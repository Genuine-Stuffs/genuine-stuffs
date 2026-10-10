/**
 * Genuine Stuffs AI Studio - Structural Heuristics Engine
 * 
 * Derives the structural skeleton (columns and beams) from the
 * architectural SolvedLayout on the building's structural grid
 * (structural_grid.ts), sizing beams by span/depth ratio.
 */
import { SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";
import complianceRules from "../compliance_rules.json";
import { structuralGridOf, type StructuralGrid } from "./structural_grid";

export interface Column {
    id: string;
    floor: number;
    x: number;
    y: number;
    width_m: number;
    depth_m: number;
}

export interface Beam {
    id: string;
    floor: number;
    start_column_id: string;
    end_column_id: string;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    span_m: number;
    width_m: number;
    depth_m: number;
}

export interface StructuralSkeleton {
    columns: Column[];
    beams: Beam[];
    /** The building's grid (shared by every floor); null without a footprint. */
    grid: StructuralGrid | null;
}

export class StructuralEngine {

    /**
     * Columns at every intersection of the building's structural grid, the
     * same on every floor so they stack; beams along the grid lines at the
     * top of each storey (under the floor above, or the roof). Bays are
     * 3.0–6.0 m, so no beam spans more than the grid bay.
     */
    public generateSkeleton(layout: SolvedLayout): StructuralSkeleton {
        const columns: Column[] = [];
        const beams: Beam[] = [];
        const grid = structuralGridOf(layout);
        if (!grid) return { columns, beams, grid };

        const structParams = complianceRules.structural_parameters;
        const colWidth = structParams.beam_design.beam_width_mm / 1000;
        const ratio = structParams.beam_design.span_to_depth_ratio.simply_supported;
        const { xs, ys } = grid;

        for (let floor = 0; floor < grid.floors; floor++) {
            const at = new Map<string, Column>();
            for (const y of ys) for (const x of xs) {
                const c: Column = { id: `F${floor}_C${columns.length + 1}`, floor, x, y, width_m: colWidth, depth_m: colWidth };
                columns.push(c); at.set(`${x},${y}`, c);
            }
            const addBeam = (c1: Column, c2: Column) => {
                const span = Math.hypot(c2.x - c1.x, c2.y - c1.y);
                const depthMm = Math.max(Math.ceil((span * 1000) / ratio / 50) * 50, 450);
                beams.push({
                    id: `F${floor}_B${beams.length + 1}`, floor,
                    start_column_id: c1.id, end_column_id: c2.id,
                    start_x: c1.x, start_y: c1.y, end_x: c2.x, end_y: c2.y,
                    span_m: span, width_m: colWidth, depth_m: depthMm / 1000,
                });
            };
            for (const y of ys) for (let i = 0; i + 1 < xs.length; i++) addBeam(at.get(`${xs[i]},${y}`)!, at.get(`${xs[i + 1]},${y}`)!);
            for (const x of xs) for (let j = 0; j + 1 < ys.length; j++) addBeam(at.get(`${x},${ys[j]}`)!, at.get(`${x},${ys[j + 1]}`)!);
        }

        console.log(`[Structural Engine] Grid x ${xs.join('/')} m, y ${ys.join('/')} m: ${columns.length} columns and ${beams.length} beams across ${grid.floors} floor(s).`);
        return { columns, beams, grid };
    }
}

export const structuralEngine = new StructuralEngine();
