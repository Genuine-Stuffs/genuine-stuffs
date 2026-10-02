/**
 * Genuine Stuffs AI Studio · Solver V2 · Constraint Solver Public Entry
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 * solvePlacement() is the SOLE export other layers may import.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { RoomGraph, HiveRoom, GraphNode, AdjacencyPair, identifyHubs, deriveSuites, findMustTouchPairs, suiteEdgeKeys } from '../graph';
import { BuildingFootprint } from '../shapes';
import { SolverConfig, SolveResult, deriveDimensionHints, PlacedRect, ReservedRect } from './types';
import { buildFootprintGrid, buildUnits, orderUnits, SearchUnit, ReachRules } from './search';
import { RectCells } from './grid';
import { GRID_RESOLUTION_M, metersToCells } from './units';
import { runWithRelaxation } from './relax';
import { checkFeasibility } from './feasibility';
import { validatePlacement, isConnectorType, isCorridorLike, isSubRoom } from '../placement_validator';
import { PlacedRoom } from '../../../../../../supabase/functions/ai-studio/schema';

const DEFAULT_CORRIDOR_W_M = 1.5;   // ported constant, zones.ts::allocateZones()
const MIN_CORRIDOR_LEN_M = 3.0;
const STAIR_W_M = 2.4, STAIR_D_M = 3.6;

export interface CirculationOptions {
    /** Place the stairwell on this floor (ground floor of a duplex). The
     * floor above receives it back as a fixed `stairwell_void` reservedRect. */
    placeStairwell?: boolean;
}

interface Circulation {
    units: SearchUnit[];
    pairs: AdjacencyPair[];
    reach: ReachRules;
    syntheticTypes: Map<string, string>;
}

const isStairNode = (n: GraphNode) =>
    n.type === 'stairwell' || n.type === 'void' || /stair|void/i.test(n.label);

/**
 * Circulation is placed BY THE SEARCH, not pre-reserved. index.ts used to
 * reserve a full-width corridor band at a fixed depth on every floor (and
 * a stairwell pinned to it), whatever the program declared. On the large
 * villas (hive-004/005) that band consumed the upper floor's entire top
 * wall — 25.5m² for a declared 7.5m² corridor — on a floor where all four
 * bedrooms and the lounge need a window, and split the ground floor into
 * two strips the 4.5m×9m structural living room could only fit one way.
 * No search strategy can recover from geometry fixed before it starts.
 *
 * Now one corridor strip per floor (the Hive's declared width, ≥1.5m; any
 * length from 3m to the full building) and, on a duplex ground floor, the
 * 2.4m×3.6m stairwell are ordinary search units. Hive circulation rooms
 * map onto them (output ids unchanged: corridor_floor{n}_0, stairwell,
 * stairwell_void), their declared adjacencies become ordinary droppable
 * pairs, and the validator's reachability rule becomes a hard constraint
 * (ReachRules) so the circulation goes where it actually connects rooms.
 */
function buildCirculation(
    graph: RoomGraph, floorIndex: number, suiteSubIds: Set<string>,
    grid: { widthCells: number; heightCells: number },
    reservedRects: ReservedRect[], options: CirculationOptions
): Circulation {
    const nodes = (graph.floors.get(floorIndex) ?? []).map(id => graph.nodes.get(id)!);
    const circNodes = nodes.filter(n => n.zone === 'circ');
    const corridorNodes = circNodes.filter(n => !isStairNode(n));
    const corridorId = `corridor_floor${floorIndex}_0`;
    const voidRect = reservedRects.find(r => r.type === 'stairwell');
    const stairId = options.placeStairwell ? 'stairwell' : voidRect?.id;
    const syntheticTypes = new Map<string, string>([[corridorId, 'circulation']]);
    const cellArea = GRID_RESOLUTION_M * GRID_RESOLUTION_M;

    // Corridor strip: thickness from the declared width, length from
    // 3m (or the declared area, if longer) to the building's long side.
    const t = Math.max(metersToCells(DEFAULT_CORRIDOR_W_M), ...corridorNodes.map(n => metersToCells(n.width)));
    const declaredArea = corridorNodes.reduce((s, n) => s + n.area, 0);
    const minLen = Math.max(metersToCells(MIN_CORRIDOR_LEN_M), Math.ceil(declaredArea / cellArea / t));
    const shapes: Array<{ w_cells: number; h_cells: number }> = [];
    for (let len = minLen; len <= Math.max(grid.widthCells, grid.heightCells); len += 2) {
        if (len <= grid.widthCells) shapes.push({ w_cells: len, h_cells: t });
        if (len <= grid.heightCells) shapes.push({ w_cells: t, h_cells: len });
    }
    const units: SearchUnit[] = [{ ids: [corridorId], totalArea_m2: minLen * t * cellArea, isSuite: false, shapes }];

    if (options.placeStairwell) {
        const w = Math.ceil(STAIR_W_M / GRID_RESOLUTION_M - 1e-6), h = Math.ceil(STAIR_D_M / GRID_RESOLUTION_M - 1e-6);
        units.push({ ids: ['stairwell'], totalArea_m2: w * h * cellArea, isSuite: false, shapes: [{ w_cells: w, h_cells: h }, { w_cells: h, h_cells: w }] });
        syntheticTypes.set('stairwell', 'stairwell');
    }

    const anchors = new Map<string, RectCells>();
    if (voidRect) {
        anchors.set(voidRect.id, {
            x_cells: Math.round(voidRect.x_m / GRID_RESOLUTION_M), y_cells: Math.round(voidRect.y_m / GRID_RESOLUTION_M),
            w_cells: Math.round(voidRect.w_m / GRID_RESOLUTION_M), h_cells: Math.round(voidRect.h_m / GRID_RESOLUTION_M),
        });
    }

    // Declared circulation adjacencies (e.g. corridor ↔ guest bedroom,
    // stairwell ↔ foyer), re-pointed at the solver's circulation ids.
    // Never hub edges: the relaxation ladder may drop them, because
    // reachability below is what actually keeps the plan connected.
    const alias = (n: GraphNode) => isStairNode(n) ? stairId : corridorId;
    const pairs: AdjacencyPair[] = [];
    const seen = new Set<string>();
    for (const n of circNodes) {
        const a = alias(n);
        if (!a) continue;
        for (const nb of n.neighbors) {
            const other = graph.nodes.get(nb);
            if (!other || other.floor !== floorIndex || other.zone === 'circ') continue;
            const key = `${a}|${nb}`;
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push({ a, b: nb, isHubEdge: false });
        }
    }

    // Reach targets. Rooms: any connector but themselves. The corridor
    // must open onto a real room (else it is an island with the stair);
    // the stair onto the corridor or a room.
    const connectorRooms = nodes.filter(n => n.zone !== 'circ' && isConnectorType(n.type)).map(n => n.id);
    const circIds = [corridorId, ...(stairId ? [stairId] : [])];
    const allConnectors = [...circIds, ...connectorRooms];
    const targets = new Map<string, Set<string>>();
    for (const n of nodes) {
        if (n.zone === 'circ' || suiteSubIds.has(n.id) || isCorridorLike(n.type) || isSubRoom(n.type)) continue;
        targets.set(n.id, new Set(allConnectors.filter(id => id !== n.id)));
    }
    const corridorTargets = connectorRooms.length > 0 ? connectorRooms : (stairId ? [stairId] : []);
    if (corridorTargets.length > 0) targets.set(corridorId, new Set(corridorTargets));
    if (stairId) targets.set(stairId, new Set(allConnectors.filter(id => id !== stairId)));

    return { units, pairs, reach: { targets, anchors }, syntheticTypes };
}

export function solvePlacement(
    graph: RoomGraph,
    footprint: BuildingFootprint,
    floorIndex: number,
    rawRooms: HiveRoom[],
    config: SolverConfig,
    reservedRects: ReservedRect[] = [],
    options: CirculationOptions = {}
): SolveResult {
    const { grid, combinedW_m, combinedH_m } = buildFootprintGrid(footprint, reservedRects);
    const suites = deriveSuites(graph, floorIndex);
    const suiteSubIds = new Set(suites.flatMap(s => s.subIds));
    const circulation = buildCirculation(graph, floorIndex, suiteSubIds, grid, reservedRects, options);
    const rawUnits = [...buildUnits(graph, floorIndex), ...circulation.units];

    // Feasibility gate (v1.0 Part D Phase 1, reopened): reject provably-
    // unsolvable programs in milliseconds instead of burning the full
    // search budget to discover the same thing.
    const feasibility = checkFeasibility(grid, rawUnits, graph, floorIndex, combinedW_m, combinedH_m);
    if (!feasibility.feasible) {
        const failed = feasibility.checks.filter(c => !c.passed);
        const summary = failed.map(c => `${c.code}: ${c.detail}`).join(' | ');
        console.warn(`[SOLVER_V3] feasibility gate rejected floor ${floorIndex}: ${summary}`);
        return {
            status: 'UNSAT',
            placements: [],
            relaxationsApplied: [],
            issues: [],
            diagnostics: { elapsed_ms: 0, nodesExplored: 0, failedConstraint: summary, proven: true, failedChecks: failed },
        };
    }

    // Bug 2 fix: derive and ENFORCE must-touch pairs — this was defined
    // in graph.ts since Phase 1 and imported into solver/types.ts in
    // Session 3a, but never actually called until now. Without this,
    // the solver placed rooms by fit alone and I3/I4's "enforced by:
    // solver, by construction" claim in the invariant table was false.
    const hubIds = new Set(identifyHubs(graph, floorIndex).map(h => h.id));
    const mustTouchPairs = [...findMustTouchPairs(graph, floorIndex, hubIds, suiteEdgeKeys(suites)), ...circulation.pairs];

    // orderUnits needs mustTouchPairs to schedule adjacency-chained units
    // right after whatever they must touch (see search.ts's orderUnits
    // doc comment) — computed above, so this must come after it now.
    const units = orderUnits(rawUnits, graph, floorIndex, mustTouchPairs);
    const hints = new Map(deriveDimensionHints(rawRooms.filter(r => r.floor === floorIndex)).map(h => [h.roomId, h]));

    const result = runWithRelaxation(
        units, graph, () => buildFootprintGrid(footprint, reservedRects).grid,
        combinedW_m, combinedH_m, config, hints, mustTouchPairs, floorIndex,
        reservedRects, circulation.reach
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
        const typeOf = (id: string) => graph.nodes.get(id)?.type ?? circulation.syntheticTypes.get(id) ?? reservedTypeMap.get(id) ?? 'unknown';
        const issues = validatePlacement([...placedRooms, ...reservedAsRooms], typeOf, labelOf, combinedW_m, combinedH_m, floorIndex, suiteSubIds);

        if (result.status === 'SOLVED' && issues.length > 0) {
            console.warn(`[SOLVER_V3] SOLVED result has ${issues.length} validator issue(s) — solver constraint bug:`, issues);
        }
        return { ...result, issues };
    }
    return result;
}
