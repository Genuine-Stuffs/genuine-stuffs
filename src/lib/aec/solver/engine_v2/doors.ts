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

// ── Wall priority scoring ──────────────────────────────────────────────────

function wallScore(neighbourType: string, currentType: string): number {
    if (isCorridor(neighbourType) || isStair(neighbourType)) return 100;
    if (neighbourType === 'foyer')                            return 80;
    if (['living_room', 'dining_room', 'family_room'].includes(neighbourType)) return 60;

    // Bathroom → open into its bedroom
    if (isService(currentType) && isBedroom(neighbourType))  return 90;

    if (isGarage(neighbourType))  return 0;  // never door into garage
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

            for (const neighbour of rooms) {
                if (neighbour.room_id === id) continue;
                const wall = sharedWall(room, neighbour);
                if (!wall) continue;
                const score = wallScore(neighbour.type, type);
                wallScores[wall] = Math.max(wallScores[wall] ?? 0, score);
            }

            // External walls get a penalty — doors prefer internal walls
            const ext = externalEdges(room, buildingW, buildingH);
            const sides: WallSide[] = ['bottom', 'right', 'top', 'left'];
            const ranked = sides
                .filter(w => !ext[w])           // exclude external walls
                .sort((a, b) => (wallScores[b] ?? 0) - (wallScores[a] ?? 0));

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
