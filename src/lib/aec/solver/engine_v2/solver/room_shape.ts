/**
 * Per-type room proportions: the narrowest a room may be and how
 * elongated. Enforced on every room's own rect (suite sub-rooms
 * included) at placement time, so the solver can't return a 2 m wide
 * bedroom or a 1.5 m x 7.5 m dining room as a "solution".
 */

import { GraphNode } from '../graph';

// Master plan v1.0 Phase 1 ABSOLUTE_MIN_WIDTH_M (values FINAL unless the
// owner amends), keyed by graph.ts's normalized types. Moved here from
// feasibility.ts so the gate (F-002) and the search use one table.
export const ABSOLUTE_MIN_WIDTH_M: Record<string, number> = {
    foyer: 1.8, living_room: 3.0, dining_room: 2.7, family_room: 3.0, entertainment: 2.7,
    kitchen: 2.1, utility: 1.5, garage: 3.0, laundry: 1.5, store: 1.2, boiler_room: 1.2,
    bedroom: 2.7, master_bedroom: 3.0, bathroom: 1.5, wardrobe: 1.2, dressing: 1.5,
    office: 2.4, study: 2.4,
    void: 1.0, circulation: 1.0, hall: 1.2, landing: 1.2, stairwell: 2.4,
};
export const DEFAULT_MIN_WIDTH_BY_ZONE: Record<string, number> = {
    social: 3.0, service: 2.1, private: 2.4, circ: 1.0,
};

// Longest side ÷ shortest side. Rooms people live in stay compact (the
// target drawings' bedrooms are ~1:1–1.4:1); a galley kitchen or an
// entrance hall may run longer. Everything else keeps candidates.ts's
// general 3:1 cap. Owner-approved quality rule, 2026-10-02.
const MAX_ASPECT_BY_TYPE: Record<string, number> = {
    bedroom: 2.0, master_bedroom: 2.0, dining_room: 2.0, office: 2.0, study: 2.0,
    living_room: 2.0, family_room: 2.0,
    kitchen: 2.5, foyer: 2.5,
};
const DEFAULT_MAX_ASPECT = 3.0;

/** Minimum width in metres for a room of this type/zone. */
export function minWidthFor(node: Pick<GraphNode, 'type' | 'zone'>): number {
    return ABSOLUTE_MIN_WIDTH_M[node.type] ?? DEFAULT_MIN_WIDTH_BY_ZONE[node.zone] ?? 2.4;
}

/**
 * True if a w_m x h_m rect is an acceptable shape for this room.
 * Inputs: the room's graph node, the rect's two sides in metres.
 * Never throws.
 */
export function roomShapeOk(node: Pick<GraphNode, 'type' | 'zone'>, w_m: number, h_m: number): boolean {
    const short = Math.min(w_m, h_m), long = Math.max(w_m, h_m);
    if (short + 1e-6 < minWidthFor(node)) return false;
    return long / short <= (MAX_ASPECT_BY_TYPE[node.type] ?? DEFAULT_MAX_ASPECT) + 1e-6;
}
