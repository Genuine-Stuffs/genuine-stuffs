/**
 * Genuine Stuffs AI Studio · Solver V2 · Building Footprint Selector
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE C · 26 June 2026
 *
 * Selects and computes the building footprint based on:
 *   - Number of rooms per floor
 *   - Plot dimensions
 *   - Number of floors
 *
 * Supported shapes:
 *   RECTANGLE — default for ≤4 rooms or shallow plots
 *   L_SHAPE   — 5–7 rooms, private wing offset to rear
 *   T_SHAPE   — 8+ rooms, central core with two wings
 *
 * Returns one or two rectangles that together define the building footprint.
 * For RECTANGLE: one rect covering the full footprint.
 * For L_SHAPE/T_SHAPE: two rects (the treemap runs inside each independently).
 *
 * Zero dependencies on production code.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { TreemapBounds } from './treemap';

export type FootprintShape = 'RECTANGLE' | 'L_SHAPE' | 'T_SHAPE';

export interface BuildingFootprint {
    shape: FootprintShape;
    /** Primary zone rectangle — always present */
    primary: TreemapBounds;
    /** Secondary wing — present for L_SHAPE and T_SHAPE */
    secondary?: TreemapBounds;
    /** Total gross floor area (sum of all rects) */
    totalArea: number;
}

/**
 * Select and compute the building footprint.
 *
 * @param plotWidth     Full plot width in metres
 * @param plotDepth     Full plot depth in metres
 * @param setbacks      Front/rear/left/right setbacks in metres
 * @param roomCount     Total number of non-circulation rooms on this floor
 * @param floorCount    Number of floors (1 = bungalow, 2 = duplex)
 * @param floorIndex    Current floor being computed (0 = ground, 1 = upper)
 */
export function selectFootprint(
    plotWidth: number,
    plotDepth: number,
    setbacks: { front: number; rear: number; left: number; right: number },
    roomCount: number,
    floorCount: number,
    floorIndex: number
): BuildingFootprint {
    // Buildable envelope after setbacks
    const bW = plotWidth  - setbacks.left - setbacks.right;
    const bD = plotDepth  - setbacks.front - setbacks.rear;

    // Building occupies 35–55% of buildable envelope width
    // and 40–65% of buildable depth, bounded to sensible residential sizes
    const buildW = clamp(bW * 0.45, 8, 22);
    const buildD = clamp(bD * 0.50, 8, 18);

    // Upper floor of a duplex mirrors the ground floor footprint exactly
    // (same x/y origin, same dimensions — this is structurally required)
    if (floorIndex > 0) {
        return rectangle(0, 0, buildW, buildD);
    }

    // Shape selection based on room count
    if (roomCount >= 8) {
        return tShape(buildW, buildD);
    }
    if (roomCount >= 5) {
        return lShape(buildW, buildD);
    }
    return rectangle(0, 0, buildW, buildD);
}

// ──────────────────────────────────────────────────────────────────────────
// Shape builders
// ──────────────────────────────────────────────────────────────────────────

function rectangle(
    x: number, y: number, width: number, depth: number
): BuildingFootprint {
    return {
        shape: 'RECTANGLE',
        primary: { x, y, width, height: depth },
        totalArea: width * depth,
    };
}

/**
 * L-shape: main block + private rear wing offset to the right.
 *
 *   ┌─────────────┐
 *   │             │  ← main block (70% width, 100% depth)
 *   │    MAIN     ├──────────┐
 *   │             │   WING   │  ← rear wing (30% width, 50% depth)
 *   └─────────────┴──────────┘
 */
function lShape(buildW: number, buildD: number): BuildingFootprint {
    const mainW = snapTo(buildW * 0.70, 0.5);
    const wingW = buildW - mainW;
    const wingD = snapTo(buildD * 0.50, 0.5);
    const wingY = buildD - wingD;

    const primary:   TreemapBounds = { x: 0,     y: 0,     width: mainW, height: buildD };
    const secondary: TreemapBounds = { x: mainW, y: wingY, width: wingW, height: wingD };

    return {
        shape: 'L_SHAPE',
        primary,
        secondary,
        totalArea: primary.width * primary.height + secondary.width * secondary.height,
    };
}

/**
 * T-shape: main central block + two wings (left rear, right rear).
 *
 *   ┌──────────────────────────────┐
 *   │          MAIN BLOCK          │  ← full width, 60% depth
 *   └──────┬───────────────┬───────┘
 *   │ L-WG │               │ R-WG  │  ← two rear wings, 40% depth each
 *   └──────┘               └───────┘
 *
 * For simplicity the T is represented as:
 *   primary   = full width × 60% depth (social/public front)
 *   secondary = full width × 40% depth (private rear, offset down)
 *
 * This produces a proportional T-plan that reads correctly in the renderer.
 */
function tShape(buildW: number, buildD: number): BuildingFootprint {
    const frontD = snapTo(buildD * 0.60, 0.5);
    const rearD  = buildD - frontD;

    const primary:   TreemapBounds = { x: 0, y: 0,       width: buildW,          height: frontD };
    const secondary: TreemapBounds = { x: 0, y: frontD,  width: buildW * 0.65,   height: rearD  };

    return {
        shape: 'T_SHAPE',
        primary,
        secondary,
        totalArea: primary.width * primary.height + secondary.width * secondary.height,
    };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

function snapTo(value: number, grid: number): number {
    return Math.round(value / grid) * grid;
}
