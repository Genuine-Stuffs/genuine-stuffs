/**
 * Places of worship and other assembly halls (NBC 2006 Use Group A-4;
 * Lagos "public building", PPR 2019 Schedule 4B). Figures from the rule
 * table in reports/Hotel and church design guidelines.md.
 */
import { cite, type RuleCheck } from './rules';
import { bays, siteFit } from './lagos';

// ── occupant load ──────────────────────────────────────────────────────────
/** Platform, stage and choir count on top of the seats (NBC Table 10.7; IBC Table 1004.5). */
export const PLATFORM_M2_PER_PERSON = cite(1.4, 'NBC 2006 Table 10.7; IBC 2021 Table 1004.5 (stages and platforms, net)');
export const CHAIRS_M2_PER_PERSON = cite(0.65, 'NBC 2006 Table 10.7 (loose chairs, net): a crowd-count factor, NOT a planning area');
/** People in a hall: the seats, plus the platform and choir. */
export function occupantLoad(seats: number, platformM2 = 0) {
    return Math.ceil(seats + platformM2 / PLATFORM_M2_PER_PERSON.value - 1e-9);
}

// ── exits ──────────────────────────────────────────────────────────────────
export const EXITS_BY_LOAD = cite([[500, 2], [1000, 3], [Infinity, 4]] as Array<[number, number]>, 'NBC 2006 Table 10.10.2');
export function exitsRequired(load: number) { return EXITS_BY_LOAD.value.find(([max]) => load <= max)![1]; }
/** Clear width per person: doors and level routes, and stairs (NBC Table 10.9 hotel row applied to assembly, inferred; IBC 1005.3). */
export const MM_PER_PERSON_LEVEL = cite(5.08, 'NBC 2006 Table 10.9 (G/H row applied to A, inferred); IBC 2021 1005.3.2');
export const MM_PER_PERSON_STAIR = cite(7.62, 'NBC 2006 Table 10.9 (inferred); IBC 2021 1005.3.1');
/** The main entrance takes at least half the load, the other exits together at least two-thirds. */
export const MAIN_EXIT_SHARE = cite(1 / 2, 'NBC 2006 §7.8.4');
export const OTHER_EXITS_SHARE = cite(2 / 3, 'NBC 2006 §7.8.4');
export const DOOR_LEAF_MIN_MM = cite(813, 'NBC 2006 §7.13.6');
export const DOOR_LEAF_MAX_MM = cite(1219, 'NBC 2006 §7.13.7');
/** Two exits stand at least half the hall's diagonal apart (a third when sprinklered). */
export const EXIT_SEPARATION = cite(1 / 2, 'NBC 2006 §7.8.12; IBC 2021 1007.1.1');
export const MAX_TRAVEL_M = cite(30, 'Lagos PPR 2019 Schedule 9 (to a storey exit)');
export const DEAD_END_M = cite(6.1, 'NBC 2006 §7.11.4, §7.26.7');

/** The exits a hall of this load needs: how many, the main entrance's width, each other exit's width, in metres. */
export function exitPlan(load: number) {
    const n = exitsRequired(load);
    const level = MM_PER_PERSON_LEVEL.value / 1000;
    const main = Math.max(load * MAIN_EXIT_SHARE.value * level, 2 * DOOR_LEAF_MIN_MM.value / 1000);
    const others = Math.max((load * OTHER_EXITS_SHARE.value * level) / (n - 1), DOOR_LEAF_MIN_MM.value / 1000 * 2);
    const leaves = (w: number) => Math.ceil(w / (DOOR_LEAF_MAX_MM.value / 1000) - 1e-9);
    return { count: n, mainWidth: round1(main), otherWidth: round1(others), mainLeaves: leaves(main), otherLeaves: leaves(others) };
}

// ── seating and the hall ────────────────────────────────────────────────────
export const SEAT_W = cite(0.5, 'LifeWay rules of thumb (seat 0.46-0.61 m)', 'default');
export const ROW_PITCH = cite(0.95, 'LifeWay (0.86 m minimum, 0.91 m+ recommended)', 'default');
export const SEATS_BETWEEN_AISLES = cite(14, 'LifeWay; NBC §7.26.14-16 allows up to 100 with wider rows', 'default');
export const SEATS_TO_WALL = cite(7, 'LifeWay; NBC §7.26.16 (one-ended rows)', 'default');
export const CENTRE_AISLE = cite(1.5, 'LifeWay (1.22 m minimum, 1.52 m recommended)', 'default');
export const SIDE_AISLE = cite(1.1, 'NBC 2006 §7.26.5-6 (level aisle, seats on one side >= 0.914 m; both sides >= 1.067 m)');
export const LAST_ROW_MAX_M = cite(25, 'LifeWay; theatre practice (20-30 m)', 'default');
export const STAGE_DEPTH = cite(8, 'Pentecostal practice 8-10 m (LifeWay platform 2.1-3.0 m+)', 'default');
export const STAGE_FRONT_GAP = cite(2.2, 'LifeWay 2.1-2.4 m', 'default');
export const CHOIR_SHARE = cite(0.1, 'LifeWay: choir 10-12% of seats', 'default');
export const CHOIR_M2_PER_SINGER = cite(0.8, 'planning assumption', 'default');
export const HALL_HEIGHT_MAX = cite(7.5, 'Lagos PPR 2019 Schedule 4B item 4 (excluding domes and towers; an overall 9.12 m also appears)', 'warn');

/** A straight-row hall: blocks of seats between aisles, rows from the stage back. Metres. */
export function seatingLayout(seats: number) {
    const per = SEATS_BETWEEN_AISLES.value, w = SEAT_W.value;
    // two blocks either side of the centre aisle, then wall blocks; widen until the depth is within reach
    let blocks = 2;
    for (;;) {
        const perRow = blocks * per;
        const rows = Math.ceil(seats / perRow - 1e-9);
        const depth = rows * ROW_PITCH.value;
        const width = perRow * w + CENTRE_AISLE.value + 2 * SIDE_AISLE.value + Math.max(0, blocks - 2) * SIDE_AISLE.value;
        if (STAGE_FRONT_GAP.value + depth <= LAST_ROW_MAX_M.value || blocks >= 6)
            return { blocks, seatsPerRow: perRow, rows, seatingDepth: round1(depth), width: round1(width), lastRowFromStage: round1(STAGE_FRONT_GAP.value + depth) };
        blocks += 2;
    }
}
/** The worship hall (nave) and its stage, the hall a seat count needs. */
export function hallFor(seats: number) {
    const s = seatingLayout(seats);
    const naveDepth = STAGE_FRONT_GAP.value + s.seatingDepth + 1.5; // a 1.5 m cross aisle at the back
    const choir = Math.ceil(seats * CHOIR_SHARE.value) * CHOIR_M2_PER_SINGER.value;
    const stageW = Math.min(s.width, Math.max(12, s.width * 0.6));
    return { ...s, naveDepth: round1(naveDepth), naveArea: Math.round(s.width * naveDepth), stageW: round1(stageW), stageArea: Math.round(stageW * STAGE_DEPTH.value), choirArea: Math.round(choir), clearSpan: round1(s.width) };
}

// ── support spaces ─────────────────────────────────────────────────────────
export const FOYER_M2_PER_SEAT = cite(0.2, 'LifeWay 0.14-0.23 m²/seat', 'default');
export const CHILD_M2 = cite(2.3, 'LifeWay 2.3 m² per child', 'default');

// ── toilets ────────────────────────────────────────────────────────────────
/** IBC floor (Table 2902.1, worship): WC 1 per 150 men, 1 per 75 women; basins 1 per 200. Default (services empty at once): UK / LifeWay level. */
export function toilets(load: number) {
    const half = load / 2, up = (x: number) => Math.ceil(x - 1e-9);
    return {
        floor: { femaleWC: up(half / 75), maleWC: up(half / 150), basins: up(load / 200), source: 'IBC 2021 Table 2902.1 (places of worship)' },
        default: { femaleWC: up(half / 35), maleWC: up(half / 100), urinals: up(half / 80), basinsEach: Math.max(2, up(half / 100)), accessibleWC: 1, source: 'Scottish Technical Handbook 3.12 / LifeWay level (default)' },
    };
}
/** Wheelchair spaces (ADA 221.2; UK 1%): the larger. */
export function wheelchairSpaces(seats: number) {
    const ada = seats <= 25 ? 1 : seats <= 50 ? 2 : seats <= 150 ? 4 : seats <= 300 ? 5 : seats <= 500 ? 6 : seats <= 5000 ? 6 + Math.ceil((seats - 500) / 150 - 1e-9) : 36 + Math.ceil((seats - 5000) / 200 - 1e-9);
    return Math.max(ada, Math.ceil(seats / 100 - 1e-9));
}

// ── plot ───────────────────────────────────────────────────────────────────
export const WORSHIP_PLOT_STANDARD_M2 = cite(1500, 'PPR 2019 Schedule 4B item 1');
export const WORSHIP_PLOT_MIN_M2 = cite(600, 'PPR 2019 Schedule 4B item 1');
/** Parking: 1 per 10 m² of worship floor on a standard plot, 1 per 40 m² on a sub-standard one. */
export function worshipParking(worshipM2: number, plotM2: number) {
    const per = plotM2 >= WORSHIP_PLOT_STANDARD_M2.value ? 10 : 40;
    return { ...bays(worshipM2 / per), perM2: per, source: 'PPR 2019 Reg 14(5)(d), Schedule 4B item 9' };
}
export const PORTAL_SPAN_MAX = cite(35, 'SteelConstruction.info: steel portal frames most efficient to 35 m, frames at 6-8 m', 'default');

/** Every plot-level rule a place of worship of `seats` on `plot` must meet, with the numbers. */
export function checkWorshipSite(seats: number, footprintM2: number, worshipM2: number, plot: { width: number; depth: number }): RuleCheck[] {
    const plotM2 = plot.width * plot.depth, park = worshipParking(worshipM2, plotM2), fit = siteFit('worship', plotM2, footprintM2, park.total);
    return [
        { rule: 'Minimum plot', ok: plotM2 >= WORSHIP_PLOT_MIN_M2.value, kind: 'hard', source: WORSHIP_PLOT_MIN_M2.source, detail: `Plot ${Math.round(plotM2)} m² (at least ${WORSHIP_PLOT_MIN_M2.value} m²; ${WORSHIP_PLOT_STANDARD_M2.value} m² for a standard plot).` },
        { rule: 'Plot coverage', ok: fit.footprintOk, kind: 'hard', source: 'PPR 2019 Reg 9(4)', detail: `Building ${Math.round(footprintM2)} m² against at most ${Math.round(fit.maxFootprint)} m² (50% of the plot).` },
        { rule: 'Parking', ok: fit.parkingOk, kind: 'hard', source: park.source, detail: `${park.total} bays (1 per ${park.perM2} m² of worship floor, ${park.accessible} accessible) need about ${Math.round(fit.parkingM2)} m²; the plot leaves about ${Math.round(Math.max(0, fit.openM2))} m² after the building and 10% landscaping (room for about ${fit.baysThatFit}).` },
    ];
}

const round1 = (x: number) => Math.round(x * 10) / 10;
