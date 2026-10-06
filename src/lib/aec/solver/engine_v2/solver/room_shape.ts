/**
 * Per-type room proportions: the narrowest a room may be and how
 * elongated. Enforced on every room's own rect (suite sub-rooms
 * included) at placement time, so the solver can't return a 2 m wide
 * bedroom or a 1.5 m x 7.5 m dining room as a "solution".
 */

import { GraphNode } from '../graph';
import complianceRules from '../../../compliance_rules.json';

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

/** NBC 2006 minimums from compliance_rules.json (spatial_compliance.
 * habitable_spaces), keyed by the code's own room names. */
const NBC_SPACES: Record<string, { min_area_m2: number; min_width_m: number }> =
    complianceRules.spatial_compliance.habitable_spaces;

/** The NBC habitable-space entry a room falls under, if any. Matches
 * by substring so variants the Hive emits (guest_bedroom, wet_kitchen,
 * sunken_lounge, ensuite) are held to their room's minimum too. */
function nbcSpaceFor(type: string): { min_area_m2: number; min_width_m: number } | undefined {
    if (type.includes('bedroom')) return NBC_SPACES.bedroom;
    if (type.includes('living') || type.includes('lounge') || type === 'family_room') return NBC_SPACES.living_room;
    if (type.includes('dining')) return NBC_SPACES.dining;
    if (type.includes('kitchen')) return NBC_SPACES.kitchen;
    if (type.includes('bath') || type === 'ensuite' || type === 'en_suite' || type === 'shower') return NBC_SPACES.bathroom;
    if (type.includes('toilet') || type === 'wc' || type === 'powder_room') return NBC_SPACES.toilet;
    return undefined;
}

/**
 * True if a w_m x h_m rect meets the NBC 2006 minimum area and width for
 * this room's type (types the code doesn't list pass). Used by the grid
 * layout, whose partitions can split a bay into narrower rooms; the area
 * minimum isn't otherwise checked by the search, which only compares
 * area with the brief.
 */
export function meetsNbcMinimums(node: Pick<GraphNode, 'type'>, w_m: number, h_m: number): boolean {
    const nbc = nbcSpaceFor(node.type);
    if (!nbc) return true;
    return Math.min(w_m, h_m) + 1e-6 >= nbc.min_width_m && w_m * h_m + 1e-6 >= nbc.min_area_m2;
}
