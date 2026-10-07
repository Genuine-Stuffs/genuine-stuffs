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
    floors_override?: number; // storeys from the brief, overriding the program's own
    seed?: number;            // fixes the footprint/candidate RNG; random when absent
    /** 'grid' lays the ground floor out on a structural bay grid
     * (prototype, 2026-10-06 design); 'gapfree' tiles every floor as one
     * rectangle (engine_v2/gapfree, off until it passes the switch-on gate);
     * 'free' (default) is the current solver. */
    layoutMode?: 'grid' | 'free' | 'gapfree';
}

export interface InternalRoomNode {
    id: string;
    target_area: number;
    placed: boolean;
    x: number;
    y: number;
    w: number;
    d: number;
    target_floor?: number;
}
