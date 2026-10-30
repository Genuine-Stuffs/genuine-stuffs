/**
 * One structural grid per building, shared by every floor (the target
 * drawing's A–B–C / 1–5 grid): bays of 3.0–6.0 m (owner, 2026-10-07: 6 m as
 * in the target drawing), a column at every grid intersection on every floor,
 * so columns stack, and beams along the grid lines.
 *
 * The grid is the one that best fits the plan — every split of the footprint
 * into 3–6 m bays is searched:
 *   1. fewest columns standing inside rooms (an intersection on no wall);
 *   2. most upper-floor wall standing on a grid beam line or on a wall below
 *      (I10);
 *   3. most wall on the grid lines.
 * A hall 2.5 m wide that runs on every floor along the same strip is a
 * corridor bay (owner, 2026-10-12): the grid may put a column line on both
 * its walls, a bay narrower than the 3 m room bay.
 * An upper wall on neither is carried by a secondary beam along its line,
 * spanning the grid bay between the two grid beams it crosses (owner,
 * 2026-10-10), so no span passes 6 m and every wall has a load path.
 * The skeleton (columns, beams), the structural overlay, the bill of
 * quantities, the IFC export, the harness's I10 measure and the drawing's
 * grid bubbles all read this one grid.
 */
import type { SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";

/** Cells of CELL m, y from the rear wall. */
export interface Rect { x: number; y: number; w: number; h: number }

export const CELL = 0.5;
export const MIN_BAY_M = 3, MAX_BAY_M = 6, CORRIDOR_BAY_M = 2.5;
const MIN_BAY = MIN_BAY_M / CELL, MAX_BAY = MAX_BAY_M / CELL, CORRIDOR = CORRIDOR_BAY_M / CELL;

/** Where a bay may start at p: a 3 m to `max` room bay (6 m unless the plan asks for less),
 * or a corridor bay where one runs. */
const steps = (p: number, corr: Set<number>, max: number) => corr.has(p) ? [CORRIDOR, ...range(max)] : range(max);
const RANGES = new Map<number, number[]>();
const range = (max: number) => RANGES.get(max) ?? (RANGES.set(max, Array.from({ length: max - MIN_BAY + 1 }, (_, i) => MIN_BAY + i)), RANGES.get(max)!);
const NONE = new Set<number>();

export interface GridFit {
    /** Grid lines, cells from the building's origin; first 0, last W (or D). */
    xs: number[]; ys: number[];
    /** Intersections inside a room, summed over the floors. */
    columnsInRooms: number;
    /** Share of upper-floor interior wall on a beam line or a wall below
     * (1 for one storey), and the metres that are not. */
    onStructure: number; offM: number;
}

/** A secondary beam under an upper wall that stands on no grid line and no
 * wall below: along the wall's line, from one grid line across to the next.
 * Cells; `floor` is the storey whose top the beam sits at (one below the
 * wall it carries). */
export interface SecondarySpan { floor: number; vertical: boolean; at: number; from: number; to: number }

/** Interior wall cells: vx[x*S+y] a vertical wall at x over cell row y, hy a
 * horizontal wall at y over cell column x. */
function walls(rs: Rect[], W: number, D: number) {
    const S = D + 1, vx = new Uint8Array((W + 1) * S), hy = new Uint8Array((W + 1) * S);
    for (const r of rs) {
        for (let y = r.y; y < r.y + r.h; y++) { vx[r.x * S + y] = 1; vx[(r.x + r.w) * S + y] = 1; }
        for (let x = r.x; x < r.x + r.w; x++) { hy[x * S + r.y] = 1; hy[x * S + r.y + r.h] = 1; }
    }
    return { vx, hy };
}

/** Every set of lines 0..len with gaps in [MIN_BAY, MAX_BAY] (or a corridor bay where one runs). */
const splitCache = new Map<string, number[][]>();
function allLines(len: number, corr: Set<number> = NONE, max = MAX_BAY): number[][] {
    const key = `${len}|${[...corr].join(",")}|${max}`, hit = splitCache.get(key); if (hit) return hit;
    const out: number[][] = [];
    const walk = (p: number, acc: number[]) => {
        if (p === len) { out.push([...acc]); return; }
        for (const b of steps(p, corr, max)) if (p + b <= len) { acc.push(p + b); walk(p + b, acc); acc.pop(); }
    };
    walk(0, [0]);
    if (!out.length) out.push([0, len]); // narrower than one bay
    splitCache.set(key, out); return out;
}

/** How many line sets allLines(len, corr) has. */
const countCache = new Map<string, number>();
function countLines(len: number, corr: Set<number> = NONE, max = MAX_BAY): number {
    const key = `${len}|${[...corr].join(",")}|${max}`, hit = countCache.get(key); if (hit !== undefined) return hit;
    if (len < MIN_BAY && !corr.size) return 1;
    const n = new Float64Array(len + 1); n[0] = 1;
    for (let p = 0; p < len; p++) if (n[p]) for (const b of steps(p, corr, max)) if (p + b <= len) n[p + b] += n[p];
    const v = Math.max(1, n[len]);
    countCache.set(key, v); return v;
}

/** The cheapest lines 0..len with gaps in [MIN_BAY, MAX_BAY] (or a corridor
 * bay where one runs); cost(p) is a line's own cost, so the sum is
 * minimised exactly by dynamic programming. */
function cheapestLines(len: number, cost: (p: number) => number, corr: Set<number> = NONE, max = MAX_BAY): { lines: number[]; score: number } {
    if (len < MIN_BAY && !corr.size) return { lines: [0, len], score: cost(0) + cost(len) };
    // reach[q]: the cheapest total of lines before q; ties go to the nearest
    // predecessor (as the backward search did), hence <=
    const best = new Float64Array(len + 1).fill(Infinity), reach = new Float64Array(len + 1).fill(Infinity), prev = new Int32Array(len + 1).fill(-1);
    best[0] = cost(0);
    for (let p = 0; p <= len; p++) {
        if (p > 0 && prev[p] >= 0) best[p] = reach[p] + cost(p);
        if (best[p] === Infinity || p === len) continue;
        for (const b of steps(p, corr, max)) { const q = p + b; if (q <= len && best[p] <= reach[q]) { reach[q] = best[p]; prev[q] = p; } }
    }
    const lines = [len];
    for (let p = len; p > 0; p = prev[p]) lines.push(prev[p]);
    return { lines: lines.reverse(), score: best[len] };
}

// Exact search while the shorter side has at most this many line sets
// (a 25 m side); beyond it, alternate the two sides to a fixed point.
const EXACT_LIMIT = 20000;

/** The best-fitting grid for a building W × D cells; floors[0] is the ground. */
export function fitGrid(floors: Rect[][], W: number, D: number, corridors: { x: number[]; y: number[] } = { x: [], y: [] }, maxBay: { x: number; y: number } = { x: MAX_BAY, y: MAX_BAY }): GridFit {
    const cx = new Set(corridors.x), cy = new Set(corridors.y);
    const S = D + 1, F = floors.map(f => walls(f, W, D));
    // unsupported interior upper wall cells on each line, and all wall per line
    const gx = new Array(W + 1).fill(0), gy = new Array(D + 1).fill(0);
    const wx = new Array(W + 1).fill(0), wy = new Array(D + 1).fill(0);
    let tot = 0, base = 0, all = 0;
    for (let f = 0; f < F.length; f++) {
        const U = F[f], B = f > 0 ? F[f - 1] : null;
        for (let x = 1; x < W; x++) for (let y = 0; y < D; y++) if (U.vx[x * S + y]) {
            wx[x]++; all++;
            if (B) { tot++; if (B.vx[x * S + y]) base++; else gx[x]++; }
        }
        for (let y = 1; y < D; y++) for (let x = 0; x < W; x++) if (U.hy[x * S + y]) {
            wy[y]++; all++;
            if (B) { tot++; if (B.hy[x * S + y]) base++; else gy[y]++; }
        }
    }
    const onWall = (P: { vx: Uint8Array; hy: Uint8Array }, x: number, y: number) =>
        (y > 0 && P.vx[x * S + y - 1]) || (y < D && P.vx[x * S + y]) || (x > 0 && P.hy[(x - 1) * S + y]) || (x < W && P.hy[x * S + y]);
    const colCost = new Uint8Array((W + 1) * S);
    for (let x = 1; x < W; x++) for (let y = 1; y < D; y++) for (const P of F) if (!onWall(P, x, y)) colCost[x * S + y]++;

    // The three aims in order, as one score to minimise (exact integers).
    const K2 = all + 1, K1 = K2 * (tot + 1);
    const xTerm = (x: number) => -gx[x] * K2 - wx[x], yTerm = (y: number) => -gy[y] * K2 - wy[y];
    const inner = (ls: number[]) => ls.slice(1, -1);
    const givenX = (xs: number[]) => { const ix = inner(xs); return cheapestLines(D, y => yTerm(y) + (y > 0 && y < D ? K1 * ix.reduce((s, x) => s + colCost[x * S + y], 0) : 0), cy, maxBay.y); };
    const givenY = (ys: number[]) => { const iy = inner(ys); return cheapestLines(W, x => xTerm(x) + (x > 0 && x < W ? K1 * iy.reduce((s, y) => s + colCost[x * S + y], 0) : 0), cx, maxBay.x); };
    const sum = (ls: number[], t: (p: number) => number) => ls.reduce((s, p) => s + t(p), 0);

    let xs: number[], ys: number[];
    if (Math.min(countLines(W, cx, maxBay.x), countLines(D, cy, maxBay.y)) <= EXACT_LIMIT) {
        // enumerate the side with fewer line sets, the other side exactly by DP
        let best = Infinity; xs = [0, W]; ys = [0, D];
        if (countLines(W, cx, maxBay.x) <= countLines(D, cy, maxBay.y)) {
            for (const lx of allLines(W, cx, maxBay.x)) { const r = givenX(lx), v = sum(lx, xTerm) + r.score; if (v < best) { best = v; xs = lx; ys = r.lines; } }
        } else {
            for (const ly of allLines(D, cy, maxBay.y)) { const r = givenY(ly), v = sum(ly, yTerm) + r.score; if (v < best) { best = v; xs = r.lines; ys = ly; } }
        }
    } else {
        ys = cheapestLines(D, yTerm, cy, maxBay.y).lines; xs = givenY(ys).lines;
        for (let best = Infinity, i = 0; i < 20; i++) {
            const ny = givenX(xs), v = sum(xs, xTerm) + ny.score;
            if (v >= best) break;
            best = v; ys = ny.lines; xs = givenY(ys).lines;
        }
    }
    let columnsInRooms = 0;
    for (const x of inner(xs)) for (const y of inner(ys)) columnsInRooms += colCost[x * S + y];
    const ok = base + xs.reduce((s, x) => s + gx[x], 0) + ys.reduce((s, y) => s + gy[y], 0);
    return { xs, ys, columnsInRooms, onStructure: tot ? ok / tot : 1, offM: (tot - ok) * CELL };
}

/** One secondary beam for each grid bay that an unsupported upper wall
 * crosses (any length of it), on every floor above the ground. */
export function secondarySpans(floors: Rect[][], W: number, D: number, xs: number[], ys: number[]): SecondarySpan[] {
    const S = D + 1, F = floors.map(f => walls(f, W, D)), out: SecondarySpan[] = [];
    const onX = new Set(xs), onY = new Set(ys);
    for (let f = 1; f < F.length; f++) {
        const U = F[f], B = F[f - 1];
        for (let x = 1; x < W; x++) if (!onX.has(x)) for (let j = 0; j + 1 < ys.length; j++) {
            let need = false;
            for (let y = ys[j]; y < ys[j + 1] && !need; y++) need = !!U.vx[x * S + y] && !B.vx[x * S + y];
            if (need) out.push({ floor: f - 1, vertical: true, at: x, from: ys[j], to: ys[j + 1] });
        }
        for (let y = 1; y < D; y++) if (!onY.has(y)) for (let i = 0; i + 1 < xs.length; i++) {
            let need = false;
            for (let x = xs[i]; x < xs[i + 1] && !need; x++) need = !!U.hy[x * S + y] && !B.hy[x * S + y];
            if (need) out.push({ floor: f - 1, vertical: false, at: y, from: xs[i], to: xs[i + 1] });
        }
    }
    return out;
}

export interface StructuralGrid extends Omit<GridFit, "xs" | "ys"> {
    /** Grid lines in metres from the building's origin. */
    xs: number[]; ys: number[];
    floors: number;
    /** Secondary beams in metres (start and end on the grid beams). */
    secondary: Array<{ floor: number; x1: number; y1: number; x2: number; y2: number }>;
}

/** Corridor bays: strips one corridor bay wide where every floor has a hall
 * (or stair) rect exactly that wide on the strip; cells, from the origin. At
 * the building's two ends only a stair's strip counts (a hotel's fire stairs
 * close its corridor: the 3 m bay kept a line off the stair's wall, and the
 * rooms beside it spanned 6 m, 2026-10-30). */
export function corridorStrips(layout: SolvedLayout, W: number, D: number): { x: number[]; y: number[] } {
    const circ = (id: string) => id.startsWith("corridor") || id.startsWith("stairwell");
    const top = Math.max(0, ...layout.placed_rooms.map(r => r.floor ?? 0));
    const on = (axis: "x" | "y") => {
        const strip = (f: number, is: (id: string) => boolean) => new Set(layout.placed_rooms.filter(r => (r.floor ?? 0) === f && is(r.room_id))
            .filter(r => Math.round((axis === "x" ? r.width : r.depth) / CELL) === CORRIDOR)
            .map(r => Math.round((axis === "x" ? r.x : r.y) / CELL)));
        let keep: Set<number> | null = null, stairs: Set<number> | null = null;
        for (let f = 0; f <= top; f++) {
            const here = strip(f, circ), st = strip(f, id => id.startsWith("stairwell"));
            keep = keep ? new Set([...keep].filter(p => here.has(p))) : here;
            stairs = stairs ? new Set([...stairs].filter(p => st.has(p))) : st;
        }
        const len = axis === "x" ? W : D;
        return [...(keep ?? [])].filter(p => (p > 0 && p + CORRIDOR < len) || (stairs!.has(p) && p >= 0 && p + CORRIDOR <= len)).sort((a, b) => a - b);
    };
    return { x: on("x"), y: on("y") };
}

/** Each floor's rooms in cells, clipped to the footprint. */
export function floorCells(layout: SolvedLayout): { floors: Rect[][]; W: number; D: number } {
    const W = Math.round((layout.building_width ?? 0) / CELL), D = Math.round((layout.building_depth ?? 0) / CELL);
    const top = Math.max(0, ...layout.placed_rooms.map(r => r.floor ?? 0));
    const floors: Rect[][] = [];
    for (let f = 0; f <= top; f++) floors.push(layout.placed_rooms.filter(r => (r.floor ?? 0) === f).map(r => ({
        x: Math.round(r.x / CELL), y: Math.round(r.y / CELL), w: Math.round(r.width / CELL), h: Math.round(r.depth / CELL),
    })).filter(r => r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= D));
    return { floors, W, D };
}

const gridCache = new WeakMap<SolvedLayout, StructuralGrid | null>();

/** The building's grid; null when the layout has no footprint or rooms. */
export function structuralGridOf(layout: SolvedLayout): StructuralGrid | null {
    if (gridCache.has(layout)) return gridCache.get(layout)!;
    const { floors, W, D } = floorCells(layout);
    let g: StructuralGrid | null = null;
    if (W && D && floors.some(f => f.length)) {
        const corr = corridorStrips(layout, W, D);
        let fit = fitGrid(floors, W, D, corr);
        // smaller bays where the plan asks (a hotel's 4.5 m across its rooms), unless they stand
        // more columns inside rooms than the 6 m grid: a column in a guest room is worse than a
        // 6 m span the engineer verifies (owner, 2026-10-30)
        if (layout.grid_bay_max_m) {
            const cap = (m?: number) => m ? Math.max(MIN_BAY, Math.min(MAX_BAY, Math.round(m / CELL))) : MAX_BAY;
            const small = fitGrid(floors, W, D, corr, { x: cap(layout.grid_bay_max_m.x), y: cap(layout.grid_bay_max_m.y) });
            if (small.columnsInRooms <= fit.columnsInRooms) fit = small;
        }
        const secondary = secondarySpans(floors, W, D, fit.xs, fit.ys).map(b => b.vertical
            ? { floor: b.floor, x1: b.at * CELL, y1: b.from * CELL, x2: b.at * CELL, y2: b.to * CELL }
            : { floor: b.floor, x1: b.from * CELL, y1: b.at * CELL, x2: b.to * CELL, y2: b.at * CELL });
        g = { ...fit, xs: fit.xs.map(v => v * CELL), ys: fit.ys.map(v => v * CELL), floors: floors.length, secondary };
    }
    gridCache.set(layout, g);
    return g;
}
