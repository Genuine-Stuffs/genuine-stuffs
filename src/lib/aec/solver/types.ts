/**
 * Genuine Stuffs AI Studio - Solver Internal Types
 */
import { SpatialProgram, SolvedLayout, PlacedRoom } from "../../../../supabase/functions/ai-studio/schema";

export interface PlotEnvelope {
    width: number;
    depth: number;
    setbacks: {
        front: number;
        rear: number;
        left: number;
        right: number;
    };
}

export interface SolverOptions {
    grid_size_m?: number; // Snap resolution, default 0.1m
    max_iterations?: number;
}

export interface InternalRoomNode {
    id: string;
    target_area: number;
    placed: boolean;
    x: number;
    y: number;
    w: number;
    d: number;
}
