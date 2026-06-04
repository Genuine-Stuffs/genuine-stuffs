/**
 * Genuine Stuffs AI Studio - Structural Heuristics Engine
 * 
 * Automatically derives the structural skeleton (Columns and Beams)
 * from the architectural SolvedLayout, sizing elements mathematically
 * against the NBC parameters.
 */
import { SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";
import complianceRules from "../compliance_rules.json";

export interface Column {
    id: string;
    x: number;
    y: number;
    width_m: number;
    depth_m: number;
}

export interface Beam {
    id: string;
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
}

export class StructuralEngine {
    
    /**
     * Derives columns and beams from the architectural layout.
     */
    public generateSkeleton(layout: SolvedLayout): StructuralSkeleton {
        const columns: Column[] = [];
        const beams: Beam[] = [];
        const structParams = complianceRules.structural_parameters;
        
        const colWidth = structParams.beam_design.beam_width_mm / 1000; // 0.225m
        const maxSpan = structParams.beam_design.max_span_m.typical_residential; // 4.5m
        
        console.log(`[Structural Engine] Generating skeleton. Max span: ${maxSpan}m`);

        // 1. Column Placement (Heuristic)
        // For Phase 2, we place a column at every outer corner of every room.
        // We will deduplicate columns that are placed in the exact same spot.
        const gridPoints = new Set<string>();

        layout.placed_rooms.forEach((room, idx) => {
            // Add the 4 corners of the room
            const corners = [
                { x: room.x, y: room.y },
                { x: room.x + room.width, y: room.y },
                { x: room.x, y: room.y + room.depth },
                { x: room.x + room.width, y: room.y + room.depth }
            ];

            corners.forEach(c => {
                const key = `${c.x.toFixed(2)},${c.y.toFixed(2)}`;
                if (!gridPoints.has(key)) {
                    gridPoints.add(key);
                    columns.push({
                        id: `C${columns.length + 1}`,
                        x: c.x,
                        y: c.y,
                        width_m: colWidth,
                        depth_m: colWidth
                    });
                }
            });
            
            // Mid-span checking: If a wall is longer than maxSpan, we need an intermediate column.
            if (room.width > maxSpan) {
                const splits = Math.ceil(room.width / maxSpan);
                const interval = room.width / splits;
                for (let i = 1; i < splits; i++) {
                    const midX = room.x + (interval * i);
                    const key1 = `${midX.toFixed(2)},${room.y.toFixed(2)}`;
                    const key2 = `${midX.toFixed(2)},${(room.y + room.depth).toFixed(2)}`;
                    
                    if (!gridPoints.has(key1)) {
                        gridPoints.add(key1);
                        columns.push({ id: `C${columns.length + 1}`, x: midX, y: room.y, width_m: colWidth, depth_m: colWidth });
                    }
                    if (!gridPoints.has(key2)) {
                        gridPoints.add(key2);
                        columns.push({ id: `C${columns.length + 1}`, x: midX, y: room.y + room.depth, width_m: colWidth, depth_m: colWidth });
                    }
                }
            }

            if (room.depth > maxSpan) {
                const splits = Math.ceil(room.depth / maxSpan);
                const interval = room.depth / splits;
                for (let i = 1; i < splits; i++) {
                    const midY = room.y + (interval * i);
                    const key1 = `${room.x.toFixed(2)},${midY.toFixed(2)}`;
                    const key2 = `${(room.x + room.width).toFixed(2)},${midY.toFixed(2)}`;
                    
                    if (!gridPoints.has(key1)) {
                        gridPoints.add(key1);
                        columns.push({ id: `C${columns.length + 1}`, x: room.x, y: midY, width_m: colWidth, depth_m: colWidth });
                    }
                    if (!gridPoints.has(key2)) {
                        gridPoints.add(key2);
                        columns.push({ id: `C${columns.length + 1}`, x: room.x + room.width, y: midY, width_m: colWidth, depth_m: colWidth });
                    }
                }
            }
        });

        // 2. Beam Generation
        // Connect columns that share an X or Y axis, provided they trace a wall
        // For simplicity in Phase 2, we connect adjacent columns along the grid.
        
        // Sort columns by X, then Y
        const colsByX = [...columns].sort((a, b) => a.x - b.x || a.y - b.y);
        const colsByY = [...columns].sort((a, b) => a.y - b.y || a.x - b.x);

        const addBeam = (c1: Column, c2: Column) => {
            const span = Math.hypot(c2.x - c1.x, c2.y - c1.y);
            if (span > 0 && span <= maxSpan + 0.1) {
                // Calculate Depth based on span-to-depth ratio (Assume Simply Supported = 15 for safety)
                const ratio = structParams.beam_design.span_to_depth_ratio.simply_supported;
                const reqDepthMm = (span * 1000) / ratio;
                // Round up to nearest 50mm
                const actualDepthMm = Math.ceil(reqDepthMm / 50) * 50; 
                // Minimum depth is usually 450mm in practice
                const finalDepthM = Math.max(actualDepthMm, 450) / 1000;

                beams.push({
                    id: `B${beams.length + 1}`,
                    start_column_id: c1.id,
                    end_column_id: c2.id,
                    start_x: c1.x,
                    start_y: c1.y,
                    end_x: c2.x,
                    end_y: c2.y,
                    span_m: span,
                    width_m: colWidth,
                    depth_m: finalDepthM
                });
            }
        };

        // Create horizontal beams (same Y)
        for (let i = 0; i < colsByY.length - 1; i++) {
            const c1 = colsByY[i];
            const c2 = colsByY[i+1];
            if (Math.abs(c1.y - c2.y) < 0.05) {
                // Must ensure they actually border a room (mock implementation assumes dense grid)
                addBeam(c1, c2);
            }
        }

        // Create vertical beams (same X)
        for (let i = 0; i < colsByX.length - 1; i++) {
            const c1 = colsByX[i];
            const c2 = colsByX[i+1];
            if (Math.abs(c1.x - c2.x) < 0.05) {
                addBeam(c1, c2);
            }
        }

        console.log(`[Structural Engine] Generated ${columns.length} columns and ${beams.length} beams.`);
        return { columns, beams };
    }
}

export const structuralEngine = new StructuralEngine();
