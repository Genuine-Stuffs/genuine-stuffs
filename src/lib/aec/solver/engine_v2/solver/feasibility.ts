/**
 * Genuine Stuffs AI Studio · Solver V2 · Feasibility Gate
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 1 (v1.0 Part D) · reopened, October 2026
 *
 * Cheap pre-checks that run BEFORE the backtracking search, so a program
 * that cannot possibly be solved fails in milliseconds with a specific,
 * actionable reason — instead of spending the full search budget
 * (config.budget_ms, up to several seconds) discovering the same thing
 * the hard way. This was the missing half of v1.0 Part D Phase 1: hub/
 * suite/adjacency classification (graph.ts) shipped, the feasibility
 * gate never did.
 *
 * Deliberately narrower than v1.0's F-001..F-005 — implements F-001
 * (area budget), F-002 (min width vs. shorter footprint side), and F-004
 * (adjacency degree). Two are intentionally left out:
 *   F-003 (adjacency graph disconnected) — does NOT transfer to this
 *   codebase's architecture. The corridor is never a graph node here
 *   (index.ts places it as fixed reserved geometry, not a Hive room), so
 *   ordinary bedrooms/garages having no declared edge back to the social
 *   cluster is normal, not broken — they connect to the corridor
 *   geometrically, checked post-placement by placement_validator.ts. A
 *   BFS-over-the-graph check would flag nearly every private/service room
 *   as a false positive.
 *   F-005 (window/perimeter capacity) needs a per-room "needs window"
 *   flag the Hive payload in this codebase doesn't supply (graph.ts's
 *   HiveRoom has no such field) — inventing one here would be a
 *   data-contract change, not a feasibility check.
 *
 * Operates directly on graph.ts's RoomGraph and the already-built
 * OccupancyGrid/SearchUnit[] — no duplicate NormProgram/NormRoom layer,
 * consistent with Master Plan v2.0's Part D note on solver/types.ts.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { RoomGraph } from '../graph';
import { OccupancyGrid } from './grid';
import { GRID_RESOLUTION_M } from './units';
import { SearchUnit } from './search';

export interface FeasibilityCheck {
    code: string;
    passed: boolean;
    detail: string;
}

export interface FeasibilityReport {
    feasible: boolean;
    checks: FeasibilityCheck[];
}

// F-001 (v1.0 I2): fraction of the floor's PLACEABLE area (grid free
// cells — already excludes circulation/stairwell/footprint notches, since
// this codebase reserves those before the solver ever runs) that room
// targets may consume. The remaining 15% covers wall thickness and
// candidate-enumeration slack.
const AREA_BUDGET_RATIO = 0.85;

// F-004: max plausible adjacency degree for a room realised as an
// axis-aligned rectangle (v1.0 Part C).
const MAX_ADJACENCY_DEGREE = 6;

// Per-type minimum widths (F-002), covering every Hive "type" value
// graph.ts's TYPE_TO_ZONE table recognises. Falls back to a per-zone
// default when a room's type is missing/unrecognised.
const ABSOLUTE_MIN_WIDTH_M: Record<string, number> = {
    foyer: 1.8, living_room: 3.0, dining_room: 2.7, family_room: 3.0, entertainment: 2.7,
    kitchen: 2.1, utility: 1.5, garage: 3.0, laundry: 1.5, store: 1.2, boiler_room: 1.2,
    bedroom: 2.7, master_bedroom: 3.0, bathroom: 1.5, wardrobe: 1.2, dressing: 1.5,
    office: 2.4, study: 2.4,
    void: 1.0, circulation: 1.0, hall: 1.2, landing: 1.2, stairwell: 2.4,
};
const DEFAULT_MIN_WIDTH_BY_ZONE: Record<string, number> = {
    social: 3.0, service: 2.1, private: 2.4, circ: 1.0,
};

function minWidthForUnit(graph: RoomGraph, unit: SearchUnit): number {
    return Math.max(...unit.ids.map(id => {
        const node = graph.nodes.get(id);
        if (!node) return 0;
        return ABSOLUTE_MIN_WIDTH_M[node.type] ?? DEFAULT_MIN_WIDTH_BY_ZONE[node.zone] ?? 2.4;
    }));
}

export function checkFeasibility(
    grid: OccupancyGrid,
    units: SearchUnit[],
    graph: RoomGraph,
    floorIndex: number,
    combinedW_m: number,
    combinedH_m: number
): FeasibilityReport {
    const checks: FeasibilityCheck[] = [];

    // F-001 — area budget
    const cellArea_m2 = GRID_RESOLUTION_M * GRID_RESOLUTION_M;
    const freeArea_m2 = grid.countFreeCells() * cellArea_m2;
    const targetArea_m2 = units.reduce((sum, u) => sum + u.totalArea_m2, 0);
    const budget_m2 = freeArea_m2 * AREA_BUDGET_RATIO;
    checks.push({
        code: 'F-001',
        passed: targetArea_m2 <= budget_m2,
        detail: `rooms need ${targetArea_m2.toFixed(1)}m² · budget is ${(AREA_BUDGET_RATIO * 100).toFixed(0)}% of ${freeArea_m2.toFixed(1)}m² placeable area = ${budget_m2.toFixed(1)}m²`,
    });

    // F-002 — a unit's minimum width exceeds the footprint's shorter side
    const shorterSide_m = Math.min(combinedW_m, combinedH_m);
    const oversized = units
        .map(u => ({ u, minWidth: minWidthForUnit(graph, u) }))
        .filter(({ minWidth }) => minWidth > shorterSide_m);
    checks.push({
        code: 'F-002',
        passed: oversized.length === 0,
        detail: oversized.length === 0
            ? `all unit minimum widths fit within the ${shorterSide_m.toFixed(1)}m shorter footprint side`
            : `${oversized.map(o => `${o.u.ids.join('+')} needs ${o.minWidth.toFixed(1)}m`).join(', ')} vs ${shorterSide_m.toFixed(1)}m shorter side`,
    });

    // NOTE — v1.0's F-003 ("adjacency graph disconnected") is deliberately
    // NOT implemented here. In this codebase the corridor is never a graph
    // node (index.ts places it as fixed reserved geometry, not a Hive
    // room), so most private/service rooms have no declared edge back to
    // the social cluster BY DESIGN — they connect to the corridor
    // geometrically, checked post-placement by placement_validator.ts, not
    // through the Hive's declared adjacency graph. A BFS-over-the-graph
    // reachability check would flag nearly every ordinary bedroom/garage
    // as "unreachable" — a false positive, not a real infeasibility. Real
    // reachability is a placement-time fact, not a pre-check one, for this
    // architecture.
    const idsOnFloor = (graph.floors.get(floorIndex) ?? []).filter(id => graph.nodes.get(id)!.zone !== 'circ');

    // F-004 — adjacency degree implausible for axis-aligned rectangles
    const overDegree = idsOnFloor
        .map(id => graph.nodes.get(id)!)
        .filter(n => n.degree > MAX_ADJACENCY_DEGREE);
    checks.push({
        code: 'F-004',
        passed: overDegree.length === 0,
        detail: overDegree.length === 0
            ? `no room exceeds degree ${MAX_ADJACENCY_DEGREE}`
            : `${overDegree.map(n => `${n.label} (degree ${n.degree})`).join(', ')} exceed degree ${MAX_ADJACENCY_DEGREE}`,
    });

    return { feasible: checks.every(c => c.passed), checks };
}
