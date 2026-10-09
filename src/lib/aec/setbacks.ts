/**
 * Setbacks and airspaces: which law, read from the user's words.
 *
 * The user decides which law applies (owner, 2026-10-09). Without a word
 * from them the default is the recommended one: the Lagos State Planning
 * Permit Regulations 2019, or the National Building Code 2006 density bands
 * when the prompt names another state. When the brief does not fit under
 * the law in force, or the user asks for less than it requires, the plan
 * says so and offers the other choices — the rule is never bent silently.
 *
 * Sources (docs/design-references, owner-supplied 2026-10-09):
 * - Lagos 2019: residential 6 front / 3 sides / 3 rear; commercial 9 / 6 / 3;
 *   mixed use 6 / 4.5 / 4.5; residential plots of 150 m² or less 3 m on one
 *   side and 1.5 m on the other; a corner plot keeps the front setback on
 *   every side facing a road.
 * - NBC 2006: medium density 6 / 3 / 3 (FRN 2006, Akure study fig. 2; the
 *   study quotes 4.5–6 m at the front). High 4.5 / 2 / 2 and low
 *   7.5 / 4.5 / 4.5 are from secondary summaries, not yet checked against
 *   the code's own text.
 */

import { programNeed } from './solver/engine_v2/gapfree/need';

export type SetbackLaw = 'lagos_2019' | 'nbc_2006';
export type BuildingUse = 'residential' | 'commercial' | 'mixed';
export type Density = 'high' | 'medium' | 'low';

export interface Setbacks { front: number; rear: number; left: number; right: number }

export interface SetbackChoice {
    law: SetbackLaw;
    use: BuildingUse;
    density: Density;   // NBC only
    corner: boolean;
}

/** What the user's own words fix. */
export interface SetbackIntent {
    law?: SetbackLaw;
    use?: BuildingUse;
    density?: Density;
    corner: boolean;
    stated: Partial<Setbacks>;
}

export interface Plot { width: number; depth: number }

const LAGOS: Record<BuildingUse, Setbacks> = {
    residential: { front: 6, rear: 3, left: 3, right: 3 },
    commercial: { front: 9, rear: 3, left: 6, right: 6 },
    mixed: { front: 6, rear: 4.5, left: 4.5, right: 4.5 },
};
const NBC_RESIDENTIAL: Record<Density, Setbacks> = {
    high: { front: 4.5, rear: 2, left: 2, right: 2 },
    medium: { front: 6, rear: 3, left: 3, right: 3 },
    low: { front: 7.5, rear: 4.5, left: 4.5, right: 4.5 },
};
const LAGOS_SMALL_PLOT_M2 = 150;

// Nigerian states and the FCT other than Lagos: naming one moves the
// default to the national code.
const OTHER_STATES = /\b(abia|adamawa|akwa\s*ibom|anambra|bauchi|bayelsa|benue|borno|cross\s*river|delta|ebonyi|edo|ekiti|enugu|gombe|imo|jigawa|kaduna|kano|katsina|kebbi|kogi|kwara|nasarawa|niger\s+state|ogun|ondo|osun|oyo|plateau|rivers|sokoto|taraba|yobe|zamfara|abuja|fct|port\s*harcourt|ibadan|abeokuta|akure|benin\s+city|enugu|owerri|uyo|calabar|kaduna|jos|ilorin|asaba|warri)\b/i;

const NUM = String.raw`(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b`;
const SIDE = String.raw`(front|rear|back|side|left|right)`;
const KIND = String.raw`(?:setback|set\s*back|airspace|air\s*space)s?`;

/** The law, use, density, corner and stated setbacks in the user's words;
 * later messages win. */
export function readSetbackIntent(userTexts: string[]): SetbackIntent {
    const intent: SetbackIntent = { corner: false, stated: {} };
    for (const raw of userTexts) {
        const t = String(raw ?? '');
        if (/\b(national\s+building\s+code|nbc)\b/i.test(t) || OTHER_STATES.test(t)) intent.law = 'nbc_2006';
        if (/\blagos\b/i.test(t) && !/\b(national\s+building\s+code|nbc)\b/i.test(t)) intent.law = 'lagos_2019';
        const d = t.match(/\b(high|medium|low)[\s-]+density\b/i);
        if (d) intent.density = d[1].toLowerCase() as Density;
        if (/\bmixed[\s-]+use\b/i.test(t)) intent.use = 'mixed';
        else if (/\b(hotel|office|shop|plaza|mall|commercial|church|auditorium)\b/i.test(t)) intent.use = 'commercial';
        if (/\bcorner\s+(plot|piece|lot)\b/i.test(t)) intent.corner = true;
        const put = (side: string, v: number) => {
            const s = side.toLowerCase();
            if (s === 'front') intent.stated.front = v;
            else if (s === 'rear' || s === 'back') intent.stated.rear = v;
            else if (s === 'left') intent.stated.left = v;
            else if (s === 'right') intent.stated.right = v;
            else { intent.stated.left = v; intent.stated.right = v; }
        };
        // "6m front setback", "front setback of 6m", "front setback: 6 m"
        for (const m of t.matchAll(new RegExp(`${NUM}\\s+${SIDE}\\s+${KIND}`, 'gi'))) put(m[2], Number(m[1]));
        for (const m of t.matchAll(new RegExp(`${SIDE}\\s+${KIND}\\s*(?:of|:|=|is)?\\s*${NUM}`, 'gi'))) put(m[1], Number(m[2]));
    }
    return intent;
}

/** The recommended choice when the user names no law. */
export function defaultChoice(intent: SetbackIntent): SetbackChoice {
    return {
        law: intent.law ?? 'lagos_2019',
        use: intent.use ?? 'residential',
        density: intent.density ?? 'medium',
        corner: intent.corner,
    };
}

/** The minimum setbacks a law requires on this plot. */
export function lawSetbacks(c: SetbackChoice, plot: Plot): Setbacks {
    const base = c.law === 'nbc_2006' && c.use === 'residential' ? NBC_RESIDENTIAL[c.density] : LAGOS[c.use];
    const s = { ...base };
    if (c.law === 'lagos_2019' && c.use === 'residential' && plot.width * plot.depth <= LAGOS_SMALL_PLOT_M2 + 1e-9) {
        s.left = 3; s.right = 1.5;
    }
    if (c.corner) s.right = s.front; // the second road side keeps the front setback
    return s;
}

export function choiceLabel(c: SetbackChoice): string {
    const law = c.law === 'lagos_2019' ? 'Lagos Planning Permit Regulations 2019' : 'National Building Code 2006';
    const band = c.law === 'nbc_2006' && c.use === 'residential' ? `, ${c.density} density` : c.use !== 'residential' ? `, ${c.use}` : '';
    return `${law}${band}${c.corner ? ', corner plot' : ''}`;
}

const fmt = (s: Setbacks) => `front ${s.front} m, rear ${s.rear} m, sides ${s.left} m / ${s.right} m`;

export interface SetbackPlan {
    choice: SetbackChoice;
    /** What the plan is drawn with: the law's figures, with any the user
     * stated in place of them. */
    setbacks: Setbacks;
    law: Setbacks;
    label: string;
    /** Sides where the user asked for less than the law requires. */
    below: Array<keyof Setbacks>;
}

export function planSetbacks(choice: SetbackChoice, plot: Plot, stated: Partial<Setbacks> = {}): SetbackPlan {
    const law = lawSetbacks(choice, plot);
    const setbacks = { ...law, ...stated };
    const below = (Object.keys(stated) as Array<keyof Setbacks>).filter(k => (stated[k] ?? Infinity) < law[k] - 1e-9);
    return { choice, setbacks, law, label: choiceLabel(choice), below };
}

export const buildableOf = (plot: Plot, s: Setbacks) => {
    const width = Math.max(0, plot.width - s.left - s.right), depth = Math.max(0, plot.depth - s.front - s.rear);
    return { width, depth, area: width * depth };
};

// The layout engine needs about 12 % over the rooms' own area for walls and
// circulation (its smallest footprint slack).
export const FOOTPRINT_SLACK = 1.12;

export interface SetbackOption { choice: SetbackChoice; label: string; setbacks: Setbacks; area: number; fits: boolean }

export interface SetbackAdvice {
    /** One line saying what conflicts, with the numbers. */
    message: string;
    /** Other ways out, in words. */
    other: string[];
}

/** The other laws/bands the user can re-plan under, best fit first. */
export function setbackOptions(plan: SetbackPlan, plot: Plot, need: number): SetbackOption[] {
    const want = need * FOOTPRINT_SLACK;
    const candidates: SetbackChoice[] = [
        { ...plan.choice, law: 'lagos_2019' },
        { ...plan.choice, law: 'nbc_2006', density: 'high' },
        { ...plan.choice, law: 'nbc_2006', density: 'medium' },
        { ...plan.choice, law: 'nbc_2006', density: 'low' },
    ];
    const same = (a: SetbackChoice, c: SetbackChoice) => a.law === c.law && (a.law === 'lagos_2019' || a.density === c.density);
    return candidates
        .filter(c => !same(c, plan.choice))
        .filter(c => c.law === 'lagos_2019' || c.use === 'residential')
        .map(c => {
            const s = lawSetbacks(c, plot), area = buildableOf(plot, s).area;
            return { choice: c, label: choiceLabel(c), setbacks: s, area, fits: area + 1e-9 >= want };
        })
        .sort((x, y) => Number(y.fits) - Number(x.fits) || y.area - x.area);

}

/**
 * Null when the brief fits the plan's setbacks and the user asked for no
 * less than the law requires; otherwise the warning and the user's options.
 * `need` is the largest floor's room area in m² (stair included).
 */
export function setbackAdvice(plan: SetbackPlan, plot: Plot, need: number, storeys: number): SetbackAdvice | null {
    const want = need * FOOTPRINT_SLACK;
    const b = buildableOf(plot, plan.setbacks);
    const fits = b.area + 1e-9 >= want;
    if (fits && plan.below.length === 0) return null;

    const lines: string[] = [];
    if (!fits) lines.push(`The rooms add up to about ${Math.round(need)} m² on the fullest floor, about ${Math.round(want)} m² of building with walls and circulation; under ${plan.label} (${fmt(plan.setbacks)}) a ${plot.width} × ${plot.depth} m plot leaves ${b.width.toFixed(1)} × ${b.depth.toFixed(1)} m = ${Math.round(b.area)} m².`);
    if (plan.below.length) lines.push(`You asked for ${plan.below.map(k => `${k} ${plan.setbacks[k]} m`).join(', ')}; ${plan.label} requires at least ${plan.below.map(k => `${k} ${plan.law[k]} m`).join(', ')}. The plan follows your figures — check them with the planning authority.`);

    const other: string[] = [];
    if (!fits) {
        const s = plan.setbacks, w = plot.width - s.left - s.right;
        if (w > 0) other.push(`A deeper plot: about ${plot.width} × ${Math.ceil(want / w + s.front + s.rear)} m keeps these setbacks.`);
        if (storeys === 1 && b.area * 2 >= want) other.push('One more storey: the rooms split over two floors fit this plot.');
        other.push(`A smaller brief: about ${Math.max(0, Math.ceil(need - b.area / FOOTPRINT_SLACK))} m² less room area per floor.`);
    }
    return { message: lines.join(' '), other };
}

/** Everything the page keeps about setbacks for one plan. */
export interface SetbackStudy {
    plot: Plot; storeys: number; need: number;
    plan: SetbackPlan;
    advice: SetbackAdvice | null;
    options: SetbackOption[];
}

export function setbackStudy(choice: SetbackChoice, plot: Plot, stated: Partial<Setbacks>, program: any, storeys: number): SetbackStudy {
    const plan = planSetbacks(choice, plot, stated);
    // counted exactly as the layout engine counts it
    const need = programNeed(program, storeys);
    return { plot, storeys, need, plan, advice: setbackAdvice(plan, plot, need, storeys), options: setbackOptions(plan, plot, need) };
}
