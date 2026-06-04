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
