/**
 * Gap-free engine · bay-and-spine layouts (owner, 2026-10-12: "go with 1")
 * ═══════════════════════════════════════════════════════════════════════
 * The target drawing's structure: every floor is [left side | hall spine |
 * right side], the same spine on every floor, the stair at its rear end,
 * plus a front block across the front of the floor (over the left side and
 * the spine, the spine and the right side, or the full width), where the
 * spine stops. A side is one bay (3–6 m) or two bays up to 9 m with a
 * column line between them that only rooms the brief lets have
 * intermediate columns may cross. The spine is a 2.5 m corridor bay (owner,
 * 2026-10-12), so the structural grid has a column line on both hall walls
 * and the floors share them by construction: no column stands in a room.
 *
 * Each region is its own slicing tree; the search moves rooms between
 * regions. Tried first on multi-storey plans; when it leaves a hard miss
 * the gap-free engine plans the brief as before (solve.ts planDriver).
 * Prototype and measurements: __harness__/spine-proto/run.ts, ledger §6
 * item 11.5 step 2.
 * ═══════════════════════════════════════════════════════════════════════
 */
import type { RoomGraph } from "../graph";
import { floorLeaves, FloorSpec, Rect, Leaf } from "./slice";
import { makeCtx, fastCost } from "./fast";

const C = 0.5, H = -1, V = -2;
export const SPINE = 5;                                  // cells: 2.5 m, the stair module's width
export const STAIR: [number, number] = [5, 8];
const BLOCK0 = 12, BLOCK_MIN = 6, SPINE_MIN = STAIR[1] + 3; // cells: usual block depth, least block, least spine (stair + passage)
const STRADDLE_W = 15;
/** [left, right] side widths in cells: single bays, or a wide side of two bays. */
// Three footprints keep a failed attempt short (~1.3 s on a villa; the
// owner's limit is "no slower than the old engine", ~9 s); houses plan on
// the first one.
export const SIDES: Array<[number, number]> = [[10, 10], [12, 12], [18, 12]];
export const SLACKS = [1.0];

/** Left side, right side and block expressions; block depth g and side
 * (0 over left + spine, 1 over spine + right, 2 full width). */
export interface SpineState { e: number[][]; o: number[][]; g: number; side: number }

function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/** One floor: the hall is the spine; an upper floor's surplus is an open terrace. */
export function spineSpec(graph: RoomGraph, floor: number, W: number, D: number): FloorSpec | null {
    const fl = floorLeaves(graph, floor, W, D, true);
    if (!fl) return null;
    const { leaves, pairs, soft } = fl;
    const hall = leaves.find(l => l.hall)!;
    hall.area = SPINE * (D - BLOCK0) * C * C;
    const rooms = leaves.filter(l => !l.hall).reduce((s, l) => s + l.area, 0);
    const surplus = W * D * C * C - hall.area - rooms;
    if (floor > 0 && surplus > 4) leaves.push({ id: `terrace_f${floor}`, type: "balcony", area: surplus, needsExt: true, front: false, connector: false } as Leaf);
    return { leaves, W, D, pairs, floor, soft, ...(floor === 0 ? { stairCells: STAIR } : {}) };
}

/** Column lines inside a wide side (cells). */
export const innerLines = (a: number, W: number) => [...(a > 12 ? [Math.round(a / 2)] : []), ...(W - a - SPINE > 12 ? [a + SPINE + Math.round((W - a - SPINE) / 2)] : [])];
const mayStraddle = (l: Leaf) => !!l.hall || l.type === "balcony" || !!l.hardSpan;

interface Scratch { area: Float64Array; nA: Float64Array; nL: Int32Array; nR: Int32Array; nOp: Int32Array; nOff: Int32Array; leaf: Int32Array; stk: Int32Array; rx: Int32Array; ry: Int32Array; rw: Int32Array; rh: Int32Array }
const scratch = (n: number, area: ArrayLike<number>): Scratch => { const m = 2 * n + 2; return { area: Float64Array.from(area), nA: new Float64Array(m), nL: new Int32Array(m), nR: new Int32Array(m), nOp: new Int32Array(m), nOff: new Int32Array(m), leaf: new Int32Array(m), stk: new Int32Array(m), rx: new Int32Array(m), ry: new Int32Array(m), rw: new Int32Array(m), rh: new Int32Array(m) }; };

/** A region's slicing tree laid out in (x0, y0, w0, h0), rooms into X/Y/Wd/Ht. */
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

/** Lay out a state into X/Y/Wd/Ht (left side width a). False if a region has no room or a cut no space. */
function layoutInto(z: Scratch, s: SpineState, spec: FloorSpec, a: number, hall: number, X: Int32Array, Y: Int32Array, Wd: Int32Array, Ht: Int32Array): boolean {
    const D = spec.D, W = spec.W, top = D - s.g, side = s.side;
    X[hall] = a; Y[hall] = 0; Wd[hall] = SPINE; Ht[hall] = top;
    if (!s.e[0].length || !s.e[1].length || !s.e[2].length) return false;
    if (!placeFast(z, s.e[0], s.o[0], 0, 0, a, side === 1 ? D : top, X, Y, Wd, Ht)) return false;
    if (!placeFast(z, s.e[1], s.o[1], a + SPINE, 0, W - a - SPINE, side === 0 ? D : top, X, Y, Wd, Ht)) return false;
    const bx = side === 1 ? a : 0, bw = side === 0 ? a + SPINE : side === 1 ? W - a : W;
    return placeFast(z, s.e[2], s.o[2], bx, top, bw, s.g, X, Y, Wd, Ht);
}

/** The rooms' rects for a state; null if it doesn't lay out. */
export function spineRects(s: SpineState, spec: FloorSpec, a: number): Rect[] | null {
    const n = spec.leaves.length, X = new Int32Array(n), Y = new Int32Array(n), Wd = new Int32Array(n), Ht = new Int32Array(n);
    if (!layoutInto(scratch(n, spec.leaves.map(l => l.area)), s, spec, a, spec.leaves.findIndex(l => l.hall), X, Y, Wd, Ht)) return null;
    return [...Array(n).keys()].map(i => ({ x: X[i], y: Y[i], w: Wd[i], h: Ht[i] }));
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

/** A move inside one region's expression (as slice.ts mutate). */
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

/** Expression e without leaf t (and the nearest operator that keeps it valid). */
function removeLeaf(e: number[], o: number[], t: number): [number[], number[]] | null {
    const p = e.indexOf(t);
    if (e.length === 1) return null;
    for (const q of [...e.keys()].filter(q => e[q] < 0).sort((a, b) => Math.abs(a - p) - Math.abs(b - p))) {
        const ne = e.filter((_, k) => k !== p && k !== q), no = o.filter((_, k) => k !== p && k !== q);
        if (valid(ne)) return [ne, no];
    }
    return null;
}

/** One seeded restart of simulated annealing on one floor, left side a cells wide. */
export function annealSpine(spec: FloorSpec, a: number, seed: number, iters: number): { spine: SpineState; cost: number } {
    const R = rng(seed), ctx = makeCtx(spec), n = spec.leaves.length, hall = spec.leaves.findIndex(l => l.hall);
    const ids = [...Array(n).keys()].filter(i => i !== hall);
    const gMax = spec.D - SPINE_MIN;
    const inner = innerLines(a, spec.W), free = spec.leaves.map(mayStraddle);
    // the upper floor's hub (most hard links) sits in the block, across the spine, to reach both sides
    const hardDeg = spec.leaves.map((_, i) => spec.pairs.filter(([x, y]) => (x === i || y === i) && !spec.soft?.has(`${x}|${y}`)).length);
    const hub = spec.floor > 0 ? hardDeg.indexOf(Math.max(...hardDeg)) : -1;
    const side = ids.map(i => (spec.floor === 0 && spec.leaves[i].front) || i === hub ? 2 : Math.floor(R() * 3));
    for (let k = 0; k < 3; k++) if (!side.includes(k)) side[Math.floor(R() * side.length)] = k;
    for (let k = 0; k < 3; k++) if (!side.includes(k)) side[side.findIndex(v => side.filter(x => x === v).length > 1)] = k;
    const es = [0, 1, 2].map(k => initial(ids.filter((_, j) => side[j] === k), spec, R));
    // a ground floor with a garage starts with a full-width block deep enough for cars
    const garage = spec.floor === 0 && spec.leaves.some(l => l.garage);
    let cur: SpineState = { e: es, o: es.map(e => e.map(() => 0)), g: Math.min(gMax, garage ? 13 : BLOCK0), side: garage || hub >= 0 ? 2 : Math.floor(R() * 3) };
    const z = scratch(n, spec.leaves.map(l => l.area));
    const costOf = (s: SpineState) => {
        if (!layoutInto(z, s, spec, a, hall, ctx.X, ctx.Y, ctx.Wd, ctx.Ht)) return 1e9;
        let x = fastCost(ctx, 0);
        for (let i = 0; i < n; i++) if (!free[i]) for (const L of inner) if (ctx.X[i] < L && ctx.X[i] + ctx.Wd[i] > L) x += STRADDLE_W;
        return x;
    };
    // street-front rooms of the ground floor (garage, foyer) and the upper hub stay in the block
    const pinned = (t: number) => (spec.floor === 0 && spec.leaves[t].front) || t === hub;
    let cc = costOf(cur), best = cur, bc = cc, T = 50;
    const cool = Math.pow(0.05 / T, 1 / iters);
    const tot = () => cur.e[0].length + cur.e[1].length + cur.e[2].length;
    for (let it = 0; it < iters && bc > 0; it++, T *= cool) {
        const m = R();
        let nxt: SpineState;
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
    return { spine: best, cost: bc };
}

/** Footprints (cells) for a brief whose fullest floor needs `need` m²:
 * W = left + spine + right; the rooms and the spine fill W·D, with the
 * usual block at the front (no remainder for the hall to absorb). */
export function spineFootprints(need: number, maxW: number, maxD: number): Array<{ W: number; D: number; a: number }> {
    const out: Array<{ W: number; D: number; a: number }> = [];
    for (const slack of SLACKS) for (const [a, b] of SIDES) {
        const W = a + SPINE + b, Wm = W * C, Sm = SPINE * C, B0 = BLOCK0 * C;
        const D = Math.round(Math.max(need * slack - Sm * B0, 0) / (Wm - Sm) / C);
        if (W <= maxW && D <= maxD && D > SPINE_MIN + BLOCK_MIN) out.push({ W, D, a });
    }
    return out;
}
