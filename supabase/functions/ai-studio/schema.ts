/**
 * Genuine Stuffs AI Studio - Phase 1 Core Contracts
 * Defines the strict interfaces passed between the LLM, the Constraint Solver,
 * the IFC Authoring Engine, and the Validation Gate.
 */

// ---------------------------------------------------------------------------
// 1. DESIGN BRIEF (LLM Orchestration Layer)
// The structured output from the conversation state machine.
// ---------------------------------------------------------------------------
export interface DesignBrief {
    plot_size_sqm: number;
    plot_orientation?: 'N' | 'S' | 'E' | 'W';
    storeys: number; // Phase 3 now supports up to 2 (Duplex)
    budget_band: 'low' | 'mid' | 'high' | 'luxury';
    style_preference: string;
    target_occupancy: number;
}

// ---------------------------------------------------------------------------
// 2. SPATIAL PROGRAM (LLM Orchestration Layer -> Solver)
// The LLM emits this. It is intent, NOT geometry.
// ---------------------------------------------------------------------------
export interface RoomRequirement {
    id: string; // e.g., "bed_master", "kitchen"
    type: 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'circulation' | 'service' | 'vertical';
    name: string;
    min_area_sqm: number; // Must respect NBC minimums
    requires_plumbing: boolean;
    required_adjacencies: string[]; // List of room IDs this room must touch
    target_floor?: number; // 0 = Ground, 1 = Upper
}

export interface SpatialProgram {
    brief_reference: DesignBrief;
    rooms: RoomRequirement[];
    total_target_area_sqm: number;
}

// ---------------------------------------------------------------------------
// 3. SOLVED LAYOUT (Constraint Solver -> IFC Authoring)
// The deterministic output of the TS solver. This IS geometry (2D).
// ---------------------------------------------------------------------------
export interface PlacedRoom {
    room_id: string;
    floor: number; // Z-index grouping
    x: number; // Bottom-left X coordinate in meters
    y: number; // Bottom-left Y coordinate in meters
    width: number; // Width in meters
    depth: number; // Depth (Y-axis length) in meters
}

export interface ValidationIssue {
    room_id: string;
    rule: string;
    detail: string;
}

export interface SolverFailureReason {
    code: string;
    detail: string;
    rooms?: string[];
    values?: Record<string, number>;
}

export interface SolverFailure {
    floor: number;
    reasons: SolverFailureReason[];
}

export interface SolvedLayout {
    program_reference: SpatialProgram;
    plot_width: number;
    plot_depth: number;
    // Bounding box of the building footprint the solver actually placed
    // into (same origin as placed_rooms). Distinct from plot_width/depth:
    // I1/I5 ("inside" / "touches the footprint perimeter") are defined
    // against this, not the plot. Optional — older layouts lack it.
    building_width?: number;
    building_depth?: number;
    placed_rooms: PlacedRoom[];
    solver_iterations_used: number;
    is_fully_connected: boolean;
    solver_status?: 'SOLVED' | 'SOLVED_RELAXED' | 'TIMEOUT' | 'UNSAT';
    // UNSAT only: true when every attempt was ruled out by a necessary
    // condition (feasibility gate / planarity bound). False or absent
    // means the search ran out of candidates — not a proof.
    solver_unsat_proven?: boolean;
    // Why the layout failed, when it did: the first floor that couldn't be
    // placed and the error-taxonomy codes behind it (F-001/F-002/F-004 from
    // the feasibility gate, S-001 search exhausted, S-002 out of time).
    // engine_v2/failure_messages.ts turns these into plain language.
    solver_failure?: SolverFailure;
    // Phase 5 rubric score (engine_v2/score.ts), 0–100 per part. Set on
    // layouts returned by solveLayoutVariants(); absent elsewhere.
    layout_score?: {
        total: number; area: number; adjacency: number;
        compactness: number; window: number; circulation: number;
    };
    placement_issues?: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// 4. VALIDATION REPORT (Validation Gate)
// The result of checking the SolvedLayout against compliance_rules.json
// ---------------------------------------------------------------------------
export interface ValidationViolation {
    type: 'overlap' | 'area_too_small' | 'adjacency_failed' | 'setback_violation' | 'unreachable';
    room_ids: string[];
    description: string;
    severity: 'fatal' | 'warning';
}

export interface ValidationReport {
    is_valid: boolean;
    violations: ValidationViolation[];
    derived_metrics: {
        total_floor_area_sqm: number;
        circulation_percentage: number;
    };
}
