/**
 * Genuine Stuffs AI Studio · Solver V2 · Relaxation Ladder
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b (reopened) · July 2026
 *
 * Rungs BASE and RELAX-AREA-20 enforce the full mustTouchPairs list;
 * RELAX-SOFT-ADJ and RELAX-MINWIDTH drop non-hub pairs (hub connectivity
 * is never sacrificed). Each rung is pre-screened with a planarity bound
 * (E ≤ 3V−6): rect contact graphs are planar, so a rung whose required
 * adjacency graph violates the bound is geometrically unsatisfiable and
 * is skipped without burning search budget — this is what turns
 * over-constrained briefs into fast, PROVEN UNSAT instead of timeouts.
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
    mustTouchPairs: AdjacencyPair[],
    floorIndex: number,
    reservedRects: ReservedRect[] = []
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
    const V = units.reduce((s, u) => s + u.ids.length, 0);
    const suiteEdges = units.reduce((s, u) => s + (u.isSuite && u.suite ? u.suite.subIds.length : 0), 0);
    let totalNodesExplored = 0;

    for (let r = 0; r < rungs.length; r++) {
        const rung = rungs[r];
        const remaining = baseConfig.budget_ms - (performance.now() - startTime);
        if (remaining <= 0) {
            return { status: 'TIMEOUT', placements: [], relaxationsApplied: applied, issues: [], diagnostics: { elapsed_ms: performance.now() - startTime, nodesExplored: totalNodesExplored } };
        }

        // BUG FIX: budget was shared across rungs, so a BASE timeout
        // starved every relaxed rung — the ladder was unreachable in the
        // common case. Each rung now gets an equal share of what's left
        // (v1.0 Phase 5 precedent: sequential attempts split the budget
        // evenly). Rungs that fail fast (planarity skip, quick UNSAT)
        // roll unused time forward automatically via `remaining`.
        const rungBudget = remaining / (rungs.length - r);

        // Planarity fail-fast: suite edges are real adjacencies too, so
        // they count toward E. Necessary condition only — passing this
        // does NOT imply satisfiable; failing it PROVES unsatisfiable.
        const E = rung.pairs.length + suiteEdges;
        if (V >= 3 && E > 3 * V - 6) {
            if (rung.name !== 'BASE') applied.push(rung.name);
            continue; // provably UNSAT at this rung — try the next relaxation
        }

        const outcome = search(units, graph, buildGrid(), combinedW_m, combinedH_m, { ...rung.config, budget_ms: rungBudget }, dimensionHints, rung.pairs, floorIndex, reservedRects);
        totalNodesExplored += outcome.nodesExplored;
        
        if (rung.name !== 'BASE') applied.push(rung.name);

        if (!outcome.failedUnitIds || outcome.failedUnitIds.length === 0) {
            return {
                status: applied.length === 0 ? 'SOLVED' : 'SOLVED_RELAXED',
                placements: toPlacedRects(outcome.placed),
                relaxationsApplied: applied,
                issues: [],
                diagnostics: { elapsed_ms: performance.now() - startTime, nodesExplored: totalNodesExplored },
            };
        }
    }

    // Determine if the search space was exhausted or if it just ran out of time
    const elapsed = performance.now() - startTime;
    const finalStatus = (elapsed >= baseConfig.budget_ms - 50) ? 'TIMEOUT' : 'UNSAT';
    
    return { status: finalStatus, placements: [], relaxationsApplied: applied, issues: [], diagnostics: { elapsed_ms: elapsed, nodesExplored: totalNodesExplored } };
}
