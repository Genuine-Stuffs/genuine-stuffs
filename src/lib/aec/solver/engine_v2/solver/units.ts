/**
 * Genuine Stuffs AI Studio · Solver V2 · Units
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3a · July 2026
 *
 * The ONLY conversion site between meters (domain layer) and cells
 * (solver layer) — D3, D5 discipline carried forward from v1.0's units.ts.
 * Every length-carrying variable elsewhere ends in _m or _cells.
 * ═══════════════════════════════════════════════════════════════════════
 */

export const GRID_RESOLUTION_M = 0.5;

export function metersToCells(m: number): number {
    return Math.round(m / GRID_RESOLUTION_M);
}

/** Floor variant — used for minimum-width constraints, where rounding UP
 * would silently violate a hard minimum (e.g. a 1.19m corridor rounding to
 * 1.2m would pass a 1.2m minimum check it shouldn't). */
export function metersToCellsFloor(m: number): number {
    return Math.max(1, Math.floor(m / GRID_RESOLUTION_M));
}

export function cellsToMeters(cells: number): number {
    return cells * GRID_RESOLUTION_M;
}
