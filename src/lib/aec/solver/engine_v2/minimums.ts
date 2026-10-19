/**
 * Room minimums from the user's own words.
 *
 * A brief that says "Sunken Living Lounge (min 40 sqm)" sets a floor, not a
 * target: the plan may make the room larger but never smaller. The Hive sends
 * only a target `area_m2` (its output is frozen, D6), so the minimum is read
 * on our side from the prompt, as the plot size is (plot.ts), and given to the
 * room whose name shares the most words with the phrase before it.
 */

const AREA_UNIT = String.raw`(?:sq\.?\s*m|sqm|m²|m2|square\s+met(?:re|er)s?)`;
// "<name> (min 40 sqm" / "<name> - minimum of 40 m²" / "<name> at least 40 sqm"
const MIN = new RegExp(String.raw`([A-Za-z][A-Za-z0-9 '\-/&]*?)\s*[(,:\-–—]?\s*(?:min(?:imum)?\.?(?:\s+of)?|at\s+least)\s+(\d+(?:\.\d+)?)\s*${AREA_UNIT}`, 'gi');
const STOP = new Set(['a', 'an', 'the', 'and', 'with', 'of', 'room', 'area', 'floor', 'ground', 'upper', 'first', 'sqm']);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w));

interface NamedRoom { room_id: string; name?: string; area_m2?: number; unit?: string }

/** room_id → minimum m², for each "min N sqm" the prompts name. A phrase
 * matching no room (or two rooms equally) is left alone. */
export function roomMinimums(userTexts: string[], rooms: NamedRoom[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const text of userTexts) {
        for (const m of (text ?? '').matchAll(MIN)) {
            const phrase = words(m[1]).slice(-4), min = Number(m[2]);
            if (!phrase.length || !(min > 0)) continue;
            // a flat brief's "Living room (min 20 sqm)" applies to every flat's living room
            const score = (r: NamedRoom) => phrase.filter(w => words(r.name ?? '').includes(w)).length;
            const best = Math.max(0, ...rooms.map(score));
            if (!best) continue;
            const hits = rooms.filter(r => score(r) === best);
            if (new Set(hits.map(r => r.unit ?? '')).size !== hits.length) continue; // ambiguous within one dwelling
            for (const r of hits) out.set(r.room_id, Math.max(out.get(r.room_id) ?? 0, min));
        }
    }
    return out;
}

/** The Hive's program with each named minimum on its room (`min_area_m2`),
 * and the target raised to it when the Hive sent less. */
export function withMinimums<P extends { rooms?: any[] }>(program: P, userTexts: string[]): P {
    if (!program.rooms) return program;
    const mins = roomMinimums(userTexts, program.rooms);
    if (!mins.size) return program;
    return { ...program, rooms: program.rooms.map(r => mins.has(r.room_id) ? { ...r, min_area_m2: mins.get(r.room_id), area_m2: Math.max(r.area_m2 ?? 0, mins.get(r.room_id)!) } : r) };
}
