// Fast scorer: the same weighted cost as cost() in slice.ts, without
// allocating. Rules that depend only on a room's own size are memoised per
// (leaf, w, h); positions are scored on preallocated typed arrays.
import { FloorSpec, Rect, violations, WEIGHT, placeStair, hallPieces, unsupportedWall, FOYER_VIA_HALL, ENTRANCE, TERRACE_LIGHT } from "./slice";

const DOOR = 2, PASSAGE = 3;

export interface Ctx {
    spec: FloorSpec; n: number; W: number; D: number;
    area: Float64Array; X: Int32Array; Y: Int32Array; Wd: Int32Array; Ht: Int32Array;
    needsExt: Uint8Array; terrace: Uint8Array; front: Uint8Array; conn: Uint8Array; reachVia: Int32Array; hall: number;
    pa: Int32Array; pb: Int32Array; pw: Float64Array; pf: Int32Array; // pf: the pair's foyer end, or -1
    intrinsic: Float64Array; // n × (W+1) × (D+1), NaN = not computed
    // layout scratch (2n-1 nodes)
    nArea: Float64Array; nL: Int32Array; nR: Int32Array; nOp: Int32Array; nOff: Int32Array; stk: Int32Array;
    rx: Int32Array; ry: Int32Array; rw: Int32Array; rh: Int32Array; leafOf: Int32Array; seen: Uint8Array; bfs: Int32Array;
}

export function makeCtx(spec: FloorSpec): Ctx {
    const n = spec.leaves.length, m = 2 * n;
    const idx = new Map(spec.leaves.map((l, i) => [l.id, i]));
    const pairs = spec.pairs;
    const c: Ctx = {
        spec, n, W: spec.W, D: spec.D,
        area: Float64Array.from(spec.leaves.map(l => l.area)),
        X: new Int32Array(n), Y: new Int32Array(n), Wd: new Int32Array(n), Ht: new Int32Array(n),
        needsExt: Uint8Array.from(spec.leaves.map(l => +l.needsExt)),
        terrace: Uint8Array.from(spec.leaves.map(l => +(l.type === "balcony"))),
        front: Uint8Array.from(spec.leaves.map(l => +(l.front && spec.floor === 0))),
        conn: Uint8Array.from(spec.leaves.map(l => +(!!l.connector || !!l.hall))),
        reachVia: Int32Array.from(spec.leaves.map(l => l.connector || l.hall ? -2 : l.reachVia !== undefined ? (idx.get(l.reachVia) ?? -1) : -1)),
        hall: spec.leaves.findIndex(l => l.hall),
        pa: Int32Array.from(pairs.map(p => p[0])), pb: Int32Array.from(pairs.map(p => p[1])),
        pw: Float64Array.from(pairs.map(([a, b]) => spec.soft?.has(`${a}|${b}`) ? WEIGHT.ADJ_SOFT : WEIGHT.ADJACENCY)),
        pf: Int32Array.from(pairs.map(([a, b]) => ENTRANCE.has(spec.leaves[a].type) ? a : ENTRANCE.has(spec.leaves[b].type) ? b : -1)),
        intrinsic: new Float64Array(n * (spec.W + 1) * (spec.D + 1)).fill(NaN),
        nArea: new Float64Array(m), nL: new Int32Array(m), nR: new Int32Array(m), nOp: new Int32Array(m), nOff: new Int32Array(m), stk: new Int32Array(m),
        rx: new Int32Array(m), ry: new Int32Array(m), rw: new Int32Array(m), rh: new Int32Array(m), leafOf: new Int32Array(m),
        seen: new Uint8Array(n), bfs: new Int32Array(n),
    };
    return c;
}

/** Leaf rects into ctx.X/Y/Wd/Ht. False if a cut had no room. */
export function fastLayout(c: Ctx, expr: number[], offs: number[]): boolean {
    let sp = 0;
    for (let k = 0; k < expr.length; k++) {
        const t = expr[k];
        if (t >= 0) { c.nOp[k] = 0; c.leafOf[k] = t; c.nArea[k] = c.area[t]; }
        else { const b = c.stk[--sp], a = c.stk[--sp]; c.nOp[k] = t; c.nL[k] = a; c.nR[k] = b; c.nOff[k] = offs[k]; c.nArea[k] = c.nArea[a] + c.nArea[b]; }
        c.stk[sp++] = k;
    }
    const root = c.stk[0];
    c.rx[root] = 0; c.ry[root] = 0; c.rw[root] = c.W; c.rh[root] = c.D;
    sp = 0; c.stk[sp++] = root;
    while (sp) {
        const k = c.stk[--sp];
        const x = c.rx[k], y = c.ry[k], w = c.rw[k], h = c.rh[k];
        if (c.nOp[k] === 0) { const l = c.leafOf[k]; c.X[l] = x; c.Y[l] = y; c.Wd[l] = w; c.Ht[l] = h; continue; }
        const a = c.nL[k], b = c.nR[k], f = c.nArea[a] / (c.nArea[a] + c.nArea[b]);
        if (c.nOp[k] === -2) { // V
            if (w < 2) return false;
            const wl = Math.min(w - 1, Math.max(1, Math.round(w * f) + c.nOff[k]));
            c.rx[a] = x; c.ry[a] = y; c.rw[a] = wl; c.rh[a] = h;
            c.rx[b] = x + wl; c.ry[b] = y; c.rw[b] = w - wl; c.rh[b] = h;
        } else {
            if (h < 2) return false;
            const hl = Math.min(h - 1, Math.max(1, Math.round(h * f) + c.nOff[k]));
            c.rx[a] = x; c.ry[a] = y; c.rw[a] = w; c.rh[a] = hl;
            c.rx[b] = x; c.ry[b] = y + hl; c.rw[b] = w; c.rh[b] = h - hl;
        }
        c.stk[sp++] = a; c.stk[sp++] = b;
    }
    return true;
}

/** Cost of rules that depend only on leaf i being w × h (memoised): area,
 * shape, NBC minimum, stair/garage size, hall width, stair fit. */
function intrinsicCost(c: Ctx, i: number, w: number, h: number): number {
    const key = (i * (c.W + 1) + w) * (c.D + 1) + h;
    const v = c.intrinsic[key];
    if (v === v) return v;
    // reuse the reference rules on a lone rect placed where only its size matters
    const rects: Rect[] = c.spec.leaves.map(() => ({ x: 0, y: 0, w: 1, h: 1 }));
    rects[i] = { x: 0, y: 0, w, h };
    const spec = c.spec;
    const solo: FloorSpec = { leaves: [spec.leaves[i]], W: spec.W, D: spec.D, pairs: [], floor: 1, stairCells: spec.stairCells };
    let s = 0;
    for (const vi of violations([rects[i]], solo)) if (!["EXTERNAL_WALL", "FRONT", "REACH", "CIRC_CONNECTED"].includes(vi.rule)) s += (WEIGHT[vi.rule] ?? 10) * vi.amount;
    c.intrinsic[key] = s;
    return s;
}

const sharedC = (c: Ctx, a: number, b: number): number => {
    const ax = c.X[a], ay = c.Y[a], aw = c.Wd[a], ah = c.Ht[a], bx = c.X[b], by = c.Y[b], bw = c.Wd[b], bh = c.Ht[b];
    if (ax + aw === bx || bx + bw === ax) return Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
    if (ay + ah === by || by + bh === ay) return Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
    return 0;
};
const gapC = (c: Ctx, a: number, b: number): number =>
    Math.max(0, c.X[a] - c.X[b] - c.Wd[b], c.X[b] - c.X[a] - c.Wd[a]) + Math.max(0, c.Y[a] - c.Y[b] - c.Ht[b], c.Y[b] - c.Y[a] - c.Ht[a]);

/** The same total as slice.ts cost(), for the current layout in ctx. */
export function fastCost(c: Ctx, stackW: number): number {
    const { n, W, D } = c;
    let s = 0;
    for (let i = 0; i < n; i++) {
        const x = c.X[i], y = c.Y[i], w = c.Wd[i], h = c.Ht[i];
        s += intrinsicCost(c, i, w, h);
        let lit = false;
        if (TERRACE_LIGHT && c.needsExt[i] && !c.terrace[i] && i !== c.hall) for (let j = 0; j < n && !lit; j++) if (j !== i && c.terrace[j] && sharedC(c, i, j) >= DOOR) lit = true;
        if (c.needsExt[i] && !lit && !(x === 0 || y === 0 || x + w === W || y + h === D))
            s += WEIGHT.EXTERNAL_WALL * (1 + Math.min(x, y, W - x - w, D - y - h) / 4);
        if (c.front[i] && y + h !== D) s += WEIGHT.FRONT * (1 + (D - y - h) / 4);
        const via = c.reachVia[i];
        if (via !== -2) {
            let ok = false, d = 1e9;
            if (via >= 0) { ok = sharedC(c, i, via) >= DOOR; if (!ok) d = gapC(c, i, via); }
            else {
                for (let j = 0; j < n && !ok; j++) if (j !== i && c.conn[j] && sharedC(c, i, j) >= DOOR) ok = true;
                if (!ok) for (let j = 0; j < n; j++) if (j !== i && c.conn[j]) d = Math.min(d, gapC(c, i, j));
            }
            if (!ok) s += WEIGHT.REACH * (1 + d / 4);
        }
    }
    for (let p = 0; p < c.pa.length; p++) {
        const a = c.pa[p], b = c.pb[p];
        let sh = sharedC(c, a, b);
        if (FOYER_VIA_HALL && sh < DOOR && c.hall >= 0 && c.pf[p] >= 0) {
            const fo = c.pf[p], o = fo === a ? b : a;
            if (sharedC(c, fo, c.hall) >= DOOR && sharedC(c, o, c.hall) >= DOOR) { s += WEIGHT.ADJ_SOFT; continue; }
        }
        if (sh < DOOR) s += c.pw[p] * (1 + (DOOR - sh) / DOOR + gapC(c, a, b) / 4);
    }
    const hall = c.hall;
    if (hall >= 0) {
        const vr = c.spec.voidRect;
        if (vr) {
            const r = { x: c.X[hall], y: c.Y[hall], w: c.Wd[hall], h: c.Ht[hall] };
            const inside = vr.x >= r.x && vr.y >= r.y && vr.x + vr.w <= r.x + r.w && vr.y + vr.h <= r.y + r.h;
            if (!inside) s += WEIGHT.STAIR_ALIGN * (1 + (Math.max(0, r.x - vr.x) + Math.max(0, vr.x + vr.w - r.x - r.w) + Math.max(0, r.y - vr.y) + Math.max(0, vr.y + vr.h - r.y - r.h)) / 2);
            else { const ps = hallPieces(r, vr); if (!(ps.length > 0 && ps.every(q => Math.min(q.w, q.h) >= PASSAGE))) s += WEIGHT.STAIR_FIT; }
        }
        // circulation network from the hall
        c.seen.fill(0); c.seen[hall] = 1; let top = 0, count = 1, conns = 0;
        for (let j = 0; j < n; j++) conns += c.conn[j];
        c.bfs[top++] = hall;
        while (top) { const a = c.bfs[--top]; for (let b = 0; b < n; b++) if (c.conn[b] && !c.seen[b] && sharedC(c, a, b) >= DOOR) { c.seen[b] = 1; count++; c.bfs[top++] = b; } }
        if (conns - count > 0) s += WEIGHT.CIRC_CONNECTED * (conns - count);
    }
    if (stackW && c.spec.below) {
        const rects: Rect[] = []; for (let i = 0; i < n; i++) rects.push({ x: c.X[i], y: c.Y[i], w: c.Wd[i], h: c.Ht[i] });
        s += stackW * unsupportedWall(rects, c.spec);
    }
    return s;
}
export { placeStair };
