/**
 * Genuine Stuffs AI Studio · Solver V2 · Zone Classifier
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE C · 26 June 2026
 *
 * Classifies rooms into architectural zones and computes zone rectangle
 * allocations within the building footprint.
 *
 * Zone model (matches all reference plans):
 *
 *   SOCIAL   — living, dining, foyer, family, study, office
 *   SERVICE  — kitchen, pantry, wet kitchen, laundry, garage, utility, store
 *   PRIVATE  — bedroom, master, bath, wc, wardrobe, dressing, ensuite
 *   CIRC     — corridor, hall, landing, stairwell, void
 *
 * Zones are placed as rectangular bands within the building:
 *
 *   Ground floor (duplex or single-storey):
 *     ┌───────────────────────────────────────┐
 *     │         SOCIAL  (front, street-facing) │
 *     ├───────────────────────────────────────┤
 *     │  SERVICE (side)  │  PRIVATE (rear)    │
 *     └───────────────────────────────────────┘
 *
 *   Upper floor:
 *     ┌───────────────────────────────────────┐
 *     │              PRIVATE                  │
 *     ├───────────────────────────────────────┤
 *     │              CIRC (landing)            │
 *     └───────────────────────────────────────┘
 *
 * Zero dependencies on production code.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { TreemapBounds } from './treemap';

// ──────────────────────────────────────────────────────────────────────────
// Zone Classification
// ──────────────────────────────────────────────────────────────────────────

export type ZoneType = 'social' | 'service' | 'private' | 'circ';

// Keyword lists. Checked via .includes() on lowercase room id.
// Order matters within each group only for readability — all are checked.
const SOCIAL_KW   = ['living','lounge','dining','foyer','family','entry','reception'];
const SERVICE_KW  = ['kitchen','pantry','wet','laundry','garage','utility','store','boiler'];
const PRIVATE_KW  = ['bedroom','master','bath','wc','toilet','shower','wardrobe','dressing','ensuite','en-suite','study','office','guest'];
const CIRC_KW     = ['corridor','hall','landing','stairwell','stair','void'];

export function classifyRoom(roomId: string): ZoneType {
    const lo = roomId.toLowerCase();

    // CIRC first — stairwell must never be placed as a social room
    if (CIRC_KW.some(k => lo.includes(k)))    return 'circ';
    if (SOCIAL_KW.some(k => lo.includes(k)))  return 'social';
    if (SERVICE_KW.some(k => lo.includes(k))) return 'service';
    if (PRIVATE_KW.some(k => lo.includes(k))) return 'private';

    // Unknown rooms default to private (safer than social — avoids
    // unknowns inflating the public front of the house)
    return 'private';
}

// ──────────────────────────────────────────────────────────────────────────
// Zone Grouping
// ──────────────────────────────────────────────────────────────────────────

export interface RoomWithZone {
    id: string;
    area: number;
    floor: number;
    zone: ZoneType;
}

export function groupByZone(
    rooms: Array<{ id: string; area: number; floor: number }>
): Map<ZoneType, RoomWithZone[]> {
    const map = new Map<ZoneType, RoomWithZone[]>([
        ['social',  []],
        ['service', []],
        ['private', []],
        ['circ',    []],
    ]);
    for (const r of rooms) {
        const zone = classifyRoom(r.id);
        map.get(zone)!.push({ ...r, zone });
    }
    return map;
}

// ──────────────────────────────────────────────────────────────────────────
// Zone Rectangle Allocation
// ──────────────────────────────────────────────────────────────────────────

export interface ZoneAllocation {
    zone: ZoneType;
    bounds: TreemapBounds;
    rooms: RoomWithZone[];
}

/**
 * Given a building footprint and room groups, compute a rectangle for each
 * zone. The corridor is injected as a thin horizontal band between social
 * and private zones; it is NOT passed to the treemap — it is placed directly.
 *
 * Ground floor layout:
 *
 *   y=0    ┌────────────────────────────────────────┐
 *           │       SOCIAL zone (full width)          │ ~40% of depth
 *           ├───────────────┬────────────────────────┤
 *           │  SERVICE zone │    PRIVATE zone        │ ~55% of depth
 *           │  (35% width)  │    (65% width)         │
 *           └───────────────┴────────────────────────┘
 *
 *   Corridor (1.5m band) is carved from BETWEEN social and service/private.
 *
 * Upper floor layout:
 *   All rooms are PRIVATE — full footprint allocated to private zone.
 *   Corridor is a 1.5m band carved from the top of the private zone.
 */
export function allocateZones(
    footprint: TreemapBounds,
    byZone: Map<ZoneType, RoomWithZone[]>,
    floorIndex: number
): { allocations: ZoneAllocation[]; corridorBounds: TreemapBounds | null } {
    const CORRIDOR_D = 1.5; // metres
    const allocations: ZoneAllocation[] = [];

    if (floorIndex > 0) {
        // ── UPPER FLOOR ───────────────────────────────────────────────────
        // Full footprint → private. Corridor carved from top as landing.
        const corridorBounds: TreemapBounds = {
            x: footprint.x,
            y: footprint.y,
            width: footprint.width,
            height: CORRIDOR_D,
        };
        const privateY = footprint.y + CORRIDOR_D;
        const privateH = footprint.height - CORRIDOR_D;

        allocations.push({
            zone: 'private',
            rooms: byZone.get('private') ?? [],
            bounds: {
                x: footprint.x,
                y: privateY,
                width: footprint.width,
                height: privateH,
            },
        });

        return { allocations, corridorBounds };
    }

    // ── GROUND FLOOR ──────────────────────────────────────────────────────
    const socialRooms  = byZone.get('social')  ?? [];
    const serviceRooms = byZone.get('service') ?? [];
    const privateRooms = byZone.get('private') ?? [];

    const socialArea   = totalArea(socialRooms);
    const serviceArea  = totalArea(serviceRooms);
    const privateArea  = totalArea(privateRooms);
    const publicArea   = socialArea + serviceArea + privateArea;

    // Social zone height: proportion of floor depth, bounded between 30–55%
    const socialFrac = publicArea > 0
        ? Math.max(0.30, Math.min(0.55, socialArea / publicArea))
        : 0.40;

    const socialH   = snapTo(footprint.height * socialFrac, 0.1);
    const corridorY = footprint.y + socialH;
    const belowH    = footprint.height - socialH - CORRIDOR_D;
    const belowY    = corridorY + CORRIDOR_D;

    // Service/Private split within the lower band:
    // Minimum service width = 3.6m (kitchen + garage can't be narrower)
    const totalBelowArea = serviceArea + privateArea;
    let serviceFrac = totalBelowArea > 0 ? serviceArea / totalBelowArea : 0.35;
    serviceFrac = Math.max(0.20, Math.min(0.45, serviceFrac));
    const serviceW  = snapTo(footprint.width * serviceFrac, 0.1);
    const serviceW2 = Math.max(serviceW, 3.6);
    const privateW  = footprint.width - serviceW2;

    // Corridor — full width, between social and the lower band
    const corridorBounds: TreemapBounds = {
        x: footprint.x,
        y: corridorY,
        width: footprint.width,
        height: CORRIDOR_D,
    };

    // Social zone — full width, top of building
    if (socialRooms.length > 0) {
        allocations.push({
            zone: 'social',
            rooms: socialRooms,
            bounds: {
                x: footprint.x,
                y: footprint.y,
                width: footprint.width,
                height: socialH,
            },
        });
    }

    // Service zone — left portion of lower band
    if (serviceRooms.length > 0) {
        allocations.push({
            zone: 'service',
            rooms: serviceRooms,
            bounds: {
                x: footprint.x,
                y: belowY,
                width: serviceW2,
                height: belowH,
            },
        });
    }

    // Private zone — right portion (or full lower band if no service)
    if (privateRooms.length > 0) {
        allocations.push({
            zone: 'private',
            rooms: privateRooms,
            bounds: {
                x: serviceRooms.length > 0 ? footprint.x + serviceW2 : footprint.x,
                y: belowY,
                width: serviceRooms.length > 0 ? privateW : footprint.width,
                height: belowH,
            },
        });
    }

    return { allocations, corridorBounds };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function totalArea(rooms: RoomWithZone[]): number {
    return rooms.reduce((s, r) => s + Math.max(r.area, 0), 0);
}

function snapTo(value: number, grid: number): number {
    return Math.round(value / grid) * grid;
}
