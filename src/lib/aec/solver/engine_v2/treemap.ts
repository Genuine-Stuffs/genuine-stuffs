/**
 * Genuine Stuffs AI Studio · Solver V2 · Squarified Treemap
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE B · 26 June 2026
 *
 * Pure subdivision algorithm. Takes a rectangle and a list of weighted items.
 * Returns a list of placed rectangles whose areas are proportional to weights
 * and whose aspect ratios are kept as close to 1.0 as possible.
 *
 * Based on:
 *   - Bruls, Huizing, van Wijk (1999) "Squarified Treemaps"
 *   - Marson & Musse (2010) "Automatic Real-Time Generation of Floor Plans"
 *
 * This file has ZERO dependencies on the rest of the codebase. It can be
 * imported, unit-tested, and reasoned about in complete isolation.
 *
 * Production wiring comes in Phase D. Do not import this file from
 * AIStudio.tsx or engine_v2/index.ts yet.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface TreemapInput {
    /** Stable identifier — passed through to output untouched */
    id: string;
    /** Weight of this item. Determines its share of the parent rectangle's area. */
    weight: number;
}

export interface TreemapRect {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TreemapBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

/**
 * Subdivide a rectangle into smaller rectangles, one per item.
 * Each rectangle's area is proportional to its weight relative to the total.
 * Aspect ratios are kept as close to 1.0 as the input allows.
 *
 * Input items do NOT need to be sorted — this function sorts internally.
 * Output preserves input ids but order may differ from input order.
 */
export function squarify(
    items: TreemapInput[],
    bounds: TreemapBounds
): TreemapRect[] {
    if (items.length === 0) return [];
    if (bounds.width <= 0 || bounds.height <= 0) return [];

    // Filter out non-positive weights, treat them as zero contribution
    const validItems = items.filter(it => it.weight > 0);
    if (validItems.length === 0) return [];

    // Sort largest weight first — squarified treemap requires this
    const sorted = [...validItems].sort((a, b) => b.weight - a.weight);

    const totalWeight = sorted.reduce((s, it) => s + it.weight, 0);
    const totalArea = bounds.width * bounds.height;

    // Convert weights to absolute areas matching the bounds
    const items_areas: { id: string; area: number }[] = sorted.map(it => ({
        id: it.id,
        area: (it.weight / totalWeight) * totalArea,
    }));

    const result: TreemapRect[] = [];
    squarifyRecursive(items_areas, [], { ...bounds }, result);
    return result;
}

// ──────────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────────

interface AreaItem { id: string; area: number; }

/**
 * Core squarification loop.
 *
 * `remaining` — items not yet placed (sorted largest first)
 * `row`       — items being considered for the current row/column
 * `rect`      — the remaining unplaced rectangle
 * `out`       — accumulator for placed rectangles
 */
function squarifyRecursive(
    remaining: AreaItem[],
    row: AreaItem[],
    rect: TreemapBounds,
    out: TreemapRect[]
): void {
    // Termination: no more items to place
    if (remaining.length === 0) {
        if (row.length > 0) layoutRow(row, rect, out);
        return;
    }

    const head = remaining[0];
    const w = Math.min(rect.width, rect.height);

    // Compute worst aspect ratio if we ADD `head` to the current row vs
    // FINALIZE the current row and start a new one with `head`.
    const currentWorst = row.length === 0 ? Infinity : worstAspect(row, w);
    const newRow = [...row, head];
    const newWorst = worstAspect(newRow, w);

    if (row.length === 0 || newWorst <= currentWorst) {
        // Adding head improves (or keeps) the worst aspect — keep building row
        squarifyRecursive(remaining.slice(1), newRow, rect, out);
    } else {
        // Adding head would make things worse — lay out current row, then
        // continue with `head` in a fresh row inside the leftover rectangle
        const leftover = layoutRow(row, rect, out);
        squarifyRecursive(remaining, [], leftover, out);
    }
}

/**
 * Worst aspect ratio (max(w/h, h/w)) across all items in `row`,
 * assuming they fill the short side of width `w`.
 */
function worstAspect(row: AreaItem[], w: number): number {
    if (row.length === 0) return Infinity;
    const sum = row.reduce((s, it) => s + it.area, 0);
    if (sum <= 0) return Infinity;
    let max = 0;
    let min = Infinity;
    for (const it of row) {
        if (it.area > max) max = it.area;
        if (it.area < min) min = it.area;
    }
    const w2 = w * w;
    const s2 = sum * sum;
    return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/**
 * Place every item in `row` as a stacked strip along the short side of `rect`.
 * Returns the leftover rectangle for further subdivision.
 */
function layoutRow(
    row: AreaItem[],
    rect: TreemapBounds,
    out: TreemapRect[]
): TreemapBounds {
    const sum = row.reduce((s, it) => s + it.area, 0);
    if (sum <= 0) return rect;

    const horizontal = rect.width < rect.height;
    // If `horizontal`: the row spans the full width, stacking items left→right;
    // strip depth = sum / width. Leftover rectangle sits BELOW.
    // Otherwise: the row spans the full height, stacking items top→bottom;
    // strip width = sum / height. Leftover rectangle sits to the RIGHT.

    if (horizontal) {
        const stripHeight = sum / rect.width;
        let x = rect.x;
        for (const it of row) {
            const w = it.area / stripHeight;
            out.push({
                id: it.id,
                x,
                y: rect.y,
                width: w,
                height: stripHeight,
            });
            x += w;
        }
        return {
            x: rect.x,
            y: rect.y + stripHeight,
            width: rect.width,
            height: rect.height - stripHeight,
        };
    } else {
        const stripWidth = sum / rect.height;
        let y = rect.y;
        for (const it of row) {
            const h = it.area / stripWidth;
            out.push({
                id: it.id,
                x: rect.x,
                y,
                width: stripWidth,
                height: h,
            });
            y += h;
        }
        return {
            x: rect.x + stripWidth,
            y: rect.y,
            width: rect.width - stripWidth,
            height: rect.height,
        };
    }
}
