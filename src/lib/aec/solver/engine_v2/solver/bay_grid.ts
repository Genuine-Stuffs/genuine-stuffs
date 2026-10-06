/**
 * Genuine Stuffs AI Studio · Solver V2 · Structural Bay Grid
 * ═══════════════════════════════════════════════════════════════════════
 * Grid-first layout (design: docs/design-references/pdfs/
 * 2026-10-06-structural-grid-design.md, approved by the owner 2026-10-06).
 *
 * The column lines are chosen BEFORE any room is placed: each side of the
 * footprint is split into bays of 3.0–4.5 m (4.5 m = the NBC typical
 * residential span, compliance_rules.json). Rooms then take whole bays
 * (search.ts), the way the target CAD drawing is laid out on its A–C /
 * 1–5 grid.
 *
 * The split is chosen FROM THE PROGRAM: rooms the Hive pinned to a
 * structural width (uses_intermediate_columns: the garage, a two-bay
 * lounge) need a run of bays that matches it. Step 1 split the footprint
 * into equal bays and the 9 m garage had no placement on most grids
 * (design doc §7).
 * ═══════════════════════════════════════════════════════════════════════
 */

import { metersToCells } from './units';

export const MIN_BAY_M = 3.0;
export const MAX_BAY_M = 4.5;

/** Grid lines in cells, from 0 to the far wall inclusive. */
export interface BayGrid { xs: number[]; ys: number[] }

/** A room pinned to structural dimensions, in cells. `w` runs across the
 * plan (x, unrotated — candidates.ts's HARD rule), `d` front to back.
 * `front`: the room must reach the front edge (garage, entrance). */
export interface PinnedRoom { w: number; d: number; front: boolean }

/** How far a run of bays may miss a pinned size: search.ts accepts a HARD
 * room within 1 m of its declared width. */
const PIN_TOLERANCE_M = 1.0;
const MAX_SPLITS = 20000;

/** Every way to write `cells` as bays of MIN_BAY_M..MAX_BAY_M, in order. */
function splits(cells: number): number[][] {
    const lo = metersToCells(MIN_BAY_M), hi = metersToCells(MAX_BAY_M);
    const out: number[][] = [];
    const walk = (left: number, acc: number[]) => {
        if (out.length >= MAX_SPLITS) return;
        if (left === 0) { out.push([...acc]); return; }
        for (let b = lo; b <= Math.min(hi, left); b++) { acc.push(b); walk(left - b, acc); acc.pop(); }
    };
    walk(cells, []);
    return out;
}

/** True if some run of consecutive bays is within tolerance of `size`
 * (and, with `atEnd`, the run ends at the far line — the front edge). */
function hasRun(bays: number[], size: number, atEnd: boolean): boolean {
    const tol = metersToCells(PIN_TOLERANCE_M);
    for (let i = 0; i < bays.length; i++) {
        let sum = 0;
        for (let j = i; j < bays.length; j++) {
            sum += bays[j];
            if (sum > size + tol) break;
            if (Math.abs(sum - size) <= tol && (!atEnd || j === bays.length - 1)) return true;
        }
    }
    return false;
}

/** Best split of one side: the most pinned rooms that fit, then the most
 * even bays; among equals, `seed` picks, so seeds try different grids. */
function bestSplit(cells: number, sizes: Array<{ size: number; atEnd: boolean }>, seed: number): number[] {
    const all = splits(cells);
    if (all.length === 0) return [cells]; // narrower than one bay: one span
    const score = (bays: number[]) => {
        const fits = sizes.filter(s => hasRun(bays, s.size, s.atEnd)).length;
        const spread = Math.max(...bays) - Math.min(...bays);
        return fits * 1000 - spread * 10 - bays.length; // fewer, even bays next
    };
    let top = -Infinity;
    const scored = all.map(b => { const s = score(b); top = Math.max(top, s); return { b, s }; });
    const best = scored.filter(x => x.s === top);
    return best[Math.abs(seed) % best.length].b;
}

const toLines = (bays: number[]) => bays.reduce((lines, b) => [...lines, lines[lines.length - 1] + b], [0]);

export function chooseBayGrid(widthCells: number, heightCells: number, seed: number, pinned: PinnedRoom[] = []): BayGrid {
    return {
        xs: toLines(bestSplit(widthCells, pinned.map(p => ({ size: p.w, atEnd: false })), seed)),
        ys: toLines(bestSplit(heightCells, pinned.map(p => ({ size: p.d, atEnd: p.front })), seed >>> 1)),
    };
}
