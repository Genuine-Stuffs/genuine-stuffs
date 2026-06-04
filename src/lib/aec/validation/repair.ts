/**
 * Genuine Stuffs AI Studio - Validation Auto-Repair Loop
 */
import { SpatialProgram, SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";
import { solveLayout } from "../solver";
import { PlotEnvelope, SolverOptions } from "../solver/types";
import { validationGate } from "./gate";

export class LayoutGenerator {
    private maxRetries = 3;

    /**
     * Attempts to generate a fully compliant layout.
     * If validation fails, it triggers the repair loop.
     */
    public generateCompliantLayout(
        program: SpatialProgram, 
        envelope: PlotEnvelope,
        baseOptions?: SolverOptions
    ): { layout: SolvedLayout | null, report: any } {
        
        let currentOptions = { ...baseOptions };
        let lastReport = null;

        console.log("[Auto-Repair] Starting layout generation...");

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            // 1. Solve
            const layout = solveLayout(program, envelope, currentOptions);

            // 2. Validate
            const report = validationGate.validate(layout);
            lastReport = report;

            // 3. Check Pass/Fail
            if (report.is_valid) {
                console.log(`[Auto-Repair] Layout Passed on attempt ${attempt}!`);
                return { layout, report };
            }

            console.warn(`[Auto-Repair] Layout Failed on attempt ${attempt}. Violations:`, report.violations.map(v => v.type));

            // 4. Repair Heuristics
            // In Phase 1, the simple fallback is to tighten the grid resolution 
            // to allow finer packing if there are setback violations.
            if (report.violations.some(v => v.type === 'setback_violation' || v.type === 'overlap')) {
                const newGrid = (currentOptions.grid_size_m || 0.1) / 2;
                console.log(`[Auto-Repair] Tightening grid to ${newGrid}m for next attempt...`);
                currentOptions.grid_size_m = newGrid;
            } else {
                // If it's an area violation, the solver didn't give a room enough space.
                // We'd pass this hint back to the solver here.
            }
        }

        console.error(`[Auto-Repair] Failed to generate a compliant layout after ${this.maxRetries} attempts.`);
        return { layout: null, report: lastReport };
    }
}

export const layoutGenerator = new LayoutGenerator();
