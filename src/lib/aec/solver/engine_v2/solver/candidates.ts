/**
 * Genuine Stuffs AI Studio · Solver V2 · Candidate Rectangle Enumeration
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3b · July 2026
 *
 * HARD/SOFT dimension handling is the Session 3a Option C decision: rooms
 * flagged uses_intermediate_columns get exactly one (w,h) pair — the
 * Hive's declared width_m x span_m, no rotation, no aspect search — since
 * their structural_notes describe a column position computed against
 * that exact span. Everything else gets v1.0's area-tolerance search,
 * with the declared shape (if any) seeded first.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { GRID_RESOLUTION_M, metersToCells, metersToCellsFloor } from './units';
import { RectCells } from './grid';
import { RoomDimensionHint } from './types';

export interface RoomSpec {
    id: string;
    targetArea_m2: number;
    minWidth_m: number;
    dimensionHint?: RoomDimensionHint;
}

const MAX_ASPECT = 3.0;
const MAX_DIMENSION_PAIRS = 12;

function enumerateDimensionPairs(
    room: RoomSpec, areaTolerance: number
): Array<{ w_cells: number; h_cells: number }> {
    const hint = room.dimensionHint;

    if (hint?.mode === 'HARD') {
        // hint.span_m is the STRUCTURAL BAY span (≤4.5m per NBC 2006 — see
        // HIVE_SYSTEM_PROMPT), not necessarily the room's actual second
        // dimension. A room composed of multiple bays (e.g. a living room
        // built from two 4.5m bays = 9m total depth) reports span_m as
        // just ONE bay's span, not the room's true depth. Using span_m
        // directly as h_cells silently shrunk multi-bay rooms to a
        // fraction of their declared area — confirmed live: a 40.5m²
        // living room (width_m=4.5, span_m=4.5) placed as a 4.5×4.5=
        // 20.25m² rectangle, a 54m² "3-car garage" (width_m=8.1,
        // span_m=4.05) placed as 8.1×4.05=32.8m². Width stays fixed
        // (intermediate columns are positioned relative to it, per
        // structural_notes), but depth is derived from the declared
        // area instead — the value feasibility, costing, and compliance
        // already treat as authoritative, and for a genuinely single-bay
        // room this is the same number span_m would have given anyway.
        const derivedDepth_m = room.targetArea_m2 / Math.max(hint.width_m, 0.1);
        return [{ w_cells: metersToCells(hint.width_m), h_cells: metersToCells(derivedDepth_m) }];
    }

    const minW_cells = metersToCellsFloor(room.minWidth_m);
    const targetArea_cells = room.targetArea_m2 / (GRID_RESOLUTION_M * GRID_RESOLUTION_M);
    const loArea = targetArea_cells * (1 - areaTolerance);
    const hiArea = targetArea_cells * (1 + areaTolerance);

    const pairs: Array<{ w_cells: number; h_cells: number; delta: number }> = [];

    if (hint) {
        // Same area-derived depth as the HARD branch above, for the same
        // reason — kept consistent rather than trusting span_m here only
        // to re-derive it correctly a few lines up. For a genuinely
        // single-bay SOFT room this equals span_m anyway (no divergence,
        // no regression); it only matters for the multi-bay case, and
        // this is just the seed — the aspect-ratio search below still
        // finds a fit if the model's numbers don't respect this seed.
        const derivedDepth_m = room.targetArea_m2 / Math.max(hint.width_m, 0.1);
        pairs.push({ w_cells: metersToCells(hint.width_m), h_cells: metersToCells(derivedDepth_m), delta: 0 });
    }

    for (let w = minW_cells; w <= Math.sqrt(hiArea * MAX_ASPECT) + 1; w++) {
        const hMin = Math.max(minW_cells, Math.ceil(loArea / w));
        const hMax = Math.floor(hiArea / w);
        for (let h = hMin; h <= hMax; h++) {
            const aspect = Math.max(w, h) / Math.min(w, h);
            if (aspect > MAX_ASPECT) continue;
            pairs.push({ w_cells: w, h_cells: h, delta: Math.abs(w * h - targetArea_cells) });
        }
    }

    pairs.sort((a, b) => a.delta - b.delta);
    const seen = new Set<string>();
    return pairs
        .filter(p => { const k = `${p.w_cells}x${p.h_cells}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, MAX_DIMENSION_PAIRS)
        .map(({ w_cells, h_cells }) => ({ w_cells, h_cells }));
}

export interface AnchorContext {
    /** Rects already occupying the grid (placed rooms + reserved corridor/stairwell). */
    placedRects: RectCells[];
    gridW_cells: number;
    gridH_cells: number;
}

/**
 * ANCHOR-BASED ENUMERATION (replaces exhaustive O(W×H) position scan).
 * Optimal rectangle packings always have every rect flush against
 * another rect or the boundary — free-floating interior positions are
 * never necessary and were ~95% of the volume that drowned the search
 * (1.9M nodes, no solve, hive-001 fully relaxed).
 *
 * For each (w,h) pair, candidate positions are only:
 *   1. The four boundary-flush lines (x=0, y=0, x=W-w, y=H-h),
 *      stepped along the free axis;
 *   2. Flush against each placed rect's four sides, spanning the
 *      overlap range so partial-offset adjacency is reachable.
 * First unit on an empty grid → boundary anchors only.
 */
export function* enumerateCandidates(
    room: RoomSpec,
    ctx: AnchorContext,
    areaTolerance: number
): Generator<RectCells> {
    const seen = new Set<number>();
    const emit = function* (x: number, y: number, w: number, h: number): Generator<RectCells> {
        if (x < 0 || y < 0 || x + w > ctx.gridW_cells || y + h > ctx.gridH_cells) return;
        const key = ((x * ctx.gridH_cells + y) * 4096 + w) * 4096 + h;
        if (seen.has(key)) return;
        seen.add(key);
        yield { x_cells: x, y_cells: y, w_cells: w, h_cells: h };
    };

    for (const { w_cells: w, h_cells: h } of enumerateDimensionPairs(room, areaTolerance)) {
        if (w > ctx.gridW_cells || h > ctx.gridH_cells) continue;

        // 1. Boundary anchors — flush to each wall, stepped along it
        for (let x = 0; x <= ctx.gridW_cells - w; x++) {
            yield* emit(x, 0, w, h);
            yield* emit(x, ctx.gridH_cells - h, w, h);
        }
        for (let y = 0; y <= ctx.gridH_cells - h; y++) {
            yield* emit(0, y, w, h);
            yield* emit(ctx.gridW_cells - w, y, w, h);
        }

        // 2. Placed-rect anchors — flush against each side, sliding
        //    across the overlap range so any shared-wall offset is reachable
        for (const p of ctx.placedRects) {
            for (let y = p.y_cells - h + 1; y <= p.y_cells + p.h_cells - 1; y++) {
                yield* emit(p.x_cells + p.w_cells, y, w, h); // right of p
                yield* emit(p.x_cells - w, y, w, h);          // left of p
            }
            for (let x = p.x_cells - w + 1; x <= p.x_cells + p.w_cells - 1; x++) {
                yield* emit(x, p.y_cells + p.h_cells, w, h); // below p
                yield* emit(x, p.y_cells - h, w, h);          // above p
            }
        }
    }
}
