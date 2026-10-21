/**
 * Bedrooms away from the road, from the user's own words: "keep all bedrooms
 * on the quiet side away from the road" (the bungalow benchmark). Each
 * bedroom on the ground floor is marked `quiet`; the plan then prefers them
 * off the street wall (a preference, never a miss). Read on our side from
 * the prompt (the Hive's output is frozen, D6), as the minimums and sides are.
 */
// "bedrooms on the quiet side", "bedrooms … away from the road", "bedrooms (placed) at the rear"; never across a
// comma or a sentence ("cross-ventilation on all bedrooms, and a gen house at the rear" is no such request)
const QUIET = /\bbed\s*rooms?\b[^.;,\n]{0,40}?\b(?:quiet\s+side|away\s+from\s+the\s+(?:road|street))\b|\bbed\s*rooms?\s+(?:(?:are|is|should\s+be|placed|located|kept|go)\s+)?(?:at|to|towards)\s+the\s+(?:rear|back)\b|\b(?:quiet\s+side|away\s+from\s+the\s+(?:road|street))\b[^.;,\n]{0,30}?\bbed\s*rooms?\b/i;

/** Whether the prompt asks for the bedrooms away from the street. */
export const wantsQuietBedrooms = (userTexts: string[]) => userTexts.some(t => QUIET.test(t ?? ''));

/** The Hive's program with its ground-floor bedrooms marked `quiet` when the prompt asks. */
export function withQuietBedrooms<P extends { rooms?: any[] }>(program: P, userTexts: string[]): P {
    if (!program.rooms || !wantsQuietBedrooms(userTexts)) return program;
    const bed = (r: any) => /bed/i.test(`${r.type ?? ''}`) || (/bed\s*room/i.test(r.name ?? '') && !/suite|bath|wardrobe|closet/i.test(r.name ?? ''));
    return { ...program, rooms: program.rooms.map(r => (r.floor ?? 0) === 0 && bed(r) ? { ...r, quiet: true } : r) };
}
