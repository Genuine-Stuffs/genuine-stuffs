import { solveLayout } from "./src/lib/aec/solver/index";
import { SpatialProgram } from "./supabase/functions/ai-studio/schema";
import { PlotEnvelope } from "./src/lib/aec/solver/types";

// 1. Hardcoded 3-Bed Bungalow Program
const testProgram: SpatialProgram = {
    brief_reference: {
        plot_size_sqm: 450,
        storeys: 1,
        budget_band: 'mid',
        style_preference: 'modern',
        target_occupancy: 5
    },
    total_target_area_sqm: 120,
    rooms: [
        { id: "living_1", type: "living", name: "Main Living Room", min_area_sqm: 24, requires_plumbing: false, required_adjacencies: ["kitchen_1", "bed_master"] },
        { id: "kitchen_1", type: "kitchen", name: "Kitchen", min_area_sqm: 12, requires_plumbing: true, required_adjacencies: ["living_1"] },
        { id: "bed_master", type: "bedroom", name: "Master Bedroom", min_area_sqm: 16, requires_plumbing: false, required_adjacencies: ["bath_master"] },
        { id: "bath_master", type: "bathroom", name: "Master Ensuite", min_area_sqm: 4, requires_plumbing: true, required_adjacencies: ["bed_master"] },
        { id: "bed_2", type: "bedroom", name: "Bedroom 2", min_area_sqm: 12, requires_plumbing: false, required_adjacencies: ["bath_shared"] },
        { id: "bed_3", type: "bedroom", name: "Bedroom 3", min_area_sqm: 12, requires_plumbing: false, required_adjacencies: ["bath_shared"] },
        { id: "bath_shared", type: "bathroom", name: "Shared Bathroom", min_area_sqm: 4, requires_plumbing: true, required_adjacencies: ["bed_2", "bed_3"] },
    ]
};

// 2. Typical Plot Envelope (e.g. Abuja 50ft x 100ft ~ 15m x 30m)
const testPlot: PlotEnvelope = {
    width: 15.0,
    depth: 30.0,
    setbacks: {
        front: 6.0,
        rear: 3.0,
        left: 3.0,
        right: 3.0
    }
};

console.log("=== RUNNING SOLVER ON HARDCODED 3-BED BUNGALOW ===");
console.log(`Plot Size: ${testPlot.width}m x ${testPlot.depth}m`);
console.log(`Buildable Area: ${testPlot.width - 6}m x ${testPlot.depth - 9}m`);

const startTime = performance.now();
const layout = solveLayout(testProgram, testPlot, { grid_size_m: 0.1 });
const endTime = performance.now();

console.log(`\nSolver finished in ${(endTime - startTime).toFixed(2)}ms (Iterations: ${layout.solver_iterations_used})`);
console.log("Placed Rooms:");
console.table(layout.placed_rooms.map(r => ({
    RoomID: r.room_id,
    X: `${r.x.toFixed(1)}m`,
    Y: `${r.y.toFixed(1)}m`,
    Width: `${r.width.toFixed(1)}m`,
    Depth: `${r.depth.toFixed(1)}m`,
    Area: `${(r.width * r.depth).toFixed(1)} sqm`
})));
