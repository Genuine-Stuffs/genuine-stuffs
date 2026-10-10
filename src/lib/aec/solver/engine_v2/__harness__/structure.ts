// Harness (report only): structural check I10 for a two-floor plan, on the
// building's structural grid (solver/structural_grid.ts — the same grid the
// skeleton, the overlay and the drawing use):
//   - one grid per footprint, bays 3.0–6.0 m, the same lines on both floors;
//   - an upper wall is on structure when it stands on a grid beam line or on
//     a wall below; anything else must be a lightweight partition on the slab;
//   - a column stands at every grid intersection, so an intersection inside
//     a room (on no wall) is a column in the middle of that room.
// The grid is the one that best fits the plan, so the numbers say how close
// the plan is to having a sound grid at all.
import type { SolvedLayout } from "../../../../../../supabase/functions/ai-studio/schema";
import { fitGrid, floorCells, CELL, type GridFit, type Rect } from "../../structural_grid";

export type { Rect };
export type StructureReport = GridFit;

export function structure(upper: Rect[], ground: Rect[], W: number, D: number): StructureReport {
    return fitGrid([ground, upper], W, D);
}

/** I10 for a solved layout (metres): ground floor vs first floor, on the
 * building footprint. null for single-storey plans. */
export function structureOfLayout(layout: SolvedLayout): StructureReport | null {
    const { floors, W, D } = floorCells(layout);
    const ground = floors[0] ?? [], upper = floors[1] ?? [];
    if (!W || !D || !ground.length || !upper.length) return null;
    return structure(upper, ground, W, D);
}

export function formatStructure(s: StructureReport): string {
    return `${(100 * s.onStructure).toFixed(0)}% of upper walls on a beam or wall below, ${s.offM.toFixed(1)} m off structure, ` +
        `${s.columnsInRooms} column(s) inside rooms (grid x ${s.xs.map(v => v * CELL).join("/")} m, y ${s.ys.map(v => v * CELL).join("/")} m)`;
}
