/**
 * Hotels (NBC 2006 Use Group H-1; Lagos "commercial", PPR 2019). Grading
 * room sizes are targets the user picks (no Nigerian or Lagos grading table
 * is published): East African Community 2009 criteria and Hotelstars Union.
 */
import { cite, type RuleCheck } from './rules';
import { bays, siteFit } from './lagos';

export type Stars = 1 | 2 | 3 | 4 | 5;
/** Bedroom and bathroom minimum m² by star (EAC 2009 §9.1, §10.2; HSU 2025-2030 crit. 143 for 5★ bath). */
export const ROOM_BY_STARS: Record<Stars, { bedroom: number; bathroom: number }> = {
    1: { bedroom: 12, bathroom: 3.5 }, 2: { bedroom: 12, bathroom: 3.5 }, 3: { bedroom: 15, bathroom: 5 },
    4: { bedroom: 20, bathroom: 6 }, 5: { bedroom: 25, bathroom: 7.5 },
};
export const ROOM_SOURCE = 'EAC 2009 hotel criteria §9.1, §10.2; Hotelstars Union 2025-2030 crit. 143 (grading targets, not Nigerian law)';
/** The legal floor for any habitable room in Lagos. */
export const ROOM_LEGAL_MIN = cite(10.8, 'Lagos PPR 2019 Reg 24(1); least side 2.7 m (NBC §6.2.6: 3.0 m)');
export const CEILING_MIN = cite(2.7, 'Lagos PPR 2019 Reg 24(10)');
/** Suites from 3★: at least 24 m² plus a 10 m² bathroom, two rooms; about 3% of keys. */
export const SUITE = { room: cite(24, 'EAC 2009 §11.1', 'default'), bathroom: cite(10, 'EAC 2009 §11.15', 'default'), share: cite(0.03, 'deRoos (Cornell) ~3% of keys', 'default') };
/** Room bay (module) by grade, metres: width x depth incl. bathroom. */
export const ROOM_BAY = { midscale: cite({ w: 3.66, d: 7.9 }, 'Cornell-derived (secondary)', 'default'), upscale: cite({ w: 4.1, d: 8.7 }, 'Cornell-derived (secondary)', 'default') };

// ── escape ─────────────────────────────────────────────────────────────────
export const STAIRS_MIN = cite(2, 'Lagos PPR 2019 Reg 24(12) (public buildings: at least two staircases)');
export const STAIR_WIDTH_MIN = cite(1.2, 'Lagos PPR 2019 Reg 24(12); NBC §7.17 1.118 m');
export const CORRIDOR_MIN = cite(1.1, 'NBC 2006 §7.11.5-6 (1-hour enclosure)');
export const CORRIDOR_DEFAULT = cite(1.8, 'double-loaded guest corridor 1.8 m (Marriott 7B 1.5 m minimum)', 'default');
export const DEAD_END_M = cite(6.1, 'NBC 2006 §7.11.4');
export const MAX_TRAVEL_M = cite(30, 'Lagos PPR 2019 Schedule 9 (to a storey exit)');
/** Escape door width by number of floors (Lagos Reg 26(2)). */
export function escapeDoorWidth(floors: number) { return floors <= 5 ? 0.9 : floors <= 8 ? 1.2 : 1.5; }

// ── lifts and back of house ─────────────────────────────────────────────────
/** A guest lift from 4 storeys including the ground (graded hotels; Lagos: above 4 floors); 2 above ~75 rooms; a service lift from 3★. */
export function lifts(storeys: number, rooms: number, stars: Stars) {
    const guest = storeys >= 4 ? (rooms > 75 ? 2 : 1) : 0;
    return { guest, service: stars >= 3 && storeys >= 2 ? 1 : 0, source: 'EAC 2009 §16.4; HSU crit. 15; Lagos PPR Reg 26(6); Marriott 7B (service lift never opens onto the guest corridor)' };
}
export const HOUSEKEEPING_M2_PER_FLOOR = cite(7, 'Marriott 7B: linen room at the service lift on every floor (~6-8 m²)', 'default');
export const RESTAURANT_M2_PER_SEAT = cite(1.6, 'facility planning 1.4-2.0 m²/seat', 'default');
export const KITCHEN_SHARE_OF_RESTAURANT = cite(0.35, 'facility planning 30-45% of the restaurant; EAC >= 0.5 m²/bed', 'default');
export const PUBLIC_M2_PER_BED: Record<Stars, number> = { 1: 0.5, 2: 0.5, 3: 1.0, 4: 1.5, 5: 2.0 }; // EAC 2009 §4.10

// ── accessibility ──────────────────────────────────────────────────────────
/** Accessible rooms: the most of NBC §6.3.8.6, ADA 224.2 and UK 1 in 20. */
export function accessibleRooms(rooms: number) {
    const nbc = rooms <= 20 ? 0 : rooms < 100 ? 1 : 1 + Math.floor((rooms - 100) / 100) + 1;
    const ada = rooms <= 25 ? 1 : rooms <= 50 ? 2 : rooms <= 75 ? 3 : rooms <= 100 ? 4 : rooms <= 150 ? 5 : rooms <= 200 ? 6 : Math.ceil(rooms * 0.03);
    return Math.max(nbc, ada, Math.ceil(rooms / 20 - 1e-9));
}

// ── plot ───────────────────────────────────────────────────────────────────
/** Parking: 1 per 3 rooms, 1 per 40 m² of dining, 1 per 10 m² of conference (Lagos PPR Reg 14(5)(a)-(b), 14(3)(b)). */
export function hotelParking(rooms: number, diningM2 = 0, conferenceM2 = 0) {
    return { ...bays(rooms / 3 + diningM2 / 40 + conferenceM2 / 10), source: 'PPR 2019 Reg 14(5)(a)-(b), 14(3)(b)' };
}
export function checkHotelSite(rooms: number, footprintM2: number, plot: { width: number; depth: number }, diningM2 = 0, conferenceM2 = 0): RuleCheck[] {
    const plotM2 = plot.width * plot.depth, park = hotelParking(rooms, diningM2, conferenceM2), fit = siteFit('hotel', plotM2, footprintM2, park.total);
    return [
        { rule: 'Plot coverage', ok: fit.footprintOk, kind: 'hard', source: 'PPR 2019 Reg 9(2)', detail: `Building ${Math.round(footprintM2)} m² against at most ${Math.round(fit.maxFootprint)} m² (70% of the plot).` },
        { rule: 'Parking', ok: fit.parkingOk, kind: 'hard', source: park.source, detail: `${park.total} bays (${park.accessible} accessible) need about ${Math.round(fit.parkingM2)} m²; the plot leaves about ${Math.round(Math.max(0, fit.openM2))} m² (room for about ${fit.baysThatFit}).` },
    ];
}
