/**
 * Genuine Stuffs AI Studio · Solver V2 · Constraint Solver Public Entry
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 * solvePlacement() is the SOLE export other layers may import.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { RoomGraph, HiveRoom, GraphNode, AdjacencyPair, identifyHubs, deriveSuites, findMustTouchPairs, suiteEdgeKeys, NO_WINDOW_TYPES, STREET_FRONT_TYPES, GARAGE_TYPES } from '../graph';
import { BuildingFootprint } from '../shapes';
import { SolverConfig, SolveResult, deriveDimensionHints, PlacedRect, ReservedRect } from './types';
import { buildFootprintGrid, buildUnits, orderUnits, SearchUnit, ReachRules } from './search';
import { RectCells } from './grid';
import { GRID_RESOLUTION_M, metersToCells } from './units';
import { runWithRelaxation, runFallback } from './relax';
import { checkFeasibility } from './feasibility';
import { validatePlacement, isConnectorType, isCorridorLike, isSubRoom, ValidationIssue } from '../placement_validator';
import { PlacedRoom } from '../../../../../../supabase/functions/ai-studio/schema';

const DEFAULT_CORRIDOR_W_M = 1.5;   // ported constant, zones.ts::allocateZones()
const MIN_CORRIDOR_LEN_M = 3.0;
const STAIR_W_M = 2.4, STAIR_D_M = 3.6;

export interface CirculationOptions {
    /** Place the stairwell on this floor (ground floor of a duplex). The
     * floor above receives it back as a fixed `stairwell_void` reservedRect. */
    placeStairwell?: boolean;
    /** Fallback mode (relax.ts::runFallback): must-touch pairs, windows and
     * reachability become preferences; whatever the plan gives up comes
     * back as placement issues. */
    fallback?: boolean;
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
    // In fallback mode only F-002 (a room wider than the building) still
    // rules a floor out: degree (F-004) and area (F-001, rooms may flex
    // ±25%) are exactly what the fallback is allowed to compromise on.
    const feasibility = checkFeasibility(grid, rawUnits, graph, floorIndex, combinedW_m, combinedH_m);
    const blocking = feasibility.checks.filter(c => !c.passed && (!options.fallback || c.code === 'F-002'));
    if (blocking.length > 0) {
        const failed = blocking;
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

    const buildGrid = () => buildFootprintGrid(footprint, reservedRects).grid;
    const result = options.fallback
        ? runFallback(units, graph, buildGrid, combinedW_m, combinedH_m, config, hints,
            { pairs: mustTouchPairs, reach: circulation.reach }, floorIndex, reservedRects)
        : runWithRelaxation(
            units, graph, buildGrid,
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
        if (options.fallback) {
            issues.push(...fallbackCompromises(result.placements, mustTouchPairs, units, labelOf, graph, combinedW_m, combinedH_m, issues));
        }
        return { ...result, issues };
    }
    return result;
}

/** Fallback plans flag what the strict search would have enforced and the
 * validator doesn't already report: declared pairs that don't share a
 * wall, and rooms whose area moved more than the normal ±10%. (Windows and
 * reachability are reported by validatePlacement as usual.) */
function fallbackCompromises(
    placements: PlacedRect[], pairs: AdjacencyPair[], units: SearchUnit[], labelOf: (id: string) => string,
    graph: RoomGraph, buildingW_m: number, buildingH_m: number, already: ValidationIssue[]
): ValidationIssue[] {
    const byId = new Map(placements.map(p => [p.id, p]));
    const issues: ValidationIssue[] = [];
    // Every room the strict search keeps on the perimeter (zone not circ,
    // not a no-window type) — the validator only checks habitable rooms,
    // so a garage or wet kitchen moved inside would otherwise go unflagged.
    const flagged = new Set(already.filter(i => i.rule === 'EXTERNAL_WALL').map(i => i.room_id));
    const eps = 1e-6;
    for (const p of placements) {
        const n = graph.nodes.get(p.id);
        if (!n || n.zone === 'circ' || NO_WINDOW_TYPES.has(n.type) || flagged.has(p.id)) continue;
        const onEdge = p.x_m < eps || p.y_m < eps || p.x_m + p.w_m > buildingW_m - eps || p.y_m + p.h_m > buildingH_m - eps;
        if (!onEdge) issues.push({ room_id: p.id, rule: 'EXTERNAL_WALL', detail: `${labelOf(p.id)} has no outside wall (no window or direct outside access).` });
    }
    for (const p of placements) {
        const n = graph.nodes.get(p.id);
        if (n && n.floor === 0 && STREET_FRONT_TYPES.has(n.type) && Math.abs(p.y_m + p.h_m - buildingH_m) > eps) {
            const why = GARAGE_TYPES.has(n.type) ? 'cars cannot drive into it from the street' : 'there is no front door into it';
            issues.push({ room_id: p.id, rule: 'NO_FRONT_ENTRANCE', detail: `${labelOf(p.id)} isn't on the front of the house, so ${why}.` });
        }
    }
    for (const p of pairs) {
        const a = byId.get(p.a), b = byId.get(p.b);
        if (a && b && !shareWall_m(a, b)) {
            issues.push({ room_id: p.a, rule: 'ADJACENCY_MISSED', detail: `${labelOf(p.a)} doesn't share a wall with ${labelOf(p.b)}.` });
        }
    }
    for (const u of units) {
        const placedArea = u.ids.reduce((s, id) => { const r = byId.get(id); return s + (r ? r.w_m * r.h_m : 0); }, 0);
        const change = (placedArea - u.totalArea_m2) / u.totalArea_m2;
        if (u.totalArea_m2 > 0 && Math.abs(change) > 0.10 && !u.shapes) {
            issues.push({
                room_id: u.ids[0], rule: 'AREA_ADJUSTED',
                detail: `${labelOf(u.ids[0])} is ${Math.round(Math.abs(change) * 100)}% ${change < 0 ? 'smaller' : 'larger'} than requested (${placedArea.toFixed(1)} m² vs ${u.totalArea_m2.toFixed(1)} m²).`,
            });
        }
    }
    return issues;
}

/** True when two rects share at least 1.0 m of wall (D5). */
function shareWall_m(a: PlacedRect, b: PlacedRect): boolean {
    const eps = 1e-6, min = 1.0 - eps;
    const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);
    if (Math.abs(a.x_m + a.w_m - b.x_m) < eps || Math.abs(b.x_m + b.w_m - a.x_m) < eps) return overlap(a.y_m, a.y_m + a.h_m, b.y_m, b.y_m + b.h_m) >= min;
    if (Math.abs(a.y_m + a.h_m - b.y_m) < eps || Math.abs(b.y_m + b.h_m - a.y_m) < eps) return overlap(a.x_m, a.x_m + a.w_m, b.x_m, b.x_m + b.w_m) >= min;
    return false;
}
