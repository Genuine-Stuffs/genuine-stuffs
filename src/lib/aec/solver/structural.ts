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
}

export class StructuralEngine {
    
    public generateSkeleton(layout: SolvedLayout): StructuralSkeleton {
        const columns: Column[] = [];
        const beams: Beam[] = [];
        const structParams = complianceRules.structural_parameters;
        
        const colWidth = structParams.beam_design.beam_width_mm / 1000;
        const maxSpan = structParams.beam_design.max_span_m.typical_residential;
        
        console.log(`[Structural Engine] Generating skeleton. Max span: ${maxSpan}m`);

        // Group rooms by floor
        const roomsByFloor = new Map<number, typeof layout.placed_rooms>();
        layout.placed_rooms.forEach(r => {
            if (!roomsByFloor.has(r.floor)) roomsByFloor.set(r.floor, []);
            roomsByFloor.get(r.floor)!.push(r);
        });

        roomsByFloor.forEach((rooms, floorIndex) => {
            const gridPoints = new Set<string>();

            rooms.forEach((room) => {
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
                            id: `F${floorIndex}_C${columns.length + 1}`,
                            floor: floorIndex,
                            x: c.x,
                            y: c.y,
                            width_m: colWidth,
                            depth_m: colWidth
                        });
                    }
                });
                
                if (room.width > maxSpan) {
                    const splits = Math.ceil(room.width / maxSpan);
                    const interval = room.width / splits;
                    for (let i = 1; i < splits; i++) {
                        const midX = room.x + (interval * i);
                        const key1 = `${midX.toFixed(2)},${room.y.toFixed(2)}`;
                        const key2 = `${midX.toFixed(2)},${(room.y + room.depth).toFixed(2)}`;
                        
                        if (!gridPoints.has(key1)) {
                            gridPoints.add(key1);
                            columns.push({ id: `F${floorIndex}_C${columns.length + 1}`, floor: floorIndex, x: midX, y: room.y, width_m: colWidth, depth_m: colWidth });
                        }
                        if (!gridPoints.has(key2)) {
                            gridPoints.add(key2);
                            columns.push({ id: `F${floorIndex}_C${columns.length + 1}`, floor: floorIndex, x: midX, y: room.y + room.depth, width_m: colWidth, depth_m: colWidth });
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
                            columns.push({ id: `F${floorIndex}_C${columns.length + 1}`, floor: floorIndex, x: room.x, y: midY, width_m: colWidth, depth_m: colWidth });
                        }
                        if (!gridPoints.has(key2)) {
                            gridPoints.add(key2);
                            columns.push({ id: `F${floorIndex}_C${columns.length + 1}`, floor: floorIndex, x: room.x + room.width, y: midY, width_m: colWidth, depth_m: colWidth });
                        }
                    }
                }
            });

            // Beams for this floor
            const floorCols = columns.filter(c => c.floor === floorIndex);
            const colsByX = [...floorCols].sort((a, b) => a.x - b.x || a.y - b.y);
            const colsByY = [...floorCols].sort((a, b) => a.y - b.y || a.x - b.x);

            const addBeam = (c1: Column, c2: Column) => {
                const span = Math.hypot(c2.x - c1.x, c2.y - c1.y);
                if (span > 0 && span <= maxSpan + 0.1) {
                    const ratio = structParams.beam_design.span_to_depth_ratio.simply_supported;
                    const reqDepthMm = (span * 1000) / ratio;
                    const actualDepthMm = Math.ceil(reqDepthMm / 50) * 50; 
                    const finalDepthM = Math.max(actualDepthMm, 450) / 1000;

                    beams.push({
                        id: `F${floorIndex}_B${beams.length + 1}`,
                        floor: floorIndex,
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

            for (let i = 0; i < colsByY.length - 1; i++) {
                const c1 = colsByY[i];
                const c2 = colsByY[i+1];
                if (Math.abs(c1.y - c2.y) < 0.05) addBeam(c1, c2);
            }

            for (let i = 0; i < colsByX.length - 1; i++) {
                const c1 = colsByX[i];
                const c2 = colsByX[i+1];
                if (Math.abs(c1.x - c2.x) < 0.05) addBeam(c1, c2);
            }
        });

        console.log(`[Structural Engine] Generated ${columns.length} columns and ${beams.length} beams across ${roomsByFloor.size} floors.`);
        return { columns, beams };
    }
}

export const structuralEngine = new StructuralEngine();
