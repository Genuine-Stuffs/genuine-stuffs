/**
 * Genuine Stuffs AI Studio · Solver V2 · Harness Assertions
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 2 · July 2026
 *
 * Pure predicate functions, one per invariant from the master plan's
 * Part D invariant table (I1, I2, I3, I4, I5, I7) plus I8 (reachability). Each takes the current
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
import { RoomGraph, deriveSuites, specHub, NO_WINDOW_TYPES, STREET_FRONT_TYPES } from "../graph";

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

// Accepted readings (owner, 2026-10-07). Test-only copies on purpose, like
// the geometry helpers above.
const ENTRANCE_TYPES = new Set(["foyer", "entrance", "entry", "entrance_hall", "lobby", "reception"]);
const OPEN_AIR_TYPES = new Set(["balcony", "terrace", "veranda", "verandah", "patio"]);

/** Circulation rooms on one floor grouped into connected halls (pieces that
 * share >= 1 m of wall are one hall). Synthetic corridor_* / stairwell* rooms
 * count, as do brief rooms in the circ zone. Returns room id -> hall index. */
function hallsOnFloor(rooms: PlacedRoom[], graph: RoomGraph): Map<string, number> {
    const isCirc = (r: PlacedRoom) => graph.nodes.get(r.room_id)?.zone === "circ"
        || (!graph.nodes.has(r.room_id) && /^(corridor|stairwell)/.test(r.room_id));
    const circ = rooms.filter(isCirc);
    const hallOf = new Map<string, number>();
    let next = 0;
    for (const start of circ) {
        if (hallOf.has(start.room_id)) continue;
        const stack = [start];
        hallOf.set(start.room_id, next);
        while (stack.length) {
            const r = stack.pop()!;
            for (const o of circ) {
                if (!hallOf.has(o.room_id) && sharedWallLength(r, o) >= WALL_TOL_M) {
                    hallOf.set(o.room_id, next);
                    stack.push(o);
                }
            }
        }
        next++;
    }
    return hallOf;
}

// ── I1 — every placed room inside the building footprint ─────────────────

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

// `hubEdgesOnly`: Part B defines I3 for SOLVED results. A SOLVED_RELAXED
// result has, by design, passed through RELAX-SOFT-ADJ, which may drop
// ordinary room-to-room edges — but never a hub edge (relax.ts), so hub
// edges are still checked there rather than skipping I3 altogether.
export function assertI3_AdjacencySatisfied(
    layout: SolvedLayout,
    graph: RoomGraph,
    hubEdgesOnly = false
): AssertionResult {
    const violations: string[] = [];
    const viaHall: string[] = [];
    const placed = byId(layout.placed_rooms);
    const seen = new Set<string>();
    const hubIds = new Set<string>();
    if (hubEdgesOnly) {
        for (const floorIndex of graph.floors.keys()) {
            for (const h of specHub(graph, floorIndex)) hubIds.add(h);
        }
    }

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
            if (hubEdgesOnly && !hubIds.has(node.id) && !hubIds.has(neighborId)) continue;
            const shared = sharedWallLength(a, b);
            if (shared >= WALL_TOL_M) continue;
            // FOYER_VIA_HALL: a foyer link is met when both rooms open onto the same hall.
            if (ENTRANCE_TYPES.has(node.type) || ENTRANCE_TYPES.has(graph.nodes.get(neighborId)?.type ?? "")) {
                const floorRooms = layout.placed_rooms.filter(r => r.floor === a.floor);
                const halls = hallsOnFloor(floorRooms, graph);
                const hallsTouching = (r: PlacedRoom) => new Set(floorRooms
                    .filter(h => halls.has(h.room_id) && h.room_id !== r.room_id && sharedWallLength(r, h) >= WALL_TOL_M)
                    .map(h => halls.get(h.room_id)!));
                const viaA = hallsTouching(a), viaB = hallsTouching(b);
                if ([...viaA].some(h => viaB.has(h))) { viaHall.push(`${node.id}<->${neighborId}`); continue; }
            }
            violations.push(`${node.id}<->${neighborId}: ${shared.toFixed(2)}m shared wall (need ${WALL_TOL_M}m)`);
        }
    }
    return {
        invariant: "I3_ADJACENCY_SATISFIED",
        pass: violations.length === 0,
        detail: violations.length === 0
            ? (hubEdgesOnly ? "all hub adjacencies satisfied (soft edges relaxed)" : "all declared adjacencies satisfied")
                + (viaHall.length ? `; met through the hall: ${viaHall.join(", ")}` : "")
            : violations.join("; "),
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
// Rule per Part D I5: zone !== 'circ' and not a no-window type (bath/
// wardrobe/dressing/store) — living, bedroom, kitchen, dining, office, etc.

export function assertI5_ExternalWall(
    layout: SolvedLayout,
    graph: RoomGraph,
    envelope: { width: number; height: number }
): AssertionResult {
    const violations: string[] = [];
    const viaTerrace: string[] = [];
    const touchesPerimeter = (r: PlacedRoom, tol = 0.5) =>
        r.x <= tol || r.y <= tol ||
        (r.x + r.width)  >= envelope.width  - tol ||
        (r.y + r.depth)  >= envelope.height - tol;

    for (const r of layout.placed_rooms) {
        const node = graph.nodes.get(r.room_id);
        // Synthetic rooms (corridor/stairwell) not in graph — not subject to this rule
        if (!node) continue;
        if (node.zone === "circ" || NO_WINDOW_TYPES.has(node.type)) continue;
        if (touchesPerimeter(r)) continue;
        // TERRACE_LIGHT: opening onto an open-air terrace on an upper floor that
        // itself reaches the perimeter gives the room daylight.
        const terrace = layout.placed_rooms.find(t => t.floor === r.floor && t.floor > 0 && t !== r
            && (OPEN_AIR_TYPES.has(graph.nodes.get(t.room_id)?.type ?? "") || (!graph.nodes.has(t.room_id) && t.room_id.startsWith("terrace_")))
            && touchesPerimeter(t) && sharedWallLength(r, t) >= WALL_TOL_M);
        if (terrace) { viaTerrace.push(`${r.room_id}->${terrace.room_id}`); continue; }
        violations.push(`${r.room_id} (${node.label}): no perimeter wall`);
    }
    return {
        invariant: "I5_EXTERNAL_WALL",
        pass: violations.length === 0,
        detail: violations.length === 0
            ? "all habitable rooms reach the perimeter" + (viaTerrace.length ? ` (via an open terrace: ${viaTerrace.join(", ")})` : "")
            : violations.join("; "),
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

// ── I8 — every room reachable: shares a wall with circulation or a hub room ─
// The validator's CORRIDOR_ADJACENCY rule. Reported-only until the solver
// placed circulation itself; now enforced during the search (ReachRules),
// so any such issue on a solved layout is a solver bug.

export function assertI8_Reachable(layout: SolvedLayout): AssertionResult {
    const violations = (layout.placement_issues ?? [])
        .filter(i => i.rule === "CORRIDOR_ADJACENCY")
        .map(i => `${i.room_id}: ${i.detail}`);
    return {
        invariant: "I8_REACHABLE",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "every room opens onto circulation or a hub room" : violations.join("; "),
    };
}

// ── I9 — the ground-floor entrance and garage are on the front (bottom) edge
export function assertI9_FrontEntrance(
    layout: SolvedLayout,
    graph: RoomGraph,
    footprint: { width: number; height: number }
): AssertionResult {
    const violations: string[] = [];
    for (const r of layout.placed_rooms) {
        const node = graph.nodes.get(r.room_id);
        if (!node || r.floor !== 0 || !STREET_FRONT_TYPES.has(node.type)) continue;
        if (Math.abs(r.y + r.depth - footprint.height) > 0.05) violations.push(`${r.room_id} (${node.label}): not on the front edge`);
    }
    return {
        invariant: "I9_FRONT_ENTRANCE",
        pass: violations.length === 0,
        detail: violations.length === 0 ? "entrance and garage on the front edge (or none declared)" : violations.join("; "),
    };
}

// ── Fallback plans: every relaxed requirement it misses must be flagged ────
// A fallback plan may break I3/I5/I8 — that is what it's for — but only
// openly: each room pair failing I3 needs an ADJACENCY_MISSED flag on one
// of the two rooms, each room failing I5 an EXTERNAL_WALL flag. (I8 is read
// from the flags themselves, so it can't go unflagged.)

export function assertCompromisesFlagged(
    i3: AssertionResult, i5: AssertionResult, layout: SolvedLayout, i9?: AssertionResult
): AssertionResult {
    const flags = layout.placement_issues ?? [];
    const flaggedAdj = new Set(flags.filter(i => i.rule === "ADJACENCY_MISSED").map(i => i.room_id));
    const flaggedExt = new Set(flags.filter(i => i.rule === "EXTERNAL_WALL").map(i => i.room_id));
    const unflagged: string[] = [];
    if (!i3.pass) {
        for (const v of i3.detail.split("; ")) {
            const m = /^(\S+)<->(\S+):/.exec(v);
            if (m && !flaggedAdj.has(m[1]) && !flaggedAdj.has(m[2])) unflagged.push(`adjacency ${m[1]}<->${m[2]}`);
        }
    }
    if (!i5.pass) {
        for (const v of i5.detail.split("; ")) {
            const m = /^(\S+) \(/.exec(v);
            if (m && !flaggedExt.has(m[1])) unflagged.push(`outside wall ${m[1]}`);
        }
    }
    if (i9 && !i9.pass) {
        const flaggedEntrance = new Set(flags.filter(i => i.rule === "NO_FRONT_ENTRANCE").map(i => i.room_id));
        for (const v of i9.detail.split("; ")) {
            const m = /^(\S+) \(/.exec(v);
            if (m && !flaggedEntrance.has(m[1])) unflagged.push(`front entrance ${m[1]}`);
        }
    }
    return {
        invariant: "F1_COMPROMISES_FLAGGED",
        pass: unflagged.length === 0,
        detail: unflagged.length === 0 ? `all ${flags.length} compromise(s) flagged` : `unflagged: ${unflagged.join("; ")}`,
    };
}

/** Fallback plans: the never-relaxed invariants plus F1, instead of all I1–I8. */
export function runFallbackAssertions(
    layout: SolvedLayout,
    graph: RoomGraph,
    envelope: { width: number; height: number }
): AssertionResult[] {
    const all = runAllAssertions(layout, graph, envelope);
    const get = (id: string) => all.find(r => r.invariant.startsWith(id))!;
    // I3 in full (not hub-only): every declared pair the plan misses must be flagged.
    const i3 = assertI3_AdjacencySatisfied(layout, graph, false);
    return [get("I1"), get("I2"), get("I4"), get("I6"), get("I7"), assertCompromisesFlagged(i3, get("I5"), layout, get("I9"))];
}

// ── Aggregate runner ────────────────────────────────────────────────────────

export function runAllAssertions(
    layout: SolvedLayout,
    graph: RoomGraph,
    envelope: { width: number; height: number }
): AssertionResult[] {
    // I1/I5 are defined against the building FOOTPRINT (master plan Part
    // B), not the buildable plot envelope. Checking I5 against the far
    // larger envelope only ever credited the top/left walls (the footprint
    // sits at the envelope origin), which went unnoticed while the grid
    // rounding bug kept the solver off the right/bottom walls too. Falls
    // back to the envelope only for layouts that predate building_width.
    const footprint = layout.building_width !== undefined && layout.building_depth !== undefined
        ? { width: layout.building_width, height: layout.building_depth }
        : envelope;
    return [
        assertI1_InsideFootprint(layout, footprint),
        assertI2_NoOverlap(layout),
        assertI3_AdjacencySatisfied(layout, graph, layout.solver_status === 'SOLVED_RELAXED'),
        assertI4_SuiteNesting(layout, graph),
        assertI5_ExternalWall(layout, graph, footprint),
        assertI6_PlacementsEmptyUnlessSolved(),
        assertI7_StairwellMirrored(layout),
        assertI8_Reachable(layout),
        assertI9_FrontEntrance(layout, graph, footprint),
    ];
}
