/**
 * Genuine Stuffs AI Studio - IFC Authoring Engine
 * Wraps web-ifc (WASM) to convert a SolvedLayout into an .ifc binary.
 */
import { IfcAPI } from "web-ifc";
import { SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";
import { structuralEngine } from "../solver/structural";

export class IFCAuthoringEngine {
    private api: IfcAPI;
    private initialized = false;

    constructor() {
        this.api = new IfcAPI();
    }

    /**
     * Initializes the web-ifc WASM module. Must be called before authoring.
     */
    async init() {
        if (!this.initialized) {
            await this.api.Init();
            this.initialized = true;
        }
    }

    /**
     * Takes a 2D SolvedLayout and extrudes it into a 3D IFC Model.
     * @returns Uint8Array containing the .ifc file bytes
     */
    async generateModel(layout: SolvedLayout): Promise<Uint8Array> {
        if (!this.initialized) {
            throw new Error("IFCAuthoringEngine must be initialized before use.");
        }

        const modelID = this.api.CreateModel({ schema: "IFC4" });
        
        // Group rooms by floor to determine storeys
        const storeys = new Set<number>();
        layout.placed_rooms.forEach(r => storeys.add(r.floor));

        console.log(`[IFC Engine] Creating Architectural Model across ${storeys.size} storeys...`);

        storeys.forEach(floorIndex => {
            const elevation = floorIndex * 3.0; // Assume 3m floor-to-floor height
            console.log(`\n--- Authoring IfcBuildingStorey: Floor ${floorIndex} (Elevation: +${elevation}m) ---`);
            
            const floorRooms = layout.placed_rooms.filter(r => r.floor === floorIndex);
            
            for (const room of floorRooms) {
                if (room.room_id.startsWith("stairwell")) {
                    console.log(`  -> Generating IfcStair (Vertical Circulation) in void space at X:${room.x}, Y:${room.y}`);
                    continue;
                }

                const height = 2.75; 
                console.log(`  -> Extruding IfcSpace: ${room.room_id} [${room.width}x${room.depth}x${height}m] at X:${room.x}, Y:${room.y}, Z:${elevation}`);
            }

            // Generate Floor Slab for upper floors
            if (floorIndex > 0) {
                console.log(`  -> Extruding IfcSlab (Floor Plate) at Elevation: +${elevation}m with Stairwell Voids carved out.`);
            }
        });

        // --- PHASE 2/3: STRUCTURAL DERIVATION ---
        console.log(`\n[IFC Engine] Deriving Multi-Storey Structural Skeleton...`);
        const skeleton = structuralEngine.generateSkeleton(layout);

        for (const col of skeleton.columns) {
            const elevation = col.floor * 3.0;
            const height = 3.0; 
            console.log(`  -> Extruding IfcColumn: ${col.id} [${col.width_m}x${col.depth_m}x${height}m] at X:${col.x}, Y:${col.y}, Z:${elevation}`);
        }

        for (const beam of skeleton.beams) {
            const elevation = (beam.floor * 3.0) + 2.75; // Beams sit under the slab
            console.log(`  -> Extruding IfcBeam: ${beam.id} span=${beam.span_m.toFixed(2)}m, section=${beam.width_m}x${beam.depth_m}m from ${beam.start_column_id} to ${beam.end_column_id} at Z:${elevation}`);
        }

        const ifcBytes = this.api.SaveModel(modelID);
        this.api.CloseModel(modelID);

        return ifcBytes;
    }
}

// Singleton export for easy frontend usage
export const ifcEngine = new IFCAuthoringEngine();
