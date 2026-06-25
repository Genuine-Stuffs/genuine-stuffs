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
        // Minimum two-column corridor grid layout
        const corridorWidth = 1.8;
        const leftColWidth = Math.min(
            Math.floor((buildableW - corridorWidth) / 2 / grid) * grid,
            9.0
        );
        const rightColWidth = leftColWidth;
        
        let leftY = 0;
        let rightY = 0;

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
            
            // Assume stairwell is placed centrally or on right
            if (forceStairwell.x >= leftColWidth) {
                rightY = forceStairwell.y + forceStairwell.d;
            } else {
                leftY = forceStairwell.y + forceStairwell.d;
            }
        }

        // Place corridor 
        const totalRoomDepth = floorNodes.reduce((sum, n) => {
            const safeArea = (typeof n.target_area === 'number' && isFinite(n.target_area) && n.target_area > 0) ? n.target_area : 9.0;
            const approxD = Math.sqrt(safeArea / 1.5); // balanced depth estimate
            return sum + approxD;
        }, 0);
        const estimatedCorridorLength = Math.min((totalRoomDepth / floorNodes.length) * 
            Math.ceil(floorNodes.length / 2) + 2.0, buildableD);

        placedRooms.push({
            room_id: `corridor_fl_${floorIndex}`,
            floor: floorIndex,
            x: leftColWidth,
            y: 0,
            width: corridorWidth,
            depth: Math.min(estimatedCorridorLength, buildableD)
        });

        for (const node of floorNodes) {
            iterations++;
            const safeArea = (typeof node.target_area === 'number' && 
                              isFinite(node.target_area) && 
                              node.target_area > 0) ? node.target_area : 9.0;

            const isLeft = leftY <= rightY;
            const colWidth = isLeft ? leftColWidth : rightColWidth;

            // KEY FIX: derive balanced dimensions, not area/fullWidth
            // Target aspect ratio between 1:1 and 1:2.5
            let roomW = Math.min(colWidth, Math.sqrt(safeArea * 1.8));
            roomW = Math.max(roomW, Math.sqrt(safeArea / 2.5)); // min width guard
            roomW = Math.min(roomW, colWidth);                  // cap at column width
            roomW = Math.round(roomW / grid) * grid;

            let roomD = Math.ceil((safeArea / roomW) / grid) * grid;

            // Enforce NBC minimum room dimensions (2.4m minimum)
            if (roomW < 2.4) { roomW = 2.4; roomD = Math.ceil((safeArea / roomW) / grid) * grid; }
            if (roomD < 2.4) { roomD = 2.4; roomW = Math.ceil((safeArea / roomD) / grid) * grid; }

            // Enforce maximum aspect ratio 1:3
            if (roomD > roomW * 3) { 
                roomD = roomW * 3; 
                roomW = Math.ceil((safeArea / roomD) / grid) * grid;
            }

            node.x = isLeft ? 0 : leftColWidth + corridorWidth;
            node.y = isLeft ? leftY : rightY;
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

            if (isLeft) leftY += roomD;
            else rightY += roomD;
        }

        // Ground floor staircase
        if (floorIndex === 0 && isDuplex) {
            const stairW = 2.4; 
            const stairD = 3.6;

            stairwellCoords = { 
                x: leftColWidth + corridorWidth, 
                y: rightY, 
                w: stairW, 
                d: stairD 
            };
            
            // Re-adjust if it spills out
            if (stairwellCoords.x + stairW > buildableW) {
                 stairwellCoords.x = buildableW - stairW;
            }

            placedRooms.push({
                room_id: "stairwell",
                floor: floorIndex,
                x: stairwellCoords.x,
                y: stairwellCoords.y,
                width: stairwellCoords.w,
                depth: stairwellCoords.d
            });
            console.log(`[Solver] Placed Ground Floor Stairwell at X:${stairwellCoords.x}, Y:${stairwellCoords.y}`);
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
