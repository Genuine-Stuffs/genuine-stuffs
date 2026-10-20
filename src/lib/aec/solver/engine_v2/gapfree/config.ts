/**
 * Gap-free layout engine · settings
 * Defaults are the configuration the owner accepted on 2026-10-07 (ledger
 * §3 item 11). In Node (harness, prototype sweeps) an environment variable
 * of the same name overrides one, "0" switching it off; in the browser
 * there is no process.env and the defaults apply.
 */
const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process.env ? process.env : {};
const flag = (name: string, dflt: boolean) => env[name] === undefined ? dflt : env[name] !== "" && env[name] !== "0";

/** The stair is a 2.5 × 4.0 m module in a corner of the hall. */
export const STAIR_IN_HALL = flag("STAIR_IN_HALL", true);
/** Allocation-free scorer (identical costs, 7–12× faster). */
export const FAST = flag("FAST", true);
/** A foyer link is met through the hall the foyer opens onto (soft). */
export const FOYER_VIA_HALL = flag("FOYER_VIA_HALL", true);
/** Upstairs, a link is met when both rooms open onto the landing (soft,
 * direct preferred), as a foyer link is downstairs (owner, 2026-10-12). */
export const LANDING_VIA_HALL = flag("LANDING_VIA_HALL", true);
/** A balcony shares a wall with the room it serves: its links are hard and
 * never met through the hall or landing (template step (i), 2026-10-13). */
export const BALCONY_SERVED = flag("BALCONY_SERVED", true);
/** BQ and generator house as separate buildings behind the house (step (k), owner 2026-10-13). */
export const OUTBUILDINGS = flag("OUTBUILDINGS", true);
/** Opening onto an open-air terrace counts as an outside wall. */
export const TERRACE_LIGHT = flag("TERRACE_LIGHT", true);
/** One hub per floor (rebuild plan Phase 2), not every room with 3+ links. */
export const SPEC_HUB = flag("SPEC_HUB", true);
/** Rooms under 6 m² may miss their area by up to 1 m² at no cost (experiment, off). */
export const SMALL_TOL = flag("SMALL_TOL", false);
/** Share of annealing moves that repair a current violation (0 = off). */
export const REPAIR_P = Number(env.REPAIR_P ?? 0);
/** Multi-storey plans try the bay-and-spine layout first (spine.ts; owner,
 * 2026-10-12), the gap-free search when it leaves a hard miss. */
export const SPINE_FIRST = flag("SPINE_FIRST", true);
/** The hall is capped at its target on every floor (step (h), 2026-10-12): the
 * surplus is an open terrace (a porch on the ground floor). */
export const HALL_CAP = flag("HALL_CAP", true);
/** No footprint fits: search the whole buildable area, every room scaled down
 * evenly (to 80 % at most) and the plan says so; the setback options stay
 * on the page (owner, 2026-10-16). */
export const SQUEEZE = flag("SQUEEZE", true);
/** Bay-and-spine budget as a share of the gap-free search's. */
export const SPINE_BUDGET = Number(env.SPINE_BUDGET ?? 0.25);
/** A floor with the same rooms as the floor above (a typical floor of flats)
 * repeats that floor's plan instead of being searched again (owner, 2026-10-16). */
export const TYPICAL_FLOOR = flag("TYPICAL_FLOOR", true);
/** A flat's entrance off the landing weighs this many REACH misses (2026-10-19:
 * flats, 20 plans, entrances off the landing 1.0 -> 0.25 of 6 at 2). */
export const ENTRY_W = Number(env.ENTRY_W ?? 2);
/** A floor with two flats is three full-depth strips side by side: one flat,
 * the core (stair, landing, shared rooms), the other flat (owner, 2026-10-19). */
export const ZONES = flag("ZONES", true);
/** Each flat of a two-flat floor gets an inner passage its bedrooms and
 * bathroom may open off (owner, 2026-10-19). */
export const FLAT_PASSAGE = flag("FLAT_PASSAGE", true);
/** A block of flats is planned from the ground floor up: the ground floor
 * (street entrance, shared rooms) places the stair (2026-10-19). */
export const FLAT_BOTTOM_UP = flag("FLAT_BOTTOM_UP", true);
/** A house with a double-volume room is planned from the ground floor up: the
 * void above goes where that room landed (2026-10-20). */
export const ATRIUM_UP = flag("ATRIUM_UP", true);
/** The room below standing under the double-volume void is a strong preference,
 * noted when missed, not a miss (owner 2026-10-20: as a hard rule 46 -> 17 of 50 villas solved). */
export const ATRIUM_SOFT = flag("ATRIUM_SOFT", true);
