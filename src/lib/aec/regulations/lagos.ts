/**
 * Lagos plot rules by use (PPR 2019). Setbacks themselves live in
 * ../setbacks.ts (the user may pick another law); these are the coverage,
 * landscaping and parking rules a site must also meet.
 */
import { cite } from './rules';

export type PlotUse = 'residential' | 'commercial' | 'mixed' | 'hotel' | 'worship' | 'assembly';

/** Maximum share of the plot the building may cover. */
export const COVERAGE = {
    worship: cite(0.5, 'PPR 2019 Reg 9(4) (place of worship, assembly, auditorium, conference and event centres)'),
    assembly: cite(0.5, 'PPR 2019 Reg 9(4)'),
    hotel: cite(0.7, 'PPR 2019 Reg 9(2) (commercial; hotels have no table of their own)'),
    commercial: cite(0.7, 'PPR 2019 Reg 9(2)'),
    mixed: cite(0.6, 'PPR 2019 Reg 9 (other uses)'),
    residential: cite(0.6, 'PPR 2019 Reg 9 (residential, where no area plan sets it)'),
} as const;

/** At least this share of the plot stays as planted landscape. */
export const LANDSCAPE = cite(0.1, 'PPR 2019 Reg 10(3)');

/** Parking bays and the open ground they take with their aisles. */
export const BAY = { w: cite(2.5, 'PPR 2019 Reg 14(8)'), d: cite(5, 'PPR 2019 Reg 14(8)'), accessibleW: cite(3, 'PPR 2019 Reg 14(9)') };
/** One bay in 20 is for disabled drivers. */
export const ACCESSIBLE_BAY_SHARE = cite(1 / 20, 'PPR 2019 Reg 14(9)');
/** Ground per bay including its share of the driving aisle (planning assumption, not law). */
export const M2_PER_BAY = cite(25, 'planning assumption: a 2.5 x 5 m bay plus its share of a 6 m aisle', 'default');

/** Bays for a number of cars, rounded up, and how many are accessible. */
export function bays(cars: number) {
    const n = Math.ceil(cars - 1e-9);
    return { total: n, accessible: n > 0 ? Math.max(1, Math.ceil(n * ACCESSIBLE_BAY_SHARE.value - 1e-9)) : 0 };
}

/** Whether a footprint and its parking fit a plot: coverage, landscape, and open ground for the bays. */
export function siteFit(use: PlotUse, plotM2: number, footprintM2: number, carBays: number) {
    const cover = (COVERAGE as any)[use]?.value ?? 0.6;
    const maxFootprint = plotM2 * cover;
    const open = plotM2 - footprintM2 - plotM2 * LANDSCAPE.value;
    const parkingM2 = carBays * M2_PER_BAY.value;
    return { maxFootprint, footprintOk: footprintM2 <= maxFootprint + 1e-6, openM2: open, parkingM2, parkingOk: parkingM2 <= open + 1e-6, baysThatFit: Math.max(0, Math.floor(open / M2_PER_BAY.value)) };
}
