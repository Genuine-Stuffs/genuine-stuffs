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
    /** primary: on a grid line, column to column; secondary: under an upper
     * wall off the grid, from one primary beam to the next. */
    kind: 'primary' | 'secondary';
    /** What each end rests on: a column (primary) or a primary beam. */
    start_support_id: string;
    end_support_id: string;
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
     * top of each storey (under the floor above, or the roof); a secondary
     * beam under each upper wall that stands on neither a grid line nor a
     * wall below, across the grid bay. Bays are 3.0–6.0 m, so no beam spans
     * more than the grid bay.
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
            const beam = (kind: Beam['kind'], from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }) => {
                const span = Math.hypot(to.x - from.x, to.y - from.y);
                const depthMm = Math.max(Math.ceil((span * 1000) / ratio / 50) * 50, 450);
                const b: Beam = {
                    id: `F${floor}_B${beams.length + 1}`, floor, kind,
                    start_support_id: from.id, end_support_id: to.id,
                    start_x: from.x, start_y: from.y, end_x: to.x, end_y: to.y,
                    span_m: span, width_m: colWidth, depth_m: depthMm / 1000,
                };
                beams.push(b); return b;
            };
            const along = new Map<string, Beam>(); // primary beams by line and bay start
            for (const y of ys) for (let i = 0; i + 1 < xs.length; i++)
                along.set(`h${y},${xs[i]}`, beam('primary', at.get(`${xs[i]},${y}`)!, at.get(`${xs[i + 1]},${y}`)!));
            for (const x of xs) for (let j = 0; j + 1 < ys.length; j++)
                along.set(`v${x},${ys[j]}`, beam('primary', at.get(`${x},${ys[j]}`)!, at.get(`${x},${ys[j + 1]}`)!));
            // a secondary beam's ends land on the primary beams of the grid lines it spans between
            const bay = (lines: number[], v: number) => lines[Math.max(0, lines.findIndex((l, k) => k + 1 < lines.length && v >= l - 1e-9 && v < lines[k + 1] - 1e-9))];
            for (const s of grid.secondary) if (s.floor === floor) {
                const vertical = s.x1 === s.x2;
                const end = (x: number, y: number) => along.get(vertical ? `h${y},${bay(xs, x)}` : `v${x},${bay(ys, y)}`)!;
                beam('secondary', { id: end(s.x1, s.y1).id, x: s.x1, y: s.y1 }, { id: end(s.x2, s.y2).id, x: s.x2, y: s.y2 });
            }
        }

        console.log(`[Structural Engine] Grid x ${xs.join('/')} m, y ${ys.join('/')} m: ${columns.length} columns and ${beams.length} beams (${grid.secondary.length} secondary) across ${grid.floors} floor(s).`);
        return { columns, beams, grid };
    }
}

export const structuralEngine = new StructuralEngine();
