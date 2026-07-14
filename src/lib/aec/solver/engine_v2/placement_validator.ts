/**
 * Genuine Stuffs AI Studio · Solver V2 · Placement Validator
 * ═══════════════════════════════════════════════════════════════════════
 * Runs once per floor, after all rooms are placed. Checks the four rules
 * derived from reference-plan analysis (see design notes, July 2026):
 *
 *   1. Every non-circulation room reaches a corridor/hall/foyer/hub —
 *      except bath/wardrobe sub-rooms, which reach through their bedroom.
 *   2. Every habitable room touches the building perimeter.
 *   3. Bathrooms SHOULD touch the perimeter (soft rule — NBC 2006 permits
 *      mechanically-vented interior WCs, so this warns, not fails).
 *
 * This does not attempt to repair a broken plan — it reports exactly which
 * room broke which rule, so the allocation step responsible can be traced
 * and fixed. Silence here means the plan is livable; a warning means a
 * specific rect needs to move.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PlacedRoom } from "../../../../../supabase/functions/ai-studio/schema";

const TOL = 0.35;

const isCorridorLike = (id: string) => /corridor|hall|landing|void|foyer/i.test(id);
const isSubRoom      = (id: string) => /bath|wc|toilet|shower|wardrobe|dressing|ensuite|en-suite/i.test(id);
const isBath         = (id: string) => /bath|wc|toilet|shower/i.test(id);
const isHabitable    = (id: string) =>
    !isCorridorLike(id) && !isSubRoom(id) &&
    /bedroom|master|living|lounge|dining|kitchen|family|office|study|great/i.test(id);

export interface ValidationIssue {
    room_id: string;
    rule: 'CORRIDOR_ADJACENCY' | 'EXTERNAL_WALL' | 'BATH_VENTILATION';
    detail: string;
}

function sharesWall(a: PlacedRoom, b: PlacedRoom): boolean {
    const aR = a.x + a.width, aB = a.y + a.depth;
    const bR = b.x + b.width, bB = b.y + b.depth;
    const overlapX = Math.min(aR, bR) - Math.max(a.x, b.x) > TOL;
    const overlapY = Math.min(aB, bB) - Math.max(a.y, b.y) > TOL;
    return (Math.abs(aB - b.y) < TOL && overlapX) ||
           (Math.abs(a.y - bB) < TOL && overlapX) ||
           (Math.abs(aR - b.x) < TOL && overlapY) ||
           (Math.abs(a.x - bR) < TOL && overlapY);
}

function touchesExternal(r: PlacedRoom, buildingW: number, buildingH: number, tol = 0.5): boolean {
    return r.x <= tol || r.y <= tol ||
        (r.x + r.width) >= buildingW - tol ||
        (r.y + r.depth) >= buildingH - tol;
}

export function validatePlacement(
    rooms: PlacedRoom[],
    buildingW: number,
    buildingH: number,
    floorIndex: number
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    // "Hub" rooms are large social rects that other rooms can open into
    // directly, same as a corridor — living/great/lounge/dining qualify.
    const connectors = rooms.filter(r =>
        isCorridorLike(r.room_id) || /living|lounge|great|dining|family/i.test(r.room_id)
    );

    for (const room of rooms) {
        if (isCorridorLike(room.room_id)) continue;

        if (!isSubRoom(room.room_id)) {
            const reaches = connectors.some(c => c.room_id !== room.room_id && sharesWall(room, c));
            if (!reaches) {
                issues.push({
                    room_id: room.room_id,
                    rule: 'CORRIDOR_ADJACENCY',
                    detail: 'No shared wall with any corridor/hall/foyer/hub room — unreachable.',
                });
            }
        }

        if (isHabitable(room.room_id) && !touchesExternal(room, buildingW, buildingH)) {
            issues.push({
                room_id: room.room_id,
                rule: 'EXTERNAL_WALL',
                detail: 'Habitable room has no wall on the building perimeter.',
            });
        }

        if (isBath(room.room_id) && !touchesExternal(room, buildingW, buildingH)) {
            issues.push({
                room_id: room.room_id,
                rule: 'BATH_VENTILATION',
                detail: 'No external wall — requires mechanical ventilation (NBC-permitted, flag for review).',
            });
        }
    }

    if (issues.length > 0) {
        console.warn(`[SOLVER_V2] floor ${floorIndex} validation: ${issues.length} issue(s)`, issues);
    } else {
        console.log(`[SOLVER_V2] floor ${floorIndex} validation: PASS`);
    }
    return issues;
}
