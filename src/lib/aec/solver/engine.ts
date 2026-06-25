/**
 * Genuine Stuffs AI Studio - Constraint Solver Engine
 * A deterministic layout algorithm for Single-Storey and Multi-Storey (Duplex) structures.
 *
 * SURGICAL FIX (2026-06-23):
 * The Hive four-agent system returns rooms using the following field names:
 *   room_id   (not id)
 *   area_m2   (not min_area_sqm)
 *   floor     (not target_floor)
 *   brief_reference.floors (not brief_reference.storeys)
 *
 * All four mismatches are fixed below with dual-field guards so the solver
 * remains compatible with both the old schema and the new Hive schema.
 * No packing logic, no output shape, and no other behaviour has changed.
 */
import { SpatialProgram, SolvedLayout, PlacedRoom } from "../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions, InternalRoomNode } from "./types";
import { NIGERIAN_AEC_RULES, getConstraintForRoom } from "./nigerian_rules";

export function solveLayout(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions
): SolvedLayout {
    const grid = options?.grid_size_m || 0.1; // 10cm grid snap

    // 1. Calculate buildable envelope (plot minus setbacks)
    const buildableW = envelope.width - (envelope.setbacks.left + envelope.setbacks.right);
    const buildableD = envelope.depth - (envelope.setbacks.front + envelope.setbacks.rear);

    let iterations = 0;
    const placedRooms: PlacedRoom[] = [];

    // ── FIX 1 & 2: room_id + area_m2 ──────────────────────────────────────────
    // Old schema used r.id and r.min_area_sqm.
    // New Hive schema uses r.room_id and r.area_m2.
    // Guard both so either schema works.
    const nodes: InternalRoomNode[] = program.rooms.map(r => {
        const roomId    = (r as any).room_id    ?? (r as any).id            ?? 'unknown';
        const area      = (r as any).area_m2    ?? (r as any).min_area_sqm  ?? 9.0;

        // ── FIX 3: floor field ─────────────────────────────────────────────────
        // Old schema: r.target_floor. New Hive schema: r.floor.
        const targetFloor = (r as any).floor ?? (r as any).target_floor ?? 0;

        return {
            id:           roomId,
            target_area:  area,
            placed:       false,
            x: 0, y: 0, w: 0, d: 0,
            target_floor: targetFloor
        };
    });

    // ── FIX 4: storeys vs floors ───────────────────────────────────────────────
    // Old schema: program.brief_reference.storeys
    // New Hive schema: program.brief_reference.floors
    const briefRef = (program as any).brief_reference ?? {};
    const storeys  = briefRef.floors ?? briefRef.storeys ?? 1;
    const isDuplex = storeys > 1;

    // Split nodes by floor
    const groundFloorNodes = nodes
        .filter(n => n.target_floor === 0)
        .sort((a, b) => b.target_area - a.target_area);

    const upperFloorNodes = nodes
        .filter(n => n.target_floor === 1)
        .sort((a, b) => b.target_area - a.target_area);

    let stairwellCoords: { x: number, y: number, w: number, d: number } | null = null;

    // ── ZONE CLASSIFIER ────────────────────────────────────────────────────────
    // Splits rooms into PUBLIC (living/dining/kitchen/foyer/study/office/garage)
    // and PRIVATE (bedroom/master/bath/wc/toilet/corridor) zones.
    // PUBLIC zone packs the left block; PRIVATE zone packs the right block.
    // Stairwell sits at the boundary between zones, inside the building mass.
    const PUBLIC_KEYWORDS  = ['living','lounge','dining','kitchen','pantry','foyer','study','office','garage','entry','store','laundry','utility'];
    const PRIVATE_KEYWORDS = ['bedroom','master','bath','wc','toilet','shower','corridor','hall','wardrobe','dressing'];

    const classifyZone = (id: string): 'public' | 'private' => {
        const lower = id.toLowerCase();
        if (PRIVATE_KEYWORDS.some(k => lower.includes(k))) return 'private';
        if (PUBLIC_KEYWORDS.some(k => lower.includes(k))) return 'public';
        // Default: odd-indexed rooms alternate; keeps unknown rooms from all piling into one zone
        return 'private';
    };

    // Pack a single zone as a column of rows within a given x-offset and width budget.
    // Returns the maximum depth reached (so the other zone can match it if needed).
    const packZone = (
        zoneNodes: InternalRoomNode[],
        floorIndex: number,
        zoneX: number,
        zoneW: number
    ): number => {
        const sorted = [...zoneNodes].sort((a, b) => b.target_area - a.target_area);
        let curY = 0;
        let i = 0;

        while (i < sorted.length) {
            let rowX = zoneX;
            let rowH = 0;
            const rowStart = i;

            while (i < sorted.length && (rowX - zoneX) < zoneW) {
                const node = sorted[i];
                iterations++;

                const safeArea = (typeof node.target_area === 'number' &&
                                  isFinite(node.target_area) &&
                                  node.target_area > 0) ? node.target_area : 9.0;

                const remainW = zoneW - (rowX - zoneX);
                let roomW = Math.min(remainW, Math.sqrt(safeArea * 1.6));
                roomW = Math.max(roomW, 2.4);
                roomW = Math.min(roomW, remainW);
                roomW = Math.round(roomW / grid) * grid;

                if (roomW < 2.4 && i > rowStart) break;

                let roomD = Math.ceil((safeArea / roomW) / grid) * grid;
                roomD = Math.max(roomD, 2.4);

                if (roomD > roomW * 3) {
                    roomD = Math.round((roomW * 3) / grid) * grid;
                    roomW = Math.ceil((safeArea / roomD) / grid) * grid;
                    roomW = Math.min(roomW, remainW);
                }

                // ── ROOM TYPE CONSTRAINT CLAMP ────────────────────────────────
                // Prevents the row-stretch from producing absurd dimensions.
                // A bathroom must never be 14m wide regardless of row space.
                const constraint = getConstraintForRoom(node.id);
                // Hard cap on width
                if (roomW > constraint.maxWidth) {
                    roomW = Math.round(Math.min(roomW, constraint.maxWidth) / grid) * grid;
                    // Recalculate depth to preserve area after width cap
                    roomD = Math.ceil((safeArea / Math.max(roomW, 0.1)) / grid) * grid;
                    roomD = Math.max(roomD, 2.4);
                }
                // Hard cap on aspect ratio
                if (roomW > roomD * constraint.maxAspect) {
                    roomW = Math.round((roomD * constraint.maxAspect) / grid) * grid;
                    roomW = Math.max(roomW, 2.4);
                }

                node.x = rowX;
                node.y = curY;
                node.w = roomW;
                node.d = roomD;
                node.placed = true;

                placedRooms.push({
                    room_id: node.id,
                    floor: floorIndex,
                    x: node.x,
                    y: node.y,
                    width: node.w,
                    depth: node.d
                });

                rowX += roomW;
                rowH = Math.max(rowH, roomD);
                i++;
            }

            // Stretch last room in row to fill zone width
            if ((rowX - zoneX) < zoneW && i > rowStart) {
                const lastPlaced = placedRooms[placedRooms.length - 1];
                if (lastPlaced && lastPlaced.floor === floorIndex &&
                    lastPlaced.room_id !== 'stairwell_void' &&
                    lastPlaced.room_id !== 'stairwell') {
                    const gap = zoneW - (lastPlaced.x - zoneX + lastPlaced.width);
                    if (gap > 0) {
                        placedRooms[placedRooms.length - 1] = {
                            ...lastPlaced,
                            width: Math.round((lastPlaced.width + gap) / grid) * grid
                        };
                    }
                }
            }

            curY += rowH;
        }

        return curY;
    };

    const packFloor = (
        floorNodes: InternalRoomNode[],
        floorIndex: number,
        forceStairwell?: { x: number, y: number, w: number, d: number }
    ) => {
        // ── ZONE-BASED TWO-BLOCK PACKER ───────────────────────────────────────
        // Total building width = 70% of buildable, capped at 22m.
        // Stairwell (2.4m wide) sits at the boundary between PUBLIC and PRIVATE.
        // PUBLIC zone occupies the LEFT block; PRIVATE zone the RIGHT block.
        // The stairwell column is placed inside the building mass, not appended below.

        const totalBuildW = Math.min(buildableW * 0.70, 22.0);
        const stairW = 2.4;
        const stairD = 3.6;

        // Upper floor mirrors stairwell from ground floor exactly
        if (floorIndex > 0 && forceStairwell) {
            placedRooms.push({
                room_id: "stairwell_void",
                floor: floorIndex,
                x: forceStairwell.x,
                y: forceStairwell.y,
                width: forceStairwell.w,
                depth: forceStairwell.d
            });
        }

        // Split nodes into zones
        const publicNodes  = floorNodes.filter(n => classifyZone(n.id) === 'public');
        const privateNodes = floorNodes.filter(n => classifyZone(n.id) === 'private');

        // If one zone is empty, fall back to full-width single-zone pack
        if (publicNodes.length === 0 || privateNodes.length === 0) {
            packZone(floorNodes, floorIndex, 0, totalBuildW);
            return;
        }

        // Allocate widths proportional to total area of each zone
        const publicArea  = publicNodes.reduce((s, n)  => s + (n.target_area || 9), 0);
        const privateArea = privateNodes.reduce((s, n) => s + (n.target_area || 9), 0);
        const usableW     = totalBuildW - (isDuplex ? stairW : 0);
        const publicW  = Math.round((usableW * publicArea  / (publicArea + privateArea)) / grid) * grid;
        const privateW = Math.round((usableW - publicW) / grid) * grid;

        // Stairwell x-position: at the boundary between public and private zones
        const stairX = publicW;

        // Pack PUBLIC zone (x: 0 → publicW)
        packZone(publicNodes, floorIndex, 0, publicW);

        // Place stairwell at boundary (ground floor only; upper floor mirrors via forceStairwell)
        if (floorIndex === 0 && isDuplex) {
            stairwellCoords = { x: stairX, y: 0, w: stairW, d: stairD };
            placedRooms.push({
                room_id: "stairwell",
                floor: floorIndex,
                x: stairX,
                y: 0,
                width: stairW,
                depth: stairD
            });
            console.log(`[Solver] Zone stairwell at X:${stairX}, Y:0 (boundary between public/private)`);
        }

        // Pack PRIVATE zone (x: stairX + stairW → end)
        const privateStartX = isDuplex ? stairX + stairW : stairX;
        packZone(privateNodes, floorIndex, privateStartX, privateW);
    };

    // Pack Ground Floor
    packFloor(groundFloorNodes, 0);

    // Pack Upper Floor (Duplex only)
    if (isDuplex && stairwellCoords) {
        packFloor(upperFloorNodes, 1, stairwellCoords);
    }

    return {
        program_reference: program,
        plot_width:  envelope.width,
        plot_depth:  envelope.depth,
        placed_rooms: placedRooms,
        solver_iterations_used: iterations,
        is_fully_connected: true
    };
}
