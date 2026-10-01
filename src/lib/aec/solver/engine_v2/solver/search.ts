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
import { RoomGraph, Suite, deriveSuites, identifyHubs, AdjacencyPair } from '../graph';
import { BuildingFootprint } from '../shapes';
import { RoomSpec, enumerateCandidates } from './candidates';
import { insideFootprint, mustTouchSatisfied } from './constraints';

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

    // Sub-rooms (bath/wardrobe) never need a window (SUB_ROOM_TYPES,
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

export interface SearchOutcome {
    placed: Map<string, RectCells>;
    failedUnitIds?: string[];
    nodesExplored: number;
}

/** Depth-first backtracking, budget-checked every 200 nodes (D4). */
export function search(
    units: SearchUnit[], graph: RoomGraph, grid: OccupancyGrid,
    combinedW_m: number, combinedH_m: number,
    config: SolverConfig, dimensionHints: Map<string, RoomDimensionHint>,
    mustTouchPairs: AdjacencyPair[],
    floorIndex: number,
    reservedRects: ReservedRect[] = []
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

    function cellsToRectM(r: RectCells): PlacedRect {
        return { id: '', x_m: cellsToMeters(r.x_cells), y_m: cellsToMeters(r.y_cells), w_m: cellsToMeters(r.w_cells), h_m: cellsToMeters(r.h_cells) };
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
            const otherRect = placed.get(otherId);
            if (!otherRect) continue; // not yet placed — checked when its own turn comes
            if (!mustTouchSatisfied(cellsToRectM(rect), cellsToRectM(otherRect)).pass) return false;
        }
        return true;
    }

    let timedOut = false;

    // ── v1.0 spec, Session 3b step 5, finally implemented ──────────────────────
    // Feasibility pruning: before recursing, remaining free cells must
    // cover the minimum possible area of every unplaced unit. Tracked as
    // a running sum rather than a suffix array, since MRV (below) places
    // units in a dynamic order, not index order.
    const cellArea = GRID_RESOLUTION_M * GRID_RESOLUTION_M;
    const minAreaCells = units.map(u =>
        Math.floor((u.totalArea_m2 / cellArea) * (1 - config.areaTolerance)));
    let unplacedMinArea = minAreaCells.reduce((s, a) => s + a, 0);
    let freeCells = grid.countFreeCells();
    const unplaced = new Set<number>(units.map((_, i) => i));

    // ── I5 enforcement (invariant table finally made true) ─────────────────
    const SUB_ROOM_TYPES = new Set(['bathroom', 'wardrobe', 'dressing']);
    const needsExternalWall = (id: string): boolean => {
        const n = graph.nodes.get(id);
        if (!n) return false;
        return n.zone !== 'circ' && !SUB_ROOM_TYPES.has(n.type);
    };

    const centerX = grid.widthCells / 2, centerY = grid.heightCells / 2;
    const distToCenter = (c: RectCells): number => {
        const cx = c.x_cells + c.w_cells / 2, cy = c.y_cells + c.h_cells / 2;
        return (cx - centerX) ** 2 + (cy - centerY) ** 2;
    };
    const hubIds = new Set(identifyHubs(graph, floorIndex).map(h => h.id));

    const reservedCells: RectCells[] = reservedRects.map(r => ({
        x_cells: metersToCellsFloor(r.x_m), y_cells: metersToCellsFloor(r.y_m),
        w_cells: metersToCells(r.w_m), h_cells: metersToCells(r.h_m)
    }));

    /** Every placement of `unit` that is legal RIGHT NOW against what's
     * already placed — footprint, adjacency, I5 and overlap all checked
     * up front, in the order the search will try them. Doing the full
     * check here (rather than lazily inside the loop) is what lets MRV
     * see a unit's true remaining option count, and makes a zero count
     * a proven dead end for the current partial placement. */
    function viablePlacements(unit: SearchUnit, prefix: Int32Array): Array<Map<string, RectCells>> {
        const spec: RoomSpec = {
            id: unit.ids[0], targetArea_m2: unit.totalArea_m2, minWidth_m: 2.4,
            dimensionHint: unit.ids.length === 1 ? dimensionHints.get(unit.ids[0]) : undefined,
        };
        const ctx = {
            placedRects: [...placedIdx, ...reservedCells],
            gridW_cells: grid.widthCells,
            gridH_cells: grid.heightCells,
        };

        // I5 pre-filter: if the unit's primary room needs an external
        // wall, only perimeter-touching outers are viable (the bedroom
        // lives inside the outer, so a non-touching outer can never
        // yield a touching bedroom). This collapses the candidate space
        // from O(W×H) to O(perimeter) for most rooms — the single
        // biggest search-space reduction in this change.
        const unitNeedsExt = needsExternalWall(unit.ids[0]);

        // Filter BEFORE ordering: MRV scores every unplaced unit at every
        // node, so sorting thousands of raw candidates (each comparison
        // re-running mustTouchSatisfied) just to discard most of them was
        // the dominant per-node cost. Cheapest checks run first.
        const viable: Array<Map<string, RectCells>> = [];
        for (const cand of enumerateCandidates(spec, ctx, config.areaTolerance)) {
            if (unitNeedsExt && !grid.touchesPerimeter(cand)) continue;
            // Sub-rooms subdivide the outer rect, so an empty outer
            // implies empty subs — one O(1) check covers the whole unit.
            if (!grid.isFreeIn(prefix, cand)) continue;
            const rect: PlacedRect = { id: unit.ids[0], x_m: cellsToMeters(cand.x_cells), y_m: cellsToMeters(cand.y_cells), w_m: cellsToMeters(cand.w_cells), h_m: cellsToMeters(cand.h_cells) };
            if (!insideFootprint(rect, combinedW_m, combinedH_m).pass) continue;

            const subs = unit.isSuite && unit.suite ? subdivideSuite(cand, unit.suite, grid.widthCells, grid.heightCells) : new Map([[unit.ids[0], cand]]);

            // Adjacency is checked against each sub-room's true rect — a
            // pair naming a specific bath/wardrobe id must be verified
            // against where that sub-room actually lands, not the suite's
            // outer bounding box.
            let adjacencyOk = true;
            for (const [id, r] of subs) {
                if (!adjacencySatisfiedFor(id, r)) { adjacencyOk = false; break; }
            }
            if (!adjacencyOk) continue;

            // I5 acceptance: per-room, post-subdivision — the bedroom's
            // TRUE rect must touch, not just the suite's outer box.
            let externalOk = true;
            for (const [id, r] of subs) {
                if (needsExternalWall(id) && !grid.touchesPerimeter(r)) { externalOk = false; break; }
            }
            if (!externalOk) continue;

            viable.push(subs);
        }

        // Every survivor already touches all placed must-touch neighbors,
        // so ordering reduces to proximity to them; with none placed yet,
        // random (seeded) order, as before.
        const relevantPairs = pairsByRoom.get(unit.ids[0]);
        // Note: activeNeighbors is computed only against unit.ids[0] (the bedroom),
        // not sub-room ids. Sub-room adjacencies outside their suite aren't declared by Hive currently.
        const activeNeighbors = relevantPairs
            ? relevantPairs.map(p => p.a === unit.ids[0] ? p.b : p.a).filter(id => placed.has(id)).map(id => placed.get(id)!)
            : [];
        const keyed = viable.map(subs => {
            const c = subs.get(unit.ids[0])!;
            let key = 0;
            if (activeNeighbors.length > 0) {
                const cx = c.x_cells + c.w_cells / 2, cy = c.y_cells + c.h_cells / 2;
                for (const n of activeNeighbors) key += (cx - (n.x_cells + n.w_cells / 2)) ** 2 + (cy - (n.y_cells + n.h_cells / 2)) ** 2;
            } else {
                key = rng();
            }
            return { subs, key };
        });
        keyed.sort((a, b) => a.key - b.key);
        return keyed.map(k => k.subs);
    }

    /** MRV (most-constrained-variable) dynamic ordering + forward check.
     * The static orderUnits() ranking was decided once, up front, and
     * could not react to how constrained a unit became mid-search: when a
     * later unit lost its last viable spot, chronological backtracking
     * kept re-shuffling the units in between before ever revisiting the
     * cause. Now every step recomputes each unplaced unit's viable
     * placements, fails immediately if a perimeter-bound unit has none
     * left, and branches on whichever unit has the fewest. Ties fall back
     * to the static order, so the hub-first / must-touch BFS preference
     * still decides between equally constrained units.
     * Measured (20 seeds, hive-001 + hive-002): avg solve 1.0s/0.8s ->
     * 0.3s/0.1s, strict SOLVED (no relaxation) 29/40 -> 37/40. */
    function tryNext(): boolean {
        if (timedOut) return false;
        if (unplaced.size === 0) return true;
        // Feasibility prune — cheapest possible dead-branch detector.
        if (freeCells < unplacedMinArea) return false;
        if ((performance.now() - startTime) > config.budget_ms) {
            timedOut = true;
            return false;
        }

        let bestIdx = -1;
        let best: Array<Map<string, RectCells>> = [];
        const prefix = grid.occupiedPrefix();
        for (const i of unplaced) {
            const viable = viablePlacements(units[i], prefix);
            if (viable.length === 0) {
                // Forward check — sound only for perimeter-bound units:
                // boundary anchors enumerate EVERY perimeter-flush position,
                // so their option set can only shrink as rooms are placed.
                // An interior unit's candidates also anchor on placed rects,
                // so a later placement can create options it lacks now —
                // defer it rather than declaring the branch dead.
                if (needsExternalWall(units[i].ids[0])) return false;
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
        for (const subs of best) {
            nodesExplored++;
            if (nodesExplored % 50 === 0 && (performance.now() - startTime) > config.budget_ms) {
                timedOut = true;
                break;
            }
            for (const [id, r] of subs) { grid.place(r, placedIdx.length); placedIdx.push(r); placed.set(id, r); freeCells -= r.w_cells * r.h_cells; }
            if (tryNext()) return true;
            for (const [id, r] of subs) { grid.remove(r); placed.delete(id); placedIdx.pop(); freeCells += r.w_cells * r.h_cells; }
            if (timedOut) break;
        }
        unplaced.add(bestIdx);
        unplacedMinArea += minAreaCells[bestIdx];
        return false;
    }

    const solved = tryNext();
    return {
        placed,
        failedUnitIds: solved ? undefined : units.filter(u => !u.ids.every(id => placed.has(id))).flatMap(u => u.ids),
        nodesExplored,
    };
}
