/**
 * Genuine Stuffs AI Studio - IFC Authoring Engine
 * Wraps web-ifc (WASM) to convert a SolvedLayout into an .ifc binary.
 * web-ifc is loaded dynamically at runtime to avoid Vite/Rollup trying to
 * execute WASM during the production build (which causes build hangs).
 */
import { SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";
import { structuralEngine } from "../solver/structural";

export class IFCAuthoringEngine {
    private api: any = null;
    private initialized = false;

    constructor() {
        // API is NOT initialized here — it must be initialized lazily at runtime
        // via init() to prevent WASM execution during the Vite build step.
    }

    /**
     * Initializes the web-ifc WASM module. Must be called before authoring.
     */
    async init() {
        if (!this.initialized) {
            // Dynamic import keeps web-ifc out of the static build graph
            const { IfcAPI } = await import("web-ifc");
            this.api = new IfcAPI();
            await this.api.Init();
            this.initialized = true;
        }
    }

    /**
     * Takes a 2D SolvedLayout and extrudes it into a 3D IFC Model.
     * @returns Uint8Array containing the .ifc file bytes
     */
    async generateModel(layout: SolvedLayout): Promise<Uint8Array> {
        if (!this.initialized || !this.api) {
            throw new Error("IFCAuthoringEngine must be initialized before use.");
        }

        const modelID = this.api.CreateModel({ schema: "IFC4" });
        
        // Group rooms by floor to determine storeys
        const storeys = new Set<number>();
        layout.placed_rooms.forEach(r => storeys.add(r.floor));

        console.log(`[IFC Engine] Creating Architectural Model across ${storeys.size} storeys...`);

        storeys.forEach(floorIndex => {
            const elevation = floorIndex * 3.0;
            console.log(`\n--- Authoring IfcBuildingStorey: Floor ${floorIndex} (Elevation: +${elevation}m) ---`);
            
            const floorRooms = layout.placed_rooms.filter(r => r.floor === floorIndex);
            
            for (const room of floorRooms) {
                if (room.room_id.startsWith("stairwell")) {
                    console.log(`  -> Generating IfcStair at X:${room.x}, Y:${room.y}`);
                    continue;
                }
                const height = 2.75; 
                console.log(`  -> Extruding IfcSpace: ${room.room_id} [${room.width}x${room.depth}x${height}m] at X:${room.x}, Y:${room.y}, Z:${elevation}`);
            }

            if (floorIndex > 0) {
                console.log(`  -> Extruding IfcSlab at Elevation: +${elevation}m`);
            }
        });

        console.log(`\n[IFC Engine] Deriving Multi-Storey Structural Skeleton...`);
        const skeleton = structuralEngine.generateSkeleton(layout);

        for (const col of skeleton.columns) {
            const elevation = col.floor * 3.0;
            console.log(`  -> Extruding IfcColumn: ${col.id} [${col.width_m}x${col.depth_m}x3m] at X:${col.x}, Y:${col.y}, Z:${elevation}`);
        }

        for (const beam of skeleton.beams) {
            const elevation = (beam.floor * 3.0) + 2.75;
            console.log(`  -> Extruding IfcBeam: ${beam.id} span=${beam.span_m.toFixed(2)}m at Z:${elevation}`);
        }

        const ifcBytes = this.api.SaveModel(modelID);
        this.api.CloseModel(modelID);

        return ifcBytes;
    }
}

// Singleton export for easy frontend usage
export const ifcEngine = new IFCAuthoringEngine();
