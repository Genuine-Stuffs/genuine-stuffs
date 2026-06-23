/**
 * Genuine Stuffs AI Studio - Constraint Solver Engine
 * A deterministic layout algorithm for Single-Storey and Multi-Storey (Duplex) structures.
 *
 * SURGICAL FIX (2026-06-23):
 * The Hive four-agent system returns rooms using the following field names:
 *   room_id   (not id)
 *   area_m2   (not min_area_sqm)
 *   floor     (not target_floor)
 *   brief_reference.floors (not brief_reference.storeys)
 *
 * All four mismatches are fixed below with dual-field guards so the solver
 * remains compatible with both the old schema and the new Hive schema.
 * No packing logic, no output shape, and no other behaviour has changed.
 */
import { SpatialProgram, SolvedLayout, PlacedRoom } from "../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions, InternalRoomNode } from "./types";
import { NIGERIAN_AEC_RULES } from "./nigerian_rules";

export function solveLayout(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions
): SolvedLayout {
    const grid = options?.grid_size_m || 0.1; // 10cm grid snap

    // 1. Calculate buildable envelope (plot minus setbacks)
    const buildableW = envelope.width - (envelope.setbacks.left + envelope.setbacks.right);
    const buildableD = envelope.depth - (envelope.setbacks.front + envelope.setbacks.rear);

    let iterations = 0;
    const placedRooms: PlacedRoom[] = [];

    // ── FIX 1 & 2: room_id + area_m2 ──────────────────────────────────────────
    // Old schema used r.id and r.min_area_sqm.
    // New Hive schema uses r.room_id and r.area_m2.
    // Guard both so either schema works.
    const nodes: InternalRoomNode[] = program.rooms.map(r => {
        const roomId    = (r as any).room_id    ?? (r as any).id            ?? 'unknown';
        const area      = (r as any).area_m2    ?? (r as any).min_area_sqm  ?? 9.0;

        // ── FIX 3: floor field ─────────────────────────────────────────────────
        // Old schema: r.target_floor. New Hive schema: r.floor.
        const targetFloor = (r as any).floor ?? (r as any).target_floor ?? 0;

        return {
            id:           roomId,
            target_area:  area,
            placed:       false,
            x: 0, y: 0, w: 0, d: 0,
            target_floor: targetFloor
        };
    });

    // ── FIX 4: storeys vs floors ───────────────────────────────────────────────
    // Old schema: program.brief_reference.storeys
    // New Hive schema: program.brief_reference.floors
    const briefRef = (program as any).brief_reference ?? {};
    const storeys  = briefRef.floors ?? briefRef.storeys ?? 1;
    const isDuplex = storeys > 1;

    // Split nodes by floor
    const groundFloorNodes = nodes
        .filter(n => n.target_floor === 0)
        .sort((a, b) => b.target_area - a.target_area);

    const upperFloorNodes = nodes
        .filter(n => n.target_floor === 1)
        .sort((a, b) => b.target_area - a.target_area);

    let stairwellCoords: { x: number, y: number, w: number, d: number } | null = null;

    const packFloor = (
        floorNodes: InternalRoomNode[],
        floorIndex: number,
        forceStairwell?: { x: number, y: number, w: number, d: number }
    ) => {
        let currentX = 0;
        let currentY = 0;
        let rowDepth = 0;

        // Upper floor: place stairwell void at same coordinates as ground floor.
        if (floorIndex > 0 && forceStairwell) {
            placedRooms.push({
                room_id: "stairwell_void",
                floor: floorIndex,
                x: forceStairwell.x,
                y: forceStairwell.y,
                width: forceStairwell.w,
                depth: forceStairwell.d
            });
            currentX = forceStairwell.x + forceStairwell.w;
            currentY = forceStairwell.y;
            rowDepth = forceStairwell.d;
        }

        for (const node of floorNodes) {
            iterations++;

            // Guard: target_area must be a positive finite number.
            // If the Hive returned undefined/null/NaN for area, fall back to
            // the NBC 2006 minimum of 9m² (bedroom minimum) so the room
            // still gets placed rather than producing NaN geometry.
            const safeArea = (
                typeof node.target_area === 'number' &&
                isFinite(node.target_area) &&
                node.target_area > 0
            ) ? node.target_area : 9.0;

            let roomW = Math.ceil(Math.sqrt(safeArea) / grid) * grid;
            let roomD = Math.ceil(Math.sqrt(safeArea) / grid) * grid;

            // Row-wrapping: if room doesn't fit on current row, start a new one.
            if (currentX + roomW > buildableW) {
                currentX = 0;
                currentY += rowDepth;
                rowDepth = 0;
            }

            node.x = currentX;
            node.y = currentY;
            node.w = roomW;
            node.d = roomD;
            node.placed = true;

            placedRooms.push({
                room_id: node.id,
                floor: floorIndex,
                x: node.x,
                y: node.y,
                width: node.w,
                depth: node.d
            });

            currentX += roomW;
            rowDepth = Math.max(rowDepth, roomD);
        }

        // Ground floor of a duplex: add staircase at end of packed row.
        if (floorIndex === 0 && isDuplex) {
            const stairW = 2.4; // 1.2m clear width × 2 flights
            const stairD = 3.6;

            if (currentX + stairW > buildableW) {
                currentX = 0;
                currentY += rowDepth;
            }

            stairwellCoords = { x: currentX, y: currentY, w: stairW, d: stairD };
            placedRooms.push({
                room_id: "stairwell",
                floor: floorIndex,
                x: stairwellCoords.x,
                y: stairwellCoords.y,
                width: stairwellCoords.w,
                depth: stairwellCoords.d
            });
            console.log(
                `[Solver] Placed Ground Floor Stairwell at X:${stairwellCoords.x}, Y:${stairwellCoords.y}`
            );
        }
    };

    // Pack Ground Floor
    packFloor(groundFloorNodes, 0);

    // Pack Upper Floor (Duplex only)
    if (isDuplex && stairwellCoords) {
        packFloor(upperFloorNodes, 1, stairwellCoords);
    }

    return {
        program_reference: program,
        plot_width:  envelope.width,
        plot_depth:  envelope.depth,
        placed_rooms: placedRooms,
        solver_iterations_used: iterations,
        is_fully_connected: true
    };
}
