/**
 * Genuine Stuffs AI Studio · Solver V2 · Constraint Solver Public Entry
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 * solvePlacement() is the SOLE export other layers may import.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { RoomGraph, HiveRoom } from '../graph';
import { BuildingFootprint } from '../shapes';
import { SolverConfig, SolveResult, deriveDimensionHints, PlacedRect } from './types';
import { buildFootprintGrid, buildUnits, orderUnits } from './search';
import { runWithRelaxation } from './relax';
import { validatePlacement } from '../placement_validator';
import { PlacedRoom } from '../../../../../../supabase/functions/ai-studio/schema';

export function solvePlacement(
    graph: RoomGraph,
    footprint: BuildingFootprint,
    floorIndex: number,
    rawRooms: HiveRoom[],
    config: SolverConfig,
    reservedRects_m: Array<{ x_m: number; y_m: number; w_m: number; h_m: number }> = []
): SolveResult {
    const { combinedW_m, combinedH_m } = buildFootprintGrid(footprint, reservedRects_m);
    const units = orderUnits(buildUnits(graph, floorIndex), graph, floorIndex);
    const hints = new Map(deriveDimensionHints(rawRooms.filter(r => r.floor === floorIndex)).map(h => [h.roomId, h]));

    const result = runWithRelaxation(
        units, graph, () => buildFootprintGrid(footprint, reservedRects_m).grid,
        combinedW_m, combinedH_m, config, hints
    );

    if (result.status === 'SOLVED' || result.status === 'SOLVED_RELAXED') {
        const placedRooms: PlacedRoom[] = result.placements.map((p: PlacedRect) => ({
            room_id: p.id, floor: floorIndex, x: p.x_m, y: p.y_m, width: p.w_m, depth: p.h_m,
        }));
        const labelOf = (id: string) => graph.nodes.get(id)?.label ?? id;
        const typeOf = (id: string) => graph.nodes.get(id)?.type ?? 'unknown';
        const issues = validatePlacement(placedRooms, typeOf, labelOf, combinedW_m, combinedH_m, floorIndex);

        if (result.status === 'SOLVED' && issues.length > 0) {
            console.warn(`[SOLVER_V3] SOLVED result has ${issues.length} validator issue(s) — solver constraint bug:`, issues);
        }
        return { ...result, issues };
    }
    return result;
}
