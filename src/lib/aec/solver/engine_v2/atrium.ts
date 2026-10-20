/**
 * A double-volume space from the user's own words.
 *
 * "central Stairwell void creating double-volume atrium over living area"
 * leaves part of the upper floor open above that room: the plan cuts an
 * "open to below" void into the upper floor, open to the landing, and keeps
 * the room it names underneath. Read on our side from the prompt (the Hive's
 * output is frozen, D6), as the minimums and sides are.
 */
import { matchRooms, NamedRoom, words } from './minimums';

const DOUBLE = /\b(?:double[\s-]*(?:volume|height)|atrium|open\s+to\s+below)\b/i;
const OVER = /\b(?:over|above)\s+(?:the\s+)?([a-z][a-z \-]{2,40}?)\s*(?:[,.;()\n]|$)/i;
const LIVING = /\b(?:living|lounge|sitting|family|great)\b/i;

interface FloorRoom extends NamedRoom { floor?: number; type?: string }

/** room_id of the ground-floor room the void stands over, or null. Named by
 * "over the <room>" after the mention; else the largest living room. */
export function atriumRoom(userTexts: string[], rooms: FloorRoom[]): string | null {
    const ground = rooms.filter(r => (r.floor ?? 0) === 0);
    if (!rooms.some(r => (r.floor ?? 0) > 0)) return null; // a single storey has no space above
    for (const text of userTexts) {
        const at = (text ?? '').search(DOUBLE);
        if (at < 0) continue;
        const over = text.slice(at).match(OVER);
        const named = over ? matchRooms(words(over[1]).slice(-4), ground) : [];
        if (named.length === 1) return named[0].room_id;
        const living = ground.filter(r => LIVING.test(`${r.name ?? ''} ${r.type ?? ''}`)).sort((a, b) => (b.area_m2 ?? 0) - (a.area_m2 ?? 0));
        if (living.length) return living[0].room_id;
    }
    return null;
}

/** The Hive's program with the room under the void marked (`atrium_over`). */
export function withAtrium<P extends { rooms?: any[] }>(program: P, userTexts: string[]): P {
    if (!program.rooms) return program;
    const id = atriumRoom(userTexts, program.rooms);
    return id ? { ...program, rooms: program.rooms.map(r => r.room_id === id ? { ...r, atrium_over: true } : r) } : program;
}
