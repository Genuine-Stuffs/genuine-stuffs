// PROTOTYPE sweep: slicing-tree layouts judged by the real harness checks.
// Usage: tsx run.ts <fixture-substr> [seeds] [itersPerAttempt]
// Accepted config (owner, 2026-10-07): FAST=1 STAIR_IN_HALL=1 REPAIR_P=0 RESTARTS=32 UPPER_FIRST=1
//   SPEC_HUB=1 FOYER_VIA_HALL=1 TERRACE_LIGHT=1  tsx run.ts <fixture> 20 640000
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import { createHash } from "crypto";
import { buildGraph, HiveRoom, deriveSuites } from "../../graph";
import { runAllAssertions } from "../assertions";
import { validatePlacement } from "../../placement_validator";
import { structure } from "../structure";
import { anneal, annealJoint, jointCost, layout, violations, floorLeaves, unsupportedWall, FloorSpec, Rect, Leaf, STAIR_IN_HALL, placeStair, hallPieces } from "./slice";

const FIX = fileURLToPath(new URL("../../__fixtures__", import.meta.url));
const SET = { front: 6, rear: 3, left: 3, right: 3 };
const want = process.argv[2] ?? "";
const N = Number(process.argv[3] ?? 20);
const ITERS = Number(process.argv[4] ?? 20000);
const STACK_W = Number(process.env.STACK_W ?? 30);
const RESTARTS = Number(process.env.RESTARTS ?? 4);
const C = 0.5;

// PAR=n: run each floor's restarts on n worker threads. The winner is picked
// by the same rule as the sequential loop, so plans are identical.
const PAR = Number(process.env.PAR ?? 0);
type AnnealRes = { expr: number[]; offs: number[]; cost: number };
const WORKER_URL = new URL("./anneal.worker.ts", import.meta.url).href;
// workers don't inherit tsx's loader: register it, then load the TypeScript worker
const workers = [...Array(PAR)].map(() => new Worker(`import("tsx/esm/api").then(m => { m.register(); return import(${JSON.stringify(WORKER_URL)}); });`, { eval: true }));
const idle = [...workers], queue: Array<() => void> = [], pending = new Map<number, (r: AnnealRes) => void>();
let nextId = 0;
for (const w of workers) w.on("message", (m: { id: number; r: AnnealRes }) => {
    pending.get(m.id)!(m.r); pending.delete(m.id);
    idle.push(w); queue.shift()?.();
});
function annealOn(spec: FloorSpec, seed: number, iters: number, sw: number): Promise<AnnealRes> {
    return new Promise(resolve => {
        const go = () => { const w = idle.pop()!, id = nextId++; pending.set(id, resolve); w.postMessage({ id, spec, seed, iters, sw }); };
        if (idle.length) go(); else queue.push(go);
    });
}
async function restarts(spec: FloorSpec, base: number, iters: number, sw: number): Promise<AnnealRes> {
    const seeds = [...Array(RESTARTS).keys()].map(k => base + k * 1000003);
    if (!PAR) {
        let res = anneal(spec, seeds[0], iters, sw);
        for (let k = 1; k < RESTARTS && res.cost > 0; k++) { const r2 = anneal(spec, seeds[k], iters, sw); if (r2.cost < res.cost) res = r2; }
        return res;
    }
    const rs = await Promise.all(seeds.map(sd => annealOn(spec, sd, iters, sw)));
    let res = rs[0];
    for (let k = 1; k < RESTARTS && res.cost > 0; k++) if (rs[k].cost < res.cost) res = rs[k];
    return res;
}

function specFor(graph: any, floor: number, W: number, D: number, duplex: boolean): FloorSpec | null {
    const fl = floorLeaves(graph, floor, W, D, duplex);
    if (!fl) return null;
    const { leaves, pairs, soft } = fl;
    const hall = leaves.find(l => l.hall)!;
    const declared = [...(graph.floors.get(floor) ?? [])].map((id: string) => graph.nodes.get(id)).filter((n: any) => n.zone === "circ" && !/stair/i.test(n.label) && n.type !== "stairwell").reduce((s: number, n: any) => s + n.area, 0);
    // the hall also holds the stair module (or its void) when stairs sit in the hall
    const hallTarget = Math.max(declared, 0.12 * W * D * C * C) + (STAIR_IN_HALL && duplex ? 5 * 8 * C * C : 0);
    if (hall.area > hallTarget * 1.6 && floor > 0) {
        // Upper floor smaller than the footprint: the surplus is an open terrace.
        const terrace: Leaf = { id: `terrace_f${floor}`, type: "balcony", area: hall.area - hallTarget, needsExt: true, front: false, connector: false };
        hall.area = hallTarget;
        leaves.push(terrace); // after the hall: pairs already point at the hall's index
        const shift = (i: number) => i; // terrace inserted before hall: hall index moves by one, pairs never name the hall
        void shift;
    }
    return { leaves, W, D, pairs, floor, soft };
}

const files = readdirSync(FIX).filter(f => f.endsWith(".json") && f.includes(want) && !/10[1-3]/.test(f));
for (const f of files) {
    const raw = JSON.parse(readFileSync(join(FIX, f), "utf-8"));
    if (process.env.GROUND) raw.rooms = raw.rooms.filter((r: any) => (r.floor ?? 0) === 0);
    if (process.env.UPPER) { raw.rooms = raw.rooms.filter((r: any) => (r.floor ?? 0) === 1 && !/stair/i.test(r.name ?? "")).map((r: any) => ({ ...r, floor: 0 })); raw.brief_reference = { ...(raw.brief_reference ?? {}), floors: 1 }; }
    const br = raw.brief_reference ?? {}; const plot = br.plot_size_sqm ?? 675; const pw = Math.sqrt(plot);
    const floors = (br.floors ?? br.storeys ?? 1);
    const be = { width: Math.max(pw - 6, 8), height: Math.max(plot / pw - 9, 8) };
    const hive: HiveRoom[] = raw.rooms.map((r: any, i: number) => ({ room_id: r.room_id ?? `room_${i}`, name: r.name, type: r.type, floor: r.floor ?? 0, area_m2: r.area_m2 ?? 9, width_m: r.width_m, span_m: r.span_m, adjacencies: r.adjacencies ?? [], uses_intermediate_columns: r.uses_intermediate_columns }));
    const graph = buildGraph(hive);
    const floorIds = [...graph.floors.keys()].sort();
    const duplex = floors > 1 || floorIds.length > 1;
    const areaOf = (fl: number) => (graph.floors.get(fl) ?? []).reduce((s, id) => s + graph.nodes.get(id)!.area, 0) + (duplex && !(graph.floors.get(fl) ?? []).some(id => /stair/i.test(graph.nodes.get(id)!.label)) ? 10 : 0);
    const need = Math.max(...floorIds.map(areaOf));
    const tally: Record<string, number> = { solved: 0, compromise: 0, nogeom: 0, clean: 0 };
    const ruleCount: Record<string, number> = {};
    let t = 0, stackSum = 0, stackN = 0;
    const stS = { on: 0, off: 0, cols: 0, n: 0, solvedN: 0, solvedNoCol: 0 };
    let sample: any = null;
    for (let s = 1; s <= N; s++) {
        const t0 = performance.now();
        type Fp = { cost: number; rects: Map<number, Rect[]>; specs: Map<number, FloorSpec>; W: number; D: number };
        // One full attempt (every floor, bottom up) on a W x D footprint.
        const tryFp = async (W: number, D: number, iters: number, salt: number): Promise<Fp | null> => {
            const specs = new Map<number, FloorSpec>(), rects = new Map<number, Rect[]>();
            let total = 0;
            // UPPER_FIRST (experiment): the busier upper floor picks the stair's place; floors below must contain it
            const order = process.env.UPPER_FIRST ? [...floorIds].reverse() : floorIds;
            let prev: number | undefined;
            for (const fl of order) {
                const spec = specFor(graph, fl, W, D, duplex);
                if (!spec) return null;
                if (prev === undefined) { if (STAIR_IN_HALL && duplex) spec.stairCells = [5, 8]; }
                else {
                    const pr = rects.get(prev)!, ps = specs.get(prev)!;
                    if (fl > prev || !process.env.UPPER_FIRST) spec.below = pr;
                    if (STAIR_IN_HALL) { const hb = ps.leaves.findIndex(l => l.hall); const S = ps.stairCells ? placeStair(pr[hb], ps.stairCells) : ps.voidRect; if (S) spec.voidRect = S; }
                    const si = ps.leaves.findIndex(l => l.stair), ui = spec.leaves.findIndex(l => l.stair);
                    if (si >= 0 && ui >= 0) spec.fixed = new Map([[ui, pr[si]]]);
                }
                const base = s * 7919 + fl * 104729 + W * 31 + D + salt;
                const sw = spec.below ? STACK_W : 0;
                const res = await restarts(spec, base, iters / RESTARTS, sw);
                const r = layout(res.expr, spec, res.offs)!;
                specs.set(fl, spec); rects.set(fl, r);
                total += violations(r, spec).filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT").length * 100 + violations(r, spec).length + (spec.below ? unsupportedWall(r, spec) : 0);
                prev = fl;
            }
            return { cost: total, rects, specs, W, D };
        };
        const fps: Array<[number, number]> = [];
        for (const slack of [1.12, 1.2]) for (const ar of [0.8, 1.0, 1.25]) {
            const A = need * slack, Wm = Math.sqrt(A * ar), Dm = A / Wm;
            const W = Math.round(Wm / C), D = Math.round(Dm / C);
            if (W * C <= be.width && D * C <= be.height) fps.push([W, D]);
        }
        let best: Fp | null = null;
        const keep = (f: Fp | null) => { if (f && (!best || f.cost < best.cost)) best = f; };
        if (process.env.SCREEN) {
            // short look at every footprint, then the full budget on the best two
            const screened: Fp[] = [];
            for (const [W, D] of fps) { const f = await tryFp(W, D, ITERS / 8, 0); if (f) screened.push(f); }
            screened.sort((a, b) => a.cost - b.cost);
            screened.forEach(keep);
            for (const f of screened.slice(0, 2)) { if (best!.cost < 1) break; keep(await tryFp(f.W, f.D, ITERS, 777)); }
        } else for (const [W, D] of fps) { keep(await tryFp(W, D, ITERS, 0)); if (best && best.cost < 1) break; }
        t += performance.now() - t0;
        if (!best) { tally.nogeom++; continue; }
        if (process.env.HASH) console.log(`  seed ${s} plan ${createHash("sha1").update(JSON.stringify([best.W, best.D, [...best.rects.entries()]])).digest("hex").slice(0, 12)} ${((performance.now() - t0) / 1000).toFixed(2)}s footprint ${fps.findIndex(([W, D]) => W === best!.W && D === best!.D)}/${fps.length} cost ${best.cost.toFixed(1)}`);
        const all = [...best.specs.entries()].flatMap(([fl, sp]) => violations(best!.rects.get(fl)!, sp));
        const relaxed = all.some(v => v.rule === "AREA_RELAXED" || v.rule === "ADJ_SOFT");
        const vs = all.filter(v => v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT");
        for (const [fl, sp] of best.specs) for (const v of violations(best.rects.get(fl)!, sp)) if (v.rule !== "AREA_RELAXED" && v.rule !== "ADJ_SOFT") { const k = `f${fl}`; ruleCount[k] = (ruleCount[k] ?? 0) + 1; }
        for (const v of vs) ruleCount[v.rule] = (ruleCount[v.rule] ?? 0) + 1;
        for (const [fl, sp] of best.specs) for (const v of violations(best.rects.get(fl)!, sp)) if (v.rule === "AREA") { const l = sp.leaves[v.leaf]; const k = `area:${l.area < 6 ? "small" : "large"}`; ruleCount[k] = (ruleCount[k] ?? 0) + 1; }
        const placed = [...best.specs.entries()].flatMap(([fl, sp]) => best!.rects.get(fl)!.flatMap((r, i) => {
            const out = (id: string, q: Rect) => ({ room_id: id, floor: fl, x: q.x * C, y: q.y * C, width: q.w * C, depth: q.h * C });
            if (!sp.leaves[i].hall) return [out(sp.leaves[i].id, r)];
            const S = sp.stairCells ? placeStair(r, sp.stairCells) : sp.voidRect && r.x <= sp.voidRect.x && r.y <= sp.voidRect.y && r.x + r.w >= sp.voidRect.x + sp.voidRect.w && r.y + r.h >= sp.voidRect.y + sp.voidRect.h ? sp.voidRect : null;
            if (!S) return [out(sp.leaves[i].id, r)];
            return [out(fl === 0 ? "stairwell" : "stairwell_void", S), ...hallPieces(r, S).map((q, k) => out(`corridor_floor${fl}_${k}`, q))];
        }));
        const typeOf = (id: string) => graph.nodes.get(id)?.type ?? (id.startsWith("stair") ? "stairwell" : id.startsWith("corridor") ? "circulation" : "balcony");
        const issues = floorIds.flatMap(fl => { const subs = new Set(deriveSuites(graph, fl).flatMap(x => x.subIds)); return validatePlacement(placed.filter(p => p.floor === fl), typeOf, id => id, best!.W * C, best!.D * C, fl, subs); });
        const L: any = { placed_rooms: placed, building_width: best.W * C, building_depth: best.D * C, solver_status: vs.length === 0 ? (relaxed ? "SOLVED_RELAXED" : "SOLVED") : "FALLBACK", placement_issues: issues };
        if (vs.length === 0) {
            tally.solved++; if (relaxed) tally.relaxed = (tally.relaxed ?? 0) + 1;
            const res = runAllAssertions(L, graph, be);
            if (res.every(r => r.pass)) tally.clean++; else console.log(`  seed ${s} harness:`, res.filter(r => !r.pass).map(r => `${r.invariant}: ${r.detail}`).join(" | "));
        } else { tally.compromise++; tally.hardMisses = (tally.hardMisses ?? 0) + vs.length; }
        if (best.specs.has(1)) { stackSum += unsupportedWall(best.rects.get(1)!, { ...best.specs.get(1)!, below: best.rects.get(0)! }); stackN++; }
        if (best.specs.has(1) && best.specs.has(0)) {
            const st = structure(best.rects.get(1)!, best.rects.get(0)!, best.W, best.D);
            stS.on += st.onStructure; stS.off += st.offM; stS.cols += st.columnsInRooms; stS.n++;
            if (vs.length === 0) { stS.solvedN++; if (st.columnsInRooms === 0) stS.solvedNoCol++; }
        }
        if (!sample || (process.env.DUMP_FAIL ? vs.length > 0 && sample.status !== "FALLBACK" : vs.length === 0 && sample.status !== "SOLVED")) sample = { fixture: f, seed: s, status: L.solver_status, W: best.W * C, D: best.D * C, placed, labels: Object.fromEntries([...graph.nodes.values()].map(n => [n.id, n.label])), violations: [...best.specs.entries()].flatMap(([fl, sp]) => violations(best!.rects.get(fl)!, sp).map(v => ({ floor: fl, rule: v.rule, room: sp.leaves[v.leaf]?.id, other: v.other !== undefined ? sp.leaves[v.other]?.id : undefined, amount: +v.amount.toFixed(2) }))) };
    }
    writeFileSync(`${process.env.OUT ?? "."}/sample_${f.slice(0, 8)}.json`, JSON.stringify(sample));
    console.log(`${f.padEnd(44)} solved ${tally.solved} (relaxed ${tally.relaxed ?? 0}, harness-clean ${tally.clean}) compromise ${tally.compromise} nogeom ${tally.nogeom} | upper walls unsupported ${stackN ? (100 * stackSum / stackN).toFixed(0) + "%" : "-"} | I10 on-structure ${stS.n ? (100 * stS.on / stS.n).toFixed(0) + "%" : "-"} off ${stS.n ? (stS.off / stS.n).toFixed(1) + "m" : "-"} cols-in-rooms ${stS.n ? (stS.cols / stS.n).toFixed(1) : "-"} (solved w/o: ${stS.solvedNoCol}/${stS.solvedN}) | hard misses/compromise plan ${tally.compromise ? ((tally.hardMisses ?? 0) / tally.compromise).toFixed(1) : "-"} | avg ${(t / N / 1000).toFixed(2)}s | misses ${JSON.stringify(ruleCount)}`);
}
for (const w of workers) await w.terminate();
