/**
 * Genuine Stuffs AI Studio · Solver V2 · Relaxation Ladder
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 *
 * RELAX-SOFT-ADJ note: findMustTouchPairs() isn't enforced as a hard
 * search constraint yet — that wiring belongs in Phase 4's integration,
 * once index.ts assembles the full pipeline end-to-end. This rung
 * currently only widens area tolerance as a stand-in. Flagged in the
 * rung name and left honest here rather than silently no-op'd.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { OccupancyGrid, RectCells } from './grid';
import { SolverConfig, SolveResult, PlacedRect, RoomDimensionHint } from './types';
import { RoomGraph, AdjacencyPair } from '../graph';
import { search, SearchUnit, SearchOutcome } from './search';
import { cellsToMeters } from './units';

function toPlacedRects(placed: Map<string, RectCells>): PlacedRect[] {
    return Array.from(placed.entries()).map(([id, r]) => ({
        id, x_m: cellsToMeters(r.x_cells), y_m: cellsToMeters(r.y_cells), w_m: cellsToMeters(r.w_cells), h_m: cellsToMeters(r.h_cells),
    }));
}

export function runWithRelaxation(
    units: SearchUnit[], graph: RoomGraph,
    buildGrid: () => OccupancyGrid,
    combinedW_m: number, combinedH_m: number,
    baseConfig: SolverConfig, dimensionHints: Map<string, RoomDimensionHint>,
    mustTouchPairs: AdjacencyPair[]
): SolveResult {
    const startTime = performance.now();
    const hubOnlyPairs = mustTouchPairs.filter(p => p.isHubEdge);

    const rungs = [
        { name: 'BASE', config: baseConfig, pairs: mustTouchPairs },
        { name: 'RELAX-AREA-20', config: { ...baseConfig, areaTolerance: 0.20 }, pairs: mustTouchPairs },
        // Drops ordinary room-to-room adjacencies only. Hub edges
        // (isHubEdge) are NEVER in this drop — a plan where every
        // bedroom fails to reach the foyer isn't a compromise, it's
        // broken, regardless of what pressure the search is under.
        { name: 'RELAX-SOFT-ADJ', config: { ...baseConfig, areaTolerance: 0.20 }, pairs: hubOnlyPairs },
        { name: 'RELAX-MINWIDTH', config: { ...baseConfig, areaTolerance: 0.25 }, pairs: hubOnlyPairs },
    ];

    const applied: string[] = [];
    for (const rung of rungs) {
        const remaining = baseConfig.budget_ms - (performance.now() - startTime);
        if (remaining <= 0) {
            return { status: 'TIMEOUT', placements: [], relaxationsApplied: applied, issues: [], diagnostics: { elapsed_ms: performance.now() - startTime, nodesExplored: 0 } };
        }
        const outcome = search(units, graph, buildGrid(), combinedW_m, combinedH_m, { ...rung.config, budget_ms: remaining }, dimensionHints, rung.pairs);
        if (rung.name !== 'BASE') applied.push(rung.name);

        if (!outcome.failedUnitIds || outcome.failedUnitIds.length === 0) {
            return {
                status: applied.length === 0 ? 'SOLVED' : 'SOLVED_RELAXED',
                placements: toPlacedRects(outcome.placed),
                relaxationsApplied: applied,
                issues: [],
                diagnostics: { elapsed_ms: performance.now() - startTime, nodesExplored: outcome.nodesExplored },
            };
        }
    }

    return { status: 'UNSAT', placements: [], relaxationsApplied: applied, issues: [], diagnostics: { elapsed_ms: performance.now() - startTime, nodesExplored: 0 } };
}
