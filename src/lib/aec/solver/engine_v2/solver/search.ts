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
import { metersToCells, cellsToMeters } from './units';
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
        grid.place({
            x_cells: metersToCells(bridge_m.x), y_cells: metersToCells(bridge_m.y),
            w_cells: Math.max(1, metersToCells(bridge_m.width)), h_cells: Math.max(1, metersToCells(bridge_m.height)),
        }, RESERVED_IDX);
    }

    // Caller-supplied fixed rects (corridor bands, stairwell) — computed
    // by index.ts's own geometry, Phase 4 wiring. Reserved the same way
    // as the wing bridge: pre-occupied cells the search must route around,
    // never a room it chooses where to put.
    for (const r of reservedRects) {
        grid.place({
            x_cells: metersToCells(r.x_m), y_cells: metersToCells(r.y_m),
            w_cells: Math.max(1, metersToCells(r.w_m)), h_cells: Math.max(1, metersToCells(r.h_m)),
        }, RESERVED_IDX);
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

export function orderUnits(units: SearchUnit[], graph: RoomGraph, floorIndex: number): SearchUnit[] {
    const hubIds = new Set(identifyHubs(graph, floorIndex).map(h => h.id));
    const hubUnits = units.filter(u => u.ids.some(id => hubIds.has(id)));
    const rest = units.filter(u => !u.ids.some(id => hubIds.has(id))).sort((a, b) => b.totalArea_m2 - a.totalArea_m2);
    return [...hubUnits, ...rest];
}

/** Ports packPrivateZone()'s bedDepth/subBounds subdivision from
 * index.ts, generalized from a single sub-room strip to N sub-rooms
 * sharing the strip side-by-side. */
function subdivideSuite(outer: RectCells, suite: Suite, gridW_cells: number, gridH_cells: number): Map<string, RectCells> {
    const SUB_DEPTH = Math.max(2, metersToCells(2.2)); // ported constant: packPrivateZone's BATH_D
    const touchesRight = (outer.x_cells + outer.w_cells) >= gridW_cells;
    const touchesLeft = outer.x_cells === 0;
    const touchesBottom = (outer.y_cells + outer.h_cells) >= gridH_cells;
    const n = suite.subIds.length;
    const result = new Map<string, RectCells>();
    if (n === 0) { result.set(suite.bedroomId, outer); return result; }

    if (touchesRight && !touchesBottom) {
        const bedW = Math.max(2, outer.w_cells - SUB_DEPTH);
        result.set(suite.bedroomId, { ...outer, w_cells: bedW });
        const slot = Math.max(1, Math.floor(outer.h_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells + bedW, y_cells: outer.y_cells + i * slot,
            w_cells: SUB_DEPTH, h_cells: i === n - 1 ? outer.h_cells - i * slot : slot,
        }));
    } else if (touchesLeft && !touchesBottom) {
        result.set(suite.bedroomId, { ...outer, x_cells: outer.x_cells + SUB_DEPTH, w_cells: outer.w_cells - SUB_DEPTH });
        const slot = Math.max(1, Math.floor(outer.h_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells, y_cells: outer.y_cells + i * slot,
            w_cells: SUB_DEPTH, h_cells: i === n - 1 ? outer.h_cells - i * slot : slot,
        }));
    } else {
        const bedH = Math.max(2, outer.h_cells - SUB_DEPTH);
        result.set(suite.bedroomId, { ...outer, h_cells: bedH });
        const slot = Math.max(1, Math.floor(outer.w_cells / n));
        suite.subIds.forEach((id, i) => result.set(id, {
            x_cells: outer.x_cells + i * slot, y_cells: outer.y_cells + bedH,
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
    mustTouchPairs: AdjacencyPair[]
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

    function tryUnit(i: number): boolean {
        if (timedOut) return false;
        if (i >= units.length) return true;
        if (nodesExplored % 200 === 0 && (performance.now() - startTime) > config.budget_ms) {
            timedOut = true;
            return false;
        }

        const unit = units[i];
        const spec: RoomSpec = {
            id: unit.ids[0], targetArea_m2: unit.totalArea_m2, minWidth_m: 2.4,
            dimensionHint: unit.ids.length === 1 ? dimensionHints.get(unit.ids[0]) : undefined,
        };
        let candidates = Array.from(enumerateCandidates(spec, grid.widthCells, grid.heightCells, config.areaTolerance));
        const relevantPairs = pairsByRoom.get(unit.ids[0]);
        const activeNeighbors = relevantPairs 
            // Note: activeNeighbors is computed only against unit.ids[0] (the bedroom), 
            // not sub-room ids. Sub-room adjacencies outside their suite aren't declared by Hive currently.
            ? relevantPairs.map(p => p.a === unit.ids[0] ? p.b : p.a).filter(id => placed.has(id)).map(id => placed.get(id)!)
            : [];
            
        if (activeNeighbors.length > 0) {
            const activeNeighborsM = activeNeighbors.map(r => cellsToRectM(r));
            candidates.sort((c1, c2) => {
                const rect1 = cellsToRectM(c1);
                const rect2 = cellsToRectM(c2);
                
                let touches1 = true;
                let touches2 = true;
                let dist1 = 0;
                let dist2 = 0;
                
                for (const nRect of activeNeighborsM) {
                    if (!mustTouchSatisfied(rect1, nRect).pass) touches1 = false;
                    if (!mustTouchSatisfied(rect2, nRect).pass) touches2 = false;
                    
                    dist1 += Math.pow((rect1.x_m + rect1.w_m/2) - (nRect.x_m + nRect.w_m/2), 2) + Math.pow((rect1.y_m + rect1.h_m/2) - (nRect.y_m + nRect.h_m/2), 2);
                    dist2 += Math.pow((rect2.x_m + rect2.w_m/2) - (nRect.x_m + nRect.w_m/2), 2) + Math.pow((rect2.y_m + rect2.h_m/2) - (nRect.y_m + nRect.h_m/2), 2);
                }
                
                // Lexicographic ordering: strictly prefer satisfying positions, fallback to sum of squared distances
                if (touches1 && !touches2) return -1;
                if (!touches1 && touches2) return 1;
                return dist1 - dist2;
            });
        } else {
            const mapped = candidates.map(c => ({ c, r: rng() }));
            mapped.sort((a, b) => a.r - b.r);
            candidates = mapped.map(x => x.c);
        }

        for (const cand of candidates) {
            nodesExplored++;
            if (nodesExplored % 50 === 0 && (performance.now() - startTime) > config.budget_ms) {
                timedOut = true;
                return false;
            }
            
            const rect: PlacedRect = { id: unit.ids[0], x_m: cellsToMeters(cand.x_cells), y_m: cellsToMeters(cand.y_cells), w_m: cellsToMeters(cand.w_cells), h_m: cellsToMeters(cand.h_cells) };
            if (!insideFootprint(rect, combinedW_m, combinedH_m).pass) continue;

            // 1. Suite Subdivision (pure geometry, fast)
            const subs = unit.isSuite && unit.suite ? subdivideSuite(cand, unit.suite, grid.widthCells, grid.heightCells) : new Map([[unit.ids[0], cand]]);
            
            // 2. Adjacency check (pure math, fast)
            // Checked AFTER subdivision, against each sub-room's true
            // rect — a pair naming a specific bath/wardrobe id must be
            // verified against where that sub-room actually lands, not
            // the suite's outer bounding box. For non-suite units this
            // collapses to the same single-rect check, so it costs
            // nothing to run uniformly.
            let adjacencyOk = true;
            for (const [id, r] of subs) {
                if (!adjacencySatisfiedFor(id, r)) { adjacencyOk = false; break; }
            }
            if (!adjacencyOk) continue;
            
            // 3. Grid overlap check (expensive iteration)
            if (![...subs.values()].every(r => grid.canPlace(r))) continue;

            for (const [id, r] of subs) { grid.place(r, placedIdx.length); placedIdx.push(r); placed.set(id, r); }
            const success = tryUnit(i + 1);
            if (success) return true;
            if (timedOut) return false;
            for (const [id, r] of subs) { grid.remove(r); placed.delete(id); placedIdx.pop(); }
        }
        return false;
    }

    const solved = tryUnit(0);
    return {
        placed,
        failedUnitIds: solved ? undefined : units.filter(u => !u.ids.every(id => placed.has(id))).flatMap(u => u.ids),
        nodesExplored,
    };
}
