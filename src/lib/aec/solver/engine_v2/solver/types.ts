/**
 * Genuine Stuffs AI Studio · Solver V2 · Solver Data Contracts
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3a · July 2026
 *
 * Per Master Plan v2.0, Part D: imports graph.ts's own types directly —
 * no duplicate room type invented here. PlacedRect uses explicit _m
 * suffixes (D3 discipline) and is intentionally distinct from the
 * production PlacedRoom (schema.ts) — index.ts translates between the
 * two at the Phase 4 "Wire In" boundary, not here.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { RoomGraph, GraphNode, ZoneType, Suite, AdjacencyPair } from '../graph';
import { BuildingFootprint } from '../shapes';
export type { ValidationIssue } from '../placement_validator';

// Re-export graph types so consumers of this module get a single import
export type { RoomGraph, GraphNode, ZoneType, Suite, AdjacencyPair };
export type { BuildingFootprint };

export interface ReservedRect {
    id: string;
    type: string;
    x_m: number; y_m: number; w_m: number; h_m: number;
}

export interface SolverConfig {
    budget_ms: number;      // default 6000 (D4)
    areaTolerance: number;  // default 0.10, relaxable to 0.20 (relax.ts, Session 3b)
    seed: number;           // passed through to shapes.ts's createRng
}

export interface PlacedRect {
    id: string;
    x_m: number; y_m: number; w_m: number; h_m: number;
}

export type SolveStatus = 'SOLVED' | 'SOLVED_RELAXED' | 'UNSAT' | 'TIMEOUT';

export interface SolveResult {
    status: SolveStatus;
    placements: PlacedRect[];       // empty unless status starts with SOLVED (I6)
    relaxationsApplied: string[];
    issues: import('../placement_validator').ValidationIssue[];
    diagnostics: { elapsed_ms: number; nodesExplored: number; failedRoomId?: string };
}

// ── Structural rigidity classification (Session 3a decision, consumed by
// candidates.ts in Session 3b) ─────────────────────────────────────────────
//
// The real Hive payload supplies width_m/span_m per room, and for rooms
// flagged uses_intermediate_columns, a structural_notes field describing
// an exact column position computed against that specific span. Enumerating
// candidate (w,h) pairs purely by area tolerance — as v1.0's candidates.ts
// did, and as this phase's task list says to port — would let the solver
// silently place such a room at dimensions its own structural_notes no
// longer describes, which structural.ts (explicitly untouched, still
// trusting placed_rooms geometry) would then derive columns/beams against
// incorrectly.
//
// Decision: HARD target (candidates.ts must only enumerate the declared
// width_m × span_m, no aspect-ratio search) for any room where the Hive set
// uses_intermediate_columns: true. SOFT preference (declared shape ranked
// first among otherwise-valid candidates, but the solver may deviate if
// none satisfy other constraints) for every other room. This is the
// narrowest rule that protects only what's provably load-bearing.
export type DimensionConstraintMode = 'HARD' | 'SOFT';

export interface RoomDimensionHint {
    roomId: string;
    width_m: number;
    span_m: number;
    mode: DimensionConstraintMode;
}

/**
 * Derive per-room dimension hints from the raw Hive payload. Takes the
 * raw rooms array (not GraphNode — width_m/span_m/uses_intermediate_columns
 * aren't yet part of graph.ts's HiveRoom interface; see flagged note in
 * Phase 3 Session 3a — adding uses_intermediate_columns to HiveRoom requires
 * graph.ts sign-off before Session 3b/Phase 4 wire-in).
 */
export function deriveDimensionHints(
    rawRooms: Array<{
        room_id: string;
        width_m?: number;
        span_m?: number;
        uses_intermediate_columns?: boolean;
    }>
): RoomDimensionHint[] {
    return rawRooms
        .filter(r => typeof r.width_m === 'number' && typeof r.span_m === 'number')
        .map(r => ({
            roomId: r.room_id,
            width_m: r.width_m!,
            span_m:  r.span_m!,
            mode: r.uses_intermediate_columns ? 'HARD' : 'SOFT',
        }));
}
