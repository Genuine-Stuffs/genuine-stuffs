import { readFileSync } from "fs";
import { buildGraph } from "../../graph";
import { floorLeaves, layout, cost, placeStair, FloorSpec } from "./slice";
import { makeCtx, fastLayout, fastCost } from "./fast";
let s0 = 99; const R = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >>> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296; };
const rand = (n: number) => { const e = [0]; for (let i = 1; i < n; i++) e.push(i, R() < 0.5 ? -1 : -2); for (let k = 0; k < 3 * n; k++) { const a = e.indexOf(Math.floor(R() * n)), b = e.indexOf(Math.floor(R() * n)); [e[a], e[b]] = [e[b], e[a]]; } return e; };
let worst = 0, N = 0, tSlow = 0, tFast = 0;
for (const f of ["hive-002.json", "hive-007-live-villa-2026-10-02-evening.json", "hive-005-large-villa-v2.json"]) {
  const raw = JSON.parse(readFileSync(new URL(`../../__fixtures__/${f}`, import.meta.url), "utf-8"));
  const g = buildGraph(raw.rooms);
  const W = 33, D = 28;
  const fl0 = floorLeaves(g, 0, W, D, true)!; const s0p: FloorSpec = { ...fl0, W, D, floor: 0, stairCells: [5, 8] };
  const fl1 = floorLeaves(g, 1, W, D, true)!; const s1p: FloorSpec = { ...fl1, W, D, floor: 1 };
  s1p.leaves = [...s1p.leaves, { id: "terrace_f1", type: "balcony", area: 30, needsExt: true, front: false, connector: false }];
  for (const spec of [s0p, s1p]) {
    if (spec.floor === 1) { // a plausible floor below
      for (let k = 0; k < 200; k++) { const e = rand(s0p.leaves.length); const r = layout(e, s0p); if (r) { const S = placeStair(r[s0p.leaves.findIndex(l => l.hall)], [5, 8]); if (S) { spec.voidRect = S; spec.below = r; break; } } }
    }
    const ctx = makeCtx(spec), n = spec.leaves.length;
    const cases = [...Array(3000)].map(() => { const e = rand(n); return { e, o: e.map(t => t < 0 ? Math.floor(R() * 5) - 2 : 0) }; });
    let t = performance.now(); const slow = cases.map(c => cost(c.e, c.o, spec, 30)); tSlow += performance.now() - t;
    t = performance.now(); const fast = cases.map(c => fastLayout(ctx, c.e, c.o) ? fastCost(ctx, 30) : 1e9); tFast += performance.now() - t;
    t = performance.now(); for (const c of cases) if (fastLayout(ctx, c.e, c.o)) fastCost(ctx, 30); const warm = performance.now() - t;
    cases.forEach((_, k) => { N++; worst = Math.max(worst, Math.abs(slow[k] - fast[k])); });
    console.log(`${f.slice(0, 8)} floor ${spec.floor}: ${n} leaves, slow ${(1000 * (tSlow / N)).toFixed(1)}us/eval avg, fast warm ${(1000 * warm / cases.length).toFixed(2)}us/eval`);
  }
}
console.log(`compared ${N} layouts: max |slow - fast| = ${worst}`);
