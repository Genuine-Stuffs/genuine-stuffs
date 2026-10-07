// Search-power test: briefs made from random gap-free plans (so a perfect
// layout is known to exist); how often does the annealer find one?
// Usage: tsx power.ts <rooms> <briefs> <iters> <restarts>
import { anneal, layout, violations, FloorSpec, Leaf, Rect, shared } from "../../gapfree/slice";

const n = Number(process.argv[2] ?? 12), B = Number(process.argv[3] ?? 20);
const ITERS = Number(process.argv[4] ?? 80000), RESTARTS = Number(process.argv[5] ?? 8);
let s0 = 12345;
const R = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >>> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296; };

let solved = 0, misses = 0, t = 0;
let tries = 0;
for (let b = 0; b < B; b++) {
  const W = 30, D = 28;
  let spec!: FloorSpec;
  for (;;) {
    tries++;
    // random plan: random slicing expression over random areas
    const leaves: Leaf[] = [...Array(n).keys()].map(i => ({ id: `r${i}`, type: "room", area: 8 + R() * 30, needsExt: false, front: false, connector: false }));
    let expr = [0]; for (let i = 1; i < n; i++) expr.push(i, R() < 0.5 ? -1 : -2);
    for (let k = 0; k < 4 * n; k++) { const a = 2 * Math.floor(R() * n / 2), c = Math.floor(R() * n); const ia = expr.indexOf(a % n), ic = expr.indexOf(c); [expr[ia], expr[ic]] = [expr[ic], expr[ia]]; }
    const base: FloorSpec = { leaves, W, D, pairs: [], floor: 1 };
    const rects = layout(expr, base) as Rect[];
    // the brief: true areas, outside wall where it has one, ~60% of real adjacencies, one hall
    leaves.forEach((l, i) => { const r = rects[i]; l.area = r.w * r.h * 0.25; l.needsExt = r.x === 0 || r.y === 0 || r.x + r.w === W || r.y + r.h === D; });
    const deg = leaves.map((_, i) => leaves.filter((_, j) => j !== i && shared(rects[i], rects[j]) >= 2).length);
    const hall = deg.indexOf(Math.max(...deg));
    leaves[hall].hall = true; leaves[hall].connector = true; leaves[hall].needsExt = false;
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (i !== hall && j !== hall && shared(rects[i], rects[j]) >= 2 && R() < 0.6) pairs.push([i, j]);
    spec = { leaves, W, D, pairs, floor: 1 };
    if (violations(rects, spec).filter(v => v.rule !== "AREA_RELAXED").length === 0) break;
  }
    const t0 = performance.now();
    let best = anneal(spec, b * 7919 + 1, ITERS / RESTARTS);
    for (let k = 1; k < RESTARTS && best.cost > 0; k++) { const r2 = anneal(spec, b * 7919 + 1 + k * 1000003, ITERS / RESTARTS); if (r2.cost < best.cost) best = r2; }
    t += performance.now() - t0;
    const found = violations(layout(best.expr, spec, best.offs)!, spec).filter(v => v.rule !== "AREA_RELAXED");
    if (found.length === 0) solved++;
    misses += found.length;
}
console.log(`(${tries} random plans drawn for ${B} solvable briefs) rooms ${n}: found a zero-miss layout for ${solved}/${B} solvable briefs, avg misses ${(misses / B).toFixed(1)}, avg ${(t / B / 1000).toFixed(2)}s`);
