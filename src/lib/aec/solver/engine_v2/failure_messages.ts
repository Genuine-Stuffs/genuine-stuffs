/**
 * Plain-language explanations of a failed layout (master plan Phase 6:
 * every F-* and S-* code maps to one user message, in one table — no
 * free-text error strings in the UI).
 */

import type { SolverFailure, SolverFailureReason } from '../../../../../supabase/functions/ai-studio/schema';
import type { UnsupportedKind } from './building_support';

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
    'H-001': r => ({
        reason: `The ${r.values?.rooms ?? ''} guest rooms on each floor need about ${Math.ceil(r.values?.need_m ?? 0)} m of corridor on each side, but a straight corridor on this plot is at most ${Math.floor(r.values?.have_m ?? 0)} m long, and an L-shaped floor with a wing across the back doesn't hold them either.`,
        suggestion: 'Fewer guest rooms per floor, smaller rooms, or a larger plot.',
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
export function explainFailure(failure: SolverFailure | undefined, alternatives: string[] = []): FailureExplanation {
    const reasons = failure?.reasons?.length ? failure.reasons : [{ code: 'S-002', detail: '' }];
    const explained = reasons.map(r => (EXPLAIN[r.code] ?? EXPLAIN['S-002'])(r));
    return {
        title: `We couldn't fit the ${floorName(failure?.floor ?? 0)} of this design`,
        reasons: [...new Set(explained.map(e => e.reason))],
        // the setbacks of another law that would fit come first: the cheapest change
        suggestions: [...new Set([...alternatives, ...explained.map(e => e.suggestion)])],
    };
}

/** A real plan: solved (fully or with compromises) and with rooms placed. */
export const isPlan = (L: { solver_status?: string; placed_rooms?: unknown[] } | null | undefined): boolean =>
    !!L && L.solver_status !== 'UNSAT' && L.solver_status !== 'TIMEOUT' && (L.placed_rooms?.length ?? 0) > 0;

/** A brief for a building type the planner doesn't draw yet (building_support.ts). */
export function explainUnsupported(kind: UnsupportedKind, rooms: string[]): FailureExplanation {
    const named = rooms.length ? ` (${list(rooms.slice(0, 3))})` : '';
    return kind === 'assembly' ? {
        title: "Churches and other assembly buildings aren't supported yet",
        reasons: [
            `This brief is for an assembly building${named}. AI Studio plans homes and blocks of flats today.`,
            'A hall for a congregation needs a column-free long-span roof, seating with aisles, and exits and restrooms sized to the number of people, from the building code. Those are being built; a plan drawn without them would be wrong, so none is drawn.',
        ],
        suggestions: ['Nothing to change in your brief: support for assembly buildings is on our roadmap.'],
    } : {
        title: "Hotels aren't supported yet",
        reasons: [
            `This brief is for a hotel${named}. AI Studio plans homes and blocks of flats today.`,
            'A hotel needs guest floors along a central corridor, a lift and fire stairs sized to the number of guests, and a restaurant with a long-span roof. Those are being built; a plan drawn without them would be wrong, so none is drawn.',
        ],
        suggestions: ['Nothing to change in your brief: support for hotels is on our roadmap.'],
    };
}
