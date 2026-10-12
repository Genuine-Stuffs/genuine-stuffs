// PROTOTYPE (option A, owner 2026-10-10): bay-and-spine layouts. Every floor
// is [left bay | hall spine | right bay], the same strips on every floor, as
// in the target drawing (rooms either side of a hall along a column line).
// The spine is the hall (stair module at one end); the search arranges each
// bay as its own slicing tree and moves rooms between the bays. The floors
// share the spine's two walls and the outer walls by construction, so they
// are searched independently.
// Front block: a band across the front of the floor, over the left bay and
// the spine, the spine and the right bay, or the full width (a 3-car garage
// or an upper lounge reaching both bays); the spine stops at it. Its depth
// and side are searched.
// Wide side (2026-10-12): a side may be two bays (up to 9 m) with a column
// line between them; only rooms the brief lets have intermediate columns
// (garage, big lounges, master suite: uses_intermediate_columns) may cross
// it, any other room crossing costs STRADDLE_W.
// Usage: tsx run.ts <fixture-substr> [seeds] [firstSeed]
import { readdirSync, readFileSync } from "fs";
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import { buildGraph } from "../../graph";
import { hiveRooms, graphNeed } from "../../gapfree/need";
import { floorLeaves, violations, placeStair, shared, FloorSpec, Rect, Leaf } from "../../gapfree/slice";
import { makeCtx, fastCost } from "../../gapfree/fast";
import { fitGrid } from "../../../structural_grid";

const FIX = fileURLToPath(new URL("../../__fixtures__", import.meta.url));
const want = process.argv[2] ?? "";
const N = Number(process.argv[3] ?? 3), FIRST = Number(process.argv[4] ?? 1);
const RESTARTS = Number(process.env.RESTARTS ?? 64), ITERS = Number(process.env.ITERS ?? 1_280_000);
const SPINE = Number(process.env.SPINE ?? 5); // cells: 2.5 m, the stair module's width
const STAIR: [number, number] = [5, 8];
const C = 0.5, H = -1, V = -2;
const BLOCK0 = 12, BLOCK_MIN = 6, SPINE_MIN = STAIR[1] + 3; // cells: typical block depth, least block, least spine (stair + passage)
const STRADDLE_W = Number(process.env.STRADDLE_W ?? 15);
// [left, right] side widths in cells: two single bays, or a wide side of two bays
const SIDES: Array<[number, number]> = JSON.parse(process.env.SIDES ?? "[[10,10],[12,12],[16,12],[18,12]]");
// HUB_VIA_HALL=1 (measurement for the owner, 2026-10-12): an upper floor's
// hard links count as met when both rooms open onto the landing (as
// FOYER_VIA_HALL downstairs); a direct wall is still preferred (soft).
const HUB_VIA_HALL = process.env.HUB_VIA_HALL === "1";
const DOOR = 2;
const SLACKS = (process.env.SLACKS ?? "1.0,1.06").split(",").map(Number);
const SOFT = new Set(["AREA_RELAXED", "ADJ_SOFT"]);

function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function specFor(graph: any, floor: number, W: number, D: number): FloorSpec | null {
    const fl = floorLeaves(graph, floor, W, D, true);
    if (!fl) return null;
    const { leaves, pairs, soft } = fl;
    const hall = leaves.find(l => l.hall)!;
    hall.area = SPINE * (D - BLOCK0) * C * C;
    const rooms = leaves.filter(l => !l.hall).reduce((s, l) => s + l.area, 0);
    const surplus = W * D * C * C - hall.area - rooms;
    if (floor > 0 && surplus > 4) leaves.push({ id: `terrace_f${floor}`, type: "balcony", area: surplus, needsExt: true, front: false, connector: false } as Leaf);
    const viaHall: Array<[number, number]> = [];
    if (HUB_VIA_HALL && floor > 0) for (const [a, b] of pairs) if (!soft.has(`${a}|${b}`)) { soft.add(`${a}|${b}`); viaHall.push([a, b]); }
    return { leaves, W, D, pairs, floor, soft, viaHall, ...(floor === 0 ? { stairCells: STAIR } : {}) } as FloorSpec;
}

/** Scratch for placeFast: one tree node per expression token. */
interface Scratch { area: Float64Array; nA: Float64Array; nL: Int32Array; nR: Int32Array; nOp: Int32Array; nOff: Int32Array; leaf: Int32Array; stk: Int32Array; rx: Int32Array; ry: Int32Array; rw: Int32Array; rh: Int32Array }
const scratch = (n: number, area: ArrayLike<number>): Scratch => { const m = 2 * n + 2; return { area: Float64Array.from(area), nA: new Float64Array(m), nL: new Int32Array(m), nR: new Int32Array(m), nOp: new Int32Array(m), nOff: new Int32Array(m), leaf: new Int32Array(m), stk: new Int32Array(m), rx: new Int32Array(m), ry: new Int32Array(m), rw: new Int32Array(m), rh: new Int32Array(m) }; };

/** place() without allocating: the region's rooms straight into X/Y/Wd/Ht. */
function placeFast(z: Scratch, expr: number[], offs: number[], x0: number, y0: number, w0: number, h0: number, X: Int32Array, Y: Int32Array, Wd: Int32Array, Ht: Int32Array): boolean {
    let sp = 0;
    for (let k = 0; k < expr.length; k++) {
        const t = expr[k];
        if (t >= 0) { z.nOp[k] = 0; z.leaf[k] = t; z.nA[k] = z.area[t]; }
        else { const b = z.stk[--sp], a = z.stk[--sp]; z.nOp[k] = t; z.nL[k] = a; z.nR[k] = b; z.nOff[k] = offs[k]; z.nA[k] = z.nA[a] + z.nA[b]; }
        z.stk[sp++] = k;
    }
    const root = z.stk[0];
    z.rx[root] = x0; z.ry[root] = y0; z.rw[root] = w0; z.rh[root] = h0;
    sp = 0; z.stk[sp++] = root;
    while (sp) {
        const k = z.stk[--sp], x = z.rx[k], y = z.ry[k], w = z.rw[k], h = z.rh[k];
        if (z.nOp[k] === 0) { const l = z.leaf[k]; X[l] = x; Y[l] = y; Wd[l] = w; Ht[l] = h; continue; }
        const a = z.nL[k], b = z.nR[k], f = z.nA[a] / (z.nA[a] + z.nA[b]);
        if (z.nOp[k] === V) {
            if (w < 2) return false;
            const wl = Math.min(w - 1, Math.max(1, Math.round(w * f) + z.nOff[k]));
            z.rx[a] = x; z.ry[a] = y; z.rw[a] = wl; z.rh[a] = h; z.rx[b] = x + wl; z.ry[b] = y; z.rw[b] = w - wl; z.rh[b] = h;
        } else {
            if (h < 2) return false;
            const hl = Math.min(h - 1, Math.max(1, Math.round(h * f) + z.nOff[k]));
            z.rx[a] = x; z.ry[a] = y; z.rw[a] = w; z.rh[a] = hl; z.rx[b] = x; z.ry[b] = y + hl; z.rw[b] = w; z.rh[b] = h - hl;
        }
        z.stk[sp++] = a; z.stk[sp++] = b;
    }
    return true;
}

/** One bay's slicing tree laid out in rect r (cells), into out[]. */
function place(expr: number[], offs: number[], area: ArrayLike<number>, r: Rect, out: Rect[]): boolean {
    const st: any[] = [];
    for (let k = 0; k < expr.length; k++) {
        const t = expr[k];
        if (t >= 0) st.push({ t, a: area[t] });
        else { const b = st.pop(), a = st.pop(); st.push({ op: t, l: a, r: b, a: a.a + b.a, off: offs[k] }); }
    }
    let ok = true;
    const go = (n: any, q: Rect) => {
        if (n.t !== undefined) { out[n.t] = q; return; }
        const f = n.l.a / n.a;
        if (n.op === V) { if (q.w < 2) ok = false; const wl = Math.min(q.w - 1, Math.max(1, Math.round(q.w * f) + n.off)); go(n.l, { x: q.x, y: q.y, w: wl, h: q.h }); go(n.r, { x: q.x + wl, y: q.y, w: q.w - wl, h: q.h }); }
        else { if (q.h < 2) ok = false; const hl = Math.min(q.h - 1, Math.max(1, Math.round(q.h * f) + n.off)); go(n.l, { x: q.x, y: q.y, w: q.w, h: hl }); go(n.r, { x: q.x, y: q.y + hl, w: q.w, h: q.h - hl }); }
    };
    go(st[0], r);
    return ok;
}

const valid = (e: number[]) => { let n = 0; for (const t of e) { n += t >= 0 ? 1 : -1; if (n < 1) return false; } return n === 1; };

function initial(ids: number[], spec: FloorSpec, R: () => number): number[] {
    const order = [...ids].sort(() => R() - 0.5);
    const front = spec.floor === 0 ? order.filter(i => spec.leaves[i].front) : [];
    const rest = order.filter(i => !front.includes(i));
    const e: number[] = [];
    if (rest.length) { e.push(rest[0]); for (let i = 1; i < rest.length; i++) e.push(rest[i], R() < 0.5 ? H : V); }
    if (front.length) { e.push(front[0]); for (let i = 1; i < front.length; i++) e.push(front[i], V); if (rest.length) e.push(H); }
    return e;
}

/** A move inside one bay's expression (as the engine's mutate). */
function mutate(nx: number[], no: number[], R: () => number): boolean {
    const nOps = nx.filter(t => t < 0).length;
    const m = R();
    if (m < 0.15 && nOps) { let i = Math.floor(R() * nx.length); while (nx[i] >= 0) i = (i + 1) % nx.length; no[i] = Math.max(-2, Math.min(2, no[i] + (R() < 0.5 ? -1 : 1))); return true; }
    if (m < 0.5) { const ops = nx.map((t, i) => t >= 0 ? i : -1).filter(i => i >= 0); const a = ops[Math.floor(R() * ops.length)], b = ops[Math.floor(R() * ops.length)]; [nx[a], nx[b]] = [nx[b], nx[a]]; return a !== b; }
    if (m < 0.75 && nOps) { let i = Math.floor(R() * nx.length); while (nx[i] >= 0) i = (i + 1) % nx.length; while (i < nx.length && nx[i] < 0) { nx[i] = nx[i] === H ? V : H; i++; } return true; }
    if (nx.length < 2) return false;
    const i = Math.floor(R() * (nx.length - 1));
    if ((nx[i] >= 0) === (nx[i + 1] >= 0)) return false;
    [nx[i], nx[i + 1]] = [nx[i + 1], nx[i]]; [no[i], no[i + 1]] = [no[i + 1], no[i]];
    return valid(nx);
}

/** Remove leaf t from expression e (with one operator); null if not possible. */
function removeLeaf(e: number[], o: number[], t: number): [number[], number[]] | null {
    const p = e.indexOf(t);
    if (e.length === 1) return null;
    for (const q of [...e.keys()].filter(q => e[q] < 0).sort((a, b) => Math.abs(a - p) - Math.abs(b - p))) {
        const ne = e.filter((_, k) => k !== p && k !== q), no = o.filter((_, k) => k !== p && k !== q);
        if (valid(ne)) return [ne, no];
    }
    return null;
}

type State = { e: number[][]; o: number[][]; g: number; side: number }; // e/o: left bay, right bay, front block

/** The three regions' rects for block depth g and side (0 left+spine, 1 spine+right, 2 full width). */
function regions(spec: FloorSpec, a: number, g: number, side: number): { L: Rect; R: Rect; B: Rect; S: Rect } {
    const D = spec.D, W = spec.W, top = D - g;
    return {
        L: { x: 0, y: 0, w: a, h: side === 1 ? D : top },
        R: { x: a + SPINE, y: 0, w: W - a - SPINE, h: side === 0 ? D : top },
        B: side === 0 ? { x: 0, y: top, w: a + SPINE, h: g } : side === 1 ? { x: a, y: top, w: W - a, h: g } : { x: 0, y: top, w: W, h: g },
        S: { x: a, y: 0, w: SPINE, h: top },
    };
}

function rectsOf(s: State, spec: FloorSpec, a: number): Rect[] | null {
    const out: Rect[] = new Array(spec.leaves.length), hall = spec.leaves.findIndex(l => l.hall);
    const area = spec.leaves.map(l => l.area), q = regions(spec, a, s.g, s.side);
    out[hall] = q.S;
    const rs = [q.L, q.R, q.B];
    for (let k = 0; k < 3; k++) if (!s.e[k].length || !place(s.e[k], s.o[k], area, rs[k], out)) return null;
    return out;
}

/** Column lines inside a wide side (cells). */
const innerLines = (a: number, W: number) => [...(a > 12 ? [Math.round(a / 2)] : []), ...(W - a - SPINE > 12 ? [a + SPINE + Math.round((W - a - SPINE) / 2)] : [])];
const mayStraddle = (l: Leaf) => !!l.hall || l.type === "balcony" || !!l.hardSpan;

function anneal(spec: FloorSpec, a: number, seed: number, iters: number): { s: State; cost: number } {
    const inner = innerLines(a, spec.W), free = spec.leaves.map(mayStraddle);
    const R = rng(seed), ctx = makeCtx(spec), n = spec.leaves.length, hall = spec.leaves.findIndex(l => l.hall);
    const ids = [...Array(n).keys()].filter(i => i !== hall);
    const gMax = spec.D - SPINE_MIN;
    // the upper floor's hub (most hard links) sits in the block, across the spine, to reach both sides
    const vhk = new Set(((spec as any).viaHall ?? []).map(([x, y]: number[]) => `${x}|${y}`));
    const hardDeg = spec.leaves.map((_, i) => spec.pairs.filter(([x, y]) => (x === i || y === i) && (!spec.soft?.has(`${x}|${y}`) || vhk.has(`${x}|${y}`))).length);
    const hub = spec.floor > 0 ? hardDeg.indexOf(Math.max(...hardDeg)) : -1;
    const side = ids.map(i => (spec.floor === 0 && spec.leaves[i].front) || i === hub ? 2 : Math.floor(R() * 3));
    for (let k = 0; k < 3; k++) if (!side.includes(k)) side[Math.floor(R() * side.length)] = k;
    for (let k = 0; k < 3; k++) if (!side.includes(k)) side[side.findIndex((v, j) => side.filter(x => x === v).length > 1)] = k;
    const es = [0, 1, 2].map(k => initial(ids.filter((_, j) => side[j] === k), spec, R));
    // a ground floor with a garage starts with a full-width block deep enough for cars
    const garage = spec.floor === 0 && spec.leaves.some(l => l.garage);
    let cur: State = { e: es, o: es.map(e => e.map(() => 0)), g: Math.min(gMax, garage ? 13 : BLOCK0), side: garage || hub >= 0 ? 2 : Math.floor(R() * 3) };
    const z = scratch(n, spec.leaves.map(l => l.area));
    const vh: Array<[number, number]> = (spec as any).viaHall ?? [];
    const sh = (p: number, q: number) => shared({ x: ctx.X[p], y: ctx.Y[p], w: ctx.Wd[p], h: ctx.Ht[p] }, { x: ctx.X[q], y: ctx.Y[q], w: ctx.Wd[q], h: ctx.Ht[q] });
    const costOf = (s: State) => {
        // regions() inlined: left bay, right bay, block; the spine is the hall
        const D = spec.D, W = spec.W, top = D - s.g, side = s.side;
        ctx.X[hall] = a; ctx.Y[hall] = 0; ctx.Wd[hall] = SPINE; ctx.Ht[hall] = top;
        if (!s.e[0].length || !s.e[1].length || !s.e[2].length) return 1e9;
        if (!placeFast(z, s.e[0], s.o[0], 0, 0, a, side === 1 ? D : top, ctx.X, ctx.Y, ctx.Wd, ctx.Ht)) return 1e9;
        if (!placeFast(z, s.e[1], s.o[1], a + SPINE, 0, W - a - SPINE, side === 0 ? D : top, ctx.X, ctx.Y, ctx.Wd, ctx.Ht)) return 1e9;
        const bx = side === 1 ? a : 0, bw = side === 0 ? a + SPINE : side === 1 ? W - a : W;
        if (!placeFast(z, s.e[2], s.o[2], bx, top, bw, s.g, ctx.X, ctx.Y, ctx.Wd, ctx.Ht)) return 1e9;
        let x = fastCost(ctx, 0);
        for (const [p, q] of vh) if (sh(p, q) < DOOR && !(sh(p, hall) >= DOOR && sh(q, hall) >= DOOR)) x += 15;
        for (let i = 0; i < n; i++) if (!free[i]) for (const L of inner) if (ctx.X[i] < L && ctx.X[i] + ctx.Wd[i] > L) x += STRADDLE_W;
        return x;
    };
    let cc = costOf(cur), best = cur, bc = cc, T = 50;
    const cool = Math.pow(0.05 / T, 1 / iters);
    // street-front rooms of the ground floor (garage, foyer) live in the block
    const pinned = (t: number) => (spec.floor === 0 && spec.leaves[t].front) || t === hub;
    const tot = () => cur.e[0].length + cur.e[1].length + cur.e[2].length;
    for (let it = 0; it < iters && bc > 0; it++, T *= cool) {
        const m = R();
        let nxt: State;
        if (m < 0.1) { // move one room to another region
            const b = Math.floor(R() * 3), d = (b + 1 + Math.floor(R() * 2)) % 3, src = cur.e[b], leaves = src.filter(t => t >= 0);
            if (leaves.length < 2) continue;
            const t = leaves[Math.floor(R() * leaves.length)];
            if (pinned(t)) continue;
            const rm = removeLeaf(src, cur.o[b], t);
            if (!rm) continue;
            const dst = [...cur.e[d], t], dO = [...cur.o[d], 0];
            if (dst.length > 1) { dst.push(R() < 0.5 ? H : V); dO.push(0); }
            const e = cur.e.slice(), o = cur.o.slice(); e[b] = rm[0]; o[b] = rm[1]; e[d] = dst; o[d] = dO;
            nxt = { ...cur, e, o };
        } else if (m < 0.2) { // swap rooms between two regions
            const b = Math.floor(R() * 3), d = (b + 1 + Math.floor(R() * 2)) % 3;
            const lb = cur.e[b].filter(t => t >= 0), ld = cur.e[d].filter(t => t >= 0);
            const tb = lb[Math.floor(R() * lb.length)], td = ld[Math.floor(R() * ld.length)];
            if (pinned(tb) || pinned(td)) continue;
            const e = cur.e.slice(); e[b] = cur.e[b].map(t => t === tb ? td : t); e[d] = cur.e[d].map(t => t === td ? tb : t);
            nxt = { ...cur, e };
        } else if (m < 0.25) { // block depth
            const g = cur.g + (R() < 0.5 ? -1 : 1) * (R() < 0.5 ? 1 : 2);
            if (g < BLOCK_MIN || g > gMax) continue;
            nxt = { ...cur, g };
        } else if (m < 0.28) { // block side
            nxt = { ...cur, side: (cur.side + 1 + Math.floor(R() * 2)) % 3 };
        } else {
            let r = R() * tot(), b = 0; while (b < 2 && r >= cur.e[b].length) { r -= cur.e[b].length; b++; }
            const nx = cur.e[b].slice(), no = cur.o[b].slice();
            if (!mutate(nx, no, R)) continue;
            const e = cur.e.slice(), o = cur.o.slice(); e[b] = nx; o[b] = no;
            nxt = { ...cur, e, o };
        }
        const nc = costOf(nxt);
        if (nc <= cc || R() < Math.exp((cc - nc) / T)) { cur = nxt; cc = nc; if (cc < bc) { bc = cc; best = cur; } }
    }
    return { s: best, cost: bc };
}

/** Columns inside rooms and upper wall on structure for the designed grid:
 * x lines fixed at the outer walls and the spine's walls, y lines the best
 * set of 3–6 m bays (exhaustive). */
function designedGrid(floors: Rect[][], W: number, D: number, xs: number[], specs: FloorSpec[]) {
    const S = D + 1;
    const walls = (rs: Rect[]) => { const vx = new Uint8Array((W + 1) * S), hy = new Uint8Array((W + 1) * S); for (const r of rs) { for (let y = r.y; y < r.y + r.h; y++) { vx[r.x * S + y] = 1; vx[(r.x + r.w) * S + y] = 1; } for (let x = r.x; x < r.x + r.w; x++) { hy[x * S + r.y] = 1; hy[x * S + r.y + r.h] = 1; } } return { vx, hy }; };
    const F = floors.map(walls);
    const onWall = (P: any, x: number, y: number) => (y > 0 && P.vx[x * S + y - 1]) || (y < D && P.vx[x * S + y]) || (x > 0 && P.hy[(x - 1) * S + y]) || (x < W && P.hy[x * S + y]);
    const sets: number[][] = []; const walk = (p: number, acc: number[]) => { if (p === D) { sets.push([...acc]); return; } for (let b = 6; b <= 12 && p + b <= D; b++) { acc.push(p + b); walk(p + b, acc); acc.pop(); } }; walk(0, [0]);
    let best: any = null;
    for (const ys of sets) {
        let cols = 0, allowed = 0;
        for (const x of xs.slice(1, -1)) for (const y of ys.slice(1, -1)) F.forEach((P, k) => {
            if (onWall(P, x, y)) return;
            const i = floors[k].findIndex(r => r.x < x && x < r.x + r.w && r.y < y && y < r.y + r.h);
            if (i >= 0 && specs[k].leaves[i].hardSpan) allowed++; else cols++;
        });
        for (const x of xs.slice(1, -1)) for (const y of [0, D]) void y;
        let tot = 0, ok = 0; const U = F[1], B = F[0];
        for (let x = 1; x < W; x++) for (let y = 0; y < D; y++) if (U.vx[x * S + y]) { tot++; if (B.vx[x * S + y] || xs.includes(x)) ok++; }
        for (let y = 1; y < D; y++) for (let x = 0; x < W; x++) if (U.hy[x * S + y]) { tot++; if (B.hy[x * S + y] || ys.includes(y)) ok++; }
        const sc = cols * 1e6 + allowed * 1e3 - ok;
        if (!best || sc < best.sc) best = { sc, cols, allowed, on: tot ? ok / tot : 1, ys };
    }
    return best;
}

export { specFor, rectsOf, regions, anneal, place, SPINE, STAIR, BLOCK0 };
export type { State };
const MAIN = (process.argv[1] ?? "").endsWith("spine-proto/run.ts");
// PAR=n: each floor's restarts on n worker threads; the winner is picked in
// seed order as the sequential loop does, so plans are the same.
const PAR = MAIN ? Number(process.env.PAR ?? 4) : 0;
const WURL = new URL("./worker.ts", import.meta.url).href;
const workers = [...Array(PAR)].map(() => new Worker(`import("tsx/esm/api").then(m => { m.register(); return import(${JSON.stringify(WURL)}); });`, { eval: true }));
const idle = [...workers], waiting: Array<() => void> = [], pend = new Map<number, (r: any) => void>();
let nid = 0;
for (const w of workers) w.on("message", (m: any) => { pend.get(m.id)!(m.r); pend.delete(m.id); idle.push(w); waiting.shift()?.(); });
const onWorker = (spec: FloorSpec, a: number, seed: number, iters: number) => new Promise<{ s: State; cost: number }>(res => {
    const go = () => { const w = idle.pop()!, id = nid++; pend.set(id, res); w.postMessage({ id, spec, a, seed, iters }); };
    if (idle.length) go(); else waiting.push(go);
});
async function restarts(spec: FloorSpec, a: number, base: number): Promise<{ s: State; cost: number }> {
    const seeds = [...Array(RESTARTS).keys()].map(k => base + k * 1000003), it = ITERS / RESTARTS;
    if (!PAR) { let res = anneal(spec, a, seeds[0], it); for (let k = 1; k < RESTARTS && res.cost > 0; k++) { const r2 = anneal(spec, a, seeds[k], it); if (r2.cost < res.cost) res = r2; } return res; }
    let firstPerfect = Infinity;
    const rs = await Promise.all(seeds.map((sd, k) => k > firstPerfect ? Promise.resolve({ s: null as any, cost: Infinity }) : onWorker(spec, a, sd, it).then(r => { if (r.cost === 0) firstPerfect = Math.min(firstPerfect, k); return r; })));
    let res = rs[0]; for (let k = 1; k < RESTARTS && res.cost > 0; k++) if (rs[k].cost < res.cost) res = rs[k];
    return res;
}
const files = MAIN ? readdirSync(FIX).filter(f => f.endsWith(".json") && f.includes(want)).sort() : [];
for (const f of files) {
    const raw = JSON.parse(readFileSync(`${FIX}/${f}`, "utf-8"));
    const graph = buildGraph(hiveRooms(raw));
    const floorIds = [...graph.floors.keys()].sort();
    if (floorIds.length < 2) continue;
    const need = graphNeed(graph, true);
    const plot = raw.brief_reference?.plot_size_sqm ?? 675, pw = Math.sqrt(plot), pd = plot / pw;
    const maxW = Math.floor((pw - 6) / C), maxD = Math.floor((pd - 9) / C);
    const tally = { allowed: 0, solved: 0, fallback: 0, hard: 0, cols: 0, on: 0, gcols: 0, gon: 0, t: 0 };
    for (let s = FIRST; s < FIRST + N; s++) {
        const t0 = performance.now();
        let best: any = null;
        for (const slack of SLACKS) for (const [bay, right] of SIDES) {
            // rooms fill the bays and the block, the spine is the hall: W·D = rooms + spine (no remainder to absorb)
            const W = bay + SPINE + right, Wm = W * C, Sm = SPINE * C, B0 = BLOCK0 * C;
            const D = Math.round(Math.max(need * slack - Sm * B0, 0) / (Wm - Sm) / C);
            if (W > maxW || D > maxD) continue;
            const specs = floorIds.map(fl => specFor(graph, fl, W, D));
            if (specs.some(sp => !sp)) continue;
            const rects: Rect[][] = [], states: State[] = [];
            let total = 0, hard = 0;
            for (const sp of specs as FloorSpec[]) {
                if (sp.floor > 0) sp.voidRect = { x: bay, y: 0, w: STAIR[0], h: STAIR[1] };
                const base = s * 7919 + sp.floor * 104729 + W * 31 + D;
                const res = await restarts(sp, bay, base);
                const r = rectsOf(res.s, sp, bay)!;
                rects.push(r); states.push(res.s);
                const vs = violations(r, sp), hi = sp.leaves.findIndex(l => l.hall);
                for (const [p, q] of (sp as any).viaHall ?? []) if (shared(r[p], r[q]) < DOOR && !(shared(r[p], r[hi]) >= DOOR && shared(r[q], r[hi]) >= DOOR)) vs.push({ rule: "HUB_LINK", leaf: p, other: q, amount: 1 });
                const h = vs.filter(v => !SOFT.has(v.rule));
                hard += h.length; total += h.length * 100 + vs.length;
                if (vs.some(v => (v.rule === "REACH" && sp.leaves[v.leaf].reachVia !== undefined) || v.rule === "STAIR_ALIGN" || v.rule === "STAIR_FIT")) total += 1e6;
            }
            if (!best || total < best.total) best = { total, hard, rects, W, D, bay, specs, states };
            if (best.total < 1) break;
        }
        tally.t += performance.now() - t0;
        if (!best) { console.log(`  seed ${s}: no footprint`); continue; }
        if (best.hard === 0) tally.solved++; else { tally.fallback++; tally.hard += best.hard; }
        const g = fitGrid(best.rects, best.W, best.D);
        const d = designedGrid(best.rects, best.W, best.D, [0, best.bay, best.bay + SPINE, best.W, ...innerLines(best.bay, best.W)].sort((p, q) => p - q), best.specs);
        const blocks = best.states.map((st: State) => `${["L", "R", "full"][st.side]}${st.g * C}`).join("/");
        tally.cols += g.columnsInRooms; tally.on += g.onStructure; tally.gcols += d.cols; tally.allowed += d.allowed; tally.gon += d.on;
        const misses = best.specs.flatMap((sp: FloorSpec, k: number) => [...violations(best.rects[k], sp), ...((sp as any).viaHall ?? []).filter(([p, q]: number[]) => { const r = best.rects[k], hi = sp.leaves.findIndex(l => l.hall); return shared(r[p], r[q]) < DOOR && !(shared(r[p], r[hi]) >= DOOR && shared(r[q], r[hi]) >= DOOR); }).map(([p, q]: number[]) => ({ rule: "HUB_LINK", leaf: p, other: q, amount: 1 }))].filter(v => !SOFT.has(v.rule)).map(v => `f${sp.floor}:${v.rule}:${sp.leaves[v.leaf].id}${v.other !== undefined ? "-" + sp.leaves[v.other].id : ""}`));
        if (process.env.DEBUG) best.specs.forEach((sp: FloorSpec, k: number) => { console.log(`   floor ${sp.floor}:`); sp.leaves.forEach((l, i) => { const r = best.rects[k][i]; console.log(`     ${l.id.padEnd(22)} ${(l.node?.label ?? l.type).slice(0, 22).padEnd(22)} want ${l.area.toFixed(1)} got ${(r.w * r.h * C * C).toFixed(1)} at ${r.x * C},${r.y * C} ${r.w * C}x${r.h * C}`); }); for (const v of violations(best.rects[k], sp)) console.log(`     ! ${v.rule} ${sp.leaves[v.leaf].id}${v.other !== undefined ? "-" + sp.leaves[v.other].id : ""} ${v.amount.toFixed(2)}`); });
        console.log(`  seed ${s}: ${best.hard ? "fallback" : "solved"} ${best.W * C}x${best.D * C} m sides ${best.bay * C}+${(best.W - best.bay - SPINE) * C} block ${blocks} | fitGrid ${(100 * g.onStructure).toFixed(0)}% ${g.columnsInRooms} cols | spine grid ${(100 * d.on).toFixed(0)}% ${d.cols} cols (+${d.allowed} allowed) | ${((performance.now() - t0) / 1000).toFixed(1)}s ${misses.join(" ")}`);
    }
    const n = tally.solved + tally.fallback;
    console.log(`spine ${f.padEnd(42)} solved ${tally.solved}/${n} | hard/fallback ${tally.fallback ? (tally.hard / tally.fallback).toFixed(1) : "-"} | fitGrid ${(100 * tally.on / n).toFixed(0)}% ${(tally.cols / n).toFixed(1)} cols | spine grid ${(100 * tally.gon / n).toFixed(0)}% ${(tally.gcols / n).toFixed(1)} cols (+${(tally.allowed / n).toFixed(1)} allowed) | avg ${(tally.t / n / 1000).toFixed(1)}s (${PAR || 1} threads)`);
}
for (const w of workers) w.terminate();
