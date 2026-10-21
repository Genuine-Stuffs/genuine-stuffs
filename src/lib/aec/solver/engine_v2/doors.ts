/**
 * Genuine Stuffs AI Studio · Solver V2 · Door + Window Placement
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE E · 26 June 2026
 *
 * Pure logic: given a list of placed rooms, computes where doors and windows
 * should appear on each room's walls.
 *
 * DOOR RULES:
 *   - Every room gets exactly one primary door
 *   - Door opens onto the highest-priority neighbour (corridor > foyer >
 *     living > any room > service room)
 *   - Bathrooms open into their parent bedroom (not corridor)
 *   - Garage doors open to exterior (no internal door arc)
 *   - Corridor and stairwell: no door symbol
 *
 * WINDOW RULES:
 *   - Every room with an external wall gets at least one window
 *   - Bathrooms get a narrow window (privacy glass implied)
 *   - Corridor gets no windows (internal circulation)
 *   - Stairwell gets one narrow window
 *
 * Output is consumed by AECFloorPlan.tsx to override the existing
 * getDoorWall() heuristic with solver-derived data.
 *
 * Zero dependencies on React or renderer code.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type WallSide = 'top' | 'bottom' | 'left' | 'right';

export interface DoorSpec {
    room_id:   string;
    wall:      WallSide;
    /** Normalised position along the wall: 0.0 = start, 1.0 = end */
    position:  number;
    /** Arc radius in metres */
    radius_m:  number;
    /** Interior swing: true = bathroom-to-bedroom, false = room-to-corridor */
    interior:  boolean;
}

export interface WindowSpec {
    room_id:  string;
    wall:     WallSide;
    /** Normalised centre position along the wall */
    position: number;
    /** Window width in metres */
    width_m:  number;
    /** Narrow = bathroom/stairwell; standard = all others */
    narrow:   boolean;
}

export interface PlacementResult {
    doors:   DoorSpec[];
    windows: WindowSpec[];
}

// ── Type-based classification (Hive `type` is authoritative — D5) ──────────
// These take the canonical Hive type string, not a room_id/label, and are
// checked by equality against graph.ts's own TYPE_TO_ZONE vocabulary —
// no independent regex classifier.

const isCorridor = (type: string) =>
    type === 'circulation' || type === 'hall' || type === 'landing' || type === 'void';
const isStair    = (type: string) => type === 'stairwell';
const isGarage   = (type: string) => type === 'garage';
const isBath     = (type: string) => type === 'bathroom';
const isWardrobe = (type: string) => type === 'wardrobe' || type === 'dressing';
const isBedroom  = (type: string) => type === 'bedroom' || type === 'master_bedroom';
const isService  = (type: string) => isBath(type) || isWardrobe(type);

// ── Shared wall detection ──────────────────────────────────────────────────

interface PlacedRect {
    room_id: string;
    /** Hive type, or a synthetic marker the caller supplies
     *  for solver-placed circulation (corridor/stairwell/void). */
    type: string;
    x: number; y: number; width: number; depth: number;
}

const TOLERANCE = 0.31; // metres — wall co-planarity threshold

function sharedWall(
    a: PlacedRect,
    b: PlacedRect
): WallSide | null {
    const aR = a.x + a.width,  aB = a.y + a.depth;
    const bR = b.x + b.width,  bB = b.y + b.depth;

    // Horizontal overlap — walls share length if projections overlap
    const overlapX = Math.min(aR, bR) - Math.max(a.x, b.x) > TOLERANCE;
    // Vertical overlap
    const overlapY = Math.min(aB, bB) - Math.max(a.y, b.y) > TOLERANCE;

    if (Math.abs(aB - b.y) < TOLERANCE && overlapX) return 'bottom'; // a's bottom = b's top
    if (Math.abs(a.y - bB) < TOLERANCE && overlapX) return 'top';    // a's top = b's bottom
    if (Math.abs(aR - b.x) < TOLERANCE && overlapY) return 'right';  // a's right = b's left
    if (Math.abs(a.x - bR) < TOLERANCE && overlapY) return 'left';   // a's left = b's right

    return null;
}

/** Length of wall two touching rooms share (0 when they don't touch). */
function sharedLength(a: PlacedRect, b: PlacedRect): number {
    const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
    return Math.abs(ox) < TOLERANCE ? Math.max(0, oy) : Math.abs(oy) < TOLERANCE ? Math.max(0, ox) : Math.max(0, Math.max(ox, oy));
}
/** Room for a 0.9 m door leaf (openings.ts doorStretch needs a stretch at least the door wide). */
const DOOR_FIT_M = 0.9;

// ── Wall priority scoring ──────────────────────────────────────────────────

const isOpenAir  = (type: string) => ['balcony', 'terrace', 'veranda', 'verandah', 'patio'].includes(type);

function wallScore(neighbourType: string, currentType: string, currentId = ''): number {
    // A declared balcony opens from the room it serves (template step (i));
    // the hall-surplus terrace (terrace_f*) stays on the hall.
    // a veranda or porch is a way into the house: it opens into the living room or foyer,
    // never a bedroom (the bungalow's front veranda opened into bedroom 3, owner 2026-10-21)
    if (/^(veranda|verandah|porch)$/.test(currentType)) {
        if (['living_room', 'family_room', 'dining_room', 'foyer'].includes(neighbourType)) return 130;
        if (isCorridor(neighbourType)) return 110;
        if (isBedroom(neighbourType)) return 2;
    }
    if (isOpenAir(currentType) && !currentId.startsWith('terrace_f')) {
        if (isBedroom(neighbourType)) return 120;
        if (['living_room', 'family_room', 'dining_room'].includes(neighbourType)) return 110;
    }
    if (isCorridor(neighbourType) || isStair(neighbourType)) return 100;
    if (neighbourType === 'foyer')                            return 80;
    if (['living_room', 'dining_room', 'family_room'].includes(neighbourType)) return 60;

    // Bathroom → open into its bedroom
    if (isService(currentType) && isBedroom(neighbourType))  return 90;

    if (isGarage(neighbourType))  return 0;  // never door into garage
    // a bedroom, study or office never opens through the kitchen, laundry or a store
    // while any other wall will do (owner, 2026-10-21: the guest bedroom into the kitchen)
    if (/^(bedroom|master_bedroom|study|office|prayer_room|gym)$/.test(currentType)
        && /^(kitchen|laundry|store|utility|pantry|boiler_room)$/.test(neighbourType)) return 1;
    if (isService(neighbourType)) return 5;  // avoid service-to-service
    return 20;
}

// ── External wall detection ────────────────────────────────────────────────

function externalEdges(
    room: PlacedRect,
    buildingW: number,
    buildingH: number,
    tol = 0.5
): Record<WallSide, boolean> {
    return {
        left:   room.x <= tol,
        top:    room.y <= tol,
        right:  (room.x + room.width)  >= buildingW - tol,
        bottom: (room.y + room.depth) >= buildingH - tol,
    };
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Compute door and window specs for all rooms on a single floor.
 *
 * @param rooms        All placed rooms on this floor (must carry a `type` field)
 * @param buildingW    Building bounding-box width in metres
 * @param buildingH    Building bounding-box height (depth) in metres
 */
export function computePlacement(
    rooms: PlacedRect[],
    buildingW: number,
    buildingH: number
): PlacementResult {
    const doors:   DoorSpec[]   = [];
    const windows: WindowSpec[] = [];

    for (const room of rooms) {
        const id   = room.room_id;
        const type = room.type;

        // Corridor and void: no door, no window
        if (isCorridor(type)) continue;

        // ── DOOR PLACEMENT ─────────────────────────────────────────────────
        if (!isGarage(type)) {
            const wallScores: Partial<Record<WallSide, number>> = {};
            // a wall onto an open-to-below void is a drop to the floor below: a door goes there
            // only in a stretch facing a room (the drawing places it, openings.ts doorStretch)
            const overVoid = new Set<WallSide>();

            for (const neighbour of rooms) {
                if (neighbour.room_id === id) continue;
                const wall = sharedWall(room, neighbour);
                if (!wall) continue;
                // a neighbour scores a wall only where a door fits in the wall it shares: a hall
                // touching 0.5 m of a bedroom's wall left the door to the kitchen beside it (owner, 2026-10-21)
                if (neighbour.type !== 'void' && sharedLength(room, neighbour) < DOOR_FIT_M) continue;
                if (neighbour.type === 'void') { overVoid.add(wall); continue; }
                const score = wallScore(neighbour.type, type, id);
                wallScores[wall] = Math.max(wallScores[wall] ?? 0, score);
            }

            // External walls get a penalty — doors prefer internal walls
            const ext = externalEdges(room, buildingW, buildingH);
            const sides: WallSide[] = ['bottom', 'right', 'top', 'left'];
            const onlyVoid = (w: WallSide) => overVoid.has(w) && wallScores[w] === undefined;
            const ranked = sides
                .filter(w => !ext[w])           // exclude external walls
                .sort((a, b) => +onlyVoid(a) - +onlyVoid(b) || (wallScores[b] ?? 0) - (wallScores[a] ?? 0));

            const doorWall = ranked[0] ?? sides.find(w => !ext[w]) ?? 'bottom';
            const isInterior = isService(type); // bath/wardrobe = interior swing

            doors.push({
                room_id:  id,
                wall:     doorWall,
                position: 0.25,
                radius_m: isStair(type) ? 0 : (isInterior ? 0.8 : 1.0),
                interior: isInterior,
            });
        }

        // ── WINDOW PLACEMENT ───────────────────────────────────────────────
        if (!isCorridor(type)) {
            const ext = externalEdges(room, buildingW, buildingH);
            const extSides = (Object.keys(ext) as WallSide[]).filter(w => ext[w]);

            for (const wall of extSides) {
                const wallLen = (wall === 'top' || wall === 'bottom')
                    ? room.width
                    : room.depth;

                const narrow   = isBath(type) || isStair(type) || isWardrobe(type);
                const winWidth = narrow
                    ? Math.min(0.6, wallLen * 0.4)
                    : Math.min(wallLen * 0.55, 2.4);

                // Only place window if wall is long enough
                if (wallLen > winWidth + 0.4) {
                    windows.push({
                        room_id:  id,
                        wall,
                        position: 0.5, // centred
                        width_m:  winWidth,
                        narrow,
                    });
                }
            }
        }
    }

    return { doors, windows };
}
