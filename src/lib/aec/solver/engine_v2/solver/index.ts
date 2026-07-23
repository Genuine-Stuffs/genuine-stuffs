/**
 * Genuine Stuffs AI Studio · Solver V2 · Constraint Solver Public Entry
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 * solvePlacement() is the SOLE export other layers may import.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { RoomGraph, HiveRoom, identifyHubs, deriveSuites, findMustTouchPairs, suiteEdgeKeys } from '../graph';
import { BuildingFootprint } from '../shapes';
import { SolverConfig, SolveResult, deriveDimensionHints, PlacedRect, ReservedRect } from './types';
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
    reservedRects: ReservedRect[] = []
): SolveResult {
    const { combinedW_m, combinedH_m } = buildFootprintGrid(footprint, reservedRects);
    const units = orderUnits(buildUnits(graph, floorIndex), graph, floorIndex);
    const hints = new Map(deriveDimensionHints(rawRooms.filter(r => r.floor === floorIndex)).map(h => [h.roomId, h]));

    // Bug 2 fix: derive and ENFORCE must-touch pairs — this was defined
    // in graph.ts since Phase 1 and imported into solver/types.ts in
    // Session 3a, but never actually called until now. Without this,
    // the solver placed rooms by fit alone and I3/I4's "enforced by:
    // solver, by construction" claim in the invariant table was false.
    const hubIds = new Set(identifyHubs(graph, floorIndex).map(h => h.id));
    const suites = deriveSuites(graph, floorIndex);
    const mustTouchPairs = findMustTouchPairs(graph, floorIndex, hubIds, suiteEdgeKeys(suites));

    const result = runWithRelaxation(
        units, graph, () => buildFootprintGrid(footprint, reservedRects).grid,
        combinedW_m, combinedH_m, config, hints, mustTouchPairs, floorIndex
    );

    if (result.status === 'SOLVED' || result.status === 'SOLVED_RELAXED') {
        const placedRooms: PlacedRoom[] = result.placements.map((p: PlacedRect) => ({
            room_id: p.id, floor: floorIndex, x: p.x_m, y: p.y_m, width: p.w_m, depth: p.h_m,
        }));
        // Reserved rects (corridor/stairwell) are FIXED geometry, not
        // solver-placed rooms — excluded from `placements` (I6), but must
        // be visible to validatePlacement() as connectors, or any room
        // whose only real link is to circulation gets falsely flagged
        // unreachable. This was the exact gap this test run exposed.
        const reservedAsRooms: PlacedRoom[] = reservedRects.map(r => ({
            room_id: r.id, floor: floorIndex, x: r.x_m, y: r.y_m, width: r.w_m, depth: r.h_m,
        }));
        const reservedTypeMap = new Map(reservedRects.map(r => [r.id, r.type]));
        const labelOf = (id: string) => graph.nodes.get(id)?.label ?? id;
        const typeOf = (id: string) => graph.nodes.get(id)?.type ?? reservedTypeMap.get(id) ?? 'unknown';
        const issues = validatePlacement([...placedRooms, ...reservedAsRooms], typeOf, labelOf, combinedW_m, combinedH_m, floorIndex);

        if (result.status === 'SOLVED' && issues.length > 0) {
            console.warn(`[SOLVER_V3] SOLVED result has ${issues.length} validator issue(s) — solver constraint bug:`, issues);
        }
        return { ...result, issues };
    }
    return result;
}
