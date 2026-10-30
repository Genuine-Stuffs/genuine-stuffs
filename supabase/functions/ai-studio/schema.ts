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
    /** parking in the compound the user asked for (src/lib/aec/parking.ts); `bays` null when no number was given */
    parking?: { bays: number | null };
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

export interface Outbuilding {
    id: string;
    label: string;
    x: number; y: number; width: number; depth: number; // house frame, metres
    in_rear_setback: boolean; // the user allowed it into the rear setback
    at_gate?: boolean;        // a gatehouse (security post) in the front setback at the gate (owner 2026-10-19)
    rooms: PlacedRoom[];      // ground floor, same frame
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
    // Separate buildings behind the house (BQ, generator house), in the
    // house's frame: its rear wall is y = 0, so these have y < 0. Optional;
    // readers that ignore it see the house alone.
    outbuildings?: Outbuilding[];
    // Where the house frame's origin (its rear-left corner) sits on the plot,
    // measured from the plot's rear-left corner. Set with outbuildings.
    site_offset?: { x: number; y: number };
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
    // True when no layout met every requirement and this is the fallback:
    // complete, valid geometry with each compromise in placement_issues.
    // solver_failure then says why the strict search failed.
    solver_fallback?: boolean;
    // Phase 5 rubric score (engine_v2/score.ts), 0–100 per part. Set on
    // layouts returned by solveLayoutVariants(); absent elsewhere.
    layout_score?: {
        total: number; area: number; adjacency: number;
        compactness: number; window: number; circulation: number;
    };
    placement_issues?: ValidationIssue[];
    // The edit loop: how the gap-free search found this plan (footprint, each floor's slicing
    // expression over its rooms), so a follow-up edit starts from it instead of a new house.
    search_state?: SearchState;
    // The edit loop: the plan started from the previous one; false when the warm start
    // couldn't keep a plan as good and the full search ran instead.
    warm_started?: boolean;
    // The structural grid's largest bay on each axis when the planner asks for less than 6 m
    // (a hotel's 4.5 m bays across its guest rooms, so they span within the 4.5 m limit).
    grid_bay_max_m?: { x?: number; y?: number };
}

export interface SearchState {
    path: 'slicing';
    W: number; D: number;              // footprint, cells
    cost: number;                      // the search's own total, to compare an edit's plan against
    hand_edited?: true;                // rooms swapped or a wall moved on the plan since: `cost` is the plan before
    // pinned: rooms the user placed by hand (swapped on the plan): a warm start holds where they stand, not their size
    floors: Array<{ floor: number; ids: string[]; areas?: number[]; expr: number[]; offs: number[]; rects: Array<{ x: number; y: number; w: number; h: number }>; pinned?: string[] }>;
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
