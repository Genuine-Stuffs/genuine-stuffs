// Gap-free layout engine (layoutMode 'gapfree'): slicing-tree floor layout.
// The footprint rectangle is cut recursively (normalized Polish expression,
// Wong–Liu); every room is a leaf; one "hall" leaf takes the remainder.
// Gap-free, overlap-free, inside the footprint by construction. Searched by
// seeded simulated annealing over the expression; cost = rule violations.
import { RoomGraph, GraphNode, NO_WINDOW_TYPES, STREET_FRONT_TYPES, deriveSuites, identifyHubs, specHub } from "../graph";
import { roomShapeOk, meetsNbcMinimums, minWidthFor } from "../solver/room_shape";
import { isConnectorType, isSubRoom } from "../placement_validator";
import { makeCtx, fastLayout, fastCost } from "./fast";
import { STAIR_IN_HALL, FAST, FOYER_VIA_HALL, TERRACE_LIGHT, SPEC_HUB, SMALL_TOL, REPAIR_P } from "./config";

const CELL = 0.5;
export { STAIR_IN_HALL, FOYER_VIA_HALL, TERRACE_LIGHT };
export const ENTRANCE = new Set(["foyer", "entrance", "entry", "entrance_hall", "lobby", "reception"]);
const H = -1, V = -2; // H: stacked (horizontal cut), V: side by side (vertical cut)

export interface Leaf {
    id: string; type: string; area: number; node?: GraphNode;
    needsExt: boolean; front: boolean; connector: boolean; reachVia?: string; // sub-room reaches via its bedroom
    hall?: boolean; stair?: boolean; garage?: boolean; hardSpan?: boolean;
}
export interface Rect { x: number; y: number; w: number; h: number } // cells
export interface FloorSpec {
    leaves: Leaf[]; W: number; D: number; pairs: Array<[number, number]>; floor: number;
    soft?: Set<string>; // "a|b" pairs the relaxation ladder may drop (no hub endpoint)
    fixed?: Map<number, Rect>; // leaf -> required rect (stair void)
    stairCells?: [number, number]; // stair module (w, h cells) set into a corner of the hall (ground)
    voidRect?: Rect;               // the stair below: the hall above must contain it
    below?: Rect[];            // rects of the floor below (wall stacking)
}

function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/** Leaf rects for an expression: each cut splits its rect in proportion to
 * the children's target areas, snapped to whole cells. */
export function layout(expr: number[], spec: FloorSpec, offs?: number[]): Rect[] | null {
    const stack: Array<{ leaves: number[]; area: number; tree: any }> = [];
    for (let k = 0; k < expr.length; k++) {
        const t = expr[k];
        if (t >= 0) stack.push({ leaves: [t], area: spec.leaves[t].area, tree: t });
        else { const b = stack.pop()!, a = stack.pop()!; stack.push({ leaves: [...a.leaves, ...b.leaves], area: a.area + b.area, tree: { op: t, a: a.tree, b: b.tree, aa: a.area, ba: b.area, off: offs?.[k] ?? 0 } }); }
    }
    const out: Rect[] = new Array(spec.leaves.length);
    let ok = true;
    const place = (tree: any, r: Rect) => {
        if (typeof tree === "number") { out[tree] = r; return; }
        const f = tree.aa / (tree.aa + tree.ba);
        if (tree.op === V) {
            const wl = Math.min(r.w - 1, Math.max(1, Math.round(r.w * f) + tree.off));
            if (r.w < 2) ok = false;
            place(tree.a, { x: r.x, y: r.y, w: wl, h: r.h }); place(tree.b, { x: r.x + wl, y: r.y, w: r.w - wl, h: r.h });
        } else {
            const hl = Math.min(r.h - 1, Math.max(1, Math.round(r.h * f) + tree.off));
            if (r.h < 2) ok = false;
            place(tree.a, { x: r.x, y: r.y, w: r.w, h: hl }); place(tree.b, { x: r.x, y: r.y + hl, w: r.w, h: r.h - hl });
        }
    };
    place(stack[0].tree, { x: 0, y: 0, w: spec.W, h: spec.D });
    return ok ? out : null;
}

export function shared(a: Rect, b: Rect): number {
    if (a.x + a.w === b.x || b.x + b.w === a.x) return Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    if (a.y + a.h === b.y || b.y + b.h === a.y) return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    return 0;
}
const onPerimeter = (r: Rect, s: FloorSpec) => r.x === 0 || r.y === 0 || r.x + r.w === s.W || r.y + r.h === s.D;
const perimDist = (r: Rect, s: FloorSpec) => Math.min(r.x, r.y, s.W - r.x - r.w, s.D - r.y - r.h);
/** Cells between two rects (0 when they touch or overlap in projection). */
const gap = (a: Rect, b: Rect) => Math.max(0, a.x - b.x - b.w, b.x - a.x - a.w) + Math.max(0, a.y - b.y - b.h, b.y - a.y - a.h);

/** Hall minus stair, as rectangles (the stair sits in one corner). */
export function hallPieces(H: Rect, S: Rect): Rect[] {
    const out: Rect[] = [];
    const left = S.x - H.x, right = H.x + H.w - (S.x + S.w), top = S.y - H.y, bottom = H.y + H.h - (S.y + S.h);
    // full-height strip beside the stair, then the part above/below it
    if (left > 0) out.push({ x: H.x, y: H.y, w: left, h: H.h });
    if (right > 0) out.push({ x: S.x + S.w, y: H.y, w: right, h: H.h });
    if (top > 0) out.push({ x: S.x, y: H.y, w: S.w, h: top });
    if (bottom > 0) out.push({ x: S.x, y: S.y + S.h, w: S.w, h: bottom });
    return out;
}
const PASSAGE = 3; // cells: 1.5 m, the engine's default corridor width

/** Passage left around the stair is either none or >= 1.5 m, and there is some. */
function piecesOk(H: Rect, S: Rect): boolean {
    const ps = hallPieces(H, S);
    return ps.length > 0 && ps.every(p => Math.min(p.w, p.h) >= PASSAGE);
}

/** The stair module in a corner of hall H, or null if it can't fit with passage. */
export function placeStair(H: Rect, cells: [number, number]): Rect | null {
    for (const [w, h] of [cells, [cells[1], cells[0]] as [number, number]]) {
        if (w > H.w || h > H.h) continue;
        for (const [x, y] of [[H.x, H.y], [H.x + H.w - w, H.y], [H.x, H.y + H.h - h], [H.x + H.w - w, H.y + H.h - h]]) {
            const S = { x, y, w, h };
            if (piecesOk(H, S)) return S;
        }
    }
    return null;
}
const contains = (H: Rect, S: Rect) => S.x >= H.x && S.y >= H.y && S.x + S.w <= H.x + H.w && S.y + S.h <= H.y + H.h;

export interface Violation { rule: string; leaf: number; other?: number; amount: number }

/** Every rule a layout breaks, with a magnitude to guide the search. */
export function violations(rects: Rect[], spec: FloorSpec): Violation[] {
    const v: Violation[] = [];
    const DOOR = 2; // cells: 1.0 m shared wall (D5)
    spec.leaves.forEach((l, i) => {
        const r = rects[i], w_m = r.w * CELL, h_m = r.h * CELL, a = w_m * h_m;
        if (l.hall) {
            if (Math.min(r.w, r.h) < 3) v.push({ rule: "HALL_WIDTH", leaf: i, amount: 3 - Math.min(r.w, r.h) });
            if (spec.stairCells && !placeStair(r, spec.stairCells)) {
                const [a2, b2] = spec.stairCells;
                const short = Math.max(0, Math.min(a2, b2) - Math.min(r.w, r.h)) + Math.max(0, Math.max(a2, b2) - Math.max(r.w, r.h));
                v.push({ rule: "STAIR_FIT", leaf: i, amount: 1 + short / 2 });
            }
            if (spec.voidRect) {
                const S = spec.voidRect;
                if (!contains(r, S)) v.push({ rule: "STAIR_ALIGN", leaf: i, amount: 1 + (Math.max(0, r.x - S.x) + Math.max(0, S.x + S.w - r.x - r.w) + Math.max(0, r.y - S.y) + Math.max(0, S.y + S.h - r.y - r.h)) / 2 });
                else if (!piecesOk(r, S)) v.push({ rule: "STAIR_FIT", leaf: i, amount: 1 });
            }
        } else {
            // a stair is sized by STAIR_SIZE; SMALL_TOL (experiment): rooms under 6 m² may be ±1 m²
            const dev = l.stair ? 0 : (SMALL_TOL && l.area < 6 && Math.abs(a - l.area) <= 1.0001) ? 0 : Math.abs(a - l.area) / l.area;
            // Ladder: within ±10% is strict; within ±20% is RELAX-AREA-20.
            if (dev > 0.20) v.push({ rule: "AREA", leaf: i, amount: 1 + 5 * (dev - 0.20) });
            else if (dev > 0.10) v.push({ rule: "AREA_RELAXED", leaf: i, amount: dev - 0.10 });
            if (l.node) {
                if (!l.hardSpan && !roomShapeOk(l.node, w_m, h_m)) v.push({ rule: "SHAPE", leaf: i, amount: 1 + Math.max(0, minWidthFor(l.node) - Math.min(w_m, h_m)) + Math.max(0, Math.max(w_m, h_m) / Math.min(w_m, h_m) - 2) });
                if (l.hardSpan && Math.max(w_m, h_m) / Math.min(w_m, h_m) > 3) v.push({ rule: "SHAPE", leaf: i, amount: 1 });
                if (!meetsNbcMinimums(l.node, w_m, h_m)) v.push({ rule: "NBC_MIN", leaf: i, amount: 1 });
            }
            if (l.stair && (Math.min(r.w, r.h) < 5 || Math.max(r.w, r.h) < 8)) v.push({ rule: "STAIR_SIZE", leaf: i, amount: 1 });
            // Cars drive in from the front: frontage per the brief's width (-1 m), >= 5.5 m deep.
            if (l.garage && (r.h * CELL < 5.5 || r.w * CELL < (l.node?.width ?? 3) - 1)) v.push({ rule: "GARAGE_SIZE", leaf: i, amount: 1 + Math.max(0, 5.5 - r.h * CELL) + Math.max(0, (l.node?.width ?? 3) - 1 - r.w * CELL) });
        }
        // TERRACE_LIGHT (experiment): opening onto an open terrace counts as an outside wall
        const lit = TERRACE_LIGHT && spec.leaves.some((m, j) => j !== i && m.type === "balcony" && !l.hall && l.type !== "balcony" && shared(r, rects[j]) >= DOOR);
        if (l.needsExt && !lit && !onPerimeter(r, spec)) v.push({ rule: "EXTERNAL_WALL", leaf: i, amount: 1 + perimDist(r, spec) / 4 });
        if (l.front && spec.floor === 0 && r.y + r.h !== spec.D) v.push({ rule: "FRONT", leaf: i, amount: 1 + (spec.D - r.y - r.h) / 4 });
        if (!l.connector && !l.hall) {
            const via = l.reachVia !== undefined ? spec.leaves.findIndex(x => x.id === l.reachVia) : -1;
            const ok = via >= 0 ? shared(r, rects[via]) >= DOOR
                : spec.leaves.some((m, j) => j !== i && (m.connector || m.hall) && shared(r, rects[j]) >= DOOR);
            if (!ok) {
                const d = via >= 0 ? gap(r, rects[via]) : Math.min(...spec.leaves.map((m, j) => j !== i && (m.connector || m.hall) ? gap(r, rects[j]) : 1e9));
                v.push({ rule: "REACH", leaf: i, amount: 1 + d / 4 });
            }
        }
        const fx = spec.fixed?.get(i);
        if (fx && (fx.x !== r.x || fx.y !== r.y || fx.w !== r.w || fx.h !== r.h))
            v.push({ rule: "STAIR_ALIGN", leaf: i, amount: 1 + (Math.abs(fx.x - r.x) + Math.abs(fx.y - r.y) + Math.abs(fx.w - r.w) + Math.abs(fx.h - r.h)) / 4 });
    });
    const hallI = spec.leaves.findIndex(l => l.hall);
    const isFoyer = (i: number) => ENTRANCE.has(spec.leaves[i].type);
    for (const [a, b] of spec.pairs) {
        let s = shared(rects[a], rects[b]);
        // FOYER_VIA_HALL (experiment): a foyer link is met through the hall the foyer opens onto
        if (FOYER_VIA_HALL && s < DOOR && hallI >= 0 && (isFoyer(a) || isFoyer(b))) {
            const f = isFoyer(a) ? a : b, o = f === a ? b : a;
            if (shared(rects[f], rects[hallI]) >= DOOR && shared(rects[o], rects[hallI]) >= DOOR) {
                v.push({ rule: "ADJ_SOFT", leaf: a, other: b, amount: 1 }); // met through the hall: allowed, direct preferred
                continue;
            }
        }
        if (s < DOOR) v.push({ rule: spec.soft?.has(`${a}|${b}`) ? "ADJ_SOFT" : "ADJACENCY", leaf: a, other: b, amount: 1 + (DOOR - s) / DOOR + gap(rects[a], rects[b]) / 4 });
    }
    // Circulation is one network: the hall (with the stair in it) and every
    // room people walk through connect by doorway-width walls, so the stair
    // reaches every room. Penalty: connectors cut off from the hall.
    const hall = spec.leaves.findIndex(l => l.hall);
    if (hall >= 0) {
        const conn = spec.leaves.map((l, j) => j).filter(j => spec.leaves[j].connector || spec.leaves[j].hall);
        const seenC = new Set([hall]), stack = [hall];
        while (stack.length) { const a = stack.pop()!; for (const b of conn) if (!seenC.has(b) && shared(rects[a], rects[b]) >= DOOR) { seenC.add(b); stack.push(b); } }
        const cut = conn.length - seenC.size;
        if (cut > 0) v.push({ rule: "CIRC_CONNECTED", leaf: hall, amount: cut });
    }
    return v;
}

export const WEIGHT: Record<string, number> = { FRONT: 30, STAIR_ALIGN: 40, STAIR_FIT: 30, REACH: 20, EXTERNAL_WALL: 20, ADJACENCY: 15, SHAPE: 15, NBC_MIN: 15, STAIR_SIZE: 20, GARAGE_SIZE: 20, HALL_WIDTH: 10, HALL_REACH: 20, CIRC_CONNECTED: 20, AREA: 20, AREA_RELAXED: 2, ADJ_SOFT: 5 };

/** Lower-floor wall cells, built once per spec: vx[x*(D+1)+y] = a vertical
 * wall runs along x from y to y+1; hy likewise for horizontal walls. */
const wallCache = new WeakMap<Rect[], { vx: Uint8Array; hy: Uint8Array }>();
function wallsOf(rs: Rect[], W: number, D: number) {
    let c = wallCache.get(rs);
    if (c) return c;
    const vx = new Uint8Array((W + 1) * (D + 1)), hy = new Uint8Array((W + 1) * (D + 1));
    for (const r of rs) {
        for (let y = r.y; y < r.y + r.h; y++) { vx[r.x * (D + 1) + y] = 1; vx[(r.x + r.w) * (D + 1) + y] = 1; }
        for (let x = r.x; x < r.x + r.w; x++) { hy[x * (D + 1) + r.y] = 1; hy[x * (D + 1) + r.y + r.h] = 1; }
    }
    c = { vx, hy }; wallCache.set(rs, c); return c;
}

/** Fraction of this floor's wall length not standing on a wall below (I10).
 * Edges shared by two rooms are counted once per room (fine for a ratio). */
export function unsupportedWall(rects: Rect[], spec: FloorSpec): number {
    if (!spec.below) return 0;
    const { vx, hy } = wallsOf(spec.below, spec.W, spec.D), S = spec.D + 1;
    let tot = 0, bad = 0;
    for (const r of rects) {
        for (let y = r.y; y < r.y + r.h; y++) { tot += 2; bad += 2 - vx[r.x * S + y] - vx[(r.x + r.w) * S + y]; }
        for (let x = r.x; x < r.x + r.w; x++) { tot += 2; bad += 2 - hy[x * S + r.y] - hy[x * S + r.y + r.h]; }
    }
    return tot ? bad / tot : 0;
}

export function cost(expr: number[], offs: number[], spec: FloorSpec, stackW: number): number {
    const rects = layout(expr, spec, offs);
    if (!rects) return 1e9;
    let c = 0;
    for (const v of violations(rects, spec)) c += (WEIGHT[v.rule] ?? 10) * v.amount;
    return c + stackW * unsupportedWall(rects, spec);
}

/** Simulated annealing over normalized Polish expressions. */
export function anneal(spec: FloorSpec, seed: number, iters: number, stackW = 0): { expr: number[]; offs: number[]; cost: number } {
    const R = rng(seed), n = spec.leaves.length;
    const order = [...Array(n).keys()].sort(() => R() - 0.5);
    const frontIdx = spec.floor === 0 ? order.filter(i => spec.leaves[i].front) : [];
    const rest = order.filter(i => !frontIdx.includes(i));
    let cur: number[] = [rest[0]];
    for (let i = 1; i < rest.length; i++) cur.push(rest[i], R() < 0.5 ? H : V);
    if (frontIdx.length) { cur.push(frontIdx[0]); for (let i = 1; i < frontIdx.length; i++) cur.push(frontIdx[i], V); cur.push(H); }
    // Allocation-free loop: the candidate is built in scratch buffers (nx, no)
    // copied from the current plan, and buffers are swapped on acceptance.
    // Same random draws and decisions as before, so the same plans.
    const L = cur.length;
    let cE = Int32Array.from(cur), cO = new Int32Array(L), nx = new Int32Array(L), no = new Int32Array(L);
    const bestE = cE.slice(), bestO = cO.slice(), opsB = new Int32Array(L);
    const ctx = FAST && !spec.fixed ? makeCtx(spec) : null;
    const costF = ctx ? (e: ArrayLike<number>, o: ArrayLike<number>) => fastLayout(ctx, e as any, o as any) ? fastCost(ctx, stackW) : 1e9 : (e: ArrayLike<number>, o: ArrayLike<number>) => cost(e as any, o as any, spec, stackW);
    let cc = costF(cE, cO), bc = cc;
    const viols = (e: ArrayLike<number>, o: ArrayLike<number>) => { if (!REPAIR_P) return []; const r = layout(e as any, spec, o as any); return r ? violations(r, spec).filter(v => v.rule !== "AREA_RELAXED") : []; };
    let curV = viols(cE, cO);
    let T = 50;
    const cool = Math.pow(0.05 / T, 1 / iters);
    for (let it = 0; it < iters && bc > 0; it++, T *= cool) {
        nx.set(cE); no.set(cO);
        const m = R();
        let nOps = 0;
        for (let i = 0; i < L; i++) if (nx[i] >= 0) opsB[nOps++] = i;
        if (m < REPAIR_P && curV.length) { // repair: act on one current violation
            const v = curV[Math.floor(R() * curV.length)];
            const pos = (leaf: number) => nx.indexOf(leaf);
            if ((v.rule === "ADJACENCY" || v.rule === "ADJ_SOFT") && v.other !== undefined) {
                // make b the operand right after a (siblings under one cut)
                const pa = pos(v.leaf), k = opsB.subarray(0, nOps).indexOf(pa), pb = pos(v.other);
                const tgt = k + 1 < nOps ? opsB[k + 1] : k - 1 >= 0 ? opsB[k - 1] : undefined;
                if (tgt !== undefined && tgt !== pb) { const t = nx[tgt]; nx[tgt] = nx[pb]; nx[pb] = t; }
            } else {
                // swap the room with a random room that currently satisfies the rule
                const rects = layout(cE as any, spec, cO as any);
                if (!rects) continue;
                const good = spec.leaves.map((_, i) => i).filter(i => i !== v.leaf && (
                    v.rule === "FRONT" ? rects[i].y + rects[i].h === spec.D :
                    v.rule === "EXTERNAL_WALL" ? (rects[i].x === 0 || rects[i].y === 0 || rects[i].x + rects[i].w === spec.W || rects[i].y + rects[i].h === spec.D) && !spec.leaves[i].needsExt :
                    true));
                if (!good.length) continue;
                const j = good[Math.floor(R() * good.length)], pa = pos(v.leaf), pj = pos(j);
                const t = nx[pa]; nx[pa] = nx[pj]; nx[pj] = t;
            }
        } else if (m < REPAIR_P + 0.15) { // nudge one cut by a cell (area tolerance)
            let i = Math.floor(R() * L); while (nx[i] >= 0) i = (i + 1) % L;
            no[i] = Math.max(-2, Math.min(2, no[i] + (R() < 0.5 ? -1 : 1)));
        } else if (m < REPAIR_P + 0.4) { // swap two operands
            const a = opsB[Math.floor(R() * nOps)], b = opsB[Math.floor(R() * nOps)];
            const t = nx[a]; nx[a] = nx[b]; nx[b] = t;
        } else if (m < REPAIR_P + 0.6) { // complement an operator chain
            let i = Math.floor(R() * L); while (nx[i] >= 0) i = (i + 1) % L;
            while (i < L && nx[i] < 0) { nx[i] = nx[i] === H ? V : H; i++; }
        } else { // swap adjacent operand/operator, keeping the expression valid
            const i = Math.floor(R() * (L - 1));
            if ((nx[i] >= 0) === (nx[i + 1] >= 0)) continue;
            let t = nx[i]; nx[i] = nx[i + 1]; nx[i + 1] = t; t = no[i]; no[i] = no[i + 1]; no[i + 1] = t;
            let operands = 0, okExpr = true;
            for (let q = 0; q < L; q++) { operands += nx[q] >= 0 ? 1 : -1; if (operands < 1) { okExpr = false; break; } }
            if (!okExpr) continue;
        }
        const nc = costF(nx, no);
        if (nc <= cc || R() < Math.exp((cc - nc) / T)) {
            let t = cE; cE = nx; nx = t; t = cO; cO = no; no = t; cc = nc; curV = viols(cE, cO);
            if (cc < bc) { bc = cc; bestE.set(cE); bestO.set(cO); }
        }
    }
    return { expr: Array.from(bestE), offs: Array.from(bestO), cost: bc };
}

/** Leaves for one floor of the brief: rooms (circulation merged into one
 * hall leaf that takes the footprint's remainder). */
export function floorLeaves(graph: RoomGraph, floor: number, W: number, D: number, extraStair: boolean): { leaves: Leaf[]; pairs: Array<[number, number]>; soft: Set<string> } | null {
    const ids = graph.floors.get(floor) ?? [];
    const suites = deriveSuites(graph, floor);
    const parentOf = new Map<string, string>();
    for (const s of suites) for (const sub of s.subIds) parentOf.set(sub, s.bedroomId);
    const leaves: Leaf[] = [];
    let hallIds: string[] = [];
    for (const id of ids) {
        const n = graph.nodes.get(id)!;
        if ((n.type === "stairwell" || (n.zone === "circ" && /stair/i.test(n.label))) && STAIR_IN_HALL) { hallIds.push(id); continue; }
        if (n.type === "stairwell" || (n.zone === "circ" && /stair/i.test(n.label))) {
            leaves.push({ id: floor === 0 ? "stairwell" : "stairwell_void", type: "stairwell", area: 10, needsExt: false, front: false, connector: true, stair: true });
            continue;
        }
        if (n.zone === "circ") { hallIds.push(id); continue; }
        const sub = isSubRoom(n.type) || parentOf.has(id);
        leaves.push({
            id, type: n.type, area: n.area, node: n,
            needsExt: !NO_WINDOW_TYPES.has(n.type) && !sub,
            front: STREET_FRONT_TYPES.has(n.type),
            connector: isConnectorType(n.type),
            reachVia: parentOf.get(id),
            garage: n.type === "garage", hardSpan: n.usesIntermediateColumns,
        });
    }
    if (extraStair && !STAIR_IN_HALL && !leaves.some(l => l.stair)) leaves.push({ id: floor === 0 ? "stairwell" : "stairwell_void", type: "stairwell", area: 10, needsExt: false, front: false, connector: true, stair: true });
    const used = leaves.reduce((s, l) => s + l.area, 0);
    const rest = W * D * CELL * CELL - used;
    if (rest < 4) return null;
    leaves.push({ id: `corridor_floor${floor}_0`, type: "circulation", area: rest, needsExt: false, front: false, connector: true, hall: true });
    const index = new Map(leaves.map((l, i) => [l.id, i]));
    for (const h of hallIds) index.set(h, leaves.length - 1); // every declared corridor is the one hall
    const pairs: Array<[number, number]> = [];
    const seen = new Set<string>();
    for (const id of ids) {
        const n = graph.nodes.get(id)!;
        for (const m of n.neighbors) {
            const a = index.get(id), b = index.get(m);
            if (a === undefined || b === undefined || a === b) continue;
            if (graph.nodes.get(m)?.floor !== floor) continue;
            const k = [a, b].sort().join("|");
            if (!seen.has(k)) { seen.add(k); pairs.push([a, b]); }
        }
    }
    // As the engine: only edges at a hub room are never dropped.
    const hubs = new Set(SPEC_HUB ? specHub(graph, floor) : identifyHubs(graph, floor).map(h => h.id));
    const soft = new Set<string>();
    // Circulation pairs are never hub edges in the engine (buildCirculation).
    const circ = (i: number) => !!(leaves[i].hall || leaves[i].stair);
    for (const [a, b] of pairs) if (circ(a) || circ(b) || (!hubs.has(leaves[a].id) && !hubs.has(leaves[b].id))) soft.add(`${a}|${b}`);
    return { leaves, pairs, soft };
}

/** One random move on (expr, offs), in place: nudge a cut, swap two rooms,
 * flip a chain of cuts, or swap an adjacent room/cut. False if invalid. */
function mutate(nx: number[], no: number[], R: () => number): boolean {
    const m = R();
    if (m < 0.15) {
        let i = Math.floor(R() * nx.length); while (nx[i] >= 0) i = (i + 1) % nx.length;
        no[i] = Math.max(-2, Math.min(2, no[i] + (R() < 0.5 ? -1 : 1)));
    } else if (m < 0.5) {
        const ops = nx.map((t, i) => t >= 0 ? i : -1).filter(i => i >= 0);
        const a = ops[Math.floor(R() * ops.length)], b = ops[Math.floor(R() * ops.length)];
        [nx[a], nx[b]] = [nx[b], nx[a]];
    } else if (m < 0.75) {
        let i = Math.floor(R() * nx.length); while (nx[i] >= 0) i = (i + 1) % nx.length;
        while (i < nx.length && nx[i] < 0) { nx[i] = nx[i] === H ? V : H; i++; }
    } else {
        const i = Math.floor(R() * (nx.length - 1));
        if ((nx[i] >= 0) === (nx[i + 1] >= 0)) return false;
        [nx[i], nx[i + 1]] = [nx[i + 1], nx[i]]; [no[i], no[i + 1]] = [no[i + 1], no[i]];
        let operands = 0;
        for (const t of nx) { operands += t >= 0 ? 1 : -1; if (operands < 1) return false; }
    }
    return true;
}

function initialExpr(spec: FloorSpec, R: () => number): number[] {
    const n = spec.leaves.length;
    const order = [...Array(n).keys()].sort(() => R() - 0.5);
    const frontIdx = spec.floor === 0 ? order.filter(i => spec.leaves[i].front) : [];
    const rest = order.filter(i => !frontIdx.includes(i));
    const cur: number[] = [rest[0]];
    for (let i = 1; i < rest.length; i++) cur.push(rest[i], R() < 0.5 ? H : V);
    if (frontIdx.length) { cur.push(frontIdx[0]); for (let i = 1; i < frontIdx.length; i++) cur.push(frontIdx[i], V); cur.push(H); }
    return cur;
}

export interface FloorState { expr: number[]; offs: number[]; rects?: Rect[] | null; cost?: number }

/** Scores floors from `from` up (lower floors keep their cached result);
 * each upper floor's stair void and walls-below come from the floor under it.
 * A stair that doesn't fit below costs the floor above more than any landing. */
export function jointCost(specs: FloorSpec[], st: FloorState[], stackW: number, stairCells: [number, number] | undefined, from = 0): number {
    let total = 0;
    for (let f = 0; f < specs.length; f++) {
        if (f < from && st[f].cost !== undefined) { total += st[f].cost!; continue; }
        const sp = specs[f];
        let extra = 0;
        if (f > 0) {
            const below = st[f - 1].rects;
            if (!below) { st[f].rects = null; st[f].cost = 1e6; total += 1e6; continue; }
            sp.below = below;
            const Hb = below[specs[f - 1].leaves.findIndex(l => l.hall)];
            const S = stairCells ? placeStair(Hb, stairCells) : null;
            sp.voidRect = S ?? undefined;
            if (stairCells && !S) extra = 100;
        }
        const r = layout(st[f].expr, sp, st[f].offs);
        let c = extra;
        if (!r) c += 1e6;
        else { for (const v of violations(r, sp)) c += (WEIGHT[v.rule] ?? 10) * v.amount; if (f > 0) c += stackW * unsupportedWall(r, sp); }
        st[f].rects = r; st[f].cost = c; total += c;
    }
    return total;
}

/** Simulated annealing over all floors at once. */
export function annealJoint(specs: FloorSpec[], seed: number, iters: number, stackW: number, stairCells?: [number, number]): { state: FloorState[]; cost: number } {
    const R = rng(seed);
    let cur: FloorState[] = specs.map(sp => { const e = initialExpr(sp, R); return { expr: e, offs: e.map(() => 0) }; });
    let cc = jointCost(specs, cur, stackW, stairCells), best = cur.map(s => ({ ...s })), bc = cc, T = 50;
    const cool = Math.pow(0.05 / T, 1 / iters);
    for (let it = 0; it < iters && bc > 0; it++, T *= cool) {
        const f = Math.floor(R() * specs.length);
        const nx = cur[f].expr.slice(), no = cur[f].offs.slice();
        if (!mutate(nx, no, R)) continue;
        const cand = cur.map((s, k) => k === f ? { expr: nx, offs: no } : k > f ? { expr: s.expr, offs: s.offs } : s);
        const nc = jointCost(specs, cand, stackW, stairCells, f);
        if (nc <= cc || R() < Math.exp((cc - nc) / T)) { cur = cand; cc = nc; if (cc < bc) { bc = cc; best = cur.map(s => ({ ...s })); } }
    }
    jointCost(specs, best, stackW, stairCells); // leave specs' derived fields matching `best`
    return { state: best, cost: bc };
}
