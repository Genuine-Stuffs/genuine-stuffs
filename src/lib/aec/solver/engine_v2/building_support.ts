/**
 * Which building types the planner can draw today (owner's engine brief,
 * 2026-10-20, capability A: the honest-output gate). Homes and blocks of
 * flats are planned; a hotel or an assembly building (church, mosque, hall)
 * isn't yet (assembly is, since 2026-10-21: gapfree/assembly.ts; hotels since 2026-10-22: gapfree/hotel.ts): their rooms have no types, their halls need long-span roofs,
 * and their exits and restrooms come from the number of people. For those
 * the page says "not supported yet" and draws nothing, rather than a plan,
 * a picture or a code "pass" built on rooms it doesn't understand.
 */

import { catalogueEntry } from './room_catalogue';

export type UnsupportedKind = 'assembly' | 'hotel';

// clear signals only: houses have "Guest Bedroom", "Laundry" or a "Reception" room too
const ASSEMBLY = /\b(auditorium|assembly|sanctuary|worship|church|mosque|chapel|cathedral|altar|choir|congregation|pulpit|nave|pews?)\b/i;
const HOTEL = /\b(hotel|restaurant|housekeeping|guest ?rooms?(?! ?bed))\b/i;

export interface BuildingSupport { supported: boolean; kind?: UnsupportedKind; rooms: string[] }

const text = (r: any) => `${String(r?.type ?? '').replace(/_/g, ' ')} ${String(r?.name ?? '')}`;

/** Whether the brief is a building type the planner draws, and if not which
 * rooms show it isn't (for the message). */
export function buildingSupport(program: any): BuildingSupport {
    const rooms: any[] = program?.rooms ?? [];
    const use = String(program?.brief_reference?.use_type ?? '');
    // the catalogue's signal rooms (room_catalogue.ts), then the words of the brief
    const signal = (r: any, b: UnsupportedKind) => { const e = catalogueEntry(r); return !!e?.signal && e.building === b; };
    const assembly = rooms.filter(r => signal(r, 'assembly') || ASSEMBLY.test(text(r)));
    // a place of worship / assembly hall is planned to the codes by gapfree/assembly.ts (2026-10-21)
    if (assembly.length || ASSEMBLY.test(use)) return { supported: true, kind: 'assembly', rooms: assembly.map(r => String(r.name ?? r.type)) };
    const hotel = rooms.filter(r => signal(r, 'hotel') || HOTEL.test(text(r)));
    // a hotel is planned to the codes by gapfree/hotel.ts (owner 2026-10-22: show hotels on the page)
    if (hotel.length || /\b(hotel|hospitality|lodging)\b/i.test(use)) return { supported: true, kind: 'hotel', rooms: hotel.map(r => String(r.name ?? r.type)) };
    return { supported: true, rooms: [] };
}
