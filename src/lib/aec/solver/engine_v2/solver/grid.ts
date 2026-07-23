/**
 * Genuine Stuffs AI Studio · Solver V2 · Occupancy Grid
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3a · July 2026
 *
 * Same design as v1.0 Part D Phase 3: a flat typed array, 0 = empty,
 * else roomIndex + 1. All methods O(rect area) or better; no allocations
 * inside hot loops.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { metersToCells } from './units';

export interface RectCells {
    x_cells: number; y_cells: number; w_cells: number; h_cells: number;
}

export class OccupancyGrid {
    private cells: Uint16Array;
    readonly widthCells: number;
    readonly heightCells: number;

    constructor(width_m: number, height_m: number) {
        this.widthCells  = Math.max(1, metersToCells(width_m));
        this.heightCells = Math.max(1, metersToCells(height_m));
        this.cells = new Uint16Array(this.widthCells * this.heightCells);
    }

    private idx(x: number, y: number): number {
        return y * this.widthCells + x;
    }

    private inBounds(r: RectCells): boolean {
        return r.x_cells >= 0 && r.y_cells >= 0 &&
            r.x_cells + r.w_cells <= this.widthCells &&
            r.y_cells + r.h_cells <= this.heightCells;
    }

    /** True if every cell in `r` is empty (or occupied only by `ignoreRoomIdx`,
     * used when re-checking a room's own currently-placed cells). */
    canPlace(r: RectCells, ignoreRoomIdx?: number): boolean {
        if (!this.inBounds(r)) return false;
        for (let y = r.y_cells; y < r.y_cells + r.h_cells; y++) {
            for (let x = r.x_cells; x < r.x_cells + r.w_cells; x++) {
                const v = this.cells[this.idx(x, y)];
                if (v !== 0 && v !== (ignoreRoomIdx ?? -1) + 1) return false;
            }
        }
        return true;
    }

    place(r: RectCells, roomIdx: number): void {
        for (let y = r.y_cells; y < r.y_cells + r.h_cells; y++) {
            for (let x = r.x_cells; x < r.x_cells + r.w_cells; x++) {
                this.cells[this.idx(x, y)] = roomIdx + 1;
            }
        }
    }

    remove(r: RectCells): void {
        for (let y = r.y_cells; y < r.y_cells + r.h_cells; y++) {
            for (let x = r.x_cells; x < r.x_cells + r.w_cells; x++) {
                this.cells[this.idx(x, y)] = 0;
            }
        }
    }

    /** Number of grid cells' worth of shared edge between two rects — the
     * cell-space equivalent of placement_validator.ts's sharesWall(), but
     * returning a count (for D5's "≥2 contiguous cells = 1.0m" rule)
     * rather than a boolean. constraints.ts wraps this for the boolean form. */
    sharedEdgeCells(a: RectCells, b: RectCells): number {
        const aR = a.x_cells + a.w_cells, aB = a.y_cells + a.h_cells;
        const bR = b.x_cells + b.w_cells, bB = b.y_cells + b.h_cells;

        if (a.y_cells === bB || b.y_cells === aB) {
            return Math.max(0, Math.min(aR, bR) - Math.max(a.x_cells, b.x_cells));
        }
        if (a.x_cells === bR || b.x_cells === aR) {
            return Math.max(0, Math.min(aB, bB) - Math.max(a.y_cells, b.y_cells));
        }
        return 0;
    }

    /** True if `r` touches any of the four grid boundaries (0 tolerance —
     * cell-space, not the 0.5m tolerance touchesExternal() uses in meters). */
    touchesPerimeter(r: RectCells): boolean {
        return r.x_cells === 0 || r.y_cells === 0 ||
            (r.x_cells + r.w_cells) === this.widthCells ||
            (r.y_cells + r.h_cells) === this.heightCells;
    }

    /** Count of unoccupied cells. O(n) — called once per search() entry,
     * then tracked incrementally by the search itself; never in a loop. */
    countFreeCells(): number {
        let free = 0;
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] === 0) free++;
        }
        return free;
    }
}
