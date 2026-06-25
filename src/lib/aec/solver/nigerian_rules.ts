/**
 * Genuine Stuffs AI Studio - Nigerian AEC Ruleset
 * Derived from NBC 2006 and Gap Analysis Synthesized Defaults.
 * These act as the baseline constraints for the TS Layout Solver.
 */

export const NIGERIAN_AEC_RULES = {
    // 1. Minimum Room Areas (sqm)
    MIN_AREAS: {
        habitable_room: 9.5,   // Bedrooms, Living
        kitchen: 5.5,          // Adjusted from NBC 4.5-5.6
        bathroom: 2.8,
        bq_bedroom: 9.0,       // Boys Quarters
        generator_room: 10.8,  // 3.6m x 3.0m typical
        inverter_room: 4.0     // 2.0m x 2.0m typical
    },

    // 2. Minimum Widths/Clearances (meters)
    MIN_DIMENSIONS: {
        habitable_width: 2.4,
        kitchen_width: 1.8,
        bathroom_width: 1.2,
        corridor_width: 1.0,
        ceiling_height: 2.75   // Average between 2.7 - 2.8 for natural vent
    },

    // 3. Setbacks (Lagos State default for Phase 1)
    SETBACKS: {
        front: 6.0,
        side: 3.0,
        rear: 3.0,
        side_compact_plot: 1.5 // For plots <= 150 sqm
    },

    // 4. Standard Door Sizes (Width x Height in meters)
    DOORS: {
        main_entrance: { width: 1.2, height: 2.1 },
        internal: { width: 0.9, height: 2.1 },
        bathroom: { width: 0.8, height: 2.1 },
        kitchen: { width: 0.9, height: 2.1 }
    },

    // 5. Environmental/Site Rules
    SITE: {
        parking_bay_width: 2.5,
        parking_bay_length: 5.0,
        driveway_min_width: 3.0,
        soakaway_from_building: 3.0,
        septic_from_building: 1.5,
        soakaway_from_boundary: 1.5,
        waste_from_borehole_min: 10.0,
        waste_from_borehole_ideal: 30.0
    },

    // 6. Window-to-Floor Area Ratio rules
    VENTILATION: {
        min_openable_window_ratio: 0.10, // 10% of floor area
        min_glazed_area_ratio: 0.20      // 20% of floor area
    }
};

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'circulation' | 'service';

// ── ROOM TYPE CONSTRAINTS ─────────────────────────────────────────────────────
// Derived from reference floor plan analysis (Nigerian/West African villa typology)
// and NBC 2006 minimums. Used by clampRoomDimensions() in engine.ts.
// Keywords are matched against room_id.toLowerCase() — first match wins.
export interface RoomConstraint {
  keywords:    string[];   // match against room_id.toLowerCase()
  minArea:     number;     // m² — NBC 2006 / typology floor
  maxArea:     number;     // m² — typology ceiling, prevents absurd sizes
  maxWidth:    number;     // m — hard cap regardless of row space available
  maxAspect:   number;     // width:depth ratio ceiling (e.g. 2.5 = width never > 2.5× depth)
}

export const ROOM_TYPE_CONSTRAINTS: RoomConstraint[] = [
  // Wet / service areas — smallest rooms, must never stretch
  { keywords: ['toilet', 'wc'],              minArea: 1.5,  maxArea: 4.0,  maxWidth: 2.2,  maxAspect: 1.8 },
  { keywords: ['bath', 'shower'],            minArea: 2.5,  maxArea: 6.0,  maxWidth: 3.0,  maxAspect: 2.0 },
  { keywords: ['laundry', 'utility'],        minArea: 3.0,  maxArea: 8.0,  maxWidth: 3.5,  maxAspect: 2.0 },
  { keywords: ['store', 'storeroom'],        minArea: 2.0,  maxArea: 8.0,  maxWidth: 3.5,  maxAspect: 2.5 },
  // Stairwell — fixed footprint, never stretched
  { keywords: ['stair', 'void'],             minArea: 5.0,  maxArea: 9.5,  maxWidth: 3.0,  maxAspect: 1.5 },
  // Circulation
  { keywords: ['corridor', 'hall', 'passage'], minArea: 3.0, maxArea: 12.0, maxWidth: 2.2, maxAspect: 6.0 },
  // Service / utility
  { keywords: ['pantry', 'wet kitchen'],     minArea: 4.0,  maxArea: 12.0, maxWidth: 4.0,  maxAspect: 2.5 },
  { keywords: ['kitchen'],                   minArea: 8.0,  maxArea: 22.0, maxWidth: 6.0,  maxAspect: 2.0 },
  // Bedrooms
  { keywords: ['master'],                    minArea: 16.0, maxArea: 35.0, maxWidth: 7.0,  maxAspect: 1.8 },
  { keywords: ['bedroom', 'bed'],            minArea: 10.0, maxArea: 20.0, maxWidth: 6.0,  maxAspect: 1.8 },
  { keywords: ['boys', 'bq', 'staff', 'quarters'], minArea: 8.0, maxArea: 14.0, maxWidth: 4.5, maxAspect: 1.8 },
  // Living / social
  { keywords: ['foyer', 'entry', 'entrance'], minArea: 4.0, maxArea: 16.0, maxWidth: 5.0,  maxAspect: 2.0 },
  { keywords: ['dining'],                    minArea: 10.0, maxArea: 20.0, maxWidth: 6.0,  maxAspect: 2.0 },
  { keywords: ['living', 'lounge', 'sitting'], minArea: 16.0, maxArea: 40.0, maxWidth: 8.0, maxAspect: 1.8 },
  { keywords: ['office', 'study'],           minArea: 8.0,  maxArea: 20.0, maxWidth: 6.0,  maxAspect: 2.0 },
  // Parking
  { keywords: ['garage', 'parking', 'carport'], minArea: 14.0, maxArea: 55.0, maxWidth: 12.0, maxAspect: 2.0 },
];

/**
 * Returns the RoomConstraint for a given room_id, or a safe default.
 */
export function getConstraintForRoom(room_id: string): RoomConstraint {
  const lower = room_id.toLowerCase();
  const match = ROOM_TYPE_CONSTRAINTS.find(c => c.keywords.some(k => lower.includes(k)));
  return match ?? {
    keywords: [],
    minArea:   6.0,
    maxArea:   40.0,
    maxWidth:  8.0,
    maxAspect: 2.5,
  };
}

/**
 * Helper: Gets the absolute minimum allowed area for a given room type.
 */
export function getMinimumAreaForRoom(type: RoomType, name: string): number {
    const lowerName = name.toLowerCase();
    if (type === 'bathroom') return NIGERIAN_AEC_RULES.MIN_AREAS.bathroom;
    if (type === 'kitchen') return NIGERIAN_AEC_RULES.MIN_AREAS.kitchen;
    
    // Service rooms
    if (lowerName.includes('gen')) return NIGERIAN_AEC_RULES.MIN_AREAS.generator_room;
    if (lowerName.includes('inverter') || lowerName.includes('battery')) return NIGERIAN_AEC_RULES.MIN_AREAS.inverter_room;
    
    // Default habitable (living/bedroom)
    if (type === 'living' || type === 'bedroom') return NIGERIAN_AEC_RULES.MIN_AREAS.habitable_room;

    // Fallback for circulation/other
    return 2.0; 
}
