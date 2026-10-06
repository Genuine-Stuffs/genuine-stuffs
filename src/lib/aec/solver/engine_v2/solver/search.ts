/**
 * Genuine Stuffs AI Studio · Solver V2 · Backtracking Search
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 *
 * Notch/bridge reservation ported from zones.ts::splitWingForCorridor()
 * (cited inline) — no zone-banding assumption, pure geometry, per the
 * plan's explicit instruction. Suite subdivision ports index.ts's
 * packPrivateZone() bedDepth/subBounds math, generalized to N sub-rooms.
 * Corridor/stairwell FIXED placement stays Phase 4's job in index.ts —
 * this file only reserves the wing-bridge strip as unplaceable circulation.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { OccupancyGrid, RectCells } from './grid';
import { GRID_RESOLUTION_M, metersToCells, metersToCellsFloor, cellsToMeters } from './units';
import { PlacedRect, SolverConfig, RoomDimensionHint, ReservedRect } from './types';
import { RoomGraph, Suite, deriveSuites, identifyHubs, AdjacencyPair, NO_WINDOW_TYPES, STREET_FRONT_TYPES } from '../graph';
import { roomShapeOk } from './room_shape';
import { BuildingFootprint } from '../shapes';
import { RoomSpec, enumerateCandidates, enumerateDimensionPairs } from './candidates';
import { insideFootprint } from './constraints';

const RESERVED_IDX = 0xFFFE; // -> cell value 0xFFFF after +1 in grid.place(); never matches a real room index

function xorshift32(seed: number): () => number {
    let x = seed || 1;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1000) / 1000; };
}

/** Ported from zones.ts::splitWingForCorridor() — same attached-right
 * (L-shape) vs attached-below (T-shape) branch logic, cell-space caller. */
function splitWingBridge(
    primary: { x: number; y: number; width: number; height: number },
    secondary: { x: number; y: number; width: number; height: number },
    corridorD_m: number
): { x: number; y: number; width: number; height: number } {
    const attachedRight = Math.abs(secondary.x - (primary.x + primary.width)) < 0.05;
    return attachedRight
        ? { x: secondary.x, y: secondary.y, width: corridorD_m, height: secondary.height }
        : { x: secondary.x, y: secondary.y, width: secondary.width, height: corridorD_m };
}

/** Every cell a fixed rect touches, clamped to the grid. Fixed geometry
 * (corridor, stairwell, wing bridge) isn't always grid-aligned — the
 * stairwell is 2.4m × 3.6m — and rounding each edge to the NEAREST cell
 * left slivers of it unreserved, so rooms could be placed overlapping it
 * (I2). Covering outward guarantees no overlap; clamping stops a rect
 * flush with the far wall from writing past the end of a grid row. */
function coveringCells(x_m: number, y_m: number, w_m: number, h_m: number, grid: OccupancyGrid): RectCells {
    const x0 = Math.max(0, Math.floor(x_m / GRID_RESOLUTION_M + 1e-6));
    const y0 = Math.max(0, Math.floor(y_m / GRID_RESOLUTION_M + 1e-6));
    const x1 = Math.min(grid.widthCells, Math.max(x0 + 1, Math.ceil((x_m + w_m) / GRID_RESOLUTION_M - 1e-6)));
    const y1 = Math.min(grid.heightCells, Math.max(y0 + 1, Math.ceil((y_m + h_m) / GRID_RESOLUTION_M - 1e-6)));
    return { x_cells: x0, y_cells: y0, w_cells: x1 - x0, h_cells: y1 - y0 };
}

export function buildFootprintGrid(
    footprint: BuildingFootprint,
    reservedRects: ReservedRect[] = []
): {
    grid: OccupancyGrid; combinedW_m: number; combinedH_m: number;
} {
    const { primary, secondary } = footprint;
    const combinedW_m = secondary ? Math.max(primary.x + primary.width, secondary.x + secondary.width) : primary.width;
    const combinedH_m = secondary ? Math.max(primary.y + primary.height, secondary.y + secondary.height) : primary.height;
    const grid = new OccupancyGrid(combinedW_m, combinedH_m);

    if (secondary) {
        const inRect = (x: number, y: number, r: typeof primary) =>
            x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;

        for (let cy = 0; cy < grid.heightCells; cy++) {
            for (let cx = 0; cx < grid.widthCells; cx++) {
                const x_m = cellsToMeters(cx), y_m = cellsToMeters(cy);
                if (!inRect(x_m, y_m, primary) && !inRect(x_m, y_m, secondary)) {
                    grid.place({ x_cells: cx, y_cells: cy, w_cells: 1, h_cells: 1 }, RESERVED_IDX);
                }
            }
        }

        const bridge_m = splitWingBridge(primary, secondary, 1.5);
        grid.place(coveringCells(bridge_m.x, bridge_m.y, bridge_m.width, bridge_m.height, grid), RESERVED_IDX);
    }

    // Caller-supplied fixed rects (corridor bands, stairwell) — computed
    // by index.ts's own geometry, Phase 4 wiring. Reserved the same way
    // as the wing bridge: pre-occupied cells the search must route around,
    // never a room it chooses where to put.
    for (const r of reservedRects) {
        grid.place(coveringCells(r.x_m, r.y_m, r.w_m, r.h_m, grid), RESERVED_IDX);
    }

    return { grid, combinedW_m, combinedH_m };
}

export interface SearchUnit {
    ids: string[];
    totalArea_m2: number;
    isSuite: boolean;
    suite?: Suite;
    /** Exact candidate shapes (solver-placed corridor / stairwell). Tried
     * smallest-first, so circulation never takes more floor than needed. */
    shapes?: Array<{ w_cells: number; h_cells: number }>;
}

/** Reachability (validator rule CORRIDOR_ADJACENCY), enforced during the
 * search instead of only reported after it: each room in `targets` must
 * share ≥1.0m of wall with at least one of its target rooms — a corridor,
 * the stairwell, or a room people walk through (foyer, living, dining).
 * `anchors` are fixed rects (the upper floor's stairwell_void) that can
 * satisfy a reach target or a must-touch pair without being placed. */
export interface ReachRules {
    targets: Map<string, Set<string>>;
    anchors: Map<string, RectCells>;
}

export function buildUnits(graph: RoomGraph, floorIndex: number): SearchUnit[] {
    const ids = graph.floors.get(floorIndex) ?? [];
    const suites = deriveSuites(graph, floorIndex);
    const suiteRoomIds = new Set(suites.flatMap(s => [s.bedroomId, ...s.subIds]));

    const units: SearchUnit[] = suites.map(s => ({ ids: [s.bedroomId, ...s.subIds], totalArea_m2: s.totalArea, isSuite: true, suite: s }));

    for (const id of ids) {
        if (suiteRoomIds.has(id)) continue;
        const node = graph.nodes.get(id)!;
        if (node.zone === 'circ') continue; // Phase 4 places circulation as fixed rects, not via search
        units.push({ ids: [id], totalArea_m2: node.area, isSuite: false });
    }
    return units;
}

/**
 * Ordering used to matter only for which unit gets first pick of a tight
 * spot; now it decides whether a must-touch chain ever GETS a spot at all.
 * enumerateCandidates() anchors most of its output flush against whatever
 * is already placed, so any unit placed before an adjacency-critical one
 * has a good chance of squatting on the exact perimeter-flush-to-hub
 * pocket that unit needed and has no other way to reach. Plain hub-first-
 * then-area-descending let large, adjacency-free units (garage, suites
 * with no hub edge) go before hub-adjacent units (dining/kitchen here),
 * which is what produced hive-001/hive-002's TIMEOUT — the search wasn't
 * short on area, it was locked out of the only shapes that satisfy both
 * "touches the hub" and "touches the perimeter" by rooms that needed
 * neither. BFS through the must-touch graph from the hub(s) outward fixes
 * this: a unit is scheduled the moment something it must touch has been
 * scheduled, so adjacency chains claim their space before anything
 * unconnected gets a turn. Units with no must-touch path to a hub (true
 * "free" rooms) fall back to the old area-descending order.
 */
export function orderUnits(units: SearchUnit[], graph: RoomGraph, floorIndex: number, mustTouchPairs: AdjacencyPair[] = []): SearchUnit[] {
    const hubIds = new Set(identifyHubs(graph, floorIndex).map(h => h.id));

    const unitByRoomId = new Map<string, SearchUnit>();
    for (const u of units) for (const id of u.ids) unitByRoomId.set(id, u);

    const neighborsOf = new Map<SearchUnit, Set<SearchUnit>>();
    for (const u of units) neighborsOf.set(u, new Set());
    for (const pair of mustTouchPairs) {
        const ua = unitByRoomId.get(pair.a), ub = unitByRoomId.get(pair.b);
        if (!ua || !ub || ua === ub) continue;
        neighborsOf.get(ua)!.add(ub);
        neighborsOf.get(ub)!.add(ua);
    }

    const hubUnits = units
        .filter(u => u.ids.some(id => hubIds.has(id)))
        .sort((a, b) => b.totalArea_m2 - a.totalArea_m2);

    const ordered: SearchUnit[] = [];
    const visited = new Set<SearchUnit>();
    const queue: SearchUnit[] = [...hubUnits];
    for (const u of hubUnits) visited.add(u);

    while (queue.length > 0) {
        const u = queue.shift()!;
        ordered.push(u);
        const neighbors = [...neighborsOf.get(u)!]
            .filter(n => !visited.has(n))
            .sort((a, b) => b.totalArea_m2 - a.totalArea_m2);
        for (const n of neighbors) { visited.add(n); queue.push(n); }
    }

    const rest = units.filter(u => !visited.has(u)).sort((a, b) => b.totalArea_m2 - a.totalArea_m2);
    return [...ordered, ...rest];
}

/** Every way to split `outer` into the bedroom plus one sub-room strip
 * along one of its four sides, N sub-rooms sharing the strip side-by-side.
 * The strip on the side OPPOSITE the perimeter wall (subdivideSuite's
 * original, single answer) comes first, so it stays the preferred split.
 *
 * One fixed split was too few: the strip covers the bedroom's whole
 * interior side, leaving only its two short ends free to meet anything
 * else. On an upper floor where a family lounge must touch four bedrooms
 * (hive-004/005), that left the lounge almost nowhere to go. A strip
 * across one end instead frees the bedroom's long interior side. Variants
 * whose bedroom loses the perimeter are dropped later by the caller's I5
 * check; ones that would leave the bedroom under minimum width, here. */
function suiteSplits(outer: RectCells, suite: Suite, gridW_cells: number, gridH_cells: number): Array<Map<string, RectCells>> {
    const preferred = subdivideSuite(outer, suite, gridW_cells, gridH_cells);
    const n = suite.subIds.length;
    if (n === 0) return [preferred];

    const SUB_DEPTH = Math.max(2, metersToCells(2.2));
    const MIN_BED = metersToCellsFloor(2.4);
    const { x_cells: x, y_cells: y, w_cells: w, h_cells: h } = outer;
    const variants: Array<Map<string, RectCells>> = [preferred];
    const key = (m: Map<string, RectCells>) => { const b = m.get(suite.bedroomId)!; return `${b.x_cells},${b.y_cells},${b.w_cells},${b.h_cells}`; };
    const seen = new Set([key(preferred)]);

    const strip = (vertical: boolean, atStart: boolean) => {
        const span = vertical ? h : w;
        if ((vertical ? w : h) - SUB_DEPTH < MIN_BED || span < n) return;
        const m = new Map<string, RectCells>();
        const subPos = atStart ? (vertical ? x : y) : (vertical ? x + w : y + h) - SUB_DEPTH;
        m.set(suite.bedroomId, vertical
            ? { x_cells: atStart ? x + SUB_DEPTH : x, y_cells: y, w_cells: w - SUB_DEPTH, h_cells: h }
            : { x_cells: x, y_cells: atStart ? y + SUB_DEPTH : y, w_cells: w, h_cells: h - SUB_DEPTH });
        const slot = Math.floor(span / n);
        suite.subIds.forEach((id, i) => {
            const len = i === n - 1 ? span - i * slot : slot;
            m.set(id, vertical
                ? { x_cells: subPos, y_cells: y + i * slot, w_cells: SUB_DEPTH, h_cells: len }
                : { x_cells: x + i * slot, y_cells: subPos, w_cells: len, h_cells: SUB_DEPTH });
        });
        if (!seen.has(key(m))) { seen.add(key(m)); variants.push(m); }
    };
    strip(true, true); strip(true, false); strip(false, true); strip(false, false);
    return variants;
}

/** Ports packPrivateZone()'s bedDepth/subBounds subdivision from
 * index.ts, generalized from a single sub-room strip to N sub-rooms
 * sharing the strip side-by-side. */
function subdivideSuite(outer: RectCells, suite: Suite, gridW_cells: number, gridH_cells: number): Map<string, RectCells> {
    const SUB_DEPTH = Math.max(2, metersToCells(2.2)); // ported constant: packPrivateZone's BATH_D
    const touchesRight = (outer.x_cells + outer.w_cells) >= gridW_cells;
    const touchesLeft = outer.x_cells === 0;
    const touchesBottom = (outer.y_cells + outer.h_cells) >= gridH_cells;
    const touchesTop = outer.y_cells === 0;
    const n = suite.subIds.length;
    const result = new Map<string, RectCells>();
    if (n === 0) { result.set(suite.bedroomId, outer); return result; }

    // Sub-rooms (bath/wardrobe) never need a window (NO_WINDOW_TYPES,
    // excluded from needsExternalWall below) — they always take the
    // INTERIOR side of the split. The bedroom does need an exterior wall
    // (I5), so it must keep whichever edge `outer` actually touches. The
    // previous version did this backwards in every branch — it shrank the
    // bedroom's own side away from the touching edge and gave that edge
    // to the subs instead, so the bedroom failed I5 acceptance regardless
    // of where the suite landed. This was the real reason hive-001/
    // hive-002 timed out even after the ordering fix: with every suite
    // candidate failing I5, the search burned its whole budget re-trying
    // suite placements that could never succeed.
    if (touchesLeft) {
        const bedW = Math.max(2, outer.w_cells - SUB_DEPTH);
        result.set(suite.bedroomId, { ...outer, w_cells: bedW }); // keeps outer.x_cells — the touching edge
        const slot = Math.max(1, Math.floor(outer.h_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells + bedW, y_cells: outer.y_cells + i * slot,
            w_cells: SUB_DEPTH, h_cells: i === n - 1 ? outer.h_cells - i * slot : slot,
        }));
    } else if (touchesRight) {
        const bedW = Math.max(2, outer.w_cells - SUB_DEPTH);
        result.set(suite.bedroomId, { ...outer, x_cells: outer.x_cells + SUB_DEPTH, w_cells: bedW }); // keeps x_cells+w_cells — the touching edge
        const slot = Math.max(1, Math.floor(outer.h_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells, y_cells: outer.y_cells + i * slot,
            w_cells: SUB_DEPTH, h_cells: i === n - 1 ? outer.h_cells - i * slot : slot,
        }));
    } else if (touchesTop) {
        const bedH = Math.max(2, outer.h_cells - SUB_DEPTH);
        result.set(suite.bedroomId, { ...outer, h_cells: bedH }); // keeps outer.y_cells — the touching edge
        const slot = Math.max(1, Math.floor(outer.w_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells + i * slot, y_cells: outer.y_cells + bedH,
            w_cells: i === n - 1 ? outer.w_cells - i * slot : slot, h_cells: SUB_DEPTH,
        }));
    } else {
        // touchesBottom (the only remaining case — `outer` already passed
        // the caller's touchesPerimeter filter, so some edge is touching).
        const bedH = Math.max(2, outer.h_cells - SUB_DEPTH);
        result.set(suite.bedroomId, { ...outer, y_cells: outer.y_cells + SUB_DEPTH, h_cells: bedH }); // keeps y_cells+h_cells — the touching edge
        const slot = Math.max(1, Math.floor(outer.w_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells + i * slot, y_cells: outer.y_cells,
            w_cells: i === n - 1 ? outer.w_cells - i * slot : slot, h_cells: SUB_DEPTH,
        }));
    }
    return result;
}

/** Fallback mode: requirements the strict search enforces become
 * preferences that only rank candidates. Overlap, footprint and suite
 * nesting stay hard — the geometry is always valid; what the plan gives up
 * is flagged afterwards by the caller. */
export interface SoftPreferences {
    /** Pairs that should share a wall (all of them, hub edges included). */
    pairs: AdjacencyPair[];
    /** Rooms that should open onto circulation or a hub room. */
    reach: ReachRules;
}

export interface SearchOutcome {
    placed: Map<string, RectCells>;
    failedUnitIds?: string[];
    nodesExplored: number;
    /** True when the budget clock stopped the search — the failure says
     * nothing about the program. False means the candidate set ran out. */
    timedOut: boolean;
}

/** Depth-first backtracking, budget-checked every 200 nodes (D4). */
export function search(
    units: SearchUnit[], graph: RoomGraph, grid: OccupancyGrid,
    combinedW_m: number, combinedH_m: number,
    config: SolverConfig, dimensionHints: Map<string, RoomDimensionHint>,
    mustTouchPairs: AdjacencyPair[],
    floorIndex: number,
    reservedRects: ReservedRect[] = [],
    reach: ReachRules = { targets: new Map(), anchors: new Map() },
    soft?: SoftPreferences
): SearchOutcome {
    const startTime = performance.now();
    const rng = xorshift32(config.seed);
    let nodesExplored = 0;
    const placed = new Map<string, RectCells>();
    const placedIdx: RectCells[] = [];

    // Indexed by room id for O(1) lookup at acceptance time — avoids an
    // O(pairs) scan per candidate per unit.
    const pairsByRoom = new Map<string, AdjacencyPair[]>();
    for (const pair of mustTouchPairs) {
        if (!pairsByRoom.has(pair.a)) pairsByRoom.set(pair.a, []);
        pairsByRoom.get(pair.a)!.push(pair);
        if (!pairsByRoom.has(pair.b)) pairsByRoom.set(pair.b, []);
        pairsByRoom.get(pair.b)!.push(pair);
    }

    /** Checked at acceptance time against ALREADY-PLACED neighbors only.
     * Completeness holds by ordinary backtracking: if room B must touch
     * A and cannot from any candidate, every one of B's candidates fails
     * this check, tryUnit(i+1) returns false for all of them, and the
     * search naturally backtracks to move A instead. By the time the
     * last unit is placed, every pair has been checked exactly once —
     * from whichever side is placed second. */
    function adjacencySatisfiedFor(roomId: string, rect: RectCells): boolean {
        const relevant = pairsByRoom.get(roomId);
        if (!relevant) return true;
        for (const pair of relevant) {
            const otherId = pair.a === roomId ? pair.b : pair.a;
            const otherRect = placed.get(otherId) ?? reach.anchors.get(otherId);
            if (!otherRect) continue; // not yet placed — checked when its own turn comes
            if (!touches(rect, otherRect)) return false;
        }
        return true;
    }

    /** mustTouchSatisfied() (≥1.0m shared wall) in cell space: every rect
     * here is grid-aligned, so its 0.35m tolerance can only ever match an
     * exactly shared edge, and 1.0m is 2 cells. Allocation-free — this
     * runs for every candidate of every unit at every node. */
    const MIN_SHARED_CELLS = Math.round(1.0 / GRID_RESOLUTION_M);
    const touches = (a: RectCells, b: RectCells): boolean => {
        if (a.y_cells + a.h_cells === b.y_cells || b.y_cells + b.h_cells === a.y_cells) {
            return Math.min(a.x_cells + a.w_cells, b.x_cells + b.w_cells) - Math.max(a.x_cells, b.x_cells) >= MIN_SHARED_CELLS;
        }
        if (a.x_cells + a.w_cells === b.x_cells || b.x_cells + b.w_cells === a.x_cells) {
            return Math.min(a.y_cells + a.h_cells, b.y_cells + b.h_cells) - Math.max(a.y_cells, b.y_cells) >= MIN_SHARED_CELLS;
        }
        return false;
    };

    // Reachability bookkeeping. A room's rule is decided the moment it
    // touches a placed target (satisfied) or every target is placed
    // without touching it (dead branch); until then it is pending, and a
    // pending room whose targets all sit in ONE unplaced unit becomes a
    // hard requirement on that unit's candidates (see tryNext).
    const unitOfRoom = new Map<string, number>();
    units.forEach((u, i) => u.ids.forEach(id => unitOfRoom.set(id, i)));
    const reachedNow = (id: string, rect: RectCells): boolean => {
        for (const t of reach.targets.get(id)!) {
            const r = placed.get(t) ?? reach.anchors.get(t);
            if (r && touches(rect, r)) return true;
        }
        return false;
    };
    /** Unplaced units that could still satisfy `id`'s reach rule. */
    const openTargetUnits = (id: string): Set<number> => {
        const open = new Set<number>();
        for (const t of reach.targets.get(id)!) {
            const u = unitOfRoom.get(t);
            if (u !== undefined && unplaced.has(u)) open.add(u);
        }
        return open;
    };

    let timedOut = false;

    // ── v1.0 spec, Session 3b step 5, finally implemented ──────────────────────
    // Feasibility pruning: before recursing, remaining free cells must
    // cover the minimum possible area of every unplaced unit. Tracked as
    // a running sum rather than a suffix array, since MRV (below) places
    // units in a dynamic order, not index order.
    const cellArea = GRID_RESOLUTION_M * GRID_RESOLUTION_M;

    // ── Grid-first layout (bay_grid.ts) ─────────────────────────────────
    // Rooms take whole bays: a rect whose edges lie on grid lines. Bays
    // come in 0.5 m steps of 3.0–4.5 m, so a room's area can't be matched
    // as closely as on the free 0.5 m grid; the window is 10 points wider
    // below and 20 above. A room smaller than 60% of the smallest bay
    // instead shares a bay: it sits in one of the bay's corners, the rest
    // of the bay left to its neighbours (owner decision 2026-10-06).
    // Circulation (shaped units) still places freely. A grid unit's list
    // is complete at the root, so it only ever shrinks.
    const bays = config.bays;
    const gridUnit = units.map(u => !!bays && !u.shapes);
    const GRID_LO = 1 - (config.areaTolerance + 0.10), GRID_HI = 1 + config.areaTolerance + 0.20;
    const smallUnit = units.map(u => {
        if (!bays || u.isSuite || u.shapes) return false;
        let minBay = Infinity;
        for (let i = 1; i < bays.xs.length; i++) for (let j = 1; j < bays.ys.length; j++)
            minBay = Math.min(minBay, (bays.xs[i] - bays.xs[i - 1]) * (bays.ys[j] - bays.ys[j - 1]));
        return u.totalArea_m2 / cellArea < 0.6 * minBay;
    });
    const minAreaCells = units.map((u, i) =>
        Math.floor((u.totalArea_m2 / cellArea) * (gridUnit[i] && !smallUnit[i] ? GRID_LO : 1 - config.areaTolerance)));
    let unplacedMinArea = minAreaCells.reduce((s, a) => s + a, 0);
    let freeCells = grid.countFreeCells();
    const unplaced = new Set<number>(units.map((_, i) => i));

    // ── I5 enforcement (invariant table finally made true) ─────────────────
    const needsExternalWall = (id: string): boolean => {
        const n = graph.nodes.get(id);
        if (!n) return false;
        return n.zone !== 'circ' && !NO_WINDOW_TYPES.has(n.type);
    };
    // Ground-floor entrance and garage must sit on the front (bottom) edge.
    const isEntrance = (id: string) => floorIndex === 0 && STREET_FRONT_TYPES.has(graph.nodes.get(id)?.type ?? '');
    const onFront = (r: RectCells) => r.y_cells + r.h_cells === grid.heightCells;

    // In fallback mode no unit is perimeter-bound; windows only rank.
    const unitNeedsExt = units.map(u => !soft && needsExternalWall(u.ids[0]));
    const unitWantsExt = units.map(u => needsExternalWall(u.ids[0]));
    const preferByRoom = new Map<string, string[]>();
    for (const p of soft?.pairs ?? []) {
        preferByRoom.set(p.a, [...(preferByRoom.get(p.a) ?? []), p.b]);
        preferByRoom.set(p.b, [...(preferByRoom.get(p.b) ?? []), p.a]);
    }

    const reservedCells: RectCells[] = reservedRects.map(r => ({
        x_cells: metersToCellsFloor(r.x_m), y_cells: metersToCellsFloor(r.y_m),
        w_cells: metersToCells(r.w_m), h_cells: metersToCells(r.h_m)
    }));

    type Cand = { outer: RectCells; subs: Map<string, RectCells> };
    const specs: RoomSpec[] = units.map(unit => ({
        id: unit.ids[0], targetArea_m2: unit.totalArea_m2, minWidth_m: 2.4,
        dimensionHint: unit.ids.length === 1 ? dimensionHints.get(unit.ids[0]) : undefined,
        shapes: unit.shapes,
    }));

    const overlaps = (a: RectCells, b: RectCells) =>
        a.x_cells < b.x_cells + b.w_cells && b.x_cells < a.x_cells + a.w_cells &&
        a.y_cells < b.y_cells + b.h_cells && b.y_cells < a.y_cells + a.h_cells;
    /** enumerateCandidates()' anchor relation: edge contact with ≥1 cell overlap. */
    const flush = (c: RectCells, p: RectCells) =>
        ((c.x_cells === p.x_cells + p.w_cells || c.x_cells + c.w_cells === p.x_cells) &&
            c.y_cells < p.y_cells + p.h_cells && p.y_cells < c.y_cells + c.h_cells) ||
        ((c.y_cells === p.y_cells + p.h_cells || c.y_cells + c.h_cells === p.y_cells) &&
            c.x_cells < p.x_cells + p.w_cells && p.x_cells < c.x_cells + c.w_cells);

    /** Candidates of unit `u` anchored on `anchorRects` (plus the four
     * walls when `boundary`), through every check that is fixed for the
     * rest of this branch: footprint, I5 per room post-split, overlap
     * with what's placed (`prefix`), and must-touch pairs with what's
     * placed. Candidates `skip` says were already generated are dropped. */
    function generate(u: number, anchorRects: RectCells[], boundary: boolean, prefix: Int32Array, skip?: (c: RectCells) => boolean): Cand[] {
        const ctx = { placedRects: anchorRects, gridW_cells: grid.widthCells, gridH_cells: grid.heightCells, skipBoundary: !boundary };
        const out: Cand[] = [];
        for (const cand of enumerateCandidates(specs[u], ctx, config.areaTolerance)) {
            if (skip?.(cand)) continue;
            accept(u, cand, prefix, out);
        }
        return out;
    }

    /** Grid mode: every whole-bay rect (or bay-corner rect, for a small
     * unit) for unit `u`, through the same checks as generate(). */
    function generateGrid(u: number, prefix: Int32Array): Cand[] {
        const { xs, ys } = bays!;
        const out: Cand[] = [];
        const target = units[u].totalArea_m2 / cellArea;
        if (smallUnit[u]) {
            const seen = new Set<string>();
            const pairs = enumerateDimensionPairs(specs[u], config.areaTolerance);
            for (let i = 1; i < xs.length; i++) for (let j = 1; j < ys.length; j++) {
                const x0 = xs[i - 1], x1 = xs[i], y0 = ys[j - 1], y1 = ys[j];
                for (const { w_cells: w, h_cells: h } of pairs) {
                    if (w > x1 - x0 || h > y1 - y0) continue;
                    for (const [x, y] of [[x0, y0], [x1 - w, y0], [x0, y1 - h], [x1 - w, y1 - h]]) {
                        const k = `${x},${y},${w},${h}`;
                        if (seen.has(k)) continue;
                        seen.add(k);
                        accept(u, { x_cells: x, y_cells: y, w_cells: w, h_cells: h }, prefix, out);
                    }
                }
            }
            return out;
        }
        const hint = units[u].ids.length === 1 ? dimensionHints.get(units[u].ids[0]) : undefined;
        const hardW = hint?.mode === 'HARD' ? metersToCells(hint.width_m) : undefined;
        for (let a = 0; a < xs.length - 1; a++) for (let b = a + 1; b < xs.length; b++) {
            const w = xs[b] - xs[a];
            // A room pinned to a structural width keeps it to within 1 m,
            // unrotated (candidates.ts's HARD rule, loosened to the bays).
            if (hardW !== undefined && Math.abs(w - hardW) > metersToCells(1.0)) continue;
            for (let c = 0; c < ys.length - 1; c++) for (let d = c + 1; d < ys.length; d++) {
                const h = ys[d] - ys[c];
                if (w * h < GRID_LO * target || w * h > GRID_HI * target) continue;
                if (Math.max(w, h) / Math.min(w, h) > 3.0) continue;
                accept(u, { x_cells: xs[a], y_cells: ys[c], w_cells: w, h_cells: h }, prefix, out);
            }
        }
        return out;
    }

    /** The checks every candidate passes, wherever it came from: footprint,
     * I5 per room post-split, overlap with what's placed (`prefix`), and
     * must-touch pairs with what's placed. Survivors are pushed to `out`. */
    function accept(u: number, cand: RectCells, prefix: Int32Array, out: Cand[]): void {
        const unit = units[u];
        {
            // I5 pre-filter: if the unit's primary room needs an external
            // wall, only perimeter-touching outers are viable (the bedroom
            // lives inside the outer, so a non-touching outer can never
            // yield a touching bedroom).
            if (unitNeedsExt[u] && !grid.touchesPerimeter(cand)) return;
            // Sub-rooms subdivide the outer rect, so an empty outer
            // implies empty subs — one O(1) check covers the whole unit.
            if (!grid.isFreeIn(prefix, cand)) return;
            const rect: PlacedRect = { id: unit.ids[0], x_m: cellsToMeters(cand.x_cells), y_m: cellsToMeters(cand.y_cells), w_m: cellsToMeters(cand.w_cells), h_m: cellsToMeters(cand.h_cells) };
            if (!insideFootprint(rect, combinedW_m, combinedH_m).pass) return;

            const splits = unit.isSuite && unit.suite ? suiteSplits(cand, unit.suite, grid.widthCells, grid.heightCells) : [new Map([[unit.ids[0], cand]])];
            for (const subs of splits) {
                let ok = true;
                for (const [id, r] of subs) {
                    // I5 acceptance: per-room, post-subdivision — the
                    // bedroom's TRUE rect must touch, not the suite's box.
                    // Adjacency against each sub-room's true rect, too: a
                    // pair naming a bath/wardrobe is about where IT lands.
                    if ((!soft && needsExternalWall(id) && !grid.touchesPerimeter(r)) || !adjacencySatisfiedFor(id, r)) { ok = false; break; }
                    if (!soft && isEntrance(id) && !onFront(r)) { ok = false; break; }
                    // Proportions per type, on the room's own rect — a suite
                    // split can otherwise leave a 2 m wide bedroom. Rooms the
                    // Hive pinned to exact structural dimensions are exempt.
                    const node = graph.nodes.get(id);
                    if (node && dimensionHints.get(id)?.mode !== 'HARD'
                        && !roomShapeOk(node, cellsToMeters(r.w_cells), cellsToMeters(r.h_cells))) { ok = false; break; }
                }
                if (ok) out.push({ outer: cand, subs });
            }
        }
    }

    /**
     * Incremental candidate lists. Every unplaced unit's list holds the
     * placements still legal against everything placed so far, and a
     * child node's list is its parent's minus what the one newly placed
     * unit rules out — overlap with it, or a must-touch pair it now fails
     * — so each node costs work proportional to what changed, not to the
     * whole candidate space. Recomputing every list from scratch at every
     * node (MRV needs every unit's count) was ~90% of search time on
     * hive-004/005 (CPU profile), capping the search at ~200 nodes/s.
     *
     * Perimeter-bound units never gain candidates: boundary anchors cover
     * every wall-flush position. Interior units (corridor, stairwell,
     * standalone baths) also anchor on placed rects, so they gain the
     * candidates anchored on the new rect — minus any flush to a wall or
     * an older rect, which were generated (and kept or ruled out for
     * good) when that anchor appeared.
     */
    function childLists(parent: Cand[][], newSubs: Map<string, RectCells>, prefix: Int32Array): Cand[][] {
        const newRects = [...newSubs.values()];
        const older = [...placedIdx.slice(0, placedIdx.length - newRects.length), ...reservedCells];
        return parent.map((list, u) => {
            if (!unplaced.has(u)) return list;
            const kept = list.filter(c => {
                for (const r of newRects) if (overlaps(c.outer, r)) return false;
                for (const [id, r] of c.subs) {
                    for (const pair of pairsByRoom.get(id) ?? []) {
                        const other = newSubs.get(pair.a === id ? pair.b : pair.a);
                        if (other && !touches(r, other)) return false;
                    }
                }
                return true;
            });
            if (unitNeedsExt[u] || gridUnit[u]) return kept;
            const onWall = (c: RectCells) => c.x_cells === 0 || c.y_cells === 0 ||
                c.x_cells + c.w_cells === grid.widthCells || c.y_cells + c.h_cells === grid.heightCells;
            return kept.concat(generate(u, newRects, false, prefix, c => onWall(c) || older.some(p => flush(c, p))));
        });
    }

    /** True if `unit` must touch an already-fixed rect: a placed must-touch
     * partner, or — once no other unplaced unit could satisfy it — one of
     * its placed reach targets. */
    function mustTouchPlaced(u: number): boolean {
        for (const id of units[u].ids) {
            for (const pair of pairsByRoom.get(id) ?? []) {
                const other = pair.a === id ? pair.b : pair.a;
                if (placed.has(other) || reach.anchors.has(other)) return true;
            }
            const targets = reach.targets.get(id);
            if (targets && ![...targets].some(t => { const o = unitOfRoom.get(t); return o !== undefined && o !== u && unplaced.has(o); })) return true;
        }
        return false;
    }

    /** `list` narrowed by reachability: this unit's own rooms (decided
     * now if no other unplaced unit could reach them later), then every
     * pending room for which this unit is the last chance (`mustReach`). */
    function reachFilter(u: number, list: Cand[], mustReach: RectCells[] = []): Cand[] {
        const own: Array<{ id: string; rects: RectCells[] }> = [];
        for (const id of units[u].ids) {
            const targets = reach.targets.get(id);
            if (!targets) continue;
            let openElsewhere = false;
            const rects: RectCells[] = [];
            for (const t of targets) {
                const o = unitOfRoom.get(t);
                if (o !== undefined && o !== u && unplaced.has(o)) { openElsewhere = true; break; }
                const r = placed.get(t) ?? reach.anchors.get(t);
                if (r) rects.push(r);
            }
            if (!openElsewhere) own.push({ id, rects });
        }
        if (own.length === 0 && mustReach.length === 0) return list;
        const primaryId = units[u].ids[0];
        return list.filter(({ subs }) => {
            for (const { id, rects } of own) {
                const r = subs.get(id)!;
                if (!rects.some(t => touches(r, t))) return false;
            }
            const primary = subs.get(primaryId)!;
            return mustReach.every(r => touches(primary, r));
        });
    }

    /** Fallback mode: how many preferences this candidate gives up,
     * judged against what is placed so far — a window it lacks, a
     * placed preferred neighbour it doesn't touch, and (once one exists)
     * no placed connector touched. Fewest compromises are tried first. */
    function compromises(u: number, cand: Cand): number {
        let n = 0;
        for (const [id, r] of cand.subs) {
            if (unitWantsExt[u] && needsExternalWall(id) && !grid.touchesPerimeter(r)) n++;
            if (isEntrance(id) && !onFront(r)) n += 3; // no front door outweighs any one other miss
            for (const other of preferByRoom.get(id) ?? []) {
                const o = placed.get(other) ?? soft!.reach.anchors.get(other);
                if (o && !touches(r, o)) n++;
            }
            const targets = soft!.reach.targets.get(id);
            if (targets) {
                const placedTargets = [...targets].map(t => placed.get(t) ?? soft!.reach.anchors.get(t)).filter((x): x is RectCells => !!x);
                if (placedTargets.length > 0 && !placedTargets.some(t => touches(r, t))) n++;
            }
        }
        return n;
    }

    /** Try order for the unit MRV picked. Every survivor already touches
     * all placed must-touch neighbors, so ordering reduces to proximity to
     * them; with none placed yet, random (seeded) order, as before.
     * Circulation (shaped units) goes shortest first. */
    function ordered(u: number, viable: Cand[]): Cand[] {
        const primaryId = units[u].ids[0];
        // Note: activeNeighbors is computed only against the primary room (the
        // bedroom), not sub-room ids. Sub-room adjacencies outside their suite
        // aren't declared by Hive currently.
        const activeNeighbors = (pairsByRoom.get(primaryId) ?? [])
            .map(p => p.a === primaryId ? p.b : p.a)
            .map(id => placed.get(id) ?? reach.anchors.get(id))
            .filter((r): r is RectCells => r !== undefined);
        const keyed = viable.map(cand => {
            const c = cand.subs.get(primaryId)!;
            let key = units[u].shapes ? c.w_cells * c.h_cells * 1e6 : 0;
            if (soft) key += compromises(u, cand) * 1e12;
            if (activeNeighbors.length > 0) {
                const cx = c.x_cells + c.w_cells / 2, cy = c.y_cells + c.h_cells / 2;
                for (const n of activeNeighbors) key += (cx - (n.x_cells + n.w_cells / 2)) ** 2 + (cy - (n.y_cells + n.h_cells / 2)) ** 2;
            } else {
                key += rng();
            }
            return { cand, key };
        });
        keyed.sort((a, b) => a.key - b.key);
        return keyed.map(k => k.cand);
    }

    /** MRV (most-constrained-variable) dynamic ordering + forward check.
     * The static orderUnits() ranking was decided once, up front, and
     * could not react to how constrained a unit became mid-search: when a
     * later unit lost its last viable spot, chronological backtracking
     * kept re-shuffling the units in between before ever revisiting the
     * cause. Now every step counts each unplaced unit's viable
     * placements, fails immediately if a unit with a complete option set
     * has none left, and branches on whichever unit has the fewest. Ties
     * fall back to the static order, so the hub-first / must-touch BFS
     * preference still decides between equally constrained units.
     * Measured (20 seeds, hive-001 + hive-002): avg solve 1.0s/0.8s ->
     * 0.3s/0.1s, strict SOLVED (no relaxation) 29/40 -> 37/40. */
    function tryNext(lists: Cand[][]): boolean {
        if (timedOut) return false;
        if (unplaced.size === 0) return true;
        // Feasibility prune — cheapest possible dead-branch detector.
        if (freeCells < unplacedMinArea) return false;
        if ((performance.now() - startTime) > config.budget_ms) {
            timedOut = true;
            return false;
        }

        // Pending reach rules: a placed room not yet touching any target.
        // If no unplaced unit can still reach it the branch is dead; if
        // exactly one can, that unit must touch it.
        const mustReach = new Map<number, RectCells[]>();
        for (const [id, rect] of [...placed, ...reach.anchors]) {
            if (!reach.targets.has(id) || reachedNow(id, rect)) continue;
            const open = openTargetUnits(id);
            if (open.size === 0) return false;
            if (open.size === 1) {
                const u = open.values().next().value as number;
                if (!mustReach.has(u)) mustReach.set(u, []);
                mustReach.get(u)!.push(rect);
            }
        }

        let bestIdx = -1;
        let best: Cand[] = [];
        for (const i of unplaced) {
            const viable = reachFilter(i, lists[i], mustReach.get(i));
            if (viable.length === 0) {
                // Forward check — sound when the unit's option set can
                // only shrink from here: perimeter-bound units (boundary
                // anchors enumerate EVERY perimeter-flush position), and
                // interior units that must touch something already fixed
                // (every rect touching a placed rect is flush to it, and
                // every side of every placed rect is anchored at every
                // offset). hive-004's stair, pinned to the foyer, was
                // otherwise deferred to last and refuted ~2000 times over.
                // Any other interior unit may gain options from a later
                // placement — defer it rather than declare the branch dead.
                if (unitNeedsExt[i] || gridUnit[i] || mustTouchPlaced(i)) return false;
                continue;
            }
            if (bestIdx === -1 || viable.length < best.length || (viable.length === best.length && i < bestIdx)) {
                bestIdx = i;
                best = viable;
            }
        }

        if (bestIdx === -1) return false; // only deferred interior units left, none placeable

        unplaced.delete(bestIdx);
        unplacedMinArea -= minAreaCells[bestIdx];
        for (const { subs } of ordered(bestIdx, best)) {
            nodesExplored++;
            if (nodesExplored % 50 === 0 && (performance.now() - startTime) > config.budget_ms) {
                timedOut = true;
                break;
            }
            for (const [id, r] of subs) { grid.place(r, placedIdx.length); placedIdx.push(r); placed.set(id, r); freeCells -= r.w_cells * r.h_cells; }
            if (tryNext(childLists(lists, subs, grid.occupiedPrefix()))) return true;
            for (const [id, r] of subs) { grid.remove(r); placed.delete(id); placedIdx.pop(); freeCells += r.w_cells * r.h_cells; }
            if (timedOut) break;
        }
        unplaced.add(bestIdx);
        unplacedMinArea += minAreaCells[bestIdx];
        return false;
    }

    const rootPrefix = grid.occupiedPrefix();
    const rootLists = units.map((_, u) => gridUnit[u] ? generateGrid(u, rootPrefix) : generate(u, unitNeedsExt[u] ? [] : reservedCells, true, rootPrefix));
    const solved = tryNext(rootLists);
    return {
        placed,
        failedUnitIds: solved ? undefined : units.filter(u => !u.ids.every(id => placed.has(id))).flatMap(u => u.ids),
        nodesExplored,
        timedOut,
    };
}
