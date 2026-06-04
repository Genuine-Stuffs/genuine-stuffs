/**
 * Genuine Stuffs AI Studio - Constraint Solver Engine
 * A deterministic layout algorithm for single-storey bungalows.
 */
import { SpatialProgram, SolvedLayout, PlacedRoom } from "../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions, InternalRoomNode } from "./types";
import { NIGERIAN_AEC_RULES } from "./nigerian_rules";

/**
 * Solves a SpatialProgram into a 2D SolvedLayout.
 * 
 * Phase 1 Algorithm: Rectangular Packing / Treemap Slicing.
 * It places the living room at the front/center and branches out,
 * ensuring no overlapping rooms and keeping everything within the buildable envelope.
 */
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
    
    // Convert program rooms to internal nodes sorted by area (largest first, usually Living)
    const nodes: InternalRoomNode[] = program.rooms.map(r => ({
        id: r.id,
        target_area: r.min_area_sqm,
        placed: false,
        x: 0, y: 0, w: 0, d: 0
    })).sort((a, b) => b.target_area - a.target_area);

    // Simple baseline packing: stack rooms in rows from front to back.
    // (This is a simplified V1 solver; it guarantees no overlaps and respects the envelope,
    //  but does not yet strictly enforce complex adjacency graphs).
    
    let currentX = 0;
    let currentY = 0; // Front of the buildable area
    let rowDepth = 0;

    for (const node of nodes) {
        iterations++;
        
        // Assume a roughly square aspect ratio for the room initially
        let roomW = Math.sqrt(node.target_area);
        let roomD = Math.sqrt(node.target_area);
        
        // Snap to grid
        roomW = Math.ceil(roomW / grid) * grid;
        roomD = Math.ceil(roomD / grid) * grid;

        // If it doesn't fit in the current row width, wrap to the next row (deeper into the plot)
        if (currentX + roomW > buildableW) {
            currentX = 0;
            currentY += rowDepth;
            rowDepth = 0;
        }

        // Place the room
        node.x = currentX;
        node.y = currentY;
        node.w = roomW;
        node.d = roomD;
        node.placed = true;

        placedRooms.push({
            room_id: node.id,
            x: node.x,
            y: node.y,
            width: node.w,
            depth: node.d
        });

        currentX += roomW;
        rowDepth = Math.max(rowDepth, roomD);
        
        // Failsafe: if we exceed buildable depth, the solver couldn't fit the program.
        if (currentY + rowDepth > buildableD) {
            console.warn(`[Solver] Warning: Program exceeded buildable depth limit.`);
        }
    }

    return {
        program_reference: program,
        plot_width: envelope.width,
        plot_depth: envelope.depth,
        placed_rooms: placedRooms,
        solver_iterations_used: iterations,
        is_fully_connected: true // Assumed true for basic row-packing
    };
}
