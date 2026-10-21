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
import { anneal, layout, violations, shared, floorLeaves, unsupportedWall, placeStair, hallPieces, STAIR_IN_HALL, ENTRANCE, servedLink, FloorSpec, Rect, Leaf, isBathType } from "./slice";
import { TERRACE_LIGHT, FOYER_VIA_HALL, LANDING_VIA_HALL, SPINE_FIRST, SPINE_BUDGET, HALL_CAP, OUTBUILDINGS, SQUEEZE, TYPICAL_FLOOR, ZONES, FLAT_BOTTOM_UP, ATRIUM_UP, WET_STACK, HALL_NARROW } from "./config";
import { splitOutbuildings, outbuildingDepth, placeOutbuildings, OB_GAP, splitGatehouses, placeGatehouses, isGenerator, withoutUnits } from "./outbuildings";
import { hotelLayout } from "./hotel";
import { assemblyLayout } from "./assembly";
import { withHallNotes } from "../../structural";
import { buildingSupport } from "../building_support";
import { annealSpine, spineSpec, spineRects, spineFootprints, SpineState, STAIR as SPINE_STAIR } from "./spine";
import type { ValidationIssue } from "../placement_validator";
import { minWidthFor, maxAspectFor } from "../solver/room_shape";

export const CELL = 0.5;
export const RESTARTS = 64;
/** The open-to-below void: 40 % of the room it stands over, 9-20 m² (3 m across at least). */
const ATRIUM_SHARE = 0.4, ATRIUM_MIN = 9, ATRIUM_MAX = 20;
/** Annealing iterations per floor per footprint, over all restarts. */
export const ITERS = 1_280_000;
/** A plot that leaves fewer candidate footprints (a narrow plot cuts several
 * to one size) spends the six footprints' budget on those it has, up to
 * 1.6× per footprint (owner, 2026-10-16): small briefs get more search, the
 * slowest briefs (six footprints) are unchanged. */
const FULL_FOOTPRINTS = 6, MAX_ITERS_SCALE = 1.6;
const STACK_W = 30;
const SEED_STRIDE = 1000003;
/** Bay-and-spine search budget per floor per footprint (a quarter of the gap-free one). */
const SPINE_RESTARTS = 32, SPINE_ITERS = ITERS * SPINE_BUDGET;

export type AnnealResult = { expr: number[]; offs: number[]; cost: number; spine?: SpineState };
/** One floor's restarts: anneal(spec, seeds[k], iters, sw) for every k, or
 * annealSpine(spec, spineA, seeds[k], iters) for a bay-and-spine floor. */
export interface RestartBatch { spec: FloorSpec; seeds: number[]; iters: number; sw: number; spineA?: number }

/** One restart of a batch (sequential search, or a pool worker). */
export function runRestart(spec: FloorSpec, seed: number, iters: number, sw: number, spineA?: number): AnnealResult {
    if (spineA === undefined) return anneal(spec, seed, iters, sw);
    const r = annealSpine(spec, spineA, seed, iters);
    return { expr: [], offs: [], cost: r.cost, spine: r.spine };
}

/** The winner among a batch's results, in seed order: the first restart
 * that lowers the best cost, stopping at a perfect one (cost 0). */
export function pickWinner(results: AnnealResult[]): AnnealResult {
    let res = results[0];
    for (let k = 1; k < results.length && res.cost > 0; k++) if (results[k].cost < res.cost) res = results[k];
    return res;
}

/** Sequential restarts, stopping once one is perfect (same winner as pickWinner over all). */
function runBatch(b: RestartBatch): AnnealResult {
    let res = runRestart(b.spec, b.seeds[0], b.iters, b.sw, b.spineA);
    for (let k = 1; k < b.seeds.length && res.cost > 0; k++) {
        const r2 = runRestart(b.spec, b.seeds[k], b.iters, b.sw, b.spineA);
        if (r2.cost < res.cost) res = r2;
    }
    return res;
}

interface Prepared {
    program: SpatialProgram; envelope: PlotEnvelope; graph: RoomGraph;
    floorIds: number[]; duplex: boolean; need: number; seed: number;
    be: { width: number; height: number };
}

export function prepare(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): Prepared {
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

function specFor(graph: RoomGraph, floor: number, W: number, D: number, duplex: boolean, squeeze = false): FloorSpec | null {
    const fl = floorLeaves(graph, floor, W, D, duplex, squeeze);
    if (!fl) return null;
    const { leaves, pairs, soft } = fl;
    const hall = leaves.find(l => l.hall)!;
    const declared = [...(graph.floors.get(floor) ?? [])].map(id => graph.nodes.get(id)!)
        .filter(n => n.zone === "circ" && !/stair/i.test(n.label) && n.type !== "stairwell").reduce((s, n) => s + n.area, 0);
    // the hall also holds the stair module (or its void) when stairs sit in the hall
    const hallTarget = Math.max(declared, 0.12 * W * D * CELL * CELL) + (STAIR_IN_HALL && duplex ? 5 * 8 * CELL * CELL : 0);
    if (HALL_CAP ? hall.area - hallTarget > 4 : hall.area > hallTarget * 1.6 && floor > 0) {
        // Upper floor smaller than the footprint: the surplus is an open terrace.
        const terrace: Leaf = { id: `terrace_f${floor}`, type: "balcony", area: hall.area - hallTarget, needsExt: true, front: false, connector: false };
        hall.area = hallTarget;
        leaves.push(terrace); // appended: pairs keep pointing at the right leaves
    }
    // ATRIUM: the brief's double-volume room below leaves an open-to-below void up
    // here, open to the landing; its area comes from the terrace surplus first, then the hall
    const under = floor > 0 ? (graph.floors.get(floor - 1) ?? []).map(id => graph.nodes.get(id)!).find(n => n.atriumOver) : undefined;
    if (under) {
        const area = Math.min(ATRIUM_MAX, Math.max(ATRIUM_MIN, ATRIUM_SHARE * under.area));
        const terrace = leaves.find(l => l.id === `terrace_f${floor}`);
        const fromTerrace = terrace ? Math.min(area, Math.max(0, terrace.area - 4)) : 0;
        if (terrace) terrace.area -= fromTerrace;
        hall.area -= area - fromTerrace;
        leaves.push({ id: `atrium_f${floor}`, type: "atrium", area, needsExt: false, front: false, connector: false, onHall: true, atrium: true });
    }
    // ZONES: two flats on the floor stand either side of the core strip
    const units = [...new Set(leaves.map(l => l.node?.unit).filter((u): u is string => !!u))].sort();
    const zones = ZONES && units.length === 2
        ? [units[0], undefined, units[1]].map(u => leaves.map((l, i) => i).filter(i => (leaves[i].node?.unit ?? leaves[i].unit) === u))
        : undefined;
    // bedrooms the brief wants away from the road (quiet.ts)
    const quiet = leaves.map((l, i) => l.node?.quiet ? i : -1).filter(i => i >= 0);
    return { leaves, W, D, pairs, floor, soft, ...(zones && zones.every(z => z.length) ? { zones } : {}), ...(quiet.length ? { quiet } : {}) };
}

/** Candidate footprints (cells): two sizes × three proportions. A side
 * longer than the buildable area is cut to it and the other side lengthened
 * to keep the area (a 15 m × 30 m plot builds 9 m wide), so no footprint is
 * dropped while the area fits at all. */
function footprints(p: Prepared, squeeze = SQUEEZE): Array<[number, number, boolean?]> {
    const fps: Array<[number, number, boolean?]> = [];
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
    // SQUEEZE: no footprint fits, but the whole buildable area holds the rooms
    // scaled down to 80 % at most (floorLeaves): search it, the plan says so
    if (squeeze && !fps.length && maxW * maxD * CELL * CELL >= p.need * 0.8) fps.push([maxW, maxD, true]);
    return fps;
}

/** Two floors with the same rooms in the same order (type, size, links,
 * flat roles); only the ids differ, so one's plan serves the other. */
function sameFloor(a: FloorSpec, b: FloorSpec): boolean {
    if (a.leaves.length !== b.leaves.length || a.pairs.length !== b.pairs.length) return false;
    const at = (sp: FloorSpec, id?: string) => id === undefined ? -1 : sp.leaves.findIndex(l => l.id === id);
    const ok = a.leaves.every((l, i) => {
        const m = b.leaves[i];
        return l.type === m.type && Math.abs(l.area - m.area) < 1e-9 && l.needsExt === m.needsExt && l.front === m.front
            && l.connector === m.connector && !!l.hall === !!m.hall && !!l.stair === !!m.stair && !!l.garage === !!m.garage
            && !!l.hardSpan === !!m.hardSpan && !!l.onHall === !!m.onHall && at(a, l.reachVia) === at(b, m.reachVia)
            && !!l.passage === !!m.passage && at(a, l.reachAlt) === at(b, m.reachAlt);
    });
    const key = (sp: FloorSpec) => sp.pairs.map(([x, y]) => `${x}|${y}|${sp.soft?.has(`${x}|${y}`) ? 1 : 0}`).join(",");
    return ok && key(a) === key(b);
}

type Fp = { cost: number; rects: Map<number, Rect[]>; specs: Map<number, FloorSpec>; W: number; D: number; iters?: number };

/** The whole search. Yields each floor's restart batch; returns the layout. */
export function* gapfreeDriver(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions, squeeze = SQUEEZE): Generator<RestartBatch, SolvedLayout, AnnealResult> {
    const p = prepare(program, envelope, options);
    const fps = footprints(p, squeeze);
    if (!fps.length) return unsat(p);
    const iters = ITERS * Math.min(MAX_ITERS_SCALE, Math.max(1, FULL_FOOTPRINTS / fps.length));
    let best: Fp | null = null;
    // FLAT_BOTTOM_UP: a block of flats plans its ground floor first (street
    // entrance, shared rooms): it places the stair, the floors above contain it
    const flatsUp = FLAT_BOTTOM_UP && ZONES && [...p.graph.nodes.values()].some(n => n.unit);
    // ATRIUM_UP: a house with a double-volume room plans its ground floor first,
    // and the void above goes where that room landed (the upper floor has the slack)
    const up = flatsUp || (ATRIUM_UP && [...p.graph.nodes.values()].some(n => n.atriumOver));
    for (const [W, D, squeeze] of fps) {
        // One full attempt on a W × D footprint: the upper floor first (it
        // chooses the stair's place), then each floor below must contain it.
        const specs = new Map<number, FloorSpec>(), rects = new Map<number, Rect[]>();
        let total = 0, prev: number | undefined, ok = true;
        for (const fl of up ? p.floorIds : [...p.floorIds].reverse()) {
            const spec = specFor(p.graph, fl, W, D, p.duplex, squeeze);
            if (!spec) { ok = false; break; }
            // HALL_NARROW (trial): a one-storey house has no stair in its hall
            if (HALL_NARROW && p.floorIds.length === 1) spec.narrowHall = true;
            if (prev === undefined) { if (STAIR_IN_HALL && p.duplex) spec.stairCells = [5, 8]; }
            else {
                const pr = rects.get(prev)!, ps = specs.get(prev)!;
                if (fl > prev) spec.below = pr;
                if (STAIR_IN_HALL) { const hb = ps.leaves.findIndex(l => l.hall); const S = ps.stairCells ? placeStair(pr[hb], ps.stairCells) : ps.voidRect; if (S) spec.voidRect = S; }
                const si = ps.leaves.findIndex(l => l.stair), ui = spec.leaves.findIndex(l => l.stair);
                if (si >= 0 && ui >= 0) spec.fixed = new Map([[ui, pr[si]]]);
                // the room under the double-volume void must stand under all of it
                const ai = ps.leaves.findIndex(l => l.atrium);
                if (ai >= 0 && fl < prev) spec.atriumRect = pr[ai];
                const oi = ps.leaves.findIndex(l => l.node?.atriumOver);
                if (oi >= 0 && fl > prev && spec.leaves.some(l => l.atrium)) spec.atriumIn = pr[oi];
                // WET_STACK: a house planned downwards puts its ground-floor wet rooms under the
                // bathrooms above (planned upwards, the term cost 34 -> 26 of 50 villas solved)
                if (WET_STACK && fl < prev) spec.wetAbove = pr.filter((_, i) => isBathType(ps.leaves[i].type));
            }
            // TYPICAL_FLOOR: the same rooms as the floor above repeat its plan
            let r: Rect[];
            if (TYPICAL_FLOOR && prev !== undefined && sameFloor(spec, specs.get(prev)!)) r = rects.get(prev)!.map(q => ({ ...q }));
            else {
                const base = p.seed * 7919 + fl * 104729 + W * 31 + D;
                const res: AnnealResult = yield {
                    spec, seeds: [...Array(RESTARTS).keys()].map(k => base + k * SEED_STRIDE),
                    // flats planned upwards keep the downward plan's scoring: no wall-stacking term (as before)
                    iters: iters / RESTARTS, sw: spec.below && !up ? STACK_W : 0,
                };
                r = layout(res.expr, spec, res.offs)!;
            }
            specs.set(fl, spec); rects.set(fl, r);
            const vs = violations(r, spec);
            total += vs.filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT" && v.rule !== "ATRIUM_SOFT").length * 100 + vs.length + (spec.below ? unsupportedWall(r, spec) : 0);
            // Never acceptable as compromises: an en-suite cut off from its
            // bedroom (I4), or a stair that doesn't land in the hall above
            // (I7). A plan with one ranks below every plan without. (Solved
            // plans have no misses, so this only orders fallbacks.)
            if (vs.some(v => (v.rule === "REACH" && spec.leaves[v.leaf].reachVia !== undefined) || v.rule === "STAIR_ALIGN" || v.rule === "STAIR_FIT")) total += 1e6;
            prev = fl;
        }
        if (ok && (!best || total < best.cost)) best = { cost: total, rects, specs, W, D, iters };
        if (best && best.cost < 1) break;
    }
    if (!best) return unsat(p);
    return toLayout(p, best);
}

/** Bay-and-spine plans (spine.ts) for a multi-storey brief: the best over
 * the spine footprints, or null when every one leaves a hard miss. Fewer
 * iterations than the gap-free search: when it plans the brief at all it
 * does so quickly, and a miss hands over to the gap-free search. */
export function* spineDriver(p: Prepared): Generator<RestartBatch, SolvedLayout | null, AnnealResult> {
    if (!p.duplex || p.floorIds.length < 2) return null;
    if ([...p.graph.nodes.values()].some(n => n.atriumOver)) return null; // bay-and-spine plans have no open-to-below void
    const fps = spineFootprints(p.need, Math.floor(p.be.width / CELL + 1e-9), Math.floor(p.be.height / CELL + 1e-9));
    let best: (Fp & { hard: number }) | null = null;
    for (const { W, D, a } of fps) {
        const specs = new Map<number, FloorSpec>(), rects = new Map<number, Rect[]>();
        let total = 0, hard = 0, ok = true;
        for (const fl of p.floorIds) {
            const spec = spineSpec(p.graph, fl, W, D);
            if (!spec) { ok = false; break; }
            if (fl > p.floorIds[0]) spec.voidRect = { x: a, y: 0, w: SPINE_STAIR[0], h: SPINE_STAIR[1] };
            const base = p.seed * 7919 + fl * 104729 + W * 31 + D + a * 7;
            const res: AnnealResult = yield { spec, seeds: [...Array(SPINE_RESTARTS).keys()].map(k => base + k * SEED_STRIDE), iters: SPINE_ITERS / SPINE_RESTARTS, sw: 0, spineA: a };
            const r = res.spine && spineRects(res.spine, spec, a);
            if (!r) { ok = false; break; }
            specs.set(fl, spec); rects.set(fl, r);
            const vs = violations(r, spec), h = vs.filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT" && v.rule !== "ATRIUM_SOFT").length;
            hard += h; total += h * 100 + vs.length;
            if (h) { ok = false; break; } // only a plan with no hard miss is used: skip the other floors
        }
        if (ok && (!best || total < best.cost)) best = { cost: total, rects, specs, W, D, hard };
        if (best && best.cost < 1) break;
    }
    if (best) console.info(`[SOLVER_SPINE] bay-and-spine plan, ${best.W * CELL} × ${best.D * CELL} m`);
    return best ? toLayout(p, best) : null;
}

/** The house: bay-and-spine first (multi-storey), else the gap-free search. */
function* houseDriver(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions, squeeze = SQUEEZE): Generator<RestartBatch, SolvedLayout, AnnealResult> {
    if (SPINE_FIRST) {
        const L = yield* spineDriver(prepare(program, envelope, options));
        if (L) return L;
    }
    return yield* gapfreeDriver(program, envelope, options, squeeze);
}

/** The whole plan. Outbuildings (OUTBUILDINGS) take a strip behind the
 * house, 3 m from it: the house is planned on the envelope less that strip
 * (the rear setback counts when the user allows it). When they don't fit,
 * the house keeps them inside, as before, and the plan says why. */
export function* planDriver(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): Generator<RestartBatch, SolvedLayout, AnnealResult> {
    // a hotel: guest floors along a central corridor, stacked (hotel.ts)
    if (buildingSupport(program).kind === 'hotel') return hotelLayout(program, envelope, options);
    // a place of worship / assembly hall: three bands about a clear-span hall, to the codes (assembly.ts)
    if (buildingSupport(program).kind === 'assembly') return assemblyLayout(program, envelope, options);
    // a security post is a gatehouse at the front gate (owner 2026-10-19), planned apart from the house
    const s = envelope.setbacks;
    const gate = OUTBUILDINGS ? splitGatehouses(program, s.front) : null;
    if (!gate?.units.length) return yield* rearDriver(program, envelope, options);
    const L = yield* rearDriver(gate.house, envelope, options);
    if (L.solver_status === "UNSAT") return { ...L, program_reference: program };
    const be = prepare(program, envelope, options).be, D = L.building_depth ?? 0;
    // the house front on the front setback line, centred across the buildable width (as with a BQ)
    const site_offset = L.site_offset ?? { x: s.left + (be.width - (L.building_width ?? 0)) / 2, y: envelope.depth - s.front - D };
    const gates = placeGatehouses(gate.units, D, envelope.depth - site_offset.y - D, site_offset.x);
    const names = gate.units.map(u => u.label).join(" and ");
    return {
        ...L, program_reference: program, plot_depth: envelope.depth, site_offset, outbuildings: [...(L.outbuildings ?? []), ...gates],
        placement_issues: [...(L.placement_issues ?? []), { room_id: gate.units[0].id, rule: "GATEHOUSE_IN_FRONT_SETBACK",
            detail: `${names} stands at the gate, in the front setback. Confirm with your planning authority.` }],
    };
}

/** The plan with the BQ and generator house behind it. */
function* rearDriver(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): Generator<RestartBatch, SolvedLayout, AnnealResult> {
    const ob = OUTBUILDINGS ? splitOutbuildings(program) : null;
    if (!ob?.units.length) return yield* houseDriver(program, envelope, options);
    const be = prepare(program, envelope, options).be, s = envelope.setbacks;
    const rear = options?.outbuildings_in_rear_setback ? s.rear : 0;
    const d = outbuildingDepth(ob.units, be.width);
    const houseDepth = d === null ? 0 : envelope.depth - OB_GAP - d + rear;
    if (d !== null && houseDepth - s.front - s.rear > 0) {
        // never squeezed: a house that only fits squeezed keeps its outbuildings inside, as before
        const L = yield* houseDriver(ob.house, { ...envelope, depth: houseDepth }, options, false);
        const placed = L.solver_status !== "UNSAT" && placeOutbuildings(ob.units, d, L.building_width ?? 0, L.placed_rooms, du => (L.building_depth ?? 0) + OB_GAP + du > be.height + 1e-9);
        // the house front on the front setback line, centred across the buildable width
        const site_offset = { x: s.left + (be.width - (L.building_width ?? 0)) / 2, y: envelope.depth - s.front - (L.building_depth ?? 0) };
        if (placed) return { ...L, program_reference: program, plot_depth: envelope.depth, outbuildings: placed, site_offset };
    }
    // a generator house never moves inside the house: it is left off, and the plan says so
    const gens = ob.units.filter(isGenerator), inside = ob.units.filter(u => !isGenerator(u));
    const L = yield* houseDriver(gens.length ? withoutUnits(program, gens) : program, envelope, options);
    const why = rear ? "even with the rear setback allowed" : "inside the setbacks";
    const options_ = `Options: ${rear ? "" : "allow them in the rear setback, "}a deeper plot, or a smaller ground floor.`;
    const notes = [
        ...(inside.length ? [{ room_id: inside[0].id, rule: "OUTBUILDING_NO_FIT" as const, detail: `${inside.map(u => u.label).join(" and ")} can't stand as a separate building 3 m behind the house ${why}, so ${inside.length > 1 ? "they are" : "it is"} inside the house. ${options_}` }] : []),
        ...(gens.length ? [{ room_id: gens[0].id, rule: "OUTBUILDING_NO_FIT" as const, detail: `${gens.map(u => u.label).join(" and ")} can't stand 3 m behind the house ${why}, and a generator is never put inside the house (fumes and fire), so it is left off this plan. ${options_}` }] : []),
    ];
    return L.solver_status === "UNSAT" ? L : { ...L, program_reference: program, placement_issues: [...(L.placement_issues ?? []), ...notes] };
}

/** Run the search with restarts one after the other. */
export function solveGapfree(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): SolvedLayout {
    const gen = planDriver(program, envelope, options);
    for (let step = gen.next(); ;) {
        if (step.done) return withHallNotes(step.value as SolvedLayout);
        step = gen.next(runBatch(step.value as RestartBatch)); // not done: a batch
    }
}

/** Run the search with each batch's restarts handed to `runAll` (e.g. a
 * worker pool) and the winner picked by the sequential rule. */
export async function solveGapfreeAsync(
    program: SpatialProgram, envelope: PlotEnvelope, options: SolverOptions | undefined,
    runAll: (b: RestartBatch) => Promise<AnnealResult[]>,
): Promise<SolvedLayout> {
    const gen = planDriver(program, envelope, options);
    for (let step = gen.next(); ;) {
        if (step.done) return withHallNotes(step.value as SolvedLayout);
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
    const hard = all.filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT" && v.rule !== "ATRIUM_SOFT");
    const placed: PlacedRoom[] = [...best.specs.entries()].flatMap(([fl, sp]) => best.rects.get(fl)!.flatMap((r, i) => {
        const out = (id: string, q: Rect): PlacedRoom => ({ room_id: id, floor: fl, x: q.x * CELL, y: q.y * CELL, width: q.w * CELL, depth: q.h * CELL });
        if (!sp.leaves[i].hall) return [out(sp.leaves[i].id, r)];
        const v = sp.voidRect;
        const S = sp.stairCells ? placeStair(r, sp.stairCells)
            : v && r.x <= v.x && r.y <= v.y && r.x + r.w >= v.x + v.w && r.y + r.h >= v.y + v.h ? v : null;
        if (!S) return [out(sp.leaves[i].id, r)];
        return [out(fl === 0 ? "stairwell" : "stairwell_void", S), ...hallPieces(r, S).map((q, k) => out(`corridor_floor${fl}_${k}`, q))];
    }));
    const typeOf = (id: string) => p.graph.nodes.get(id)?.type ?? (id.startsWith("stair") ? "stairwell" : id.startsWith("corridor") || id.startsWith("passage_") ? "circulation" : id.startsWith("atrium_") ? "atrium" : "balcony");
    const issues = p.floorIds.flatMap(fl => {
        const subs = new Set(deriveSuites(p.graph, fl).flatMap(x => x.subIds));
        // a store that opens off its kitchen (STORE_OFF_KITCHEN) is reached through it, as a suite's sub-room
        for (const l of best.specs.get(fl)?.leaves ?? []) if (l.reachVia && /^(store|pantry)$/.test(l.type)) subs.add(l.id);
        return validatePlacement(placed.filter(q => q.floor === fl), typeOf, id => id, best.W * CELL, best.D * CELL, fl, subs);
    });
    const solved = hard.length === 0;
    // Every plan lists every miss, by the same rules the harness checks (I3,
    // I5): a fallback by the compromise policy, a solved plan because the
    // relaxation ladder may have dropped room links (RELAX-SOFT-ADJ).
    issues.push(...unflaggedMisses(p, placed, best, issues));
    if (!solved) issues.push(...searchMisses(p, placed, best, hard, issues));
    issues.push(...squeezeNote(best, placed), ...atriumNote(best));
    if (!solved) console.warn(`[SOLVER_GAPFREE] no plan met every rule; best plan with ${hard.length} miss(es), flagged`);
    return {
        program_reference: p.program, plot_width: p.envelope.width, plot_depth: p.envelope.depth,
        building_width: best.W * CELL, building_depth: best.D * CELL,
        placed_rooms: placed, solver_iterations_used: (best.iters ?? ITERS) * best.specs.size,
        is_fully_connected: true,
        solver_status: relaxed || !solved ? "SOLVED_RELAXED" : "SOLVED",
        ...(solved ? {} : {
            solver_fallback: true,
            solver_failure: { floor: Math.min(...hard.map(v => v.fl)), reasons: [{ code: "S-002", detail: `best plan misses ${hard.length} rule(s): ${[...new Set(hard.map(v => v.rule))].join(", ")}` }] },
        }),
        placement_issues: issues,
    };
}

/** A fallback plan's remaining misses, one note each, in words: every rule
 * the search counts as hard (SHAPE, AREA, a cut-off hall, …) that the
 * notes don't carry yet. Links and outside walls are already listed by
 * `unflaggedMisses` and the validator. */
/** SQUEEZE: a plan whose rooms were scaled down to fit says by how much,
 * and which room lost most against the brief. */
/** The double-volume void that couldn't stand over its room (ATRIUM_SOFT): said, not hidden. */
function atriumNote(best: Fp): ValidationIssue[] {
    for (const sp of best.specs.values()) {
        const rects = best.rects.get(sp.floor)!;
        const miss = violations(rects, sp).find(v => v.rule === "ATRIUM_SOFT");
        if (!miss) continue;
        const room = [...best.specs.values()].flatMap(s => s.leaves).find(l => l.node?.atriumOver)?.node?.label ?? "the room asked for";
        return [{ room_id: `atrium_f${Math.max(...best.specs.keys())}`, rule: "ATRIUM_OFF_ROOM",
            detail: `The open-to-below void on the upper floor isn't wholly over the ${room}, so only part of it (or none) is double height. Re-planning may find a layout with the void over it.` }];
    }
    return [];
}

function squeezeNote(best: Fp, placed: PlacedRoom[]): ValidationIssue[] {
    const rooms = [...best.specs.entries()].flatMap(([fl, sp]) => sp.leaves.filter(l => l.node && !l.hall).map(l => ({ l, fl })));
    if (!rooms.some(({ l }) => l.area < l.node!.area - 1e-6)) return [];
    const pct = Math.round((1 - rooms.reduce((s, { l }) => s + l.area, 0) / rooms.reduce((s, { l }) => s + l.node!.area, 0)) * 100);
    const got = (id: string, fl: number) => { const r = placed.find(q => q.room_id === id && q.floor === fl); return r ? r.width * r.depth : 0; };
    const worst = rooms.map(({ l, fl }) => ({ l, a: got(l.id, fl) })).sort((x, y) => x.a / x.l.node!.area - y.a / y.l.node!.area)[0];
    const m = (v: number) => `${+v.toFixed(2)}`;
    return [{ room_id: worst.l.id, rule: "ROOMS_SQUEEZED",
        detail: `The brief is bigger than the buildable area, so every room is about ${pct}% smaller than asked; the most: ${worst.l.node!.label} is ${m(worst.a)} m² against ${m(worst.l.node!.area)} m². See Setbacks for ways to keep every room at full size.` }];
}

function searchMisses(p: Prepared, placed: PlacedRoom[], best: Fp, hard: Array<{ rule: string; leaf: number; fl: number }>, issues: ValidationIssue[]): ValidationIssue[] {
    const out: ValidationIssue[] = [];
    const m = (v: number) => `${+v.toFixed(2)}`;
    const floor = (fl: number) => fl === 0 ? "ground floor" : fl === 1 ? "first floor" : `floor ${fl}`;
    const seen = (rule: string, id: string) => [...issues, ...out].some(i => i.room_id === id && (i.rule === rule
        || (rule === "REACH" && i.rule === "CORRIDOR_ADJACENCY") || (rule === "FRONT" && i.rule === "NO_FRONT_ENTRANCE")));
    for (const v of hard) {
        if (v.rule === "ADJACENCY" || v.rule === "EXTERNAL_WALL") continue;
        const l = best.specs.get(v.fl)!.leaves[v.leaf];
        const hallId = placed.find(r => r.floor === v.fl && (r.room_id.startsWith("corridor_floor") || r.room_id.startsWith("stairwell")))?.room_id ?? l.id;
        const id = l.hall ? hallId : l.id;
        if (seen(v.rule, id)) continue;
        const r = placed.find(q => q.room_id === l.id && q.floor === v.fl);
        const name = l.node?.label ?? (l.passage ? `${l.unit} passage` : l.atrium ? "The open-to-below void" : l.id), size = r ? `${m(r.width)} × ${m(r.depth)} m` : "";
        let detail: string;
        switch (v.rule) {
            case "SHAPE": detail = l.node && r && Math.min(r.width, r.depth) + 1e-6 < minWidthFor(l.node)
                ? `${name} is ${size}, narrower than its ${m(minWidthFor(l.node))} m minimum.`
                : `${name} is ${size}, longer than ${m(maxAspectFor(l.node ?? { type: l.type }))} times its width.`; break;
            case "AREA": detail = l.node?.minArea && r && r.width * r.depth < l.node.minArea - 1e-6
                ? `${name} is ${m(r.width * r.depth)} m², below the ${m(l.node.minArea)} m² minimum asked for.`
                : l.node && l.area < l.node.area - 1e-6
                ? `${name} is ${r ? m(r.width * r.depth) : "?"} m², more than 20% off its squeezed size of ${m(l.area)} m² (${m(l.node.area)} m² asked for).`
                : `${name} is ${r ? m(r.width * r.depth) : "?"} m², more than 20% off the ${m(l.area)} m² asked for.`; break;
            case "FACADE": detail = `${name} isn't on the ${({ N: "north", S: "south", E: "east", W: "west" } as const)[l.node!.facade!]} side asked for.`; break;
            case "NBC_MIN": detail = `${name} is ${size}, below the building code's minimum for its type.`; break;
            case "GARAGE_SIZE": detail = `${name} is ${size}, too small for the cars asked for.`; break;
            case "STAIR_SIZE": detail = `The stair is ${size}, too small for a full flight.`; break;
            case "HALL_WIDTH": detail = `The hall on the ${floor(v.fl)} is narrower than 1.5 m in places.`; break;
            case "STAIR_FIT": detail = `The stair doesn't fit inside the hall on the ${floor(v.fl)}.`; break;
            case "STAIR_ALIGN": detail = `The stair on the ${floor(v.fl)} doesn't line up with the floor below.`; break;
            case "CIRC_CONNECTED": {
                // the walk-through rooms not joined to the hall by a doorway-width wall, as violations() finds them
                const sp = best.specs.get(v.fl)!, R = best.rects.get(v.fl)!;
                const conn = sp.leaves.map((_, j) => j).filter(j => sp.leaves[j].connector || sp.leaves[j].hall);
                const joined = new Set([v.leaf]), stack = [v.leaf];
                while (stack.length) { const a = stack.pop()!; for (const b of conn) if (!joined.has(b) && shared(R[a], R[b]) >= 2) { joined.add(b); stack.push(b); } }
                const cut = conn.filter(j => !joined.has(j)).map(j => sp.leaves[j].node?.label ?? sp.leaves[j].id);
                detail = `${cut.join(" and ") || "Part of the circulation"} ${cut.length > 1 ? "are" : "is"} cut off from the hall on the ${floor(v.fl)}.`; break;
            }
            case "FRONT": detail = `${name} isn't on the street front.`; break;
            case "ATRIUM": detail = `${name} isn't under all of the open-to-below void on the floor above.`; break;
            case "REACH": detail = l.atrium ? `${name} doesn't open onto the landing on the ${floor(v.fl)}.` : best.specs.get(v.fl)!.leaves[v.leaf].onHall
                ? `${name}, the flat's entrance, doesn't open onto the landing on the ${floor(v.fl)}.`
                : `${name} doesn't open onto the hall or a room that leads to it.`; break;
            default: detail = `${name} misses the ${v.rule.toLowerCase().replace(/_/g, " ")} rule.`;
        }
        out.push({ room_id: id, rule: v.rule as ValidationIssue["rule"], detail });
    }
    return out;
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
 * met, and upstairs any link met through the landing), and rooms needing a
 * window with no outside wall (or open terrace). */
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
            if (((FOYER_VIA_HALL && (ENTRANCE.has(n.type) || ENTRANCE.has(p.graph.nodes.get(m)?.type ?? ""))) || (LANDING_VIA_HALL && a.floor > 0)) && !servedLink(n.type, p.graph.nodes.get(m)?.type ?? "")) {
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
        // a terrace or a balcony of the brief (a flat's own) gives daylight upstairs, as the planner counts it (slice.ts)
        const lit = TERRACE_LIGHT && fl > 0 && placed.some(t => t.floor === fl && t !== r
            && (t.room_id.startsWith("terrace_f") || /^(balcony|terrace)$/.test(p.graph.nodes.get(t.room_id)?.type ?? "")) && sharedM(r, t) >= 1.0);
        if (!onEdge && !lit && !has("EXTERNAL_WALL", l.id))
            out.push({ room_id: l.id, rule: "EXTERNAL_WALL", detail: `${label(l.id)} has no outside wall for a window.` });
    }
    return out;
}
