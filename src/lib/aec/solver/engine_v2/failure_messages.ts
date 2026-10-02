/**
 * Plain-language explanations of a failed layout (master plan Phase 6:
 * every F-* and S-* code maps to one user message, in one table — no
 * free-text error strings in the UI).
 */

import type { SolverFailure, SolverFailureReason } from '../../../../../supabase/functions/ai-studio/schema';

export interface FailureExplanation {
    title: string;
    /** One sentence per reason the floor couldn't be laid out. */
    reasons: string[];
    /** What the user can change in their brief. */
    suggestions: string[];
}

const floorName = (floor: number) => floor === 0 ? 'ground floor' : floor === 1 ? 'first floor' : `floor ${floor}`;
const list = (names: string[] = []) =>
    names.length <= 1 ? (names[0] ?? 'a room') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
const m2 = (v?: number) => `${Math.round(v ?? 0)} m²`;

type Explain = (r: SolverFailureReason) => { reason: string; suggestion: string };

const EXPLAIN: Record<string, Explain> = {
    'F-001': r => ({
        reason: `The rooms on this floor add up to about ${m2(r.values?.needed_m2)}, but the building footprint only leaves about ${m2(r.values?.budget_m2)} once walls and circulation are allowed for.`,
        suggestion: 'Reduce some room sizes or the number of rooms on this floor, or use a larger plot.',
    }),
    'F-002': r => ({
        reason: `${list(r.rooms)} is wider than the building footprint allows (about ${(r.values?.shorterSide_m ?? 0).toFixed(1)} m across).`,
        suggestion: `Make ${list(r.rooms)} narrower, or use a larger plot.`,
    }),
    'F-004': r => ({
        reason: `${list(r.rooms)} has to share a wall directly with ${r.values?.maxDegree ?? 'too many'} rooms. A room can realistically open onto at most ${r.values?.limit ?? 6}.`,
        suggestion: `Let some of the rooms around ${list(r.rooms)} open off a corridor or hall instead.`,
    }),
    'S-001': () => ({
        reason: 'No arrangement satisfies every requirement at once — room sizes, which rooms must touch, and which rooms need an outside wall for windows.',
        suggestion: 'Ask for fewer rooms that must sit next to each other, or fewer large fixed-size rooms (garage, structural living room).',
    }),
    'S-002': () => ({
        reason: 'The brief is very tightly constrained: we could not find an arrangement that meets every requirement in the time available.',
        suggestion: 'Ask for fewer rooms opening off the entrance foyer, a smaller garage, or a larger plot — then generate again.',
    }),
};

/**
 * Explain why a layout failed, for display in place of the floor plan.
 * Input: SolvedLayout.solver_failure (may be absent on older layouts).
 * Output: a title, one reason per failure code, and de-duplicated suggestions.
 * Never throws; unknown codes fall back to the S-002 wording.
 */
export function explainFailure(failure: SolverFailure | undefined): FailureExplanation {
    const reasons = failure?.reasons?.length ? failure.reasons : [{ code: 'S-002', detail: '' }];
    const explained = reasons.map(r => (EXPLAIN[r.code] ?? EXPLAIN['S-002'])(r));
    return {
        title: `We couldn't fit the ${floorName(failure?.floor ?? 0)} of this design`,
        reasons: [...new Set(explained.map(e => e.reason))],
        suggestions: [...new Set(explained.map(e => e.suggestion))],
    };
}
