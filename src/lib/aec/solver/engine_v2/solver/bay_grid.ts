/**
 * Genuine Stuffs AI Studio · Solver V2 · Structural Bay Grid
 * ═══════════════════════════════════════════════════════════════════════
 * Grid-first layout (design: docs/design-references/pdfs/
 * 2026-10-06-structural-grid-design.md, approved by the owner 2026-10-06).
 *
 * The column lines are chosen BEFORE any room is placed: each side of the
 * footprint is split into bays of 3.0–4.5 m (4.5 m = the NBC typical
 * residential span, compliance_rules.json), as equal as the 0.5 m grid
 * allows. Rooms then take whole bays (search.ts), the way the target CAD
 * drawing is laid out on its A–C / 1–5 grid.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { metersToCells } from './units';

export const MIN_BAY_M = 3.0;
export const MAX_BAY_M = 4.5;

/** Grid lines in cells, from 0 to the far wall inclusive. */
export interface BayGrid { xs: number[]; ys: number[] }

/** Splits `cells` into the fewest bays no wider than MAX_BAY_M, as equal
 * as the grid allows. Which bays get the extra half-metre rotates with
 * `seed`, so different seeds try different line positions. */
export function bayLines(cells: number, seed: number): number[] {
    const max = metersToCells(MAX_BAY_M);
    const n = Math.max(1, Math.ceil(cells / max));
    const base = Math.floor(cells / n);
    const extra = cells - base * n;
    const start = Math.abs(seed) % n;
    const lines = [0];
    for (let i = 0; i < n; i++) {
        const wide = ((i - start + n) % n) < extra;
        lines.push(lines[i] + base + (wide ? 1 : 0));
    }
    return lines;
}

export function chooseBayGrid(widthCells: number, heightCells: number, seed: number): BayGrid {
    return { xs: bayLines(widthCells, seed), ys: bayLines(heightCells, seed >>> 1) };
}
