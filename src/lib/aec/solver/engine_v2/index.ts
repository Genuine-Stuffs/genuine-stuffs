/**
 * Genuine Stuffs AI Studio · Solver V2 · Entry Point
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 4 · July 2026 · "Wire In"
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
import { selectFootprint, createRng } from "./shapes";
import { solvePlacement } from "./solver";
import { SolverConfig, ReservedRect } from "./solver/types";
import { ValidationIssue } from "./placement_validator";

// ──────────────────────────────────────────────────────────────────────────
// Public entry point — same signature as before
// ──────────────────────────────────────────────────────────────────────────

export function solveLayoutV2(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions
): SolvedLayout {

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

    const bW = Math.max(envelope.width - envelope.setbacks.left - envelope.setbacks.right, 8);
    const bD = Math.max(envelope.depth - envelope.setbacks.front - envelope.setbacks.rear, 8);

    const placedRooms: PlacedRoom[] = [];
    const allIssues: ValidationIssue[] = [];
    let stairCoords: { x: number; y: number; width: number; height: number } | null = null;
    let totalNodesExplored = 0;
    let anyFloorUnsolved = false;
    const floors = isDuplex ? [0, 1] : [0];

    const rng = createRng((options as any)?.seed);
    const groundNonCirc = rooms.filter(r => r.floor === 0 && r.zone !== 'circ');
    const footprint = selectFootprint(
        envelope.width, envelope.depth, envelope.setbacks,
        groundNonCirc.length, storeys, 0, rng
    );

    if (footprint.pattern) {
        console.log(`[SOLVER_V2] wing pattern=${footprint.pattern} shape=${footprint.shape}`);
    }

    const combinedW = footprint.secondary
        ? Math.max(footprint.primary.x + footprint.primary.width, footprint.secondary.x + footprint.secondary.width)
        : footprint.primary.width;
    const combinedH = footprint.secondary
        ? Math.max(footprint.primary.y + footprint.primary.height, footprint.secondary.y + footprint.secondary.height)
        : footprint.primary.height;

    const CORRIDOR_D = 1.5; // ported constant, unchanged from zones.ts::allocateZones()
    // FLAGGED FOR CONFIRMATION — zones.ts sized the ground-floor corridor
    // band by actual social-vs-private/service room area ratio (zone-
    // banding math, deleted this phase). Substituting zones.ts's own
    // FALLBACK constant (0.40 — what it used when a floor had no rooms to
    // compute a ratio from) as a fixed band position for every floor,
    // since corridor placement is now a solver pre-placement concern, not
    // a zone-sizing one. This changes band Y-position versus the old
    // area-proportional version for floors with lopsided area ratios.
    const GROUND_CORRIDOR_FRAC = 0.40;

    const seedNum = (options as any)?.seed ?? Math.floor(Math.random() * 2 ** 31);

    for (const floorIndex of floors) {
        const floorRooms = rooms.filter(r => r.floor === floorIndex);
        if (floorRooms.length === 0) continue;

        // ── Corridor band(s) — fixed geometry, unchanged responsibility ────
        const corridorBounds: Array<{ x: number; y: number; width: number; height: number }> = [];
        let corridorY: number;
        if (floorIndex === 0) {
            const socialH = footprint.primary.height * GROUND_CORRIDOR_FRAC;
            corridorY = footprint.primary.y + socialH;
        } else {
            // Upper floor: fixed band at the top — this WAS already fixed
            // in zones.ts (not area-proportional), unchanged.
            corridorY = footprint.primary.y;
        }
        corridorBounds.push({ x: footprint.primary.x, y: corridorY, width: footprint.primary.width, height: CORRIDOR_D });

        corridorBounds.forEach((band, i) => {
            placedRooms.push({
                room_id: `corridor_floor${floorIndex}_${i}`,
                floor: floorIndex, x: band.x, y: band.y, width: band.width, depth: band.height,
            });
        });

        // ── Stairwell (ground floor, duplex only) — unchanged geometry ─────
        if (floorIndex === 0 && isDuplex) {
            const stairW = 2.4, stairD = 3.6;
            const stairX = footprint.primary.x + footprint.primary.width - stairW;
            const mainCorridorY = corridorBounds[0].y;
            const stairY = Math.max(mainCorridorY - stairD, footprint.primary.y);
            stairCoords = { x: stairX, y: stairY, width: stairW, height: stairD };
            placedRooms.push({ room_id: 'stairwell', floor: 0, x: stairCoords.x, y: stairCoords.y, width: stairCoords.width, depth: stairCoords.height });
        }
        if (floorIndex === 1 && stairCoords) {
            placedRooms.push({ room_id: 'stairwell_void', floor: 1, x: stairCoords.x, y: stairCoords.y, width: stairCoords.width, depth: stairCoords.height });
        }

        // ── Reserve corridor + stairwell cells for the solver ───────────────
        // The wing-bridge (L/T-shape connectivity strip) is reserved
        // automatically inside buildFootprintGrid() — nothing to add here
        // for that; only OUR fixed rects need declaring.
        const reservedRects: ReservedRect[] = corridorBounds.map((b, i) => ({
            id: `corridor_floor${floorIndex}_${i}`, type: 'circulation',
            x_m: b.x, y_m: b.y, w_m: b.width, h_m: b.height,
        }));
        if (floorIndex === 0 && stairCoords) {
            reservedRects.push({ id: 'stairwell', type: 'stairwell', x_m: stairCoords.x, y_m: stairCoords.y, w_m: stairCoords.width, h_m: stairCoords.height });
        }
        if (floorIndex === 1 && stairCoords) {
            reservedRects.push({ id: 'stairwell_void', type: 'stairwell', x_m: stairCoords.x, y_m: stairCoords.y, w_m: stairCoords.width, h_m: stairCoords.height });
        }

        // ── Solve placement for every non-circ room on this floor ──────────
        const config: SolverConfig = { budget_ms: 6000, areaTolerance: 0.10, seed: seedNum + floorIndex };
        const result = solvePlacement(graph, footprint, floorIndex, hiveRooms, config, reservedRects);

        if (result.status === 'UNSAT' || result.status === 'TIMEOUT') {
            anyFloorUnsolved = true;
            console.warn(`[SOLVER_V2] floor ${floorIndex}: ${result.status} — ${result.diagnostics.failedRoomId ?? 'no geometry produced'}`);
        } else {
            for (const p of result.placements) {
                placedRooms.push({ room_id: p.id, floor: floorIndex, x: p.x_m, y: p.y_m, width: p.w_m, depth: p.h_m });
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
        placed_rooms:            placedRooms,
        solver_iterations_used:  totalNodesExplored,
        is_fully_connected:      !anyFloorUnsolved,
        placement_issues:        allIssues,
    };
}
