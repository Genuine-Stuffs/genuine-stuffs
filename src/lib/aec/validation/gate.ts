/**
 * Genuine Stuffs AI Studio - Validation Gate
 * Acts as the strict bouncer to ensure no generated layout violates 
 * the Nigerian Building Code (NBC) or physical constraints before rendering.
 */
import { SolvedLayout, ValidationReport, ValidationViolation, SpatialProgram } from "../../../../supabase/functions/ai-studio/schema";
import complianceRules from "../compliance_rules.json";

export class ValidationGate {
    
    /**
     * Runs a full validation suite on the SolvedLayout.
     */
    public validate(layout: SolvedLayout): ValidationReport {
        const violations: ValidationViolation[] = [];
        let totalArea = 0;

        // 1. Semantic Check: Minimum Areas (NBC 2006)
        for (const room of layout.placed_rooms) {
            const actualArea = room.width * room.depth;
            totalArea += actualArea;

            // Find the room intent from the program
            const intent = layout.program_reference.rooms.find(r => r.id === room.room_id);
            if (!intent) continue;

            const minRequiredArea = this.getNBCMinArea(intent.type);
            
            if (actualArea < minRequiredArea) {
                violations.push({
                    type: 'area_too_small',
                    room_ids: [room.room_id],
                    description: `Room '${intent.name}' area (${actualArea.toFixed(1)} sqm) is below NBC minimum (${minRequiredArea} sqm).`,
                    severity: 'fatal'
                });
            }
        }

        // 2. Geometric Check: Overlaps
        // (A simple bounding box intersection check)
        for (let i = 0; i < layout.placed_rooms.length; i++) {
            for (let j = i + 1; j < layout.placed_rooms.length; j++) {
                const r1 = layout.placed_rooms[i];
                const r2 = layout.placed_rooms[j];

                if (this.isOverlapping(r1, r2)) {
                    violations.push({
                        type: 'overlap',
                        room_ids: [r1.room_id, r2.room_id],
                        description: `Physical overlap detected between ${r1.room_id} and ${r2.room_id}.`,
                        severity: 'fatal'
                    });
                }
            }
        }

        // 3. Setback Check
        const lagosSetbacks = complianceRules.spatial_compliance.setbacks.lagos_residential;
        for (const room of layout.placed_rooms) {
            // Check if any room crosses the plot envelope minus setbacks
            if (room.x < 0 || room.y < 0 || 
                (room.x + room.width) > (layout.plot_width - (lagosSetbacks.side_m * 2)) ||
                (room.y + room.depth) > (layout.plot_depth - (lagosSetbacks.front_m + lagosSetbacks.rear_m))) {
                
                violations.push({
                    type: 'setback_violation',
                    room_ids: [room.room_id],
                    description: `Room ${room.room_id} violates Lagos State setback requirements.`,
                    severity: 'fatal'
                });
            }
        }

        return {
            is_valid: violations.length === 0,
            violations,
            derived_metrics: {
                total_floor_area_sqm: totalArea,
                circulation_percentage: 0 // Mock for Phase 1
            }
        };
    }

    /**
     * Map internal room types to the compliance_rules.json keys
     */
    private getNBCMinArea(type: string): number {
        const rules = complianceRules.spatial_compliance.habitable_spaces as any;
        if (type === 'bedroom' && rules.bedroom) return rules.bedroom.min_area_m2;
        if (type === 'living' && rules.living_room) return rules.living_room.min_area_m2;
        if (type === 'kitchen' && rules.kitchen) return rules.kitchen.min_area_m2;
        if (type === 'bathroom' && rules.bathroom) return rules.bathroom.min_area_m2;
        return 2.0; // Fallback
    }

    /**
     * Simple 2D AABB Intersection
     */
    private isOverlapping(r1: any, r2: any): boolean {
        // Since we snap to grid, add a tiny epsilon to prevent edge-sharing from being flagged as overlap
        const epsilon = 0.01;
        return (
            r1.x < r2.x + r2.width - epsilon &&
            r1.x + r1.width > r2.x + epsilon &&
            r1.y < r2.y + r2.depth - epsilon &&
            r1.y + r1.depth > r2.y + epsilon
        );
    }
}

export const validationGate = new ValidationGate();
