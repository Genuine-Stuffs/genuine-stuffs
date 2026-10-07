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
/** Opening onto an open-air terrace counts as an outside wall. */
export const TERRACE_LIGHT = flag("TERRACE_LIGHT", true);
/** One hub per floor (rebuild plan Phase 2), not every room with 3+ links. */
export const SPEC_HUB = flag("SPEC_HUB", true);
/** Rooms under 6 m² may miss their area by up to 1 m² at no cost (experiment, off). */
export const SMALL_TOL = flag("SMALL_TOL", false);
/** Share of annealing moves that repair a current violation (0 = off). */
export const REPAIR_P = Number(env.REPAIR_P ?? 0);
