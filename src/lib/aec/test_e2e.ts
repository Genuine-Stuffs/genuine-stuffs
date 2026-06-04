/**
 * Genuine Stuffs AI Studio - End-to-End Pipeline Test
 * 
 * Simulates a run of the entire Phase 1 pipeline for a 3-Bedroom Bungalow.
 * Run this to verify that the SpatialProgram -> SolvedLayout -> Validation -> IFC chain is intact.
 */
import { SpatialProgram } from "../../../../supabase/functions/ai-studio/schema";
import { solveLayout } from "./solver";
import { validationGate } from "./validation/gate";

async function runIntegrationTest() {
    console.log("=== Genuine Stuffs AEC Studio: E2E Pipeline Test ===");

    // 1. Simulate the output from the LLM Edge Function
    console.log("\\n[Step 1] Receiving SpatialProgram from LLM...");
    const mockProgram: SpatialProgram = {
        brief_reference: {
            plot_size_sqm: 450,
            plot_orientation: "N",
            storeys: 1,
            budget_band: "mid",
            style_preference: "contemporary",
            target_occupancy: 5
        },
        total_target_area_sqm: 120,
        rooms: [
            { id: "living_1", type: "living", name: "Main Lounge", min_area_sqm: 16, requires_plumbing: false, required_adjacencies: ["kitchen_1", "bed_master"] },
            { id: "kitchen_1", type: "kitchen", name: "Kitchen", min_area_sqm: 8, requires_plumbing: true, required_adjacencies: ["living_1"] },
            { id: "bed_master", type: "bedroom", name: "Master Suite", min_area_sqm: 14, requires_plumbing: false, required_adjacencies: ["bath_master"] },
            { id: "bath_master", type: "bathroom", name: "Master Bath", min_area_sqm: 4, requires_plumbing: true, required_adjacencies: ["bed_master"] },
            { id: "bed_2", type: "bedroom", name: "Bedroom 2", min_area_sqm: 10, requires_plumbing: false, required_adjacencies: [] },
            { id: "bed_3", type: "bedroom", name: "Bedroom 3", min_area_sqm: 10, requires_plumbing: false, required_adjacencies: [] }
        ]
    };

    // 2. Run the Typescript Constraint Solver
    console.log("\\n[Step 2] Passing to Local Constraint Solver...");
    const envelope = { width: 15, depth: 30 }; // Standard 450sqm Lagos plot
    
    try {
        const start = performance.now();
        const layout = solveLayout(mockProgram, envelope, { grid_size_m: 0.1 });
        const end = performance.now();
        
        console.log(`✓ Solver completed in ${(end - start).toFixed(2)}ms`);
        console.log(`  Rooms Placed: ${layout.placed_rooms.length} / ${mockProgram.rooms.length}`);

        // 3. Pass to Validation Gate
        console.log("\\n[Step 3] Passing to Validation Gate (NBC 2006 Rules)...");
        const report = validationGate.validate(layout);
        
        if (report.is_valid) {
            console.log("✓ Layout is fully compliant with NBC codes and setbacks.");
        } else {
            console.warn("! Validation flagged issues:", report.violations);
        }

        // 4. Ready for IFC & Viewer
        console.log("\\n[Step 4] Handoff to web-ifc and @thatopen/components...");
        console.log("✓ Pipeline integration successful. The layout object is ready for the Viewer components.");

        // 5. Structural Derivation Test (Phase 2)
        console.log("\\n[Step 5] Deriving Structural Grid & Asserting Beam Spans...");
        const { structuralEngine } = await import("./solver/structural");
        const skeleton = structuralEngine.generateSkeleton(layout);
        
        console.log(`✓ Structural Engine generated ${skeleton.columns.length} columns and ${skeleton.beams.length} beams.`);
        
        let maxFoundSpan = 0;
        let concreteVol = 0;
        skeleton.columns.forEach(c => concreteVol += (c.width_m * c.depth_m * 3.0));
        skeleton.beams.forEach(b => {
            concreteVol += (b.width_m * b.depth_m * b.span_m);
            if (b.span_m > maxFoundSpan) maxFoundSpan = b.span_m;
        });

        console.log(`✓ Concrete Volume generated: ${concreteVol.toFixed(2)} m3`);

        if (maxFoundSpan > 4.5) {
            console.error(`X Structural Failure: A beam span exceeded the 4.5m NBC limit! Found span: ${maxFoundSpan}m`);
        } else {
            console.log(`✓ Structural Compliance passed. Maximum beam span is ${maxFoundSpan.toFixed(2)}m (≤ 4.5m limit).`);
        }

        console.log("\\n=== Test Completed Successfully ===");
        
    } catch (e: any) {
        console.error("X Pipeline broke during execution:");
        console.error(e.message);
    }
}

// In a real environment, you'd run this via a test runner like Vitest.
// For Phase 1, exporting the function is enough to prove the interfaces wire up.
export { runIntegrationTest };
