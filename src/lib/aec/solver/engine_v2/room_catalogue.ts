/**
 * Non-residential room types (owner's engine brief, 2026-10-20, capability
 * B): hotel and assembly (place-of-worship) rooms the planner met only as
 * unknown types, defaulted to "private". Each entry says what the room is:
 *
 * - category: habitable / wet / service / circulation / assembly
 * - wet: needs water and ventilation (restrooms, kitchens, laundries, crèche)
 * - longSpan: a hall wider than the 6 m framed bay (portal frame / truss,
 *   capability D) — a span check must not fail it
 * - building: the building type it belongs to; `signal` marks the rooms
 *   that alone show a brief is that type (building_support.ts)
 * - adjacentTo / apartFrom: room types it should share a wall with, or keep
 *   its circulation apart from (guests and back of house)
 * - minArea: deliberately absent until it comes from the building code
 *   (capability C); the brief forbids guessed figures
 *
 * Matched on the AI's type (snake_case, after normalizeRoomType) first,
 * then on the room's name.
 */
import type { ZoneType } from './graph';

export type RoomCategory = 'habitable' | 'wet' | 'service' | 'circulation' | 'assembly';
export type CatalogueBuilding = 'hotel' | 'assembly' | 'any';

export interface CatalogueEntry {
    type: string;
    category: RoomCategory;
    wet: boolean;
    longSpan?: boolean;
    building: CatalogueBuilding;
    signal?: boolean;
    adjacentTo?: string[];
    apartFrom?: string[];
    /** the AI's types for this room (snake_case) */
    types: string[];
    /** name words that identify it when the type is generic or missing */
    name?: RegExp;
}

const ZONE_OF: Record<RoomCategory, ZoneType> = {
    habitable: 'private', wet: 'service', service: 'service', circulation: 'circ', assembly: 'social',
};

export const ROOM_CATALOGUE: CatalogueEntry[] = [
    // ── assembly / place of worship ──
    { type: 'auditorium', category: 'assembly', wet: false, longSpan: true, building: 'assembly', signal: true, types: ['auditorium', 'assembly_hall', 'main_hall', 'sanctuary', 'nave', 'worship_hall', 'church_hall', 'prayer_hall'], name: /\b(auditorium|sanctuary|nave|worship hall|prayer hall|main hall|church hall)\b/i, adjacentTo: ['stage', 'foyer'] },
    { type: 'stage', category: 'assembly', wet: false, building: 'assembly', signal: true, types: ['stage', 'altar', 'pulpit', 'platform', 'chancel'], name: /\b(stage|altar|pulpit|chancel)\b/i, adjacentTo: ['auditorium'] },
    { type: 'choir', category: 'assembly', wet: false, building: 'assembly', signal: true, types: ['choir', 'choir_area', 'choir_stand'], name: /\bchoir\b/i, adjacentTo: ['stage'] },
    { type: 'overflow', category: 'assembly', wet: false, longSpan: true, building: 'assembly', types: ['overflow', 'overflow_hall', 'multi_purpose', 'multipurpose', 'children_church', 'childrens_section'], name: /\b(overflow|children'?s (section|church))\b/i, adjacentTo: ['auditorium'] },
    { type: 'instrument_store', category: 'service', wet: false, building: 'assembly', types: ['instrument_store', 'equipment_store'], name: /\binstrument\b/i, adjacentTo: ['stage'] },
    { type: 'vestry', category: 'habitable', wet: false, building: 'assembly', signal: true, types: ['vestry', 'sacristy'], name: /\b(vestry|sacristy)\b/i, adjacentTo: ['stage'] },
    { type: 'ushers_room', category: 'service', wet: false, building: 'assembly', types: ['ushers_room', 'usher_room'], name: /\bushers?'? ?room\b/i, adjacentTo: ['foyer'] },
    { type: 'creche', category: 'wet', wet: true, building: 'any', types: ['creche', 'nursery', 'nursing_room', 'mothers_room'], name: /\b(cr[eè]che|nursing|mothers'? room)\b/i, adjacentTo: ['foyer'] },
    { type: 'restroom', category: 'wet', wet: true, building: 'any', types: ['restroom', 'restrooms', 'public_toilet', 'toilets', 'washroom'], name: /\b(restrooms?|washrooms?|public toilets?)\b/i, adjacentTo: ['foyer'] },
    { type: 'retail', category: 'habitable', wet: false, building: 'any', types: ['retail', 'shop', 'bookshop', 'kiosk'], name: /\b(bookshop|shop|kiosk)\b/i, adjacentTo: ['foyer'] },
    // ── hotel / lodging ──
    { type: 'reception', category: 'habitable', wet: false, building: 'hotel', types: ['reception', 'front_desk'], name: /\b(reception desk|front desk)\b/i, adjacentTo: ['lobby'] },
    { type: 'lobby', category: 'circulation', wet: false, building: 'hotel', types: ['lobby'], name: /\blobby\b/i, adjacentTo: ['reception', 'lift_core'] },
    { type: 'bar', category: 'habitable', wet: false, building: 'hotel', types: ['bar', 'lounge_bar', 'cocktail_lounge'], name: /\b(lounge bar|cocktail|bar)\b/i, adjacentTo: ['lobby'] },
    { type: 'restaurant', category: 'assembly', wet: false, longSpan: true, building: 'hotel', signal: true, types: ['restaurant', 'dining_hall', 'banquet_hall'], name: /\b(restaurant|banquet)\b/i, adjacentTo: ['hotel_kitchen', 'lobby'] },
    { type: 'hotel_kitchen', category: 'wet', wet: true, building: 'hotel', types: ['hotel_kitchen', 'commercial_kitchen', 'back_of_house_kitchen'], name: /\b(commercial|back[- ]of[- ]house) kitchen\b/i, adjacentTo: ['restaurant'], apartFrom: ['lobby'] },
    { type: 'guest_room', category: 'habitable', wet: false, building: 'hotel', signal: true, types: ['guest_room', 'hotel_room', 'standard_room', 'deluxe_room'], name: /\b(guest rooms?(?! ?bed)|hotel rooms?|standard rooms?|deluxe rooms?)\b/i, adjacentTo: ['circulation'] },
    { type: 'hotel_suite', category: 'habitable', wet: false, building: 'hotel', types: ['hotel_suite', 'executive_suite', 'presidential_suite'], name: /\b(executive|presidential|junior) suite\b/i, adjacentTo: ['circulation'] },
    { type: 'housekeeping', category: 'service', wet: false, building: 'hotel', signal: true, types: ['housekeeping', 'linen_store', 'housekeeping_store'], name: /\bhousekeeping\b/i, adjacentTo: ['circulation'], apartFrom: ['lobby'] },
    { type: 'lift_core', category: 'circulation', wet: false, building: 'any', types: ['lift', 'lift_core', 'elevator', 'lift_lobby'], name: /\b(lifts?|elevators?)\b/i },
    { type: 'staff_facilities', category: 'wet', wet: true, building: 'hotel', types: ['staff_facilities', 'staff_room', 'staff_changing', 'staff_toilet'], name: /\bstaff (room|facilities|changing|toilets?)\b/i, apartFrom: ['lobby'] },
    { type: 'commercial_laundry', category: 'wet', wet: true, building: 'hotel', types: ['commercial_laundry', 'hotel_laundry'], name: /\b(hotel|commercial) laundry\b/i, apartFrom: ['lobby'] },
];

const BY_TYPE = new Map(ROOM_CATALOGUE.flatMap(e => e.types.map(t => [t, e] as const)));

/** The catalogue entry for a room (its type first, then its name), or null. */
export function catalogueEntry(room: { type?: string; name?: string }): CatalogueEntry | null {
    const t = room.type?.toLowerCase().trim().replace(/['’]/g, '').replace(/[\s/-]+/g, '_');
    if (t && BY_TYPE.has(t)) return BY_TYPE.get(t)!;
    const name = String(room.name ?? '');
    return ROOM_CATALOGUE.find(e => e.name?.test(name)) ?? null;
}

/** The planner's zone for a catalogue room. */
export const catalogueZone = (e: CatalogueEntry): ZoneType => ZONE_OF[e.category];
