/**
 * Genuine Stuffs AI Studio · Solver V2
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE A SCAFFOLD · 26 June 2026
 *
 * This is the entry point for the new treemap + adjacency-graph solver.
 * It runs alongside engine.ts behind the USE_SOLVER_V2 feature flag.
 *
 * Phase A goal: prove the wiring works end-to-end. This file returns a
 * deterministic placeholder layout with no real packing logic. The output
 * is intentionally simple — a 3-column grid of placeholder rooms — so we
 * can confirm:
 *   1. The new file imports cleanly
 *   2. Vercel builds green
 *   3. AIStudio.tsx dispatches to V2 when the flag is on
 *   4. The renderer (AECFloorPlan.tsx) accepts the V2 output
 *
 * Real algorithm comes in Phase B (treemap.ts) and Phase C (zones.ts).
 * Do not add packing logic to this file.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { SpatialProgram, SolvedLayout, PlacedRoom } from "../../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions } from "../types";

export function solveLayoutV2(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions
): SolvedLayout {
    // ── Dual-field schema guards (same pattern as engine.ts) ──────────────
    // The Hive may return either old or new schema field names.
    const sourceRooms: any[] = (program as any).rooms ?? [];
    const briefRef = (program as any).brief_reference ?? {};
    const briefStoreys = briefRef.floors ?? briefRef.storeys ?? 1;
    const storeys = (options as any)?.floors_override ?? briefStoreys;

    const nodes = sourceRooms.map((r, idx) => ({
        id:    (r as any).room_id   ?? (r as any).id           ?? `room_${idx}`,
        area:  (r as any).area_m2   ?? (r as any).min_area_sqm ?? 9.0,
        floor: (r as any).floor     ?? (r as any).target_floor ?? 0,
    }));

    // Detect duplex either from briefStoreys or from room data
    const hasUpperFloorRooms = nodes.some(n => n.floor === 1);
    const isDuplex = storeys > 1 || hasUpperFloorRooms;

    // ── PHASE A SCAFFOLD LAYOUT ───────────────────────────────────────────
    // Place rooms in a 3-column grid inside a 12m × 10m rectangle per floor.
    // This is NOT the treemap — that's Phase B. This scaffold only proves
    // the wiring works and the SolvedLayout shape is valid.
    const COLS = 3;
    const CELL_W = 4.0;
    const CELL_D = 3.5;

    const placedRooms: PlacedRoom[] = [];

    // Group by floor so each floor packs independently
    const byFloor = new Map<number, typeof nodes>();
    for (const n of nodes) {
        if (!byFloor.has(n.floor)) byFloor.set(n.floor, []);
        byFloor.get(n.floor)!.push(n);
    }

    for (const [floor, floorNodes] of byFloor.entries()) {
        floorNodes.forEach((n, idx) => {
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            placedRooms.push({
                room_id: n.id,
                floor:   floor,
                x:       col * CELL_W,
                y:       row * CELL_D,
                width:   CELL_W,
                depth:   CELL_D,
            });
        });
    }

    // Log clearly so we can confirm V2 ran (visible in browser console)
    console.log(
        `[SOLVER_V2] Phase A scaffold · ${placedRooms.length} rooms placed ` +
        `across ${byFloor.size} floor(s) · duplex=${isDuplex}`
    );

    return {
        program_reference:      program,
        plot_width:              envelope.width,
        plot_depth:              envelope.depth,
        placed_rooms:            placedRooms,
        solver_iterations_used:  0,
        is_fully_connected:      true,
    };
}
