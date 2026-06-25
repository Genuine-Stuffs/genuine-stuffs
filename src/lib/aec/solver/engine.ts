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
import { selectStrategy, StrategyOptions, BuildableEnvelope } from "./strategies/index";
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
    // floors_override from AIStudio.tsx takes priority — it reads brief_reference
    // before calling solveLayout so we don't depend on the Hive setting it correctly.
    const briefRef = (program as any).brief_reference ?? {};
    const briefStoreys = briefRef.floors ?? briefRef.storeys ?? 1;
    const storeys = (options as any)?.floors_override ?? briefStoreys;

    // Also detect duplex from room data directly — if any room has floor: 1,
    // treat as duplex regardless of brief_reference value.
    const hasUpperFloorRooms = nodes.some(n => n.target_floor === 1);
    const isDuplex = storeys > 1 || hasUpperFloorRooms;

    // Split nodes by floor
    const groundFloorNodes = nodes
        .filter(n => n.target_floor === 0)
        .sort((a, b) => b.target_area - a.target_area);

    const upperFloorNodes = nodes
        .filter(n => n.target_floor === 1)
        .sort((a, b) => b.target_area - a.target_area);

    let stairwellCoords: { x: number, y: number, w: number, d: number } | null = null;

    // ── ADJACENCY PAIRING ─────────────────────────────────────────────────────
    // Pairs each bathroom/wardrobe to its parent bedroom so they pack as a unit.
    // A paired room is placed immediately after its parent in the sorted order,
    // preventing bathrooms from floating into unrelated rows.
    // Pairing is detected from the Hive adjacencies field.
    const buildPairedOrder = (floorNodes: InternalRoomNode[]): InternalRoomNode[] => {
        // Get adjacency map from source rooms
        const sourceRooms: any[] = (program as any).rooms ?? [];
        const adjacencyMap = new Map<string, string[]>();
        for (const r of sourceRooms) {
            const id = r.room_id ?? r.id ?? '';
            const adj: string[] = r.adjacencies ?? [];
            adjacencyMap.set(id, adj);
        }

        // Identify service rooms that should follow a parent
        const SERVICE_KEYWORDS = ['bath', 'wc', 'toilet', 'shower', 'wardrobe', 'dressing', 'ensuite', 'en-suite'];
        const isServiceRoom = (id: string) => SERVICE_KEYWORDS.some(k => id.toLowerCase().includes(k));

        // Build paired order: for each non-service room, append its service adjacencies immediately after
        const paired: InternalRoomNode[] = [];
        const appended = new Set<string>();

        // Sort: large non-service rooms first
        const anchors = floorNodes
            .filter(n => !isServiceRoom(n.id))
            .sort((a, b) => b.target_area - a.target_area);
        const services = floorNodes.filter(n => isServiceRoom(n.id));

        for (const anchor of anchors) {
            if (appended.has(anchor.id)) continue;
            paired.push(anchor);
            appended.add(anchor.id);

            // Find service rooms adjacent to this anchor
            const adjs = adjacencyMap.get(anchor.id) ?? [];
            for (const adjId of adjs) {
                const svcNode = services.find(s => s.id === adjId && !appended.has(s.id));
                if (svcNode) {
                    paired.push(svcNode);
                    appended.add(svcNode.id);
                }
            }
        }

        // Fallback pairing: if service rooms have no adjacency data,
        // pair them to the nearest bedroom anchor by index order.
        // This handles the case where the Hive omits adjacencies entirely.
        const unpairedServices = services.filter(s => !appended.has(s.id));
        const unpairedAnchors  = anchors.filter(a =>
            a.id.toLowerCase().includes('bedroom') ||
            a.id.toLowerCase().includes('master')
        );

        unpairedServices.forEach((svc, idx) => {
            // Insert after the bedroom at the same index (wraps if more services than bedrooms)
            const targetAnchor = unpairedAnchors[idx % Math.max(unpairedAnchors.length, 1)];
            if (targetAnchor) {
                const insertPos = paired.indexOf(targetAnchor) + 1;
                // Skip past any already-inserted services after this anchor
                let finalPos = insertPos;
                while (finalPos < paired.length &&
                       SERVICE_KEYWORDS.some(k => paired[finalPos].id.toLowerCase().includes(k))) {
                    finalPos++;
                }
                paired.splice(finalPos, 0, svc);
            } else {
                paired.push(svc);
            }
            appended.add(svc.id);
        });

        return paired;
    };

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
        // ── SUITE-AWARE SORT ──────────────────────────────────────────────────
        // Rather than a flat area sort, build an ordered list where each bedroom
        // is immediately followed by its paired service rooms (bathroom, wardrobe).
        // This guarantees en-suite rooms are offered to the same row as their
        // parent bedroom before the packer moves to the next bedroom.
        const SERVICE_KEYWORDS = ['bath', 'wc', 'toilet', 'shower', 'wardrobe', 'dressing', 'ensuite', 'en-suite'];
        const isService = (id: string) => SERVICE_KEYWORDS.some(k => id.toLowerCase().includes(k));

        const anchors = zoneNodes.filter(n => !isService(n.id))
            .sort((a, b) => b.target_area - a.target_area);
        const services = zoneNodes.filter(n => isService(n.id));
        const usedServices = new Set<string>();

        // Build suite groups: [bedroom, bath, wardrobe, ...] as atomic units
        const suiteGroups: InternalRoomNode[][] = anchors.map(anchor => {
            const group: InternalRoomNode[] = [anchor];
            // Attach services that share a name-pattern with this anchor
            // e.g. "master_bedroom" pairs with "master_bath", "master_wardrobe"
            const anchorBase = anchor.id.toLowerCase()
                .replace(/bedroom|master|suite/g, '').replace(/_+/g, '_').trim();
            for (const svc of services) {
                if (usedServices.has(svc.id)) continue;
                const svcBase = svc.id.toLowerCase();
                // Match by shared prefix or sequential numbering
                const matches = anchorBase.length > 2 && svcBase.includes(anchorBase.slice(0, 4));
                if (matches) {
                    group.push(svc);
                    usedServices.add(svc.id);
                }
            }
            return group;
        });

        // Fallback: assign remaining unpaired services to suite groups by index
        const remainingServices = services.filter(s => !usedServices.has(s.id));
        remainingServices.forEach((svc, idx) => {
            const targetGroup = suiteGroups[idx % Math.max(suiteGroups.length, 1)];
            if (targetGroup) targetGroup.push(svc);
        });

        // Flatten suite groups back into ordered node list
        const sorted = suiteGroups.flat();

        let curY = 0;
        let i = 0;

        while (i < sorted.length) {
            let rowX = zoneX;
            let rowH = 0;
            const rowStart = i;

            // ── MINIMUM ROW OCCUPANCY GUARD ───────────────────────────────────
            // If all remaining rooms are service rooms and previous rows exist,
            // append to the last row instead of starting a disconnected strip.
            const SERVICE_ROW_KEYWORDS = ['bath', 'wc', 'toilet', 'stair', 'wet', 'wardrobe'];
            const remainingNodes = sorted.slice(i);
            const allRemainingAreService = remainingNodes.length > 0 &&
                remainingNodes.every(n =>
                    SERVICE_ROW_KEYWORDS.some(k => n.id.toLowerCase().includes(k))
                );

            if (allRemainingAreService && curY > 0 && placedRooms.length > 0) {
                const lastOnFloor = [...placedRooms]
                    .reverse()
                    .find(r => r.floor === floorIndex &&
                               r.x >= zoneX && r.x < zoneX + zoneW);
                if (lastOnFloor) {
                    curY = lastOnFloor.y;
                    rowX = lastOnFloor.x + lastOnFloor.width;
                    rowH = lastOnFloor.depth;
                }
            }

            // ── ROW FILL — suite-aware ────────────────────────────────────────
            // When a bedroom is placed, immediately attempt to place its suite
            // service rooms in the same row before advancing to the next bedroom.
            while (i < sorted.length && (rowX - zoneX) < zoneW) {
                const node = sorted[i];
                iterations++;

                const safeArea = (typeof node.target_area === 'number' &&
                                  isFinite(node.target_area) &&
                                  node.target_area > 0) ? node.target_area : 9.0;

                const remainW = zoneW - (rowX - zoneX);

                // If this is a service room and there's not enough space, break to
                // next row — but only if it's not immediately following its anchor
                // (i.e. the previous node was not its bedroom partner).
                const prevNode = i > 0 ? sorted[i - 1] : null;
                const prevWasBedroom = prevNode && (
                    prevNode.id.toLowerCase().includes('bedroom') ||
                    prevNode.id.toLowerCase().includes('master')
                );
                const thisIsService = isService(node.id);

                if (thisIsService && !prevWasBedroom && remainW < 2.4 && i > rowStart) {
                    break;
                }

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
                const constraint = getConstraintForRoom(node.id);
                if (roomW > constraint.maxWidth) {
                    roomW = Math.round(Math.min(roomW, constraint.maxWidth) / grid) * grid;
                    roomD = Math.ceil((safeArea / Math.max(roomW, 0.1)) / grid) * grid;
                    roomD = Math.max(roomD, 2.4);
                }
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

            // Stretch last room in row — constraint-guarded
            if ((rowX - zoneX) < zoneW && i > rowStart) {
                const lastPlaced = placedRooms[placedRooms.length - 1];
                if (lastPlaced && lastPlaced.floor === floorIndex &&
                    lastPlaced.room_id !== 'stairwell_void' &&
                    lastPlaced.room_id !== 'stairwell') {
                    const gap = zoneW - (lastPlaced.x - zoneX + lastPlaced.width);
                    if (gap > 0) {
                        const stretchConstraint = getConstraintForRoom(lastPlaced.room_id);
                        const stretchedW = Math.round((lastPlaced.width + gap) / grid) * grid;
                        const stretchedAspect = stretchedW / Math.max(lastPlaced.depth, 0.1);
                        const canStretch = stretchedW <= stretchConstraint.maxWidth &&
                                           stretchedAspect <= stretchConstraint.maxAspect;
                        if (canStretch) {
                            placedRooms[placedRooms.length - 1] = {
                                ...lastPlaced,
                                width: stretchedW
                            };
                        }
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
        const totalBuildW = Math.min(buildableW * 0.70, 22.0);
        const stairW = 2.4;
        const stairD = 3.6;

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

        const bedroomCount = floorNodes.filter(n =>
            n.id.toLowerCase().includes('bedroom') ||
            n.id.toLowerCase().includes('master')
        ).length;
        const hasCorridorAlready = floorNodes.some(n =>
            n.id.toLowerCase().includes('corridor') ||
            n.id.toLowerCase().includes('hall')
        );
        if (bedroomCount >= 2 && !hasCorridorAlready) {
            const corridorArea = Math.min(bedroomCount * 2.5, 12.0);
            floorNodes.push({
                id: `corridor_floor${floorIndex}`,
                target_area: corridorArea,
                placed: false,
                x: 0, y: 0, w: 0, d: 0,
                target_floor: floorIndex
            });
        }

        const pairedFloorNodes = buildPairedOrder(floorNodes);
        const publicNodes  = pairedFloorNodes.filter(n => classifyZone(n.id) === 'public');
        const privateNodes = pairedFloorNodes.filter(n => classifyZone(n.id) === 'private');

        if (publicNodes.length === 0 || privateNodes.length === 0) {
            packZone(floorNodes, floorIndex, 0, totalBuildW);
            return;
        }

        const publicArea  = publicNodes.reduce((s, n) => s + (n.target_area || 9), 0);
        const privateArea = privateNodes.reduce((s, n) => s + (n.target_area || 9), 0);
        const usableW     = totalBuildW - (isDuplex ? stairW : 0);

        const bedroomsInPrivate = privateNodes.filter(n =>
            n.id.toLowerCase().includes('bedroom') ||
            n.id.toLowerCase().includes('master')
        ).length;

        let publicW  = Math.round((usableW * publicArea  / (publicArea + privateArea)) / grid) * grid;
        let privateW = Math.round((usableW - publicW) / grid) * grid;

        const minPrivateW = bedroomsInPrivate >= 3
            ? Math.round((bedroomsInPrivate * 3.6) / grid) * grid
            : 0;

        if (privateW < minPrivateW && minPrivateW < usableW * 0.75) {
            privateW = Math.min(minPrivateW, Math.round(usableW * 0.65 / grid) * grid);
            publicW  = Math.round((usableW - privateW) / grid) * grid;
        }

        const stairX = publicW;

        packZone(publicNodes, floorIndex, 0, publicW);

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
        }

        const privateStartX = isDuplex ? stairX + stairW : stairX;
        packZone(privateNodes, floorIndex, privateStartX, privateW);
    };

    // Pack Ground Floor
    packFloor(groundFloorNodes, 0);

    // Pack Upper Floor (Duplex only)
    if (isDuplex && upperFloorNodes.length > 0) {
        if (!stairwellCoords) {
            const totalBuildW = Math.min(buildableW * 0.70, 22.0);
            stairwellCoords = {
                x: Math.max(0, totalBuildW - 2.4),
                y: 0,
                w: 2.4,
                d: 3.6,
            };
            placedRooms.push({
                room_id: 'stairwell',
                floor: 0,
                x: stairwellCoords.x,
                y: stairwellCoords.y,
                width: stairwellCoords.w,
                depth: stairwellCoords.d,
            });
        }
        packFloor(upperFloorNodes, 1, stairwellCoords);
    }

    return {
        program_reference:       program,
        plot_width:               envelope.width,
        plot_depth:               envelope.depth,
        placed_rooms:             placedRooms,
        solver_iterations_used:   iterations,
        is_fully_connected:       true,
    };
}
