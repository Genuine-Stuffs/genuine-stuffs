/**
 * Genuine Stuffs AI Studio · Solver V2 · Placement Constraints
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 3 · SESSION 3a · July 2026
 *
 * Pure predicate functions, each ≤25 lines. sharesWall()/touchesExternal()
 * are ported VERBATIM (same 0.35m / 0.5m tolerances) from
 * placement_validator.ts, per the master plan's explicit instruction not
 * to reinvent wall-sharing or perimeter detection — those were already
 * tuned against real reference plans. Operates in METERS (the tolerances
 * are meter-based), unlike grid.ts's cell-space sharedEdgeCells().
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PlacedRect } from './types';

export interface ConstraintCheck { pass: boolean; code: string; }

// ── Ported verbatim from placement_validator.ts::sharesWall() ────────────
// (there: PlacedRoom { x, y, width, depth }; here: PlacedRect { x_m, y_m,
// w_m, h_m } — field names only, tolerance and logic unchanged.)
const WALL_TOL_M = 0.35;

export function sharesWall(a: PlacedRect, b: PlacedRect): boolean {
    const aR = a.x_m + a.w_m, aB = a.y_m + a.h_m;
    const bR = b.x_m + b.w_m, bB = b.y_m + b.h_m;
    const overlapX = Math.min(aR, bR) - Math.max(a.x_m, b.x_m) > WALL_TOL_M;
    const overlapY = Math.min(aB, bB) - Math.max(a.y_m, b.y_m) > WALL_TOL_M;
    return (Math.abs(aB - b.y_m) < WALL_TOL_M && overlapX) ||
           (Math.abs(a.y_m - bB) < WALL_TOL_M && overlapX) ||
           (Math.abs(aR - b.x_m) < WALL_TOL_M && overlapY) ||
           (Math.abs(a.x_m - bR) < WALL_TOL_M && overlapY);
}

// ── Ported verbatim from placement_validator.ts::touchesExternal() ───────
const PERIMETER_TOL_M = 0.5;

export function touchesExternal(
    r: PlacedRect, buildingW: number, buildingH: number, tol = PERIMETER_TOL_M
): boolean {
    return r.x_m <= tol || r.y_m <= tol ||
        (r.x_m + r.w_m) >= buildingW - tol ||
        (r.y_m + r.h_m) >= buildingH - tol;
}

// ── New pure predicates (Session 3a) ────────────────────────────────────────

export function noOverlap(a: PlacedRect, b: PlacedRect): ConstraintCheck {
    const aR = a.x_m + a.w_m, aB = a.y_m + a.h_m;
    const bR = b.x_m + b.w_m, bB = b.y_m + b.h_m;
    const overlapX = Math.min(aR, bR) - Math.max(a.x_m, b.x_m) > 0.01;
    const overlapY = Math.min(aB, bB) - Math.max(a.y_m, b.y_m) > 0.01;
    const overlaps = overlapX && overlapY;
    return { pass: !overlaps, code: overlaps ? 'OVERLAP' : 'OK' };
}

export function insideFootprint(
    r: PlacedRect, buildingW: number, buildingH: number, tol = 0.01
): ConstraintCheck {
    const inside =
        r.x_m >= -tol && r.y_m >= -tol &&
        (r.x_m + r.w_m) <= buildingW + tol &&
        (r.y_m + r.h_m) <= buildingH + tol;
    return { pass: inside, code: inside ? 'OK' : 'OUTSIDE_FOOTPRINT' };
}

/** D5's rule: adjacency requires ≥1.0m (2 contiguous 0.5m cells) shared
 * wall — a stricter check than sharesWall()'s 0.35m corner-tolerance,
 * which only decides which SIDE two rects touch on, not whether the
 * touch is long enough to count as a real doorway-capable adjacency. */
export function mustTouchSatisfied(a: PlacedRect, b: PlacedRect): ConstraintCheck {
    const aR = a.x_m + a.w_m, aB = a.y_m + a.h_m;
    const bR = b.x_m + b.w_m, bB = b.y_m + b.h_m;
    let shared = 0;
    if (Math.abs(aB - b.y_m) < WALL_TOL_M || Math.abs(a.y_m - bB) < WALL_TOL_M) {
        shared = Math.max(0, Math.min(aR, bR) - Math.max(a.x_m, b.x_m));
    } else if (Math.abs(aR - b.x_m) < WALL_TOL_M || Math.abs(a.x_m - bR) < WALL_TOL_M) {
        shared = Math.max(0, Math.min(aB, bB) - Math.max(a.y_m, b.y_m));
    }
    const pass = shared >= 1.0;
    return { pass, code: pass ? 'OK' : `INSUFFICIENT_ADJACENCY(${shared.toFixed(2)}m)` };
}

export function windowSatisfied(
    r: PlacedRect, buildingW: number, buildingH: number
): ConstraintCheck {
    const pass = touchesExternal(r, buildingW, buildingH);
    return { pass, code: pass ? 'OK' : 'NO_EXTERNAL_WALL' };
}
