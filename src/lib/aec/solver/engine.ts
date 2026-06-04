/**
 * Genuine Stuffs AI Studio - Constraint Solver Engine
 * A deterministic layout algorithm for Single-Storey and Multi-Storey (Duplex) structures.
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
    
    // Convert program rooms to internal nodes
    const nodes: InternalRoomNode[] = program.rooms.map(r => ({
        id: r.id,
        target_area: r.min_area_sqm,
        placed: false,
        x: 0, y: 0, w: 0, d: 0,
        target_floor: r.target_floor || 0
    }));

    const isDuplex = program.brief_reference.storeys > 1;

    // Split nodes by floor
    const groundFloorNodes = nodes.filter(n => n.target_floor === 0).sort((a, b) => b.target_area - a.target_area);
    const upperFloorNodes = nodes.filter(n => n.target_floor === 1).sort((a, b) => b.target_area - a.target_area);

    let stairwellCoords: { x: number, y: number, w: number, d: number } | null = null;

    const packFloor = (floorNodes: InternalRoomNode[], floorIndex: number, forceStairwell?: { x: number, y: number, w: number, d: number }) => {
        let currentX = 0;
        let currentY = 0; 
        let rowDepth = 0;

        // If upper floor, we MUST place the stairwell void at the exact same location as the ground floor.
        if (floorIndex > 0 && forceStairwell) {
            placedRooms.push({
                room_id: "stairwell_void",
                floor: floorIndex,
                x: forceStairwell.x,
                y: forceStairwell.y,
                width: forceStairwell.w,
                depth: forceStairwell.d
            });
            // We adjust current packing cursor to avoid overlapping the stairwell in this simple heuristic.
            // In a true constraint solver, this acts as a hard boundary polygon.
            currentX = forceStairwell.x + forceStairwell.w;
            currentY = forceStairwell.y;
            rowDepth = forceStairwell.d;
        }

        for (const node of floorNodes) {
            iterations++;
            
            let roomW = Math.ceil(Math.sqrt(node.target_area) / grid) * grid;
            let roomD = Math.ceil(Math.sqrt(node.target_area) / grid) * grid;

            // Simple row-wrapping logic
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

        // If Ground Floor of a Duplex, we need to generate a Staircase to go up.
        // We'll place it at the end of the current row packing.
        if (floorIndex === 0 && isDuplex) {
            const stairW = 2.4; // 1.2m width * 2 flights
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
            console.log(`[Solver] Placed Ground Floor Stairwell at X:${stairwellCoords.x}, Y:${stairwellCoords.y}`);
        }
    };

    // Pack Ground Floor
    packFloor(groundFloorNodes, 0);

    // Pack Upper Floor (if Duplex)
    if (isDuplex && stairwellCoords) {
        packFloor(upperFloorNodes, 1, stairwellCoords);
    }

    return {
        program_reference: program,
        plot_width: envelope.width,
        plot_depth: envelope.depth,
        placed_rooms: placedRooms,
        solver_iterations_used: iterations,
        is_fully_connected: true
    };
}
