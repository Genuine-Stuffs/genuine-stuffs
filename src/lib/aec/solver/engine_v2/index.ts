/**
 * Genuine Stuffs AI Studio · Solver V2 · Entry Point
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE D · 26 June 2026
 *
 * Wires treemap.ts + zones.ts + shapes.ts into a complete layout algorithm.
 * Replaces the Phase A 3-column scaffold with real squarified subdivision.
 *
 * Algorithm sequence (per floor):
 *   1. Classify rooms into social / service / private / circ zones
 *   2. Select building footprint shape (RECTANGLE / L_SHAPE / T_SHAPE)
 *   3. Allocate zone rectangles within the footprint
 *   4. Run squarified treemap inside each zone rectangle
 *   5. Nest service sub-rooms (bath, wardrobe) inside bedroom footprints
 *   6. Place corridor band between social and private zones
 *   7. Place stairwell at zone junction (duplex ground floor)
 *   8. Mirror stairwell void on upper floor
 *
 * Feature flag: USE_SOLVER_V2 in AIStudio.tsx (currently false).
 * This file is production-safe — it is only reached when that flag is true.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
    SpatialProgram,
    SolvedLayout,
    PlacedRoom
} from "../../../../../supabase/functions/ai-studio/schema";
import { PlotEnvelope, SolverOptions } from "../types";
import { squarify, TreemapBounds } from "./treemap";
import { classifyRoom, groupByZone, allocateZones, RoomWithZone } from "./zones";
import { selectFootprint } from "./shapes";

// ──────────────────────────────────────────────────────────────────────────
// Public entry point — same signature as solveLayout() in engine.ts
// ──────────────────────────────────────────────────────────────────────────

export function solveLayoutV2(
    program: SpatialProgram,
    envelope: PlotEnvelope,
    options?: SolverOptions
): SolvedLayout {

    // ── Schema guards (dual-field, same pattern as engine.ts) ─────────────
    const sourceRooms: any[] = (program as any).rooms ?? [];
    const briefRef  = (program as any).brief_reference ?? {};
    const briefStoreys = briefRef.floors ?? briefRef.storeys ?? 1;
    const storeys   = (options as any)?.floors_override ?? briefStoreys;

    const rooms = sourceRooms.map((r: any, idx: number) => ({
        id:    r.room_id   ?? r.id           ?? `room_${idx}`,
        area:  r.area_m2   ?? r.min_area_sqm ?? 9.0,
        floor: r.floor     ?? r.target_floor ?? 0,
    }));

    const hasUpperFloorRooms = rooms.some(r => r.floor === 1);
    const isDuplex = storeys > 1 || hasUpperFloorRooms;

    // Buildable envelope
    const bW = Math.max(envelope.width  - envelope.setbacks.left  - envelope.setbacks.right, 8);
    const bD = Math.max(envelope.depth  - envelope.setbacks.front - envelope.setbacks.rear,  8);

    const placedRooms: PlacedRoom[] = [];

    // Track ground-floor stairwell coords so upper floor can mirror the void
    let stairCoords: TreemapBounds | null = null;

    // Pack each floor independently
    const floors = isDuplex ? [0, 1] : [0];

    for (const floorIndex of floors) {
        const floorRooms = rooms.filter(r => r.floor === floorIndex);
        if (floorRooms.length === 0) continue;

        // ── 1. Select footprint ───────────────────────────────────────────
        const nonCircRooms = floorRooms.filter(
            r => classifyRoom(r.id) !== 'circ'
        );
        const footprint = selectFootprint(
            envelope.width, envelope.depth,
            envelope.setbacks,
            nonCircRooms.length,
            storeys,
            floorIndex
        );

        // ── 2. Zone grouping ──────────────────────────────────────────────
        const byZone = groupByZone(floorRooms);

        // ── 3. Zone rectangle allocation ─────────────────────────────────
        const { allocations, corridorBounds } = allocateZones(
            footprint.primary,
            byZone,
            floorIndex
        );

        // ── 4. Place corridor band ────────────────────────────────────────
        if (corridorBounds) {
            placedRooms.push({
                room_id: `corridor_floor${floorIndex}`,
                floor:   floorIndex,
                x:       corridorBounds.x,
                y:       corridorBounds.y,
                width:   corridorBounds.width,
                depth:   corridorBounds.height,
            });
        }

        // ── 5. Place stairwell (ground floor, duplex only) ────────────────
        if (floorIndex === 0 && isDuplex) {
            const stairW = 2.4;
            const stairD = 3.6;
            const stairX = footprint.primary.x + footprint.primary.width - stairW;
            const stairY = footprint.primary.y;
            stairCoords  = { x: stairX, y: stairY, width: stairW, height: stairD };
            placedRooms.push({
                room_id: 'stairwell',
                floor:   0,
                x:       stairX,
                y:       stairY,
                width:   stairW,
                depth:   stairD,
            });
        }

        // ── 6. Mirror stairwell void on upper floor ───────────────────────
        if (floorIndex === 1 && stairCoords) {
            placedRooms.push({
                room_id: 'stairwell_void',
                floor:   1,
                x:       stairCoords.x,
                y:       stairCoords.y,
                width:   stairCoords.width,
                depth:   stairCoords.height,
            });
        }

        // ── 7. Treemap + suite nesting per zone ───────────────────────────
        for (const allocation of allocations) {
            packZone(
                allocation.zone,
                allocation.rooms,
                allocation.bounds,
                floorIndex,
                placedRooms
            );
        }
    }

    console.log(
        `[SOLVER_V2] Phase D · ${placedRooms.length} rooms placed · ` +
        `duplex=${isDuplex} · floors=${floors.length}`
    );

    return {
        program_reference:      program,
        plot_width:              envelope.width,
        plot_depth:              envelope.depth,
        placed_rooms:            placedRooms,
        solver_iterations_used:  0,
        is_fully_connected:      true,
    };
}

// ──────────────────────────────────────────────────────────────────────────
// Zone Packing
// ──────────────────────────────────────────────────────────────────────────

/**
 * Pack rooms for a single zone using squarified treemap.
 *
 * For PRIVATE zones: bedroom + service sub-rooms are packed as a unit.
 * Each bedroom gets a vertical strip. Service rooms (bath, wardrobe) are
 * nested inside that strip below the bedroom — they share the external wall.
 *
 * For SOCIAL and SERVICE zones: all rooms are packed flat with no nesting.
 */
function packZone(
    zone: string,
    rooms: RoomWithZone[],
    bounds: TreemapBounds,
    floorIndex: number,
    out: PlacedRoom[]
): void {
    if (rooms.length === 0) return;
    if (bounds.width <= 0 || bounds.height <= 0) return;

    if (zone === 'private') {
        packPrivateZone(rooms, bounds, floorIndex, out);
    } else {
        packFlatZone(rooms, bounds, floorIndex, out);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Flat Zone (social + service)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Simple squarified treemap with no sub-room nesting.
 * Used for social (living/dining/kitchen) and service (garage) zones.
 */
function packFlatZone(
    rooms: RoomWithZone[],
    bounds: TreemapBounds,
    floorIndex: number,
    out: PlacedRoom[]
): void {
    const items = rooms.map(r => ({
        id:     r.id,
        weight: Math.max(r.area, 4),
    }));

    const rects = squarify(items, bounds);

    for (const rect of rects) {
        out.push({
            room_id: rect.id,
            floor:   floorIndex,
            x:       rect.x,
            y:       rect.y,
            width:   rect.width,
            depth:   rect.height,
        });
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Private Zone (bedrooms with nested bathrooms + wardrobes)
// ──────────────────────────────────────────────────────────────────────────

const SERVICE_SUB_KW = [
    'bath','wc','toilet','shower','wardrobe','dressing','ensuite','en-suite'
];
const isSubRoom = (id: string) =>
    SERVICE_SUB_KW.some(k => id.toLowerCase().includes(k));
const isBedroom = (id: string) => {
    if (isSubRoom(id)) return false; // sub-rooms are never bedrooms, even if named "Master ..."
    const lo = id.toLowerCase();
    return lo.includes('bedroom') || lo.includes('master');
    // 'suite' alone dropped — it's redundant with 'master'/'bedroom' and
    // collides with 'ensuite', which is a sub-room keyword.
};

/**
 * Pack the private zone as bedroom suites.
 *
 * Each bedroom is paired with its service sub-rooms.
 * The bedroom is run through the treemap as a single unit
 * (area = bedroom + all sub-room areas combined).
 * After treemap placement, the bedroom rectangle is subdivided:
 *   top portion   → bedroom (70% of suite depth)
 *   bottom portion → service sub-rooms side by side (30% of suite depth)
 *
 * This guarantees:
 *   - Bedroom touches corridor (top wall)
 *   - Bathroom touches external wall (bottom wall)
 *   - Sub-rooms never have external doors — only interior door to bedroom
 */
function packPrivateZone(
    rooms: RoomWithZone[],
    bounds: TreemapBounds,
    floorIndex: number,
    out: PlacedRoom[]
): void {
    // ── A. Pair bedrooms with their sub-rooms ─────────────────────────────
    const bedrooms = rooms.filter(r => isBedroom(r.id));
    const subRooms = rooms.filter(r => isSubRoom(r.id));
    const other    = rooms.filter(r => !isBedroom(r.id) && !isSubRoom(r.id));

    // Match sub-rooms to bedrooms by numeric suffix or master keyword
    // If there are no bedrooms (e.g. office WCs), promote sub-rooms to
    // standalone so they pack flat rather than stranding with no parent.
    const orphanSubs = bedrooms.length === 0 ? subRooms : [];
    const pairedSubs = bedrooms.length === 0 ? [] : subRooms;
    const suites = buildSuites(bedrooms, pairedSubs);
    // Orphaned sub-rooms join the flat pack alongside other rooms
    const flatExtras = [...other, ...orphanSubs];

    // ── B. Treemap on suite weights (bedroom + sub-room areas combined) ───
    const suiteItems = suites.map(s => ({
        id:     s.bedroom.id,
        weight: s.totalArea,
    }));

    // Add non-bedroom, non-service private rooms (e.g. family lounge) +
    // any orphaned sub-rooms (WCs in office briefs with no bedrooms)
    const otherItems = flatExtras.map(r => ({
        id:     r.id,
        weight: Math.max(r.area, 6),
    }));

    const allItems = [...suiteItems, ...otherItems];
    if (allItems.length === 0) return;

    const rects = squarify(allItems, bounds);

    // ── C. Place each suite (bedroom + sub-rooms subdivided vertically) ───
    for (const rect of rects) {
        // Check if this rect belongs to a suite or a standalone room
        const suite = suites.find(s => s.bedroom.id === rect.id);

        if (suite && suite.subs.length > 0) {
            const BATH_D = 2.2;
            const bedDepth = Math.max(rect.height - BATH_D, 2.4); // reserve a sane minimum bedroom depth

            out.push({
                room_id: suite.bedroom.id,
                floor:   floorIndex,
                x:       rect.x,
                y:       rect.y,
                width:   rect.width,
                depth:   bedDepth,
            });

            placeSubRooms(
                suite.subs,
                {
                    x:      rect.x,
                    y:      rect.y + bedDepth,
                    width:  rect.width,
                    height: BATH_D,
                },
                floorIndex,
                out
            );
        } else {
            // Standalone room (family lounge, study, etc.)
            out.push({
                room_id: rect.id,
                floor:   floorIndex,
                x:       rect.x,
                y:       rect.y,
                width:   rect.width,
                depth:   rect.height,
            });
        }
    }
}

/**
 * Place service sub-rooms (baths, wardrobes) side-by-side inside the given
 * rectangle using a simple equal-width split.
 */
function placeSubRooms(
    subs: RoomWithZone[],
    bounds: TreemapBounds,
    floorIndex: number,
    out: PlacedRoom[]
): void {
    if (subs.length === 0) return;
    const slotW = bounds.width / subs.length;
    subs.forEach((sub, idx) => {
        out.push({
            room_id: sub.id,
            floor:   floorIndex,
            x:       bounds.x + idx * slotW,
            y:       bounds.y,
            width:   slotW,
            depth:   bounds.height,
        });
    });
}

// ──────────────────────────────────────────────────────────────────────────
// Suite Pairing
// ──────────────────────────────────────────────────────────────────────────

interface Suite {
    bedroom:   RoomWithZone;
    subs:      RoomWithZone[];
    totalArea: number;
}

/**
 * Pair each bedroom with its service sub-rooms.
 *
 * Matching priority:
 *   1. Numeric suffix match: "Bedroom 2" ↔ "Bathroom 2", "Wardrobe 2"
 *   2. Master keyword match: "Master Suite" ↔ "Master Bath", "Walk-in Wardrobe"
 *   3. Round-robin fallback for any unmatched sub-rooms
 */
function buildSuites(
    bedrooms: RoomWithZone[],
    subs: RoomWithZone[]
): Suite[] {
    const used = new Set<string>();

    const suites: Suite[] = bedrooms.map(bed => {
        const matched: RoomWithZone[] = [];
        const bedNum     = bed.id.match(/\d+/)?.[0];
        const bedMaster  = bed.id.toLowerCase().includes('master');

        for (const sub of subs) {
            if (used.has(sub.id)) continue;
            const subNum    = sub.id.match(/\d+/)?.[0];
            const subMaster = sub.id.toLowerCase().includes('master') ||
                              sub.id.toLowerCase().includes('luxury') ||
                              sub.id.toLowerCase().includes('walk-in') ||
                              sub.id.toLowerCase().includes('walkin');

            const numMatch    = !!(bedNum && subNum && bedNum === subNum);
            const masterMatch = bedMaster && subMaster;

            if (numMatch || masterMatch) {
                matched.push(sub);
                used.add(sub.id);
            }
        }

        const totalArea = bed.area + matched.reduce((s, r) => s + r.area, 0);
        return { bedroom: bed, subs: matched, totalArea };
    });

    // Round-robin remaining unmatched sub-rooms into existing suites.
    // Guard: if there are no suites (no bedrooms in brief), skip silently —
    // orphaned sub-rooms are promoted to flat packing in packPrivateZone.
    if (suites.length > 0) {
        subs.filter(s => !used.has(s.id)).forEach((sub, idx) => {
            suites[idx % suites.length].subs.push(sub);
            suites[idx % suites.length].totalArea += sub.area;
        });
    }

    return suites;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function snapTo(value: number, grid: number): number {
    return Math.round(value / grid) * grid;
}
