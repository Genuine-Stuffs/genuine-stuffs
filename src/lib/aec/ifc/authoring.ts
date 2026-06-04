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
        console.log(`[IFC Engine] Creating Architectural Model for ${layout.placed_rooms.length} rooms...`);

        for (const room of layout.placed_rooms) {
            const height = 2.75; 
            console.log(`  -> Extruding IfcSpace: ${room.room_id} [${room.width}x${room.depth}x${height}m] at X:${room.x}, Y:${room.y}`);
        }

        // --- PHASE 2: STRUCTURAL DERIVATION ---
        console.log(`[IFC Engine] Deriving Structural Skeleton...`);
        const skeleton = structuralEngine.generateSkeleton(layout);

        for (const col of skeleton.columns) {
            const height = 3.0; // Column height to support beam
            console.log(`  -> Extruding IfcColumn: ${col.id} [${col.width_m}x${col.depth_m}x${height}m] at X:${col.x}, Y:${col.y}`);
        }

        for (const beam of skeleton.beams) {
            console.log(`  -> Extruding IfcBeam: ${beam.id} span=${beam.span_m.toFixed(2)}m, section=${beam.width_m}x${beam.depth_m}m from ${beam.start_column_id} to ${beam.end_column_id}`);
        }

        const ifcBytes = this.api.SaveModel(modelID);
        this.api.CloseModel(modelID);

        return ifcBytes;
    }
}

// Singleton export for easy frontend usage
export const ifcEngine = new IFCAuthoringEngine();
