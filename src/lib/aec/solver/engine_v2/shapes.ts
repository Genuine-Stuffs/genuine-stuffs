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

/**
 * Every footprint shape/pattern combination worth trying for this room
 * count. The portfolio search (index.ts) runs the actual placement solver
 * against each candidate in turn and keeps whatever solves — this exists
 * because trying to compute the ONE right footprint up front (an earlier
 * attempt sized wings from each zone's area) turned out not to work:
 * a wing can have plenty of total area while still being too NARROW for
 * the rooms that end up needing it, and that's a per-room-width problem
 * area math alone can't see. Generating several real candidates and
 * letting the solver's own feasibility gate + search be the judge
 * sidesteps needing that formula to be right at all.
 *
 * Ordered fastest-to-solve first: RECTANGLE has no wing to get wrong, so
 * it's the reliable fallback every room count gets; L/T-shape variants
 * (both wing patterns, since which one fits better depends on the actual
 * room mix in ways this function deliberately doesn't try to predict)
 * follow for callers that want the more architecturally varied options.
 */
export function generateFootprintCandidates(
    plotWidth: number,
    plotDepth: number,
    setbacks: { front: number; rear: number; left: number; right: number },
    roomCount: number,
    programArea_m2?: number
): BuildingFootprint[] {
    const bW = plotWidth - setbacks.left - setbacks.right;
    const bD = plotDepth - setbacks.front - setbacks.rear;
    const buildW = clamp(bW * 0.45, 8, 22);
    const buildD = clamp(bD * 0.50, 8, 18);

    // Sized to the PROGRAM first, tightest first: the plot-proportional box
    // below gave every brief on a 2000 m² plot the same ~17 x 17.5 m
    // building, so a 150 m² ground floor came back half empty. The first
    // footprint that solves wins, so plans are as compact as the rooms
    // allow, and the plot-based shapes stay as the reliable fallback.
    // On a small plot (15 m x 30 m) the plot-based box is the 8 m minimum and
    // can't hold the program, so the program-sized boxes, which stay within
    // the buildable area, are kept even when they are the larger.
    const plotBoxTooSmall = !!programArea_m2 && buildW * buildD * PROGRAM_FILL_RATIOS[0] < programArea_m2;
    const sized = programArea_m2 && programArea_m2 > 0
        ? PROGRAM_FILL_RATIOS.map(fill => programRectangle(programArea_m2 / fill, bW, bD))
            .filter(r => plotBoxTooSmall || r.primary.width < buildW - 0.25 || r.primary.height < buildD - 0.25)
        : [];

    const candidates: BuildingFootprint[] = [...sized, rectangle(0, 0, buildW, buildD)];

    if (roomCount >= 5) {
        candidates.push(lShape(buildW, buildD, 'private_wing'));
        candidates.push(lShape(buildW, buildD, 'service_wing'));
    }
    if (roomCount >= 8) {
        candidates.push(tShape(buildW, buildD, 'private_wing'));
        candidates.push(tShape(buildW, buildD, 'service_wing'));
    }
    return candidates;
}

// Share of the footprint the rooms' own areas may fill, tightest first.
// 0.80 sits just inside the feasibility gate's 85% (F-001), leaving room
// for walls and the hall; 0.70 is the looser retry.
const PROGRAM_FILL_RATIOS = [0.80, 0.70];
// Depth ÷ width (width is the street front). The target drawings run
// ~12 m x 17 m; 1.25 keeps the front generous enough for the entrance
// and garage side by side.
const PROGRAM_DEPTH_RATIO = 1.25;
const MIN_SIDE_M = 8;

/** A rectangle of about `area_m2`, PROGRAM_DEPTH_RATIO deep, on the 0.5 m
 * grid, within the buildable envelope (bW x bD). */
function programRectangle(area_m2: number, bW: number, bD: number): BuildingFootprint {
    let w = clamp(Math.sqrt(area_m2 / PROGRAM_DEPTH_RATIO), MIN_SIDE_M, bW);
    let d = clamp(area_m2 / w, MIN_SIDE_M, bD);
    w = clamp(area_m2 / d, MIN_SIDE_M, bW); // re-widen if depth hit the envelope
    return rectangle(0, 0, Math.ceil(w * 2) / 2, Math.ceil(d * 2) / 2);
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
