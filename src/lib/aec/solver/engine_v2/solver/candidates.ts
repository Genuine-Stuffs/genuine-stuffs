/**
 * Genuine Stuffs AI Studio · Solver V2 · Candidate Rectangle Enumeration
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 *
 * HARD/SOFT dimension handling is the Session 3a Option C decision: rooms
 * flagged uses_intermediate_columns get exactly one (w,h) pair — the
 * Hive's declared width_m x span_m, no rotation, no aspect search — since
 * their structural_notes describe a column position computed against
 * that exact span. Everything else gets v1.0's area-tolerance search,
 * with the declared shape (if any) seeded first.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { GRID_RESOLUTION_M, metersToCells, metersToCellsFloor } from './units';
import { RectCells } from './grid';
import { RoomDimensionHint } from './types';

export interface RoomSpec {
    id: string;
    targetArea_m2: number;
    minWidth_m: number;
    dimensionHint?: RoomDimensionHint;
}

const MAX_ASPECT = 3.0;
const MAX_DIMENSION_PAIRS = 12;

function enumerateDimensionPairs(
    room: RoomSpec, areaTolerance: number
): Array<{ w_cells: number; h_cells: number }> {
    const hint = room.dimensionHint;

    if (hint?.mode === 'HARD') {
        return [{ w_cells: metersToCells(hint.width_m), h_cells: metersToCells(hint.span_m) }];
    }

    const minW_cells = metersToCellsFloor(room.minWidth_m);
    const targetArea_cells = room.targetArea_m2 / (GRID_RESOLUTION_M * GRID_RESOLUTION_M);
    const loArea = targetArea_cells * (1 - areaTolerance);
    const hiArea = targetArea_cells * (1 + areaTolerance);

    const pairs: Array<{ w_cells: number; h_cells: number; delta: number }> = [];

    if (hint) {
        pairs.push({ w_cells: metersToCells(hint.width_m), h_cells: metersToCells(hint.span_m), delta: 0 });
    }

    for (let w = minW_cells; w <= Math.sqrt(hiArea * MAX_ASPECT) + 1; w++) {
        const hMin = Math.max(minW_cells, Math.ceil(loArea / w));
        const hMax = Math.floor(hiArea / w);
        for (let h = hMin; h <= hMax; h++) {
            const aspect = Math.max(w, h) / Math.min(w, h);
            if (aspect > MAX_ASPECT) continue;
            pairs.push({ w_cells: w, h_cells: h, delta: Math.abs(w * h - targetArea_cells) });
        }
    }

    pairs.sort((a, b) => a.delta - b.delta);
    const seen = new Set<string>();
    return pairs
        .filter(p => { const k = `${p.w_cells}x${p.h_cells}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, MAX_DIMENSION_PAIRS)
        .map(({ w_cells, h_cells }) => ({ w_cells, h_cells }));
}

export function* enumerateCandidates(
    room: RoomSpec,
    gridW_cells: number,
    gridH_cells: number,
    areaTolerance: number
): Generator<RectCells> {
    for (const { w_cells, h_cells } of enumerateDimensionPairs(room, areaTolerance)) {
        if (w_cells > gridW_cells || h_cells > gridH_cells) continue;
        for (let y = 0; y <= gridH_cells - h_cells; y++) {
            for (let x = 0; x <= gridW_cells - w_cells; x++) {
                yield { x_cells: x, y_cells: y, w_cells, h_cells };
            }
        }
    }
}
