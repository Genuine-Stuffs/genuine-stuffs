/**
 * Room sides from the user's own words.
 *
 * "Master Suite (min 50 sqm, southern facade)" or "3-car Garage (eastern
 * flank)" puts that room on that outside wall. The Hive doesn't send it (its
 * output is frozen, D6), so it is read on our side from the prompt, as the
 * minimums are (minimums.ts). The plan's north arrow points up with the
 * street at the bottom: south is the street front, east the right-hand side.
 */
import type { Facade } from './graph';
import { matchRooms, NamedRoom, words } from './minimums';

// "<name> (..., southern facade, ...)"
const GROUP = /([A-Za-z][A-Za-z0-9 '\-/&]*?)\s*\(([^)]*)\)/g;
const SIDE = /\b(north|south|east|west)(?:ern)?\s+(?:facade|façade|flank|side|elevation|wing|front)\b|\bfacing\s+(north|south|east|west)\b/i;
const CODE: Record<string, Facade> = { north: 'N', south: 'S', east: 'E', west: 'W' };

/** room_id → side, for each room the prompts put on a named side. */
export function roomFacades(userTexts: string[], rooms: NamedRoom[]): Map<string, Facade> {
    const out = new Map<string, Facade>();
    for (const text of userTexts) {
        for (const m of (text ?? '').matchAll(GROUP)) {
            const side = m[2].match(SIDE);
            const phrase = words(m[1]).slice(-4);
            if (!side || !phrase.length) continue;
            for (const r of matchRooms(phrase, rooms)) out.set(r.room_id, CODE[(side[1] ?? side[2]).toLowerCase()]);
        }
    }
    return out;
}

/** The Hive's program with each named side on its room (`facade`). */
export function withFacades<P extends { rooms?: any[] }>(program: P, userTexts: string[]): P {
    if (!program.rooms) return program;
    const sides = roomFacades(userTexts, program.rooms);
    if (!sides.size) return program;
    return { ...program, rooms: program.rooms.map(r => sides.has(r.room_id) ? { ...r, facade: sides.get(r.room_id) } : r) };
}
