/**
 * Gap-free layout engine · driver (layoutMode 'gapfree')
 * ═══════════════════════════════════════════════════════════════════════
 * Every floor tiles one rectangle (the target drawing's layout), searched by
 * seeded simulated annealing (D1 as amended 2026-10-06). Ported from the
 * harness prototype (__harness__/gapfree-proto/run.ts) with the owner's
 * accepted configuration (2026-10-07): upper floor first, its stair landing
 * in the ground-floor hall; 64 restarts per floor per footprint (the double
 * budget — the switch-on target is "no slower than today's engine").
 *
 * The driver is a generator: for each floor it yields one batch of seeded
 * restarts and receives the winner. runSync() runs restarts one after the
 * other (harness, no-worker fallback); a caller with workers runs them in
 * parallel and picks the winner with pickWinner(), the same rule, so the
 * plan for a given seed is the same either way.
 *
 * A plan that meets every hard rule is SOLVED / SOLVED_RELAXED. Otherwise
 * the best plan found is returned as a fallback (solver_fallback), every
 * miss flagged in placement_issues, as the compromise policy requires. If
 * no footprint fits the buildable area at all, UNSAT with F-001 (proven).
 * ═══════════════════════════════════════════════════════════════════════
 */
import type { SpatialProgram, SolvedLayout, PlacedRoom } from "../../../../../../supabase/functions/ai-studio/schema";
import type { PlotEnvelope, SolverOptions } from "../../types";
import { buildGraph, deriveSuites, HiveRoom, RoomGraph } from "../graph";
import { hiveRooms, graphNeed } from "./need";
import { validatePlacement } from "../placement_validator";
import { anneal, layout, violations, floorLeaves, unsupportedWall, placeStair, hallPieces, STAIR_IN_HALL, ENTRANCE, FloorSpec, Rect, Leaf } from "./slice";
import { TERRACE_LIGHT, FOYER_VIA_HALL } from "./config";
import type { ValidationIssue } from "../placement_validator";

export const CELL = 0.5;
export const RESTARTS = 64;
/** Annealing iterations per floor per footprint, over all restarts. */
export const ITERS = 1_280_000;
const STACK_W = 30;
const SEED_STRIDE = 1000003;

export type AnnealResult = { expr: number[]; offs: number[]; cost: number };
/** One floor's restarts: anneal(spec, seeds[k], iters, sw) for every k. */
export interface RestartBatch { spec: FloorSpec; seeds: number[]; iters: number; sw: number }

/** The winner among a batch's results, in seed order: the first restart
 * that lowers the best cost, stopping at a perfect one (cost 0). */
export function pickWinner(results: AnnealResult[]): AnnealResult {
    let res = results[0];
    for (let k = 1; k < results.length && res.cost > 0; k++) if (results[k].cost < res.cost) res = results[k];
    return res;
}

/** Sequential restarts, stopping once one is perfect (same winner as pickWinner over all). */
function runBatch(b: RestartBatch): AnnealResult {
    let res = anneal(b.spec, b.seeds[0], b.iters, b.sw);
    for (let k = 1; k < b.seeds.length && res.cost > 0; k++) {
        const r2 = anneal(b.spec, b.seeds[k], b.iters, b.sw);
        if (r2.cost < res.cost) res = r2;
    }
    return res;
}

interface Prepared {
    program: SpatialProgram; envelope: PlotEnvelope; graph: RoomGraph;
    floorIds: number[]; duplex: boolean; need: number; seed: number;
    be: { width: number; height: number };
}

function prepare(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): Prepared {
    const raw: any = program;
    const br = raw.brief_reference ?? {};
    const storeys = options?.floors_override ?? br.floors ?? br.storeys ?? 1;
    const graph = buildGraph(hiveRooms(raw));
    const floorIds = [...graph.floors.keys()].sort();
    const duplex = storeys > 1 || floorIds.length > 1;
    const s = envelope.setbacks;
    return {
        program, envelope, graph, floorIds, duplex,
        need: graphNeed(graph, duplex),
        seed: options?.seed ?? Math.floor(Math.random() * 2 ** 31),
        // the setbacks' own buildable area: never widened, a brief that
        // doesn't fit is reported (the page offers the user's options)
        be: { width: Math.max(envelope.width - s.left - s.right, 0), height: Math.max(envelope.depth - s.front - s.rear, 0) },
    };
}

function specFor(graph: RoomGraph, floor: number, W: number, D: number, duplex: boolean): FloorSpec | null {
    const fl = floorLeaves(graph, floor, W, D, duplex);
    if (!fl) return null;
    const { leaves, pairs, soft } = fl;
    const hall = leaves.find(l => l.hall)!;
    const declared = [...(graph.floors.get(floor) ?? [])].map(id => graph.nodes.get(id)!)
        .filter(n => n.zone === "circ" && !/stair/i.test(n.label) && n.type !== "stairwell").reduce((s, n) => s + n.area, 0);
    // the hall also holds the stair module (or its void) when stairs sit in the hall
    const hallTarget = Math.max(declared, 0.12 * W * D * CELL * CELL) + (STAIR_IN_HALL && duplex ? 5 * 8 * CELL * CELL : 0);
    if (hall.area > hallTarget * 1.6 && floor > 0) {
        // Upper floor smaller than the footprint: the surplus is an open terrace.
        const terrace: Leaf = { id: `terrace_f${floor}`, type: "balcony", area: hall.area - hallTarget, needsExt: true, front: false, connector: false };
        hall.area = hallTarget;
        leaves.push(terrace); // appended: pairs keep pointing at the right leaves
    }
    return { leaves, W, D, pairs, floor, soft };
}

/** Candidate footprints (cells): two sizes × three proportions. A side
 * longer than the buildable area is cut to it and the other side lengthened
 * to keep the area (a 15 m × 30 m plot builds 9 m wide), so no footprint is
 * dropped while the area fits at all. */
function footprints(p: Prepared): Array<[number, number]> {
    const fps: Array<[number, number]> = [];
    const maxW = Math.floor(p.be.width / CELL + 1e-9), maxD = Math.floor(p.be.height / CELL + 1e-9);
    for (const slack of [1.12, 1.2]) for (const ar of [0.8, 1.0, 1.25]) {
        const A = p.need * slack, Wm = Math.sqrt(A * ar), Dm = A / Wm;
        let W = Math.round(Wm / CELL), D = Math.round(Dm / CELL);
        const cut = W > maxW || D > maxD;
        if (W > maxW) { W = maxW; D = Math.ceil(A / (W * CELL * CELL)); }
        else if (D > maxD) { D = maxD; W = Math.ceil(A / (D * CELL * CELL)); }
        // proportions cut to the same size are one footprint, searched once
        if (cut && fps.some(([w, d]) => w === W && d === D)) continue;
        if (W <= maxW && D <= maxD) fps.push([W, D]);
    }
    return fps;
}

type Fp = { cost: number; rects: Map<number, Rect[]>; specs: Map<number, FloorSpec>; W: number; D: number };

/** The whole search. Yields each floor's restart batch; returns the layout. */
export function* gapfreeDriver(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): Generator<RestartBatch, SolvedLayout, AnnealResult> {
    const p = prepare(program, envelope, options);
    const fps = footprints(p);
    if (!fps.length) return unsat(p);
    let best: Fp | null = null;
    for (const [W, D] of fps) {
        // One full attempt on a W × D footprint: the upper floor first (it
        // chooses the stair's place), then each floor below must contain it.
        const specs = new Map<number, FloorSpec>(), rects = new Map<number, Rect[]>();
        let total = 0, prev: number | undefined, ok = true;
        for (const fl of [...p.floorIds].reverse()) {
            const spec = specFor(p.graph, fl, W, D, p.duplex);
            if (!spec) { ok = false; break; }
            if (prev === undefined) { if (STAIR_IN_HALL && p.duplex) spec.stairCells = [5, 8]; }
            else {
                const pr = rects.get(prev)!, ps = specs.get(prev)!;
                if (fl > prev) spec.below = pr;
                if (STAIR_IN_HALL) { const hb = ps.leaves.findIndex(l => l.hall); const S = ps.stairCells ? placeStair(pr[hb], ps.stairCells) : ps.voidRect; if (S) spec.voidRect = S; }
                const si = ps.leaves.findIndex(l => l.stair), ui = spec.leaves.findIndex(l => l.stair);
                if (si >= 0 && ui >= 0) spec.fixed = new Map([[ui, pr[si]]]);
            }
            const base = p.seed * 7919 + fl * 104729 + W * 31 + D;
            const res: AnnealResult = yield {
                spec, seeds: [...Array(RESTARTS).keys()].map(k => base + k * SEED_STRIDE),
                iters: ITERS / RESTARTS, sw: spec.below ? STACK_W : 0,
            };
            const r = layout(res.expr, spec, res.offs)!;
            specs.set(fl, spec); rects.set(fl, r);
            const vs = violations(r, spec);
            total += vs.filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT").length * 100 + vs.length + (spec.below ? unsupportedWall(r, spec) : 0);
            // Never acceptable as compromises: an en-suite cut off from its
            // bedroom (I4), or a stair that doesn't land in the hall above
            // (I7). A plan with one ranks below every plan without. (Solved
            // plans have no misses, so this only orders fallbacks.)
            if (vs.some(v => (v.rule === "REACH" && spec.leaves[v.leaf].reachVia !== undefined) || v.rule === "STAIR_ALIGN" || v.rule === "STAIR_FIT")) total += 1e6;
            prev = fl;
        }
        if (ok && (!best || total < best.cost)) best = { cost: total, rects, specs, W, D };
        if (best && best.cost < 1) break;
    }
    if (!best) return unsat(p);
    return toLayout(p, best);
}

/** Run the search with restarts one after the other. */
export function solveGapfree(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): SolvedLayout {
    const gen = gapfreeDriver(program, envelope, options);
    for (let step = gen.next(); ;) {
        if (step.done) return step.value as SolvedLayout;
        step = gen.next(runBatch(step.value as RestartBatch)); // not done: a batch
    }
}

/** Run the search with each batch's restarts handed to `runAll` (e.g. a
 * worker pool) and the winner picked by the sequential rule. */
export async function solveGapfreeAsync(
    program: SpatialProgram, envelope: PlotEnvelope, options: SolverOptions | undefined,
    runAll: (b: RestartBatch) => Promise<AnnealResult[]>,
): Promise<SolvedLayout> {
    const gen = gapfreeDriver(program, envelope, options);
    for (let step = gen.next(); ;) {
        if (step.done) return step.value as SolvedLayout;
        step = gen.next(pickWinner(await runAll(step.value as RestartBatch))); // not done: a batch
    }
}

function unsat(p: Prepared): SolvedLayout {
    const budget = p.be.width * p.be.height;
    return {
        program_reference: p.program, plot_width: p.envelope.width, plot_depth: p.envelope.depth,
        placed_rooms: [], solver_iterations_used: 0, is_fully_connected: false,
        solver_status: "UNSAT", solver_unsat_proven: true,
        solver_failure: { floor: 0, reasons: [{ code: "F-001", detail: `largest floor needs ${p.need.toFixed(1)}m² plus circulation; buildable area is ${budget.toFixed(1)}m²`, values: { needed_m2: p.need, budget_m2: budget } }] },
        placement_issues: [],
    };
}

function toLayout(p: Prepared, best: Fp): SolvedLayout {
    const all = [...best.specs.entries()].flatMap(([fl, sp]) => violations(best.rects.get(fl)!, sp).map(v => ({ ...v, fl })));
    const relaxed = all.some(v => v.rule === "AREA_RELAXED" || v.rule === "ADJ_SOFT");
    const hard = all.filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT");
    const placed: PlacedRoom[] = [...best.specs.entries()].flatMap(([fl, sp]) => best.rects.get(fl)!.flatMap((r, i) => {
        const out = (id: string, q: Rect): PlacedRoom => ({ room_id: id, floor: fl, x: q.x * CELL, y: q.y * CELL, width: q.w * CELL, depth: q.h * CELL });
        if (!sp.leaves[i].hall) return [out(sp.leaves[i].id, r)];
        const v = sp.voidRect;
        const S = sp.stairCells ? placeStair(r, sp.stairCells)
            : v && r.x <= v.x && r.y <= v.y && r.x + r.w >= v.x + v.w && r.y + r.h >= v.y + v.h ? v : null;
        if (!S) return [out(sp.leaves[i].id, r)];
        return [out(fl === 0 ? "stairwell" : "stairwell_void", S), ...hallPieces(r, S).map((q, k) => out(`corridor_floor${fl}_${k}`, q))];
    }));
    const typeOf = (id: string) => p.graph.nodes.get(id)?.type ?? (id.startsWith("stair") ? "stairwell" : id.startsWith("corridor") ? "circulation" : "balcony");
    const issues = p.floorIds.flatMap(fl => {
        const subs = new Set(deriveSuites(p.graph, fl).flatMap(x => x.subIds));
        return validatePlacement(placed.filter(q => q.floor === fl), typeOf, id => id, best.W * CELL, best.D * CELL, fl, subs);
    });
    const solved = hard.length === 0;
    // Every plan lists every miss, by the same rules the harness checks (I3,
    // I5): a fallback by the compromise policy, a solved plan because the
    // relaxation ladder may have dropped room links (RELAX-SOFT-ADJ).
    issues.push(...unflaggedMisses(p, placed, best, issues));
    if (!solved) console.warn(`[SOLVER_GAPFREE] no plan met every rule; best plan with ${hard.length} miss(es), flagged`);
    return {
        program_reference: p.program, plot_width: p.envelope.width, plot_depth: p.envelope.depth,
        building_width: best.W * CELL, building_depth: best.D * CELL,
        placed_rooms: placed, solver_iterations_used: ITERS * best.specs.size,
        is_fully_connected: true,
        solver_status: relaxed || !solved ? "SOLVED_RELAXED" : "SOLVED",
        ...(solved ? {} : {
            solver_fallback: true,
            solver_failure: { floor: Math.min(...hard.map(v => v.fl)), reasons: [{ code: "S-002", detail: `best plan misses ${hard.length} rule(s): ${[...new Set(hard.map(v => v.rule))].join(", ")}` }] },
        }),
        placement_issues: issues,
    };
}

/** Shared wall between two placed rooms (m), 0 if they don't touch. */
function sharedM(a: PlacedRoom, b: PlacedRoom): number {
    const aR = a.x + a.width, aB = a.y + a.depth, bR = b.x + b.width, bB = b.y + b.depth;
    if (Math.abs(aB - b.y) < 0.35 || Math.abs(a.y - bB) < 0.35) return Math.max(0, Math.min(aR, bR) - Math.max(a.x, b.x));
    if (Math.abs(aR - b.x) < 0.35 || Math.abs(a.x - bR) < 0.35) return Math.max(0, Math.min(aB, bB) - Math.max(a.y, b.y));
    return 0;
}

/** Misses of a fallback plan that `issues` doesn't flag yet: declared links
 * without a 1 m shared wall (a foyer link met through the hall counts as
 * met), and rooms needing a window with no outside wall (or open terrace). */
function unflaggedMisses(p: Prepared, placed: PlacedRoom[], best: Fp, issues: ValidationIssue[]): ValidationIssue[] {
    const out: ValidationIssue[] = [];
    const byId = new Map(placed.map(r => [r.room_id, r]));
    const label = (id: string) => p.graph.nodes.get(id)?.label ?? id;
    const has = (rule: string, id: string) => issues.some(i => i.rule === rule && i.room_id === id) || out.some(i => i.rule === rule && i.room_id === id);
    const W = best.W * CELL, D = best.D * CELL;
    const isHall = (r: PlacedRoom) => r.room_id.startsWith("corridor_floor") || r.room_id.startsWith("stairwell") || p.graph.nodes.get(r.room_id)?.zone === "circ";
    const seen = new Set<string>();
    for (const n of p.graph.nodes.values()) {
        const a = byId.get(n.id);
        if (!a) continue;
        for (const m of n.neighbors) {
            const key = [n.id, m].sort().join("|");
            if (seen.has(key)) continue;
            seen.add(key);
            const b = byId.get(m);
            if (!b || a.floor !== b.floor || sharedM(a, b) >= 1.0) continue;
            if (FOYER_VIA_HALL && (ENTRANCE.has(n.type) || ENTRANCE.has(p.graph.nodes.get(m)?.type ?? ""))) {
                const halls = placed.filter(h => h.floor === a.floor && isHall(h));
                if (halls.some(h => sharedM(a, h) >= 1.0) && halls.some(h => sharedM(b, h) >= 1.0)) continue;
            }
            const detail = `${label(n.id)} doesn't share a wall with ${label(m)}.`; // one line per missed link
            if (![...issues, ...out].some(i => i.rule === "ADJACENCY_MISSED" && i.detail === detail))
                out.push({ room_id: n.id, rule: "ADJACENCY_MISSED", detail });
        }
    }
    for (const [fl, sp] of best.specs) for (const l of sp.leaves) {
        if (!l.needsExt || !p.graph.nodes.has(l.id)) continue;
        const r = byId.get(l.id);
        if (!r) continue;
        const onEdge = r.x <= 0.5 || r.y <= 0.5 || r.x + r.width >= W - 0.5 || r.y + r.depth >= D - 0.5;
        const lit = TERRACE_LIGHT && fl > 0 && placed.some(t => t.floor === fl && t.room_id.startsWith("terrace_f") && sharedM(r, t) >= 1.0);
        if (!onEdge && !lit && !has("EXTERNAL_WALL", l.id))
            out.push({ room_id: l.id, rule: "EXTERNAL_WALL", detail: `${label(l.id)} has no outside wall for a window.` });
    }
    return out;
}
