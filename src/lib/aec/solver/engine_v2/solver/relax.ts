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
import { SolverConfig, SolveResult, PlacedRect, RoomDimensionHint, ReservedRect } from './types';
import { RoomGraph, AdjacencyPair } from '../graph';
import { search, SearchUnit, SearchOutcome, ReachRules } from './search';
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
    reservedRects: ReservedRect[] = [],
    reach?: ReachRules
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
    const suiteEdges = units.reduce((s, u) => s + (u.isSuite && u.suite ? u.suite.subIds.length : 0), 0);
    const suiteRoomIds = units.flatMap(u => u.isSuite && u.suite && u.suite.subIds.length > 0 ? u.ids : []);
    let totalNodesExplored = 0;
    // A rung that ran out of clock says nothing about the program, and
    // neither does one that exhausted its capped candidate set. Only a
    // ladder where EVERY rung was ruled out by the planarity bound is a
    // proof — anything else must not be reported as one.
    let anyRungTimedOut = false;
    let anyRungSearched = false;

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
        // V counts only rooms that HAVE an edge: the bound holds for any
        // subgraph of a planar graph, and edgeless units (the solver-placed
        // corridor, with no declared adjacencies) only loosen it — hive-101's
        // K6 slipped through as soon as the corridor made V = 7.
        const E = rung.pairs.length + suiteEdges;
        const V = new Set([...rung.pairs.flatMap(p => [p.a, p.b]), ...suiteRoomIds]).size;
        if (V >= 3 && E > 3 * V - 6) {
            if (rung.name !== 'BASE') applied.push(rung.name);
            continue; // provably UNSAT at this rung — try the next relaxation
        }

        const outcome = search(units, graph, buildGrid(), combinedW_m, combinedH_m, { ...rung.config, budget_ms: rungBudget }, dimensionHints, rung.pairs, floorIndex, reservedRects, reach);
        totalNodesExplored += outcome.nodesExplored;
        anyRungSearched = true;
        if (outcome.timedOut) anyRungTimedOut = true;
        
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

    // TIMEOUT if any rung was stopped by the clock (a later rung failing
    // fast doesn't make an earlier rung's timeout a proof); otherwise
    // UNSAT, proven only when no rung needed a search at all.
    const elapsed = performance.now() - startTime;
    const finalStatus = (anyRungTimedOut || elapsed >= baseConfig.budget_ms - 50) ? 'TIMEOUT' : 'UNSAT';
    const proven = finalStatus === 'UNSAT' && !anyRungSearched;

    return { status: finalStatus, placements: [], relaxationsApplied: applied, issues: [], diagnostics: { elapsed_ms: elapsed, nodesExplored: totalNodesExplored, proven } };
}
