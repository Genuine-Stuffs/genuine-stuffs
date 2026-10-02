/**
 * Genuine Stuffs AI Studio · Solver V2 · Entry Point
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 4 · July 2026 · "Wire In"
 * PHASE 5 · October 2026 · Footprint Portfolio
 *
 * zones.ts's front/social–side/service–rear/private banding and
 * treemap.ts's squarify are GONE. Every room is now placed directly
 * against the combined buildable footprint by solvePlacement() (Phase 3),
 * using graph.ts's real must-touch/suite/hub data instead of a hardcoded
 * "social always at the front" assumption.
 *
 * Corridor bands and the stairwell are still computed here as fixed
 * geometry (unchanged responsibility) and pre-placed into the solver's
 * occupancy grid via reservedRects — the solver treats them as already-
 * occupied cells, not rooms it chooses where to put.
 *
 * Footprint portfolio (Phase 5): rather than committing to one rng-picked
 * footprint shape and hoping the rooms fit — which an area-aware sizing
 * attempt this phase proved doesn't reliably work, since a wing can have
 * plenty of total area while still being too narrow for what ends up
 * needing it — solveLayoutV2() now tries several real candidate
 * footprints (shapes.ts's generateFootprintCandidates()) and keeps
 * whichever the solver actually completes. solveLayoutVariants() exposes
 * every candidate that solved, not just the first, for a future "pick
 * from a few options" UI; solveLayoutV2()'s signature and single-result
 * behavior are unchanged for existing callers.
 *
 * treemap.ts and zones.ts are no longer imported anywhere in this file.
 * Per Phase 4's task list, both are safe to delete once this is confirmed
 * working end-to-end — not done in this commit, pending human test.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
    SpatialProgram,
    SolvedLayout,
    PlacedRoom
} from "../../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions } from "../types";
import { buildGraph, HiveRoom, ZoneType } from "./graph";
import { BuildingFootprint, generateFootprintCandidates } from "./shapes";
import { solvePlacement } from "./solver";
import { SolverConfig, ReservedRect } from "./solver/types";
import { GRID_RESOLUTION_M } from "./solver/units";
import { ValidationIssue } from "./placement_validator";

// Per attempt, per floor. Kept short deliberately — trying several
// candidates only pays off if each one is cheap enough that the total
// stays reasonable: worst case (every attempt times out on every floor)
// is candidateCount × RETRIES_PER_CANDIDATE × floorCount × this value,
// e.g. 5 × 2 × 2 × 1200ms = 24s, and that ceiling is only ever hit if
// NOTHING solves. In practice a genuinely infeasible candidate's
// feasibility gate rejects it in under a millisecond, and an observed
// solve typically completes in under a second (see commit history) — so
// most real requests finish far faster than the worst case, and the ones
// that don't were never going to solve at any budget.
const CANDIDATE_FLOOR_BUDGET_MS = 1200;

// Same footprint, different RNG seed, can be the difference between
// SOLVED and TIMEOUT — measured directly: a plain RECTANGLE against one
// otherwise-unsolvable fixture solved on 10/20 seeds and timed out on the
// other 10, with identical geometry every time. One seed per candidate
// was leaving half of that on the table. Each retry gets a decorrelated
// seed (see ATTEMPT_SEED_STRIDE below), not a re-run of the same one.
const RETRIES_PER_CANDIDATE = 2;

// Large, mutually-coprime-ish strides so (candidateIndex, retry) pairs
// don't collide or correlate for any realistic candidate/retry count —
// exact values don't matter beyond "big and not a small multiple of
// each other"; this just needs to decorrelate xorshift32's output, not
// satisfy any cryptographic property.
const ATTEMPT_SEED_CANDIDATE_STRIDE = 7919;
const ATTEMPT_SEED_RETRY_STRIDE = 104729;

const snapDownToGrid = (m: number) => Math.floor(m / GRID_RESOLUTION_M + 1e-6) * GRID_RESOLUTION_M;

/** Aligns every footprint edge to the solver's 0.5m grid (edges move
 * inward, never out). shapes.ts produces arbitrary-precision dimensions
 * (e.g. 17.4m × 17.9m); the occupancy grid can only represent whole
 * cells, so an unaligned footprint left the corridor, stairwell and
 * wing boundaries straddling cells — rooms then overlapped fixed
 * geometry (I2) or ended short of the real perimeter wall. Snapping
 * once, here, gives the grid, the fixed geometry and the reported
 * building_width/depth one shared, exact outline. */
function snapFootprintToGrid(fp: BuildingFootprint): BuildingFootprint {
    const snap = (b: { x: number; y: number; width: number; height: number }) => {
        const x = snapDownToGrid(b.x), y = snapDownToGrid(b.y);
        return { x, y, width: snapDownToGrid(b.x + b.width) - x, height: snapDownToGrid(b.y + b.height) - y };
    };
    const primary = snap(fp.primary);
    const secondary = fp.secondary ? snap(fp.secondary) : undefined;
    return {
        ...fp, primary, secondary,
        totalArea: primary.width * primary.height + (secondary ? secondary.width * secondary.height : 0),
    };
}

interface PreparedProgram {
    hiveRooms: HiveRoom[];
    graph: ReturnType<typeof buildGraph>;
    rooms: Array<{ id: string; label: string; area: number; floor: number; zone: ZoneType; type: string }>;
    isDuplex: boolean;
    storeys: number;
    seedNum: number;
}

function prepareProgram(program: SpatialProgram, options?: SolverOptions): PreparedProgram {
    const sourceRooms: any[] = (program as any).rooms ?? [];
    const briefRef  = (program as any).brief_reference ?? {};
    const briefStoreys = briefRef.floors ?? briefRef.storeys ?? 1;
    const storeys   = (options as any)?.floors_override ?? briefStoreys;

    const hiveRooms: HiveRoom[] = sourceRooms.map((r: any, idx: number) => ({
        room_id:     r.room_id ?? r.id ?? `room_${idx}`,
        name:        r.name ?? r.room_name ?? r.room_type ?? r.category,
        type:        r.type,
        floor:       r.floor ?? r.target_floor ?? 0,
        area_m2:     r.area_m2 ?? r.min_area_sqm ?? 9.0,
        width_m:     r.width_m,
        span_m:      r.span_m,
        adjacencies: r.adjacencies ?? r.adjacent_to ?? [],
        uses_intermediate_columns: r.uses_intermediate_columns,
    }));
    const graph = buildGraph(hiveRooms);

    const rooms = sourceRooms.map((r: any, idx: number) => {
        const id = r.room_id ?? r.id ?? `room_${idx}`;
        const node = graph.nodes.get(id);
        return {
            id,
            label: r.name ?? r.room_name ?? r.room_type ?? r.category
                   ?? r.room_id ?? r.id ?? `room_${idx}`,
            area:  r.area_m2   ?? r.min_area_sqm ?? 9.0,
            floor: r.floor     ?? r.target_floor ?? 0,
            zone:  node?.zone ?? ('private' as ZoneType),
            type:  r.type ?? 'unknown',
        };
    });

    const hasUpperFloorRooms = rooms.some(r => r.floor === 1);
    const isDuplex = storeys > 1 || hasUpperFloorRooms;
    const seedNum = (options as any)?.seed ?? Math.floor(Math.random() * 2 ** 31);

    return { hiveRooms, graph, rooms, isDuplex, storeys, seedNum };
}

/** Attempt a full layout (every floor) against one specific candidate
 * footprint. Everything here was previously solveLayoutV2()'s body once
 * it had committed to a single footprint — unchanged behavior, just
 * parameterized so the portfolio loop can call it once per candidate. */
function attemptWithFootprint(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    prepared: PreparedProgram,
    footprint: BuildingFootprint,
    budgetMsPerFloor: number,
    attemptSeed: number
): SolvedLayout {
    const { hiveRooms, graph, rooms, isDuplex } = prepared;

    if (footprint.pattern) {
        console.log(`[SOLVER_V2] wing pattern=${footprint.pattern} shape=${footprint.shape}`);
    }

    const placedRooms: PlacedRoom[] = [];
    const allIssues: ValidationIssue[] = [];
    let stairCoords: { x: number; y: number; width: number; height: number } | null = null;
    let totalNodesExplored = 0;
    let anyFloorUnsolved = false;
    let finalStatus: 'SOLVED' | 'SOLVED_RELAXED' | 'TIMEOUT' | 'UNSAT' = 'SOLVED';
    const floors = isDuplex ? [0, 1] : [0];

    // Corridor and stairwell are placed by the solver itself (see
    // solver/index.ts::buildCirculation) — no fixed band, no pinned
    // stairwell. The ground floor's solved stairwell is then reserved on
    // the floor above as stairwell_void, same rect (I7).
    for (const floorIndex of floors) {
        const floorRooms = rooms.filter(r => r.floor === floorIndex);
        if (floorRooms.length === 0) continue;

        // The upper floor's stair void comes from the ground floor's
        // solution; without one there is nothing to land the stair on.
        if (floorIndex > 0 && anyFloorUnsolved) {
            console.warn(`[SOLVER_V2] floor ${floorIndex}: skipped — floor below unsolved`);
            continue;
        }

        const reservedRects: ReservedRect[] = [];
        if (floorIndex === 1 && stairCoords) {
            reservedRects.push({ id: 'stairwell_void', type: 'stairwell', x_m: stairCoords.x, y_m: stairCoords.y, w_m: stairCoords.width, h_m: stairCoords.height });
            placedRooms.push({ room_id: 'stairwell_void', floor: 1, x: stairCoords.x, y: stairCoords.y, width: stairCoords.width, depth: stairCoords.height });
        }

        const config: SolverConfig = { budget_ms: budgetMsPerFloor, areaTolerance: 0.10, seed: attemptSeed + floorIndex };
        const result = solvePlacement(graph, footprint, floorIndex, hiveRooms, config, reservedRects,
            { placeStairwell: floorIndex === 0 && isDuplex });

        if (result.status === 'TIMEOUT') finalStatus = 'TIMEOUT';
        else if (result.status === 'UNSAT' && finalStatus !== 'TIMEOUT') finalStatus = 'UNSAT';
        else if (result.status === 'SOLVED_RELAXED' && finalStatus === 'SOLVED') finalStatus = 'SOLVED_RELAXED';

        if (result.status === 'UNSAT' || result.status === 'TIMEOUT') {
            anyFloorUnsolved = true;
            console.warn(`[SOLVER_V2] floor ${floorIndex}: ${result.status} — ${result.diagnostics.failedRoomId ?? 'no geometry produced'}`);
        } else {
            for (const p of result.placements) {
                placedRooms.push({ room_id: p.id, floor: floorIndex, x: p.x_m, y: p.y_m, width: p.w_m, depth: p.h_m });
                if (p.id === 'stairwell') stairCoords = { x: p.x_m, y: p.y_m, width: p.w_m, height: p.h_m };
            }
        }
        allIssues.push(...result.issues);
        totalNodesExplored += result.diagnostics.nodesExplored;

        console.log(`[SOLVER_V2] floor ${floorIndex}: ${result.status}` +
            (result.relaxationsApplied.length ? ` (relaxed: ${result.relaxationsApplied.join(', ')})` : '') +
            ` · ${result.issues.length} issue(s) · ${result.diagnostics.elapsed_ms.toFixed(0)}ms`);
    }

    if (allIssues.length > 0) {
        console.warn(`[SOLVER_V2] ${allIssues.length} total placement issue(s) across all floors:`, allIssues);
    }

    console.log(
        `[SOLVER_V2] Phase 4 · ${placedRooms.length} rooms placed · ` +
        `duplex=${isDuplex} · floors=${floors.length} · nodesExplored=${totalNodesExplored}`
    );

    return {
        program_reference:      program,
        plot_width:              envelope.width,
        plot_depth:              envelope.depth,
        // Same combined bounding box solver/search.ts's buildFootprintGrid()
        // places into (solver/ exports only solvePlacement, so not imported).
        building_width:          footprint.secondary ? Math.max(footprint.primary.x + footprint.primary.width, footprint.secondary.x + footprint.secondary.width) : footprint.primary.width,
        building_depth:          footprint.secondary ? Math.max(footprint.primary.y + footprint.primary.height, footprint.secondary.y + footprint.secondary.height) : footprint.primary.height,
        placed_rooms:            placedRooms,
        solver_iterations_used:  totalNodesExplored,
        is_fully_connected:      !anyFloorUnsolved,
        solver_status:           finalStatus,
        placement_issues:        allIssues,
    };
}

function isFullSuccess(layout: SolvedLayout): boolean {
    return layout.solver_status === 'SOLVED' || layout.solver_status === 'SOLVED_RELAXED';
}

/** Tries every candidate footprint for this room program, in order, and
 * returns every one that produced a full success plus the final attempt
 * (for diagnostics when nothing succeeded). `stopAtFirstSuccess` skips
 * the remaining candidates once one works — used by solveLayoutV2() for
 * its existing single-result, "fast as possible" contract; solveLayoutVariants()
 * leaves it false to collect the full portfolio. */
function solveLayoutCandidates(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options: SolverOptions | undefined,
    stopAtFirstSuccess: boolean
): { successes: SolvedLayout[]; lastAttempt: SolvedLayout } {
    const prepared = prepareProgram(program, options);
    const groundNonCirc = prepared.rooms.filter(r => r.floor === 0 && r.zone !== 'circ');
    const candidates = generateFootprintCandidates(
        envelope.width, envelope.depth, envelope.setbacks, groundNonCirc.length
    );

    const successes: SolvedLayout[] = [];
    let lastAttempt: SolvedLayout | undefined;

    outer: for (let c = 0; c < candidates.length; c++) {
        const footprint = snapFootprintToGrid(candidates[c]);
        for (let retry = 0; retry < RETRIES_PER_CANDIDATE; retry++) {
            const attemptSeed = prepared.seedNum + c * ATTEMPT_SEED_CANDIDATE_STRIDE + retry * ATTEMPT_SEED_RETRY_STRIDE;
            const result = attemptWithFootprint(program, envelope, prepared, footprint, CANDIDATE_FLOOR_BUDGET_MS, attemptSeed);
            lastAttempt = result;
            if (isFullSuccess(result)) {
                successes.push(result);
                if (stopAtFirstSuccess) break outer;
                break; // this candidate already has a success — move to the next shape, not another retry of it
            }
        }
    }

    return { successes, lastAttempt: lastAttempt! };
}

// ──────────────────────────────────────────────────────────────────────────
// Public entry points — solveLayoutV2's signature is unchanged for
// existing callers (AIStudio.tsx); solveLayoutVariants is new.
// ──────────────────────────────────────────────────────────────────────────

export function solveLayoutV2(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions
): SolvedLayout {
    const { successes, lastAttempt } = solveLayoutCandidates(program, envelope, options, /* stopAtFirstSuccess */ true);
    return successes[0] ?? lastAttempt;
}

/** Every candidate footprint that produced a complete, valid layout (up
 * to `maxVariants`), for a UI that wants to offer several real options
 * from one prompt instead of committing to whichever one the RNG picked.
 * Falls back to the last (failed) attempt, same as solveLayoutV2, if
 * nothing solved at all — callers always get at least one result. */
export function solveLayoutVariants(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions,
    maxVariants: number = 4
): SolvedLayout[] {
    const { successes, lastAttempt } = solveLayoutCandidates(program, envelope, options, /* stopAtFirstSuccess */ false);
    return successes.length > 0 ? successes.slice(0, maxVariants) : [lastAttempt];
}
