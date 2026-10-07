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
    PlacedRoom,
    SolverFailure,
    SolverFailureReason
} from "../../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions } from "../types";
import { buildGraph, HiveRoom, RoomGraph, ZoneType } from "./graph";
import { scoreLayout } from "./score";
import { BuildingFootprint, generateFootprintCandidates } from "./shapes";
import { solvePlacement } from "./solver";
import { SolverConfig, ReservedRect } from "./solver/types";
import { GRID_RESOLUTION_M } from "./solver/units";
import { ValidationIssue } from "./placement_validator";
import { solveGapfree } from "./gapfree/solve";

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

// Cap on the whole strict portfolio. Briefs that solve do so in well under
// a second (20-seed sweeps: 0.05-0.4s); a brief that hasn't solved after
// this long is a fallback case, and every footprint it still had to fail
// was another few seconds of frozen page (villas: ~14s before the cap).
const STRICT_TOTAL_MS = 6000;

// Fallback (owner request 2026-10-02): when no footprint solves strictly,
// lay the plan out with every soft requirement as a preference and flag
// what was given up, rather than return nothing. Every footprint × a few
// seeds, best compromise cost wins (see fallbackPlan). Without adjacency/
// window/reach constraints each attempt is a plain packing search and
// normally finishes in ~0.1s.
// Measured: a fallback attempt that succeeds takes 50–100ms; one that
// doesn't would burn its whole budget, so the budget stays short.
const FALLBACK_FLOOR_BUDGET_MS = 300;
const FALLBACK_SEEDS = 3;
const FALLBACK_TOTAL_MS = 1500;

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
    layoutMode: 'grid' | 'free' | 'gapfree';
}

function prepareProgram(program: SpatialProgram, options?: SolverOptions): PreparedProgram {
    const sourceRooms: any[] = (program as any).rooms ?? [];
    const briefRef  = (program as any).brief_reference ?? {};
    const briefStoreys = briefRef.floors ?? briefRef.storeys ?? 1;
    const storeys   = options?.floors_override ?? briefStoreys;

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
    const seedNum = options?.seed ?? Math.floor(Math.random() * 2 ** 31);

    return { hiveRooms, graph, rooms, isDuplex, storeys, seedNum, layoutMode: options?.layoutMode ?? 'free' };
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
    attemptSeed: number,
    fallback: boolean = false
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
    let unsatProven = true; // stays true only if every UNSAT floor was proven
    let failure: SolverFailure | undefined;
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
            { placeStairwell: floorIndex === 0 && isDuplex, fallback, bayGrid: prepared.layoutMode === 'grid' && floorIndex === 0 });

        if (result.status === 'TIMEOUT') finalStatus = 'TIMEOUT';
        else if (result.status === 'UNSAT' && finalStatus !== 'TIMEOUT') finalStatus = 'UNSAT';
        else if (result.status === 'SOLVED_RELAXED' && finalStatus === 'SOLVED') finalStatus = 'SOLVED_RELAXED';
        if (result.status === 'UNSAT' && !result.diagnostics.proven) unsatProven = false;

        if (result.status === 'UNSAT' || result.status === 'TIMEOUT') {
            anyFloorUnsolved = true;
            failure = { floor: floorIndex, reasons: failureReasons(result) };
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
        solver_unsat_proven:     finalStatus === 'UNSAT' ? unsatProven : undefined,
        solver_failure:          failure,
        placement_issues:        allIssues,
    };
}

/** Why one floor failed, as error-taxonomy codes: the feasibility checks
 * that rejected it, else S-002 (out of time) or S-001 (search exhausted). */
function failureReasons(result: { status: string; diagnostics: { failedChecks?: SolverFailureReason[] } }): SolverFailureReason[] {
    if (result.diagnostics.failedChecks?.length) {
        return result.diagnostics.failedChecks.map(({ code, detail, rooms, values }) => ({ code, detail, rooms, values }));
    }
    return result.status === 'TIMEOUT'
        ? [{ code: 'S-002', detail: 'search ran out of time before every room could be placed' }]
        : [{ code: 'S-001', detail: 'no placement satisfies every requirement, even after relaxation' }];
}

/** One failure for a whole portfolio: the lowest floor that failed, with
 * the reasons EVERY footprint attempt on it hit — a reason only some
 * shapes hit (e.g. a T-shape short on area) isn't why the brief failed,
 * and would send the user cutting rooms for nothing. If none is shared,
 * the search failures (S-*) are reported, else all. Rooms merged per code. */
function mergeFailures(failures: SolverFailure[]): SolverFailure | undefined {
    if (failures.length === 0) return undefined;
    const floor = Math.min(...failures.map(f => f.floor));
    const onFloor = failures.filter(f => f.floor === floor);
    const byCode = new Map<string, SolverFailureReason>();
    for (const r of onFloor.flatMap(f => f.reasons)) {
        const seen = byCode.get(r.code);
        if (!seen) byCode.set(r.code, { ...r, rooms: r.rooms ? [...r.rooms] : undefined });
        else if (r.rooms) seen.rooms = [...new Set([...(seen.rooms ?? []), ...r.rooms])];
    }
    const all = [...byCode.values()];
    const shared = all.filter(r => onFloor.every(f => f.reasons.some(x => x.code === r.code)));
    if (shared.length > 0) return { floor, reasons: shared };
    // Nothing shared: a shape that passed the feasibility gate and still
    // failed in the search is the real story; gate rejections then only
    // describe the other shapes.
    const search = all.filter(r => r.code.startsWith('S-'));
    return { floor, reasons: search.length > 0 ? search : all };
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
): { successes: SolvedLayout[]; lastAttempt: SolvedLayout; graph: RoomGraph } {
    const prepared = prepareProgram(program, options);
    const groundNonCirc = prepared.rooms.filter(r => r.floor === 0 && r.zone !== 'circ');
    // The busier floor's room areas (circulation included) size the footprint.
    const floorArea = new Map<number, number>();
    for (const r of prepared.rooms) floorArea.set(r.floor, (floorArea.get(r.floor) ?? 0) + r.area);
    const candidates = generateFootprintCandidates(
        envelope.width, envelope.depth, envelope.setbacks, groundNonCirc.length,
        Math.max(0, ...floorArea.values())
    );

    const successes: SolvedLayout[] = [];
    const attempts: SolvedLayout[] = [];
    let lastAttempt: SolvedLayout | undefined;

    const strictStart = performance.now();
    outer: for (let c = 0; c < candidates.length; c++) {
        if (performance.now() - strictStart > STRICT_TOTAL_MS) break;
        const footprint = snapFootprintToGrid(candidates[c]);
        for (let retry = 0; retry < RETRIES_PER_CANDIDATE; retry++) {
            const attemptSeed = prepared.seedNum + c * ATTEMPT_SEED_CANDIDATE_STRIDE + retry * ATTEMPT_SEED_RETRY_STRIDE;
            const result = attemptWithFootprint(program, envelope, prepared, footprint, CANDIDATE_FLOOR_BUDGET_MS, attemptSeed);
            lastAttempt = result;
            attempts.push(result);
            if (isFullSuccess(result)) {
                successes.push(result);
                if (stopAtFirstSuccess) break outer;
                break; // this candidate already has a success — move to the next shape, not another retry of it
            }
        }
    }

    const failed = summarizeFailures(attempts, lastAttempt!);
    if (successes.length === 0) {
        const plan = fallbackPlan(program, envelope, prepared, candidates, failed);
        if (plan) successes.push(plan);
    }
    return { successes, lastAttempt: failed, graph: prepared.graph };
}

/** How bad a fallback plan's compromises are, for picking the best one:
 * no front entrance is worst; an unreachable room or a room with no
 * outside wall outweighs a missed
 * adjacency, which outweighs a resized room. Advisory bath notes are free. */
const COMPROMISE_WEIGHT: Record<string, number> = {
    NO_FRONT_ENTRANCE: 8, CORRIDOR_ADJACENCY: 5, EXTERNAL_WALL: 4, ADJACENCY_MISSED: 2, AREA_ADJUSTED: 1, BATH_VENTILATION: 0,
};
const compromiseCost = (l: SolvedLayout) =>
    (l.placement_issues ?? []).reduce((s, i) => s + (COMPROMISE_WEIGHT[i.rule] ?? 1), 0);

/** A complete plan with flagged compromises, or undefined if even the
 * fallback can't place every room (then the strict failure is reported).
 * Each attempt is a plain packing search and usually takes ~0.1s, so it
 * tries every footprint with a few seeds (within FALLBACK_TOTAL_MS) and
 * keeps the plan whose compromises cost least. Carries the strict failure
 * so the UI can say why it compromised. */
function fallbackPlan(
    program: SpatialProgram, envelope: PlotEnvelope, prepared: PreparedProgram,
    candidates: BuildingFootprint[], strictFailure: SolvedLayout
): SolvedLayout | undefined {
    const start = performance.now();
    let best: SolvedLayout | undefined;
    outer: for (let retry = 0; retry < FALLBACK_SEEDS; retry++) {
        for (let c = 0; c < candidates.length; c++) {
            if (best && performance.now() - start > FALLBACK_TOTAL_MS) break outer;
            const seed = prepared.seedNum + c * ATTEMPT_SEED_CANDIDATE_STRIDE + retry * ATTEMPT_SEED_RETRY_STRIDE;
            const result = attemptWithFootprint(program, envelope, prepared, snapFootprintToGrid(candidates[c]), FALLBACK_FLOOR_BUDGET_MS, seed, true);
            if (isFullSuccess(result) && (!best || compromiseCost(result) < compromiseCost(best))) best = result;
        }
    }
    if (!best) return undefined;
    console.warn(`[SOLVER_V2] strict solve failed; fallback plan with ${best.placement_issues?.length ?? 0} flagged compromise(s)`);
    return { ...best, solver_fallback: true, solver_failure: strictFailure.solver_failure };
}

/** The status a failed portfolio reports must describe every attempt, not
 * just the last: TIMEOUT if any attempt ran out of clock (a later footprint
 * failing fast proves nothing about it), otherwise UNSAT — proven only if
 * every attempt was proven. Geometry is still the last attempt's. */
function summarizeFailures(attempts: SolvedLayout[], last: SolvedLayout): SolvedLayout {
    if (isFullSuccess(last)) return last;
    const anyTimeout = attempts.some(a => a.solver_status === 'TIMEOUT');
    return {
        ...last,
        solver_status: anyTimeout ? 'TIMEOUT' : 'UNSAT',
        solver_unsat_proven: anyTimeout ? undefined : attempts.every(a => a.solver_unsat_proven === true),
        solver_failure: mergeFailures(attempts.flatMap(a => a.solver_failure ? [a.solver_failure] : [])),
    };
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
    if (options?.layoutMode === 'gapfree') return solveGapfree(program, envelope, options);
    const { successes, lastAttempt } = solveLayoutCandidates(program, envelope, options, /* stopAtFirstSuccess */ true);
    return successes[0] ?? lastAttempt;
}

/** Every candidate footprint that produced a complete, valid layout (up
 * to `maxVariants`), for a UI that wants to offer several real options
 * from one prompt instead of committing to whichever one the RNG picked.
 * Each success carries its Phase 5 layout_score and the list is sorted
 * best-first, so [0] is the recommended option. Falls back to the last
 * (failed) attempt, same as solveLayoutV2, if nothing solved at all —
 * callers always get at least one result. */
export function solveLayoutVariants(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions,
    maxVariants: number = 4
): SolvedLayout[] {
    // The gap-free engine returns its one best plan (its search already
    // compares every footprint); no separate options list yet.
    if (options?.layoutMode === 'gapfree') return [solveGapfree(program, envelope, options)];
    const { successes, lastAttempt, graph } = solveLayoutCandidates(program, envelope, options, /* stopAtFirstSuccess */ false);
    if (successes.length === 0) return [lastAttempt];
    return successes
        .map(layout => ({ ...layout, layout_score: scoreLayout(layout, graph) }))
        .sort((a, b) => b.layout_score.total - a.layout_score.total)
        .slice(0, maxVariants);
}
