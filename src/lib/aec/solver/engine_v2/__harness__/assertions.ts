/**
 * Genuine Stuffs AI Studio · Solver V2 · Harness Assertions
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 2 · July 2026
 *
 * Pure predicate functions, one per invariant from the master plan's
 * Part D invariant table (I1, I2, I3, I4, I5, I7). Each takes the current
 * pipeline's real output — SolvedLayout — plus the buildable envelope the
 * harness itself computed, and returns a single pass/fail with an
 * aggregated detail string covering every violation found.
 *
 * I6 (SolveResult.placements empty unless status starts with SOLVED) is
 * NOT implemented here — the current engine has no typed SolveStatus,
 * that's a Phase 3/4 concept. Included as a stub that always reports
 * SKIPPED so the harness table stays honest about what isn't measured yet.
 *
 * Classification (zone/type) is never re-derived here — RoomGraph from
 * graph.ts is passed in, built once by the caller, per D5.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { SolvedLayout, PlacedRoom } from "../../../../../../supabase/functions/ai-studio/schema";
import { RoomGraph, deriveSuites } from "../graph";

export interface AssertionResult {
    invariant: string;
    pass: boolean;
    detail: string;
}

const WALL_TOL_M = 1.0;   // D5 (v1.0): shared wall must be ≥ 1.0m to count as "touching"
const GEOM_TOL_M = 0.05;  // near-zero tolerance for overlap/containment — these are hard geometry rules

// ── Geometry helpers (test-only; intentionally not imported from
//    production code, since these check different tolerances than the
//    renderer/validator use for door-placement heuristics) ────────────────

function rectsOverlap(a: PlacedRoom, b: PlacedRoom): boolean {
    const aR = a.x + a.width, aB = a.y + a.depth;
    const bR = b.x + b.width, bB = b.y + b.depth;
    const overlapX = Math.min(aR, bR) - Math.max(a.x, b.x) > GEOM_TOL_M;
    const overlapY = Math.min(aB, bB) - Math.max(a.y, b.y) > GEOM_TOL_M;
    return overlapX && overlapY;
}

function sharedWallLength(a: PlacedRoom, b: PlacedRoom): number {
    const aR = a.x + a.width, aB = a.y + a.depth;
    const bR = b.x + b.width, bB = b.y + b.depth;
    if (Math.abs(aB - b.y) < 0.35 || Math.abs(a.y - bB) < 0.35) {
        return Math.max(0, Math.min(aR, bR) - Math.max(a.x, b.x));
    }
    if (Math.abs(aR - b.x) < 0.35 || Math.abs(a.x - bR) < 0.35) {
        return Math.max(0, Math.min(aB, bB) - Math.max(a.y, b.y));
    }
    return 0;
}

function byId(rooms: PlacedRoom[]): Map<string, PlacedRoom> {
    return new Map(rooms.map(r => [r.room_id, r]));
}

// ── I1 — every placed room inside its floor's buildable envelope ──────────

export function assertI1_InsideFootprint(
    layout: SolvedLayout,
    envelope: { width: number; height: number }
): AssertionResult {
    const violations: string[] = [];
    for (const r of layout.placed_rooms) {
        const outOfBounds =
            r.x < -GEOM_TOL_M || r.y < -GEOM_TOL_M ||
            (r.x + r.width)  > envelope.width  + GEOM_TOL_M ||
            (r.y + r.depth)  > envelope.height + GEOM_TOL_M;
        if (outOfBounds) {
            violations.push(
                `${r.room_id} (floor ${r.floor}): [${r.x.toFixed(2)},${r.y.toFixed(2)}] ` +
                `${r.width.toFixed(2)}x${r.depth.toFixed(2)} exceeds ${envelope.width.toFixed(2)}x${envelope.height.toFixed(2)}`
            );
        }
    }
    return {
        invariant: "I1_INSIDE_FOOTPRINT",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "all rooms within envelope" : violations.join("; "),
    };
}

// ── I2 — no two placed rooms overlap (per floor) ───────────────────────────

export function assertI2_NoOverlap(layout: SolvedLayout): AssertionResult {
    const violations: string[] = [];
    const floors = new Set(layout.placed_rooms.map(r => r.floor));
    for (const floor of floors) {
        const rooms = layout.placed_rooms.filter(r => r.floor === floor);
        for (let i = 0; i < rooms.length; i++) {
            for (let j = i + 1; j < rooms.length; j++) {
                if (rectsOverlap(rooms[i], rooms[j])) {
                    violations.push(`floor ${floor}: ${rooms[i].room_id} overlaps ${rooms[j].room_id}`);
                }
            }
        }
    }
    return {
        invariant: "I2_NO_OVERLAP",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "no overlaps" : violations.join("; "),
    };
}

// ── I3 — declared adjacency (graph edges) shares ≥1.0m wall ────────────────
// NOTE: this checks EVERY declared edge, not just the hub-excluded
// "must-touch pairs" findMustTouchPairs() will define in Phase 3 — that's
// a deliberately narrower set for placement-ordering purposes. Checking
// all declared edges here gives a more informative baseline number now;
// swap to findMustTouchPairs() once Phase 3 lands if a stricter
// comparison is wanted.

export function assertI3_AdjacencySatisfied(
    layout: SolvedLayout,
    graph: RoomGraph
): AssertionResult {
    const violations: string[] = [];
    const placed = byId(layout.placed_rooms);
    const seen = new Set<string>();

    for (const node of graph.nodes.values()) {
        const a = placed.get(node.id);
        if (!a) continue;
        for (const neighborId of node.neighbors) {
            const key = [node.id, neighborId].sort().join("|");
            if (seen.has(key)) continue;
            seen.add(key);
            const b = placed.get(neighborId);
            // Skip cross-floor edges (e.g. stairwells) — checked by I7
            if (!b || a.floor !== b.floor) continue;
            const shared = sharedWallLength(a, b);
            if (shared < WALL_TOL_M) {
                violations.push(`${node.id}<->${neighborId}: ${shared.toFixed(2)}m shared wall (need ${WALL_TOL_M}m)`);
            }
        }
    }
    return {
        invariant: "I3_ADJACENCY_SATISFIED",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "all declared adjacencies satisfied" : violations.join("; "),
    };
}

// ── I4 — suite sub-rooms (bath/wardrobe) adjacent to their parent bedroom ──

export function assertI4_SuiteNesting(
    layout: SolvedLayout,
    graph: RoomGraph
): AssertionResult {
    const violations: string[] = [];
    const placed = byId(layout.placed_rooms);

    for (const floorIndex of graph.floors.keys()) {
        const suites = deriveSuites(graph, floorIndex);
        for (const suite of suites) {
            const bed = placed.get(suite.bedroomId);
            if (!bed) continue;
            for (const subId of suite.subIds) {
                const sub = placed.get(subId);
                if (!sub) continue;
                const shared = sharedWallLength(bed, sub);
                if (shared < WALL_TOL_M) {
                    violations.push(
                        `suite ${suite.bedroomId}: sub-room ${subId} not adjacent ` +
                        `(${shared.toFixed(2)}m shared wall)`
                    );
                }
            }
        }
    }
    return {
        invariant: "I4_SUITE_NESTING",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "all suites correctly nested" : violations.join("; "),
    };
}

// ── I5 — every room needing an external wall touches the perimeter ─────────
// Rule per Part D I5: zone !== 'circ' and not a sub-room (bath/wardrobe/
// dressing) — living, bedroom, kitchen, dining, office, garage, etc.

const SUB_ROOM_TYPES = new Set(["bathroom", "wardrobe", "dressing"]);

export function assertI5_ExternalWall(
    layout: SolvedLayout,
    graph: RoomGraph,
    envelope: { width: number; height: number }
): AssertionResult {
    const violations: string[] = [];
    const touchesPerimeter = (r: PlacedRoom, tol = 0.5) =>
        r.x <= tol || r.y <= tol ||
        (r.x + r.width)  >= envelope.width  - tol ||
        (r.y + r.depth)  >= envelope.height - tol;

    for (const r of layout.placed_rooms) {
        const node = graph.nodes.get(r.room_id);
        // Synthetic rooms (corridor/stairwell) not in graph — not subject to this rule
        if (!node) continue;
        if (node.zone === "circ" || SUB_ROOM_TYPES.has(node.type)) continue;
        if (!touchesPerimeter(r)) {
            violations.push(`${r.room_id} (${node.label}): no perimeter wall`);
        }
    }
    return {
        invariant: "I5_EXTERNAL_WALL",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "all habitable rooms reach the perimeter" : violations.join("; "),
    };
}

// ── I6 — deferred; no typed SolveStatus exists yet (Phase 3+ concept) ──────

export function assertI6_PlacementsEmptyUnlessSolved(): AssertionResult {
    return {
        invariant: "I6_STATUS_GATED_PLACEMENTS",
        pass: true,
        detail: "SKIPPED — no typed SolveStatus in current engine; applies from Phase 3 onward",
    };
}

// ── I7 — stairwell / stairwell_void occupy identical (x,y,w,h) across floors ─

export function assertI7_StairwellMirrored(layout: SolvedLayout): AssertionResult {
    const ground = layout.placed_rooms.find(r => r.room_id === "stairwell");
    const upper  = layout.placed_rooms.find(r => r.room_id === "stairwell_void");

    if (!ground && !upper) {
        return { invariant: "I7_STAIRWELL_MIRRORED", pass: true, detail: "single-storey — not applicable" };
    }
    if (!ground || !upper) {
        return { invariant: "I7_STAIRWELL_MIRRORED", pass: false, detail: "one of stairwell/stairwell_void missing" };
    }
    const matches =
        Math.abs(ground.x - upper.x) < GEOM_TOL_M &&
        Math.abs(ground.y - upper.y) < GEOM_TOL_M &&
        Math.abs(ground.width - upper.width) < GEOM_TOL_M &&
        Math.abs(ground.depth - upper.depth) < GEOM_TOL_M;

    return {
        invariant: "I7_STAIRWELL_MIRRORED",
        pass: matches,
        detail: matches
            ? "stairwell geometry matches across floors"
            : `mismatch: ground [${ground.x.toFixed(2)},${ground.y.toFixed(2)},` +
              `${ground.width.toFixed(2)},${ground.depth.toFixed(2)}] ` +
              `vs upper [${upper.x.toFixed(2)},${upper.y.toFixed(2)},` +
              `${upper.width.toFixed(2)},${upper.depth.toFixed(2)}]`,
    };
}

// ── Aggregate runner ────────────────────────────────────────────────────────

export function runAllAssertions(
    layout: SolvedLayout,
    graph: RoomGraph,
    envelope: { width: number; height: number }
): AssertionResult[] {
    return [
        assertI1_InsideFootprint(layout, envelope),
        assertI2_NoOverlap(layout),
        assertI3_AdjacencySatisfied(layout, graph),
        assertI4_SuiteNesting(layout, graph),
        assertI5_ExternalWall(layout, graph, envelope),
        assertI6_PlacementsEmptyUnlessSolved(),
        assertI7_StairwellMirrored(layout),
    ];
}
