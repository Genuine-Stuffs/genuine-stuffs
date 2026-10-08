/**
 * Plot shape from the user's own words.
 *
 * The Hive sends only `plot_size_sqm`, and its output is frozen (D6), so the
 * plot's width and depth are read on our side from the prompt ("a 15m × 30m
 * plot"). The first figure is the frontage (along the road), the second the
 * depth, as plots are described in Nigeria. Without a usable figure the plot
 * stays the square of the stated area, as before.
 */

export interface PlotSize { width: number; depth: number }

const UNIT = String.raw`(?:m|metres?|meters?)\b`;
const DIMS = new RegExp(String.raw`(\d+(?:\.\d+)?)\s*(${UNIT})?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(${UNIT})?`, 'gi');

/** Width and depth of the plot named in the latest user message that names
 * one, or null. When the Hive gave an area, the figure must agree with it
 * within 10 % (otherwise the words are about something else, e.g. a room). */
export function plotFromPrompts(userTexts: string[], plotSqm?: number): PlotSize | null {
    for (let i = userTexts.length - 1; i >= 0; i--) {
        for (const m of (userTexts[i] ?? '').matchAll(DIMS)) {
            if (!m[2] && !m[4]) continue; // "15 x 30" with no unit could be anything
            const width = Number(m[1]), depth = Number(m[3]);
            if (!(width >= 5 && depth >= 5 && width <= 500 && depth <= 500)) continue;
            if (plotSqm && Math.abs(width * depth - plotSqm) > 0.1 * plotSqm) continue;
            return { width, depth };
        }
    }
    return null;
}

/** The plot the solver gets: the prompt's width × depth when it has one,
 * else the square of the stated area, else the 15 m × 30 m default. */
export function plotSize(userTexts: string[], plotSqm?: number): PlotSize {
    const named = plotFromPrompts(userTexts, plotSqm);
    if (named) return named;
    if (plotSqm) { const w = Math.sqrt(plotSqm); return { width: w, depth: plotSqm / w }; }
    return { width: 15, depth: 30 };
}
