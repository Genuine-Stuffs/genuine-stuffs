/**
 * Parking in the compound, from the user's own words (owner 2026-10-29: the flats asked for
 * "parking for eight cars" yet got a pedestrian gate, because open parking is no room of the plan
 * and the AI step's brief doesn't carry it). Read like the setback law (setbacks.ts
 * readSetbackIntent): "parking for eight cars", "14 parking bays", "a 10-car park", "car park",
 * "parking in the compound". `bays` is null when parking is asked for without a number.
 */
export interface ParkingIntent { bays: number | null }

const WORDS: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const NUM = `(\\d{1,4}|${Object.keys(WORDS).join('|')})`;
const toNumber = (s: string) => /^\d+$/.test(s) ? Number(s) : WORDS[s.toLowerCase()];

const COUNTED = [
    // "parking for eight cars", "parking for up to 14 vehicles", "parking space for 6 cars"
    new RegExp(`\\bparking(?:\\s+(?:space|area|lot))?\\s+(?:for|of)\\s+(?:up\\s+to\\s+|about\\s+|around\\s+|at\\s+least\\s+)?${NUM}\\s+(?:cars?|vehicles?)\\b`, 'i'),
    // "14 parking bays", "8 car parking spaces", "six parking lots"
    new RegExp(`\\b${NUM}\\s+(?:car\\s+)?parking\\s+(?:bays?|spaces?|lots?|slots?|stalls?)\\b`, 'i'),
    // "a 10-car park", "a 20 car parking area"
    new RegExp(`\\b${NUM}[\\s-]+car\\s+park(?:ing)?\\b`, 'i'),
];
const ANY = /\b(car\s*park|parking)\b/i;
// "no parking", "without parking", "parking is not needed": not a request
const NOT = /\b(no|without)\s+(?:car\s*)?parking\b|\bparking\s+(?:is\s+)?not\s+(?:needed|required)\b/i;

export function readParkingIntent(userTexts: string[]): ParkingIntent | null {
    let found: ParkingIntent | null = null;
    for (const raw of userTexts) {
        const t = String(raw ?? '');
        if (NOT.test(t)) { found = null; continue; }
        if (!ANY.test(t)) continue;
        // a later message can restate the number; the latest one stands
        const n = COUNTED.map(re => t.match(re)).find(m => m)?.[1];
        found = { bays: n !== undefined ? toNumber(n) ?? null : found?.bays ?? null };
    }
    return found;
}
