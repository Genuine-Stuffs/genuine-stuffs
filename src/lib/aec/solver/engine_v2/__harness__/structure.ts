// Harness (report only): structural check I10 for a two-floor plan, read
// from the target drawing (A–B–C / 1–5 grid shared by both floors):
//   - one grid per footprint, bays 3.0–6.0 m (owner, 2026-10-07: 6 m as in
//     the target drawing), the same lines on both floors;
//   - an upper wall is on structure when it stands on a grid beam line or on
//     a wall below; anything else must be a lightweight partition on the slab;
//   - a column stands at every grid intersection, so an intersection inside
//     a room (on no wall) is a column in the middle of that room.
// The grid is the one that best fits the plan (every 3–6 m split searched:
// fewest columns in rooms, then most wall on structure), so the numbers say
// how close the plan is to having a sound grid at all.
import type { SolvedLayout } from "../../../../../../supabase/functions/ai-studio/schema";

/** Cells of CELL m, y from the rear wall. */
export interface Rect { x: number; y: number; w: number; h: number }

const CELL = 0.5;
export const MIN_BAY = 6, MAX_BAY = 12; // cells: 3.0–6.0 m

function walls(rs: Rect[], W: number, D: number) {
    const S = D + 1, vx = new Uint8Array((W + 1) * S), hy = new Uint8Array((W + 1) * S);
    for (const r of rs) {
        for (let y = r.y; y < r.y + r.h; y++) { vx[r.x * S + y] = 1; vx[(r.x + r.w) * S + y] = 1; }
        for (let x = r.x; x < r.x + r.w; x++) { hy[x * S + r.y] = 1; hy[x * S + r.y + r.h] = 1; }
    }
    return { vx, hy };
}

/** Every set of lines 0..len with gaps in [MIN_BAY, MAX_BAY]. */
const splitCache = new Map<number, number[][]>();
function allLines(len: number): number[][] {
    const hit = splitCache.get(len); if (hit) return hit;
    const out: number[][] = [];
    const walk = (p: number, acc: number[]) => {
        if (p === len) { out.push([...acc]); return; }
        for (let b = MIN_BAY; b <= MAX_BAY && p + b <= len; b++) { acc.push(p + b); walk(p + b, acc); acc.pop(); }
    };
    walk(0, [0]);
    if (!out.length) out.push([0, len]); // narrower than one bay
    splitCache.set(len, out); return out;
}

export interface StructureReport { onStructure: number; offM: number; columnsInRooms: number; xs: number[]; ys: number[] }

export function structure(upper: Rect[], ground: Rect[], W: number, D: number): StructureReport {
    const S = D + 1, U = walls(upper, W, D), G = walls(ground, W, D);
    // unsupported interior upper wall cells on each line
    const gx = new Array(W + 1).fill(0), gy = new Array(D + 1).fill(0);
    let tot = 0, base = 0;
    for (let x = 1; x < W; x++) for (let y = 0; y < D; y++) if (U.vx[x * S + y]) { tot++; if (G.vx[x * S + y]) base++; else gx[x]++; }
    for (let y = 1; y < D; y++) for (let x = 0; x < W; x++) if (U.hy[x * S + y]) { tot++; if (G.hy[x * S + y]) base++; else gy[y]++; }
    const onWall = (F: { vx: Uint8Array; hy: Uint8Array }, x: number, y: number) =>
        (y > 0 && F.vx[x * S + y - 1]) || (y < D && F.vx[x * S + y]) || (x > 0 && F.hy[(x - 1) * S + y]) || (x < W && F.hy[x * S + y]);
    // interior intersection (x, y): columns standing in a room, ground + upper
    const colCost = (x: number, y: number) => (onWall(G, x, y) ? 0 : 1) + (onWall(U, x, y) ? 0 : 1);
    // The grid an architect would pick: fewest columns in rooms, then the most upper wall on structure.
    let best = { cols: Infinity, ok: -1, xs: [0, W], ys: [0, D] };
    for (const xs of allLines(W)) {
        const okX = xs.reduce((s, x) => s + gx[x], 0);
        for (const ys of allLines(D)) {
            let cols = 0;
            for (let i = 1; i < xs.length - 1 && cols <= best.cols; i++) for (let j = 1; j < ys.length - 1; j++) cols += colCost(xs[i], ys[j]);
            const ok = base + okX + ys.reduce((s, y) => s + gy[y], 0);
            if (cols < best.cols || (cols === best.cols && ok > best.ok)) best = { cols, ok, xs, ys };
        }
    }
    const { xs, ys, cols: columnsInRooms, ok } = best;
    return { onStructure: tot ? ok / tot : 1, offM: (tot - ok) * CELL, columnsInRooms, xs, ys };
}

/** I10 for a solved layout (metres): ground floor vs first floor, on the
 * building footprint. null for single-storey plans. */
export function structureOfLayout(layout: SolvedLayout): StructureReport | null {
    const W = Math.round((layout.building_width ?? 0) / CELL), D = Math.round((layout.building_depth ?? 0) / CELL);
    const cells = (floor: number) => layout.placed_rooms.filter(r => (r.floor ?? 0) === floor).map(r => ({
        x: Math.round(r.x / CELL), y: Math.round(r.y / CELL), w: Math.round(r.width / CELL), h: Math.round(r.depth / CELL),
    })).filter(r => r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= D);
    const ground = cells(0), upper = cells(1);
    if (!W || !D || !ground.length || !upper.length) return null;
    return structure(upper, ground, W, D);
}

export function formatStructure(s: StructureReport): string {
    return `${(100 * s.onStructure).toFixed(0)}% of upper walls on a beam or wall below, ${s.offM.toFixed(1)} m off structure, ` +
        `${s.columnsInRooms} column(s) inside rooms (grid x ${s.xs.map(v => v * CELL).join("/")} m, y ${s.ys.map(v => v * CELL).join("/")} m)`;
}
