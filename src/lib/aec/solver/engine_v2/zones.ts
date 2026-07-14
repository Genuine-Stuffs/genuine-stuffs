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
import { BuildingFootprint, WingPattern } from './shapes';

// ──────────────────────────────────────────────────────────────────────────
// Zone Classification
// ──────────────────────────────────────────────────────────────────────────

export type ZoneType = 'social' | 'service' | 'private' | 'circ';

// Keyword lists. Checked via .includes() on lowercase room id.
// Order matters within each group only for readability — all are checked.
const SOCIAL_KW   = [
    'living','lounge','dining','foyer','family','entry','reception',
    'great','sunken','entertainment','sitting','drawing','parlour','parlor'
];
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
    console.warn(`[SOLVER_V2] classifyRoom: no match for "${roomId}" — defaulting to private`);
    return 'private';
}

// ──────────────────────────────────────────────────────────────────────────
// Zone Grouping
// ──────────────────────────────────────────────────────────────────────────

export interface RoomWithZone {
    id: string;
    label: string;
    area: number;
    floor: number;
    zone: ZoneType;
}

/**
 * Group rooms into the 4 architectural zones.
 */
export function groupByZone(
    rooms: Array<{ id: string; label: string; area: number; floor: number }>
): Map<ZoneType, RoomWithZone[]> {
    const map = new Map<ZoneType, RoomWithZone[]>([
        ['social',  []],
        ['service', []],
        ['private', []],
        ['circ',    []],
    ]);
    for (const r of rooms) {
        const zone = classifyRoom(r.label);
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
    footprint: BuildingFootprint,
    byZone: Map<ZoneType, RoomWithZone[]>,
    floorIndex: number
): { allocations: ZoneAllocation[]; corridorBounds: TreemapBounds[] } {
    const CORRIDOR_D = 1.5;
    const allocations: ZoneAllocation[] = [];
    const corridorBounds: TreemapBounds[] = [];
    const primary = footprint.primary;
    const wingIsPrivate = footprint.secondary && footprint.pattern === 'private_wing';
    const wingIsService = footprint.secondary && footprint.pattern === 'service_wing';

    if (floorIndex > 0) {
        // Upper floor mirrors ground floor's footprint exactly (see shapes.ts).
        // If ground floor put bedrooms in the wing, upstairs does too — same
        // pattern, both floors, for structural + visual coherence.
        corridorBounds.push({ x: primary.x, y: primary.y, width: primary.width, height: CORRIDOR_D });

        const privateY = primary.y + CORRIDOR_D;
        const privateH = Math.min(primary.height - CORRIDOR_D, primary.width * 0.65);
        const privateRooms = byZone.get('private') ?? [];

        if (wingIsPrivate && footprint.secondary) {
            const { bridge, usable } = splitWingForCorridor(primary, footprint.secondary, CORRIDOR_D);
            allocations.push({ zone: 'private', rooms: privateRooms, bounds: usable });
            corridorBounds.push(bridge);
            // NOTE: primary's own lower band is left unallocated here (all
            // bedrooms moved to the wing). This mirrors the ground floor's
            // service-only lower band under private_wing, but currently
            // stops any *social*-classified upper-floor rooms (e.g. a family
            // lounge) from being placed at all — see flag below the diff.
        } else {
            allocations.push({
                zone: 'private', rooms: privateRooms,
                bounds: { x: primary.x, y: privateY, width: primary.width, height: privateH },
            });
        }
        return { allocations, corridorBounds };
    }

    // ── GROUND FLOOR ──────────────────────────────────────────────────────
    const socialRooms  = byZone.get('social')  ?? [];
    const serviceRooms = byZone.get('service') ?? [];
    const privateRooms = byZone.get('private') ?? [];

    const lowerServiceRooms = wingIsService ? [] : serviceRooms;
    const lowerPrivateRooms = wingIsPrivate ? [] : privateRooms;

    const socialArea = totalArea(socialRooms);
    const primaryPublicArea = socialArea + totalArea(lowerServiceRooms) + totalArea(lowerPrivateRooms);
    const socialFrac = primaryPublicArea > 0
        ? Math.max(0.30, Math.min(0.55, socialArea / primaryPublicArea))
        : 0.40;

    const socialH   = snapTo(primary.height * socialFrac, 0.1);
    const corridorY = primary.y + socialH;
    const belowH    = primary.height - socialH - CORRIDOR_D;
    const belowY    = corridorY + CORRIDOR_D;

    corridorBounds.push({ x: primary.x, y: corridorY, width: primary.width, height: CORRIDOR_D });

    if (socialRooms.length > 0) {
        allocations.push({
            zone: 'social', rooms: socialRooms,
            bounds: { x: primary.x, y: primary.y, width: primary.width, height: socialH },
        });
    }

    const lowerTotal = totalArea(lowerServiceRooms) + totalArea(lowerPrivateRooms);
    if (lowerServiceRooms.length > 0 && lowerPrivateRooms.length > 0) {
        let serviceFrac = lowerTotal > 0 ? totalArea(lowerServiceRooms) / lowerTotal : 0.35;
        serviceFrac = Math.max(0.20, Math.min(0.45, serviceFrac));
        const serviceW2 = Math.max(snapTo(primary.width * serviceFrac, 0.1), 3.6);

        allocations.push({
            zone: 'service', rooms: lowerServiceRooms,
            bounds: { x: primary.x, y: belowY, width: serviceW2, height: belowH },
        });
        allocations.push({
            zone: 'private', rooms: lowerPrivateRooms,
            bounds: { x: primary.x + serviceW2, y: belowY, width: primary.width - serviceW2, height: belowH },
        });
    } else if (lowerServiceRooms.length > 0) {
        allocations.push({
            zone: 'service', rooms: lowerServiceRooms,
            bounds: { x: primary.x, y: belowY, width: primary.width, height: belowH },
        });
    } else if (lowerPrivateRooms.length > 0) {
        allocations.push({
            zone: 'private', rooms: lowerPrivateRooms,
            bounds: { x: primary.x, y: belowY, width: primary.width, height: belowH },
        });
    }

    // Wing allocation
    if (wingIsPrivate && footprint.secondary && privateRooms.length > 0) {
        const { bridge, usable } = splitWingForCorridor(primary, footprint.secondary, CORRIDOR_D);
        allocations.push({ zone: 'private', rooms: privateRooms, bounds: usable });
        corridorBounds.push(bridge);
    }
    if (wingIsService && footprint.secondary && serviceRooms.length > 0) {
        // No corridor bridge — service rooms reach the house via a direct
        // shared-wall doorway, auto-detected by doors.ts's adjacency scan
        // once these rooms are placed next to primary's rooms. No extra
        // circulation spine needed for a utility/garage wing.
        allocations.push({ zone: 'service', rooms: serviceRooms, bounds: footprint.secondary });
    }

    return { allocations, corridorBounds };
}

/**
 * Carve a corridor-width bridge strip off whichever edge of the wing is
 * shared with primary, so wing rooms are reachable by circulation and not
 * just an exterior door. Returns the bridge (for corridor placement) and
 * the remaining usable rect (for room packing) — they never overlap.
 */
function splitWingForCorridor(
    primary: TreemapBounds,
    secondary: TreemapBounds,
    corridorD: number
): { bridge: TreemapBounds; usable: TreemapBounds } {
    const attachedRight = Math.abs(secondary.x - (primary.x + primary.width)) < 0.05;

    if (attachedRight) {
        // L-shape: wing is to the right — vertical strip along the shared wall
        return {
            bridge: { x: secondary.x, y: secondary.y, width: corridorD, height: secondary.height },
            usable: { x: secondary.x + corridorD, y: secondary.y, width: secondary.width - corridorD, height: secondary.height },
        };
    }
    // T-shape: wing is below — horizontal strip along the shared wall
    return {
        bridge: { x: secondary.x, y: secondary.y, width: secondary.width, height: corridorD },
        usable: { x: secondary.x, y: secondary.y + corridorD, width: secondary.width, height: secondary.height - corridorD },
    };
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
