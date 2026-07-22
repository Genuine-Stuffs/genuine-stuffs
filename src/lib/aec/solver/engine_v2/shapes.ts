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

export interface TreemapBounds { x: number; y: number; width: number; height: number; }

export type FootprintShape = 'RECTANGLE' | 'L_SHAPE' | 'T_SHAPE';

export type WingPattern = 'private_wing' | 'service_wing';

export interface BuildingFootprint {
    shape: FootprintShape;
    /** Which zone occupies the secondary wing — only set for L/T shapes */
    pattern?: WingPattern;
    primary: TreemapBounds;
    secondary?: TreemapBounds;
    totalArea: number;
}

// ── Seeded RNG (mulberry32) ────────────────────────────────────────────────
// Same seed → same pattern, every time. Omit the seed for genuine randomness
// (default production behaviour — same prompt can yield different layouts).
export function createRng(seed?: number): () => number {
    if (seed === undefined) return Math.random;
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
    floorIndex: number,
    rng: () => number = Math.random,
    mirrorOf?: BuildingFootprint
): BuildingFootprint {
    const bW = plotWidth - setbacks.left - setbacks.right;
    const bD = plotDepth - setbacks.front - setbacks.rear;
    const buildW = clamp(bW * 0.45, 8, 22);
    const buildD = clamp(bD * 0.50, 8, 18);

    // Upper floor is NEVER computed independently — a second storey must
    // sit on the exact footprint of the first, wing included. This is a
    // structural requirement, not a style choice, so it's unaffected by rng.
    if (floorIndex > 0) {
        if (mirrorOf) return { ...mirrorOf };
        return rectangle(0, 0, buildW, buildD); // safe fallback, shouldn't fire
    }

    if (roomCount >= 8) {
        return tShape(buildW, buildD, rng() < 0.5 ? 'private_wing' : 'service_wing');
    }
    if (roomCount >= 5) {
        return lShape(buildW, buildD, rng() < 0.5 ? 'private_wing' : 'service_wing');
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
function lShape(buildW: number, buildD: number, pattern: WingPattern): BuildingFootprint {
    const mainW = snapTo(buildW * 0.70, 0.5);
    const wingW = buildW - mainW;
    const wingD = snapTo(buildD * 0.50, 0.5);
    const wingY = buildD - wingD;

    const primary:   TreemapBounds = { x: 0,     y: 0,     width: mainW, height: buildD };
    const secondary: TreemapBounds = { x: mainW, y: wingY, width: wingW, height: wingD };

    return {
        shape: 'L_SHAPE', pattern, primary, secondary,
        totalArea: primary.width * primary.height + secondary.width * secondary.height,
    };
}

function tShape(buildW: number, buildD: number, pattern: WingPattern): BuildingFootprint {
    const frontD = snapTo(buildD * 0.60, 0.5);
    const rearD  = buildD - frontD;

    const primary:   TreemapBounds = { x: 0, y: 0,      width: buildW,        height: frontD };
    const secondary: TreemapBounds = { x: 0, y: frontD, width: buildW * 0.65, height: rearD  };

    return {
        shape: 'T_SHAPE', pattern, primary, secondary,
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
