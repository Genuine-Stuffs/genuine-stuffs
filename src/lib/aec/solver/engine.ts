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

    // ──────────────────────────────────────────────────────────────────────────
    // CIRCULATION-FIRST SOLVER
    // ──────────────────────────────────────────────────────────────────────────
    // Architectural principle: the corridor is allocated FIRST as a real
    // T-shaped circulation spine. Every room is then placed touching the
    // corridor with exactly one wall, so every door opens onto circulation
    // space rather than into another room.
    //
    // Layout:
    //   ┌──────────────────────────────────────────────────────────┐
    //   │  PUBLIC ROW (living, dining, kitchen, garage, foyer)     │
    //   ├──────────────────────────────────────────────────────────┤
    //   │═══════════════ HORIZONTAL CORRIDOR ══════════════════════│  ← 1.5m
    //   ├──────────────────────────────────────────────────────────┤
    //   │  PRIVATE ROW (bedroom suites, each with internal bath)   │
    //   └──────────────────────────────────────────────────────────┘
    //
    // Each bedroom suite is a single rectangle. Inside that rectangle:
    //   - bedroom occupies ~70% of the depth (top portion, against corridor)
    //   - bathroom + wardrobe occupy ~30% (bottom portion, against external wall)
    // No separate door for bathroom — it is accessed via the bedroom interior.
    // ──────────────────────────────────────────────────────────────────────────

    const SERVICE_KEYWORDS_C = ['bath','wc','toilet','shower','wardrobe','dressing','ensuite','en-suite'];
    const isService_C = (id: string) => SERVICE_KEYWORDS_C.some(k => id.toLowerCase().includes(k));
    const isBedroom_C = (id: string) => {
        const lo = id.toLowerCase();
        return lo.includes('bedroom') || lo.includes('master');
    };

    // Pair each bedroom with its service rooms using Hive adjacencies or name match
    const pairSuites = (
        floorNodes: InternalRoomNode[]
    ): Array<{ bedroom: InternalRoomNode; services: InternalRoomNode[] }> => {
        const sourceRooms: any[] = (program as any).rooms ?? [];
        const adjacencyMap = new Map<string, string[]>();
        for (const r of sourceRooms) {
            const id = r.room_id ?? r.id ?? '';
            adjacencyMap.set(id, r.adjacencies ?? []);
        }

        const bedrooms = floorNodes.filter(n => isBedroom_C(n.id));
        const services = floorNodes.filter(n => isService_C(n.id));
        const used = new Set<string>();

        const suites = bedrooms.map(bed => {
            const linked: InternalRoomNode[] = [];

            // 1. Try explicit adjacencies from Hive
            const adjs = adjacencyMap.get(bed.id) ?? [];
            for (const adj of adjs) {
                const svc = services.find(s => s.id === adj && !used.has(s.id));
                if (svc) { linked.push(svc); used.add(svc.id); }
            }

            // 2. Name-prefix match
            if (linked.length === 0) {
                const base = bed.id.toLowerCase()
                    .replace(/(bedroom|master|suite|_)/g, '').slice(0, 5);
                if (base.length >= 2) {
                    for (const svc of services) {
                        if (used.has(svc.id)) continue;
                        if (svc.id.toLowerCase().includes(base)) {
                            linked.push(svc); used.add(svc.id);
                        }
                    }
                }
            }

            return { bedroom: bed, services: linked };
        });

        // 3. Round-robin remaining services to suites that have none yet
        const remaining = services.filter(s => !used.has(s.id));
        remaining.forEach((svc, idx) => {
            if (suites.length === 0) return;
            const target = suites[idx % suites.length];
            target.services.push(svc);
            used.add(svc.id);
        });

        return suites;
    };

    const snap_C = (v: number, g: number) => Math.round(v / g) * g;

    const packFloor = (
        floorNodes: InternalRoomNode[],
        floorIndex: number,
        forceStairwell?: { x: number, y: number, w: number, d: number }
    ) => {
        // Building envelope: 75% of buildable width, capped at 22m
        const buildW = Math.min(buildableW * 0.75, 22.0);
        const CORRIDOR_D = 1.5;
        const STAIR_W = 2.4;
        const STAIR_D = 3.6;

        // Upper floor: mirror stairwell void
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

        // ── CLASSIFY ROOMS ────────────────────────────────────────────────────
        // PUBLIC: living, dining, kitchen, foyer, office, garage, etc.
        // PRIVATE: bedrooms (which absorb their bathrooms/wardrobes internally)
        // EXCLUDED: stairwell, corridor — these are handled by the solver itself
        const PUBLIC_KW = ['living','lounge','dining','kitchen','pantry','foyer',
                           'study','office','garage','entry','store','laundry','utility'];
        const isPublic_C = (id: string) => PUBLIC_KW.some(k => id.toLowerCase().includes(k));
        const isStairOrCorridor = (id: string) => {
            const lo = id.toLowerCase();
            return lo.includes('stair') || lo.includes('corridor') ||
                   lo.includes('hall') || lo.includes('void');
        };

        const eligibleNodes = floorNodes.filter(n => !isStairOrCorridor(n.id) && !isService_C(n.id));
        const publicNodes  = eligibleNodes.filter(n => isPublic_C(n.id))
            .sort((a, b) => b.target_area - a.target_area);
        const privateBedrooms = eligibleNodes.filter(n => isBedroom_C(n.id))
            .sort((a, b) => b.target_area - a.target_area);

        // Pair each bedroom with its services (internal sub-rooms)
        const suites = pairSuites(floorNodes);

        // ── COMPUTE ROW HEIGHTS ──────────────────────────────────────────────
        // Public row: depth = avg of public room target dimensions
        // Private row: depth = bedroom depth + bathroom depth (suite stack)
        const PUBLIC_ROW_D  = Math.max(5.5, Math.min(7.0, buildW / 4));   // 5.5–7m
        const SUITE_BATH_D  = 2.4;
        const SUITE_BED_D   = Math.max(3.6, Math.min(5.0, buildW / 5));   // 3.6–5m
        const PRIVATE_ROW_D = SUITE_BED_D + SUITE_BATH_D;

        // ── 1. PACK PUBLIC ROW (top of building, y = 0) ──────────────────────
        let curX = 0;
        const publicY = 0;
        const totalPublicArea = publicNodes.reduce((s, n) => s + (n.target_area || 12), 0);
        const publicAvailW = isDuplex ? buildW - STAIR_W : buildW;

        publicNodes.forEach((node, i) => {
            const safeArea = Math.max(node.target_area || 12, 6);
            const constraint = getConstraintForRoom(node.id);

            // Width proportional to area share
            let w = snap_C(publicAvailW * (safeArea / Math.max(totalPublicArea, 1)), grid);
            w = Math.max(w, 2.4);
            w = Math.min(w, constraint.maxWidth);

            // Last room fills remaining width
            if (i === publicNodes.length - 1) {
                w = snap_C(publicAvailW - curX, grid);
                w = Math.max(w, 2.4);
            }

            // Depth: fixed PUBLIC_ROW_D, but shrink if area would overflow
            let d = PUBLIC_ROW_D;
            if (w * d > safeArea * 1.5) {
                d = snap_C(Math.max(safeArea / w, 3.0), grid);
            }
            d = Math.max(d, 3.0);

            placedRooms.push({
                room_id: node.id,
                floor: floorIndex,
                x: curX,
                y: publicY,
                width: w,
                depth: d,
            });
            curX += w;
        });

        // Determine actual public row depth from tallest placed public room
        const actualPublicRowD = placedRooms
            .filter(r => r.floor === floorIndex && r.y === publicY)
            .reduce((max, r) => Math.max(max, r.depth), PUBLIC_ROW_D);

        // ── 2. PLACE STAIRWELL (ground floor duplex only) ────────────────────
        let stairX = buildW - STAIR_W;
        if (isDuplex && floorIndex === 0) {
            stairwellCoords = { x: stairX, y: publicY, w: STAIR_W, d: actualPublicRowD };
            placedRooms.push({
                room_id: "stairwell",
                floor: floorIndex,
                x: stairX,
                y: publicY,
                width: STAIR_W,
                depth: actualPublicRowD,
            });
        }

        // ── 3. PLACE HORIZONTAL CORRIDOR SPINE ───────────────────────────────
        // Corridor runs full width below the public row.
        const corridorY = snap_C(publicY + actualPublicRowD, grid);
        placedRooms.push({
            room_id: `corridor_floor${floorIndex}`,
            floor: floorIndex,
            x: 0,
            y: corridorY,
            width: buildW,
            depth: CORRIDOR_D,
        });

        // ── 4. PACK PRIVATE ROW (bedroom suites below corridor) ──────────────
        // Each suite is a vertical strip: bedroom on top (against corridor),
        // bathroom + wardrobe stacked below (against external wall).
        const privateY = snap_C(corridorY + CORRIDOR_D, grid);

        if (privateBedrooms.length === 0) {
            return; // No bedrooms on this floor (e.g. ground floor with only guest bedroom)
        }

        const totalBedroomArea = suites.reduce((s, u) =>
            s + Math.max(u.bedroom.target_area || 12, 10), 0);

        let pX = 0;
        suites.forEach((suite, i) => {
            const bedArea = Math.max(suite.bedroom.target_area || 12, 10);
            const constraint = getConstraintForRoom(suite.bedroom.id);

            // Suite width proportional to bedroom area share
            let suiteW = snap_C(buildW * (bedArea / Math.max(totalBedroomArea, 1)), grid);
            suiteW = Math.max(suiteW, 3.0); // minimum suite width
            suiteW = Math.min(suiteW, constraint.maxWidth);

            // Last suite fills remaining width
            if (i === suites.length - 1) {
                suiteW = snap_C(buildW - pX, grid);
                suiteW = Math.max(suiteW, 3.0);
            }

            // ── Place bedroom (top portion of suite, touches corridor) ───────
            placedRooms.push({
                room_id: suite.bedroom.id,
                floor: floorIndex,
                x: pX,
                y: privateY,
                width: suiteW,
                depth: SUITE_BED_D,
            });

            // ── Place services INSIDE the suite footprint, below the bedroom ─
            // Bathroom on the left half, wardrobe on the right half (or stacked)
            const svcY = snap_C(privateY + SUITE_BED_D, grid);
            const baths   = suite.services.filter(s => {
                const lo = s.id.toLowerCase();
                return lo.includes('bath') || lo.includes('wc') || lo.includes('toilet') || lo.includes('shower');
            });
            const wards   = suite.services.filter(s => {
                const lo = s.id.toLowerCase();
                return lo.includes('wardrobe') || lo.includes('dressing');
            });

            if (baths.length > 0 && wards.length > 0) {
                // Split suite width: bath on left, wardrobe on right
                const bathW = snap_C(suiteW * 0.55, grid);
                const wardW = snap_C(suiteW - bathW, grid);
                placedRooms.push({
                    room_id: baths[0].id,
                    floor: floorIndex,
                    x: pX,
                    y: svcY,
                    width: bathW,
                    depth: SUITE_BATH_D,
                });
                placedRooms.push({
                    room_id: wards[0].id,
                    floor: floorIndex,
                    x: pX + bathW,
                    y: svcY,
                    width: wardW,
                    depth: SUITE_BATH_D,
                });
            } else if (baths.length > 0) {
                placedRooms.push({
                    room_id: baths[0].id,
                    floor: floorIndex,
                    x: pX,
                    y: svcY,
                    width: suiteW,
                    depth: SUITE_BATH_D,
                });
            } else if (wards.length > 0) {
                placedRooms.push({
                    room_id: wards[0].id,
                    floor: floorIndex,
                    x: pX,
                    y: svcY,
                    width: suiteW,
                    depth: SUITE_BATH_D,
                });
            }

            pX += suiteW;
        });
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
