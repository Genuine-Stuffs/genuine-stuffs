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

// Type-based classification — same canonical vocabulary as graph.ts's
// TYPE_TO_ZONE. Each label-regex set below is ported 1:1 to its type
// equivalent (D5) rather than re-guessing from room_id/label.
export const isCorridorLike = (type: string) =>
    ['circulation', 'hall', 'landing', 'void', 'foyer', 'stairwell'].includes(type);
export const isSubRoom = (type: string) =>
    ['bathroom', 'wardrobe', 'dressing'].includes(type);
/** Rooms other rooms may open into: circulation, plus the large social
 * rooms people walk through (rule 1's "hub" rooms). Shared with the
 * solver, which enforces rule 1 during placement (solver/search.ts). */
export const isConnectorType = (type: string) =>
    isCorridorLike(type) || ['living_room', 'dining_room', 'family_room'].includes(type);
const isBath = (type: string) => type === 'bathroom';
const isHabitable = (type: string) =>
    !isCorridorLike(type) && !isSubRoom(type) &&
    ['bedroom', 'master_bedroom', 'living_room', 'dining_room', 'family_room',
     'kitchen', 'office', 'study'].includes(type);

export interface ValidationIssue {
    room_id: string;
    rule: 'CORRIDOR_ADJACENCY' | 'EXTERNAL_WALL' | 'BATH_VENTILATION' | 'ADJACENCY_MISSED' | 'AREA_ADJUSTED';
    detail: string;
}

/** Issue rules that are advisory — the plan works, a professional should
 * review — as opposed to a room that is unreachable or a habitable room
 * with no window. Shared with the UI's WARN/REVIEW split. ADJACENCY_MISSED
 * and AREA_ADJUSTED come only from fallback plans. */
export const ADVISORY_RULES: ReadonlySet<ValidationIssue['rule']> =
    new Set(['BATH_VENTILATION', 'ADJACENCY_MISSED', 'AREA_ADJUSTED']);

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
    typeOf: (room_id: string) => string,
    labelOf: (room_id: string) => string,
    buildingW: number,
    buildingH: number,
    floorIndex: number,
    suiteSubIds: Set<string> = new Set()
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    // "Hub" rooms are large social rects that other rooms can open into
    // directly, same as a corridor — living/great/lounge/dining/family qualify.
    const connectors = rooms.filter(r => isConnectorType(typeOf(r.room_id)));

    for (const room of rooms) {
        const type  = typeOf(room.room_id);
        const label = labelOf(room.room_id); // display text only, not classification
        if (isCorridorLike(type)) continue;

        // Suite members of any type (e.g. a "store" walk-in wardrobe)
        // reach through their bedroom, same as a typed sub-room.
        if (!isSubRoom(type) && !suiteSubIds.has(room.room_id)) {
            const reaches = connectors.some(c => c.room_id !== room.room_id && sharesWall(room, c));
            if (!reaches) {
                issues.push({
                    room_id: room.room_id,
                    rule: 'CORRIDOR_ADJACENCY',
                    detail: `No shared wall with any corridor/hall/foyer/hub room — unreachable (${label}).`,
                });
            }
        }

        if (isHabitable(type) && !touchesExternal(room, buildingW, buildingH)) {
            issues.push({
                room_id: room.room_id,
                rule: 'EXTERNAL_WALL',
                detail: `Habitable room has no wall on the building perimeter (${label}).`,
            });
        }

        if (isBath(type) && !touchesExternal(room, buildingW, buildingH)) {
            issues.push({
                room_id: room.room_id,
                rule: 'BATH_VENTILATION',
                detail: `No external wall — requires mechanical ventilation (NBC-permitted, flag for review) (${label}).`,
            });
        }
    }

    if (issues.length > 0) {
        console.warn(`[SOLVER_V2] floor ${floorIndex} validation: ${issues.length} issue(s)\n${JSON.stringify(issues, null, 2)}`);
    } else {
        console.log(`[SOLVER_V2] floor ${floorIndex} validation: PASS`);
    }
    return issues;
}
