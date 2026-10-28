/**
 * Doors and windows of a plan, decided once (template step (e)): which wall
 * each room's door is on and what it is, which external walls get a window
 * and what size, and the D1…/W1… tags and schedule that name them. The floor
 * drawing draws exactly these; the schedule lists exactly these.
 *
 * Sizes are real (width × height, metres) from a short residential catalogue,
 * so the drawing shows a 0.9 m door as 0.9 m whatever the scale.
 */
import type { SolvedLayout, PlacedRoom } from 'supabase/functions/ai-studio/schema';
import { computePlacement, type WallSide } from '@/lib/aec/solver/engine_v2/doors';
import { buildGraph, deriveSuites, unitEntrances, carsIn, VEHICLE_BAY, VEHICLE_END, normalizeRoomType } from '@/lib/aec/solver/engine_v2/graph';
import { hiveRooms } from '@/lib/aec/solver/engine_v2/gapfree/need';

export interface OpeningType { kind: 'D' | 'W'; w: number; h: number }

/** Room door; bath, WC and wardrobe door (opens inside the suite). */
export const DOOR_ROOM: OpeningType = { kind: 'D', w: 0.9, h: 2.1 };
export const DOOR_SERVICE: OpeningType = { kind: 'D', w: 0.8, h: 2.1 };
/** The front door, the template's own D1. */
export const DOOR_ENTRANCE: OpeningType = { kind: 'D', w: 0.9, h: 2.5 };
/** A garage's vehicle door: an overhead door 2.4 m high, 2.5 m of opening
 * per car (one type per width, so the schedule counts each size once). */
const VEHICLE_H = 2.4;
const vehicleTypes = new Map<number, OpeningType>();
const vehicleType = (w: number): OpeningType => {
  if (!vehicleTypes.has(w)) vehicleTypes.set(w, { kind: 'D', w, h: VEHICLE_H });
  return vehicleTypes.get(w)!;
};
/** An assembly exit of a given clear width: double or triple doors 2.4 m high, one type per width. */
const exitTypes = new Map<number, OpeningType>();
const exitType = (w: number): OpeningType => {
  if (!exitTypes.has(w)) exitTypes.set(w, { kind: 'D', w, h: 2.4 });
  return exitTypes.get(w)!;
};
const WIN_LARGE: OpeningType = { kind: 'W', w: 1.8, h: 1.2 };
const WIN_ROOM: OpeningType = { kind: 'W', w: 1.2, h: 1.2 };
const WIN_SMALL: OpeningType = { kind: 'W', w: 0.6, h: 0.6 };

const LARGE_ROOMS = /^(living(_room)?|family(_room)?|dining(_room)?|lounge|sitting_room|master_bedroom)$/;
const SMALL_ROOMS = /^(bathroom|toilet|wc|ensuite|shower|laundry|store|storage|wardrobe|dressing|pantry)$/;
const SERVICE_ROOMS = /^(bathroom|toilet|wc|ensuite|shower|wardrobe|dressing)$/;
/** Clear wall each side: a door needs 0.1 m, a window 0.3 m. */
const DOOR_CLEAR = 0.2, WIN_CLEAR = 0.6;
const EDGE_TOLERANCE = 0.5; // metres
// Briefs write types loosely ("living", "master bedroom", "wet-kitchen").
const norm = (t: string) => t.toLowerCase().replace(/[\s-]+/g, '_');

/** The room's type: synthetic solver rooms by id, the rest from the brief. */
export function roomTypeOf(layout: SolvedLayout, room_id: string): string {
  if (/^stairwell(_void)?(_\d+)?$/.test(room_id)) return 'stairwell'; // a hotel's second stair: stairwell_2 / stairwell_void_2
  if (room_id.startsWith('corridor_floor')) return 'circulation';
  if (room_id.startsWith('terrace_f')) return 'balcony';
  // a flat's inner passage (engine FLAT_PASSAGE): walled, a door into its living room
  if (room_id.startsWith('passage_')) return 'passage';
  // the open-to-below void over a double-volume room: open to the landing, no door or window
  if (room_id.startsWith('atrium_')) return 'void';
  const rooms: any[] = layout.program_reference?.rooms ?? [];
  // the planner's own names ("living" -> living_room, "master bedroom" -> master_bedroom):
  // the door rules key on them, so a raw type left the lounge scored as a plain room (2026-10-20)
  return normalizeRoomType(rooms.find(r => r.room_id === room_id || r.id === room_id)?.type) ?? 'unknown';
}

const isOpen = (t: string) => t === 'circulation' || t === 'hall' || t === 'landing' || t === 'void';
/** A worship front open to the hall (altar/stage, choir): a raised platform, no door of its own (owner 2026-10-22). */
export const isPlatform = (t: string) => t === 'stage' || t === 'choir';
const isOutside = (t: string) => t === 'balcony' || t === 'terrace';

/** Which of the room's walls are on the building's outline: on its bounding
 * box, or — given the floor's rooms — with no room beyond them (the inner
 * faces of an L-shaped floor, hotel.ts). A rectangular floor has a room
 * beyond every inner wall, so it reads the same either way. */
export const externalEdges = (r: PlacedRoom, W: number, D: number, rooms?: PlacedRoom[]): Record<WallSide, boolean> => {
  const box = {
    left:   r.x <= EDGE_TOLERANCE,
    top:    r.y <= EDGE_TOLERANCE,
    right:  r.x + r.width >= W - EDGE_TOLERANCE,
    bottom: r.y + r.depth >= D - EDGE_TOLERANCE,
  };
  if (!rooms) return box;
  const e = 1e-6, ov = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1);
  const beyond = (side: WallSide) => rooms.some(q => q !== r && q.room_id !== r.room_id && (
    side === 'left' ? Math.abs(q.x + q.width - r.x) < e && ov(r.y, r.y + r.depth, q.y, q.y + q.depth) > e
    : side === 'right' ? Math.abs(q.x - r.x - r.width) < e && ov(r.y, r.y + r.depth, q.y, q.y + q.depth) > e
    : side === 'top' ? Math.abs(q.y + q.depth - r.y) < e && ov(r.x, r.x + r.width, q.x, q.x + q.width) > e
    : Math.abs(q.y - r.y - r.depth) < e && ov(r.x, r.x + r.width, q.x, q.x + q.width) > e));
  return { left: box.left || !beyond('left'), top: box.top || !beyond('top'), right: box.right || !beyond('right'), bottom: box.bottom || !beyond('bottom') };
};

const TOLERANCE = 0.3; // metres — shared wall detection threshold

/** The renderer's own door wall when the solver gives none (the garage):
 * the internal wall with the best neighbour (corridor > bath's bedroom >
 * living > any room > service room). */
function heuristicDoorWall(room: PlacedRoom, rooms: PlacedRoom[], typeOf: (id: string) => string, ext: Record<WallSide, boolean>): WallSide {
  const roomRight = room.x + room.width, roomBottom = room.y + room.depth;
  const scores: Record<WallSide, number> = { top: 0, bottom: 0, left: 0, right: 0 };
  const currentType = typeOf(room.room_id);
  for (const n of rooms) {
    if (n.room_id === room.room_id) continue;
    const nRight = n.x + n.width, nBottom = n.y + n.depth;
    const nType = typeOf(n.room_id);
    const score = nType === 'void' ? -100 // a drop to the floor below
      : ['circulation', 'hall', 'landing', 'stairwell'].includes(nType) ? 10
      : (currentType === 'bathroom' && ['bedroom', 'master_bedroom'].includes(nType)) ? 9
      : ['living_room', 'dining_room', 'family_room'].includes(nType) ? 8
      : ['bathroom', 'wardrobe', 'dressing', 'store', 'garage'].includes(nType) ? 0
      : 1;
    const xOver = room.x < nRight - TOLERANCE && roomRight > n.x + TOLERANCE;
    const yOver = room.y < nBottom - TOLERANCE && roomBottom > n.y + TOLERANCE;
    if (Math.abs(roomBottom - n.y) < TOLERANCE && xOver) scores.bottom += score;
    if (Math.abs(room.y - nBottom) < TOLERANCE && xOver) scores.top += score;
    if (Math.abs(roomRight - n.x) < TOLERANCE && yOver) scores.right += score;
    if (Math.abs(room.x - nRight) < TOLERANCE && yOver) scores.left += score;
  }
  const ranked = (['bottom', 'right', 'top', 'left'] as WallSide[]).filter(w => !ext[w]).sort((a, b) => scores[b] - scores[a]);
  return ranked[0] ?? 'bottom';
}

/** `at`: where the door leaf starts along its wall (m from the wall's start), when a
 * quarter along would open into the wrong room; a quarter along when absent. */
/** Where a door goes on its wall: in the stretch shared with the room it opens
 * into (`target`, else the best neighbour there: hall or landing, then a living
 * room, then any room; never a void), so a wall shared by the hall and a
 * bathroom doesn't put the door into the bathroom. A quarter along, as before,
 * when that already lands in the right stretch. */
function doorStretch(r: PlacedRoom, wall: WallSide, type: OpeningType, rooms: PlacedRoom[], typeOf: (id: string) => string, target?: PlacedRoom): { at?: number } {
  const horizontal = wall === 'top' || wall === 'bottom';
  const lo = horizontal ? r.x : r.y, len = horizontal ? r.width : r.depth;
  const line = wall === 'top' ? r.y : wall === 'bottom' ? r.y + r.depth : wall === 'left' ? r.x : r.x + r.width;
  const own = norm(typeOf(r.room_id));
  const score = (q: PlacedRoom) => {
    if (target) return q.room_id === target.room_id ? 1 : -1;
    const t = norm(typeOf(q.room_id));
    if (t === 'void') return -1; // a drop to the floor below
    if (isOpen(t) || t === 'stairwell' || t === 'foyer' || q.room_id.startsWith('corridor_floor')) return 100;
    if (SERVICE_ROOMS.test(own) && /bedroom/.test(t)) return 90;
    if (/^(living_room|family_room|dining_room)$/.test(t)) return 60;
    if (SERVICE_ROOMS.test(t) || /garage|store|wardrobe/.test(t)) return 5;
    // a bedroom, study or office never opens through the kitchen or laundry while another stretch will do
    if (/^(bedroom|master_bedroom|study|office|prayer_room|gym)$/.test(own) && /^(kitchen|laundry|utility|pantry|boiler_room)$/.test(t)) return 1;
    return 20;
  };
  const stretches = rooms.filter(q => q.room_id !== r.room_id).flatMap(q => {
    const touches = horizontal ? Math.abs(q.y + q.depth - line) < TOLERANCE || Math.abs(q.y - line) < TOLERANCE
      : Math.abs(q.x + q.width - line) < TOLERANCE || Math.abs(q.x - line) < TOLERANCE;
    const a = Math.max(lo, horizontal ? q.x : q.y) - lo, b = Math.min(lo + len, horizontal ? q.x + q.width : q.y + q.depth) - lo;
    return touches && b - a >= type.w ? [{ a, b, s: score(q) }] : [];
  }).filter(x => x.s >= 0);
  if (!stretches.length) return {};
  const best = Math.max(...stretches.map(x => x.s));
  const ok = stretches.filter(x => x.s === best);
  const q = Math.max(0, Math.min(len * 0.25, len - type.w)); // where the drawing puts it by default
  if (ok.some(x => q >= x.a - 1e-6 && q + type.w <= x.b + 1e-6)) return {};
  const x = ok.sort((u, v) => (v.b - v.a) - (u.b - u.a))[0];
  return { at: x.a + Math.min(0.1, (x.b - x.a - type.w) / 2) };
}

export interface PlannedDoor { room_id: string; wall: WallSide; type: OpeningType; at?: number }
/** `at`: the window's centre along its wall (m from the wall's start, x for
 * top/bottom, y for left/right); centred when absent. */
export interface PlannedWindow { room_id: string; wall: WallSide; type: OpeningType; at?: number }
/** The front door: on the street wall (the floor's bottom edge, y = D) of
 * the room it opens into, centred on that room's street frontage. */
export interface PlannedEntrance { room_id: string; type: OpeningType; x: number; y: number }
/** The kitchen's door to the yard: on an outside wall, never the street's;
 * `at` is where its leaf starts along the wall (m from the wall's start). */
export interface PlannedYardDoor { room_id: string; wall: WallSide; type: OpeningType; at: number }
/** `at`: the opening's start along its wall (m from the wall's start, x for top/bottom, y for left/right). */
/** `open`: a carport / car porch / parking bay: its car side is open (no door, not in the schedule). */
export interface PlannedVehicleDoor { room_id: string; wall: WallSide; at: number; type: OpeningType; open?: boolean }
/** `yards`: every outside door to the yard (the kitchen's `yard`, then a laundry's), for the drawings and the schedule. */
export interface FloorOpenings { doors: Map<string, PlannedDoor>; windows: PlannedWindow[]; entrance: PlannedEntrance | null; yard: PlannedYardDoor | null; yards: PlannedYardDoor[]; vehicles: PlannedVehicleDoor[] }

const KITCHENS = /^(kitchen|wet_kitchen|kitchenette|outdoor_kitchen|dirty_kitchen)$/;
const YARD_END = 0.3; // the yard door's leaf starts this far from the wall's end

/** The ground floor's yard door, as Lagos houses have it: from a kitchen
 * through an outside wall to the back yard, facing the BQ where there is
 * one. The rear wall first, then the kitchen nearest an outbuilding, then
 * a wet kitchen; at the wall's end nearer the outbuilding (or the rear),
 * the wall's window moved into the rest of the wall, dropped only when
 * nothing fits there. */
function yardDoor(layout: SolvedLayout, rooms: PlacedRoom[], W: number, D: number, typeOf: (id: string) => string, windows: PlannedWindow[]): PlannedYardDoor | null {
  const obs = (layout.outbuildings ?? []).filter(b => !b.at_gate).map(b => ({ x: b.x + b.width / 2, y: b.y + b.depth / 2 }));
  const target = (r: PlacedRoom) => obs.length
    ? obs.reduce((a, b) => Math.hypot(b.x - r.x - r.width / 2, b.y) < Math.hypot(a.x - r.x - r.width / 2, a.y) ? b : a)
    : { x: r.x + r.width / 2, y: -1 };
  const options = rooms.filter(r => KITCHENS.test(norm(typeOf(r.room_id)))).flatMap(r => {
    const ext = externalEdges(r, W, D);
    return (['top', 'left', 'right'] as WallSide[]).filter(w => ext[w] && wallLength(r, w) >= DOOR_ROOM.w + YARD_END * 2).map(wall => {
      const t = target(r);
      return { r, wall, rank: [wall === 'top' ? 0 : 1, obs.length ? Math.hypot(t.x - r.x - r.width / 2, t.y - r.y) : 0, /wet|dirty|outdoor/.test(norm(typeOf(r.room_id))) ? 0 : 1] };
    });
  }).sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.rank[2] - b.rank[2]);
  const best = options[0];
  if (!best) return null;
  const { r, wall } = best, L = wallLength(r, wall), t = target(r);
  // the end nearer the outbuilding (or, on a side wall, the rear)
  const along = wall === 'top' ? t.x - r.x : t.y - r.y;
  const at = along > L / 2 ? L - YARD_END - DOOR_ROOM.w : YARD_END;
  moveWindow(windows, r, wall, at, L);
  return { room_id: r.room_id, wall, type: DOOR_ROOM, at };
}

/** A door at `at` on a room's outside wall: that wall's window moves into the rest of the wall, dropped only when nothing fits. */
function moveWindow(windows: PlannedWindow[], r: PlacedRoom, wall: WallSide, at: number, L: number) {
  const i = windows.findIndex(w => w.room_id === r.room_id && w.wall === wall);
  if (i < 0) return;
  const [lo, hi] = at === YARD_END ? [at + DOOR_ROOM.w + YARD_END, L - YARD_END] : [YARD_END, at - YARD_END];
  const type = [windows[i].type, WIN_ROOM, WIN_SMALL].filter(s => s.w <= windows[i].type.w).find(s => hi - lo >= s.w);
  if (type) windows[i] = { ...windows[i], type, at: (lo + hi) / 2 };
  else windows.splice(i, 1);
}

const LAUNDRIES = /^(laundry|laundry_room|washing|washing_area)$/;
/** A boys' quarters or staff room inside the house: self-contained, entered from outside (T29's staff room). */
const QUARTERS = /^(bq|staff_room|maid_room|maids_room|staff_quarters)$/;
const QUARTERS_NAME = /\b(boys'? ?quarters?|b\.?q\.?|staff room|maid'?s? room|domestic staff)\b/i;
/** A ground-floor laundry's door to the yard, as the templates draw it (T21 "Washing",
 * T26 kitchen yard, T29 washing area, T30 laundry in the back yard): on an outside
 * wall, never the street's — the rear first, then a side — at the wall's start. */
function laundryDoor(rooms: PlacedRoom[], W: number, D: number, typeOf: (id: string) => string, windows: PlannedWindow[], taken: PlannedYardDoor | null, which: (r: PlacedRoom) => boolean = q => LAUNDRIES.test(norm(typeOf(q.room_id)))): PlannedYardDoor | null {
  for (const r of rooms.filter(which)) {
    const ext = externalEdges(r, W, D, rooms);
    const wall = (['top', 'left', 'right'] as WallSide[]).find(w => ext[w] && wallLength(r, w) >= DOOR_ROOM.w + YARD_END * 2
      && !(taken && taken.room_id === r.room_id && taken.wall === w));
    if (!wall) continue;
    moveWindow(windows, r, wall, YARD_END, wallLength(r, wall));
    return { room_id: r.room_id, wall, type: DOOR_ROOM, at: YARD_END };
  }
  return null;
}

const ENTRY_NAME = /foyer|entrance|entry|lobby|porch/i;

/** The ground floor's front door: into the foyer (or entrance, lobby,
 * porch) where one touches the street, else the hall, else the living
 * room, else another day room; the widest frontage of the first kind
 * found. None when only bedrooms, baths, stores or the garage face it. */
function frontEntrance(layout: SolvedLayout, rooms: PlacedRoom[], D: number, typeOf: (id: string) => string): PlannedEntrance | null {
  const brief: Array<{ room_id?: string; id?: string; name?: string; unit?: string }> = layout.program_reference?.rooms ?? [];
  const named = (id: string) => brief.find(r => r.room_id === id || r.id === id)?.name ?? '';
  // a flat's own rooms are private: the block's front door never opens into one
  const inFlat = (id: string) => !!brief.find(r => r.room_id === id || r.id === id)?.unit;
  const onStreet = rooms.filter(r => Math.abs(r.y + r.depth - D) < EDGE_TOLERANCE && r.width >= DOOR_ENTRANCE.w + DOOR_CLEAR && !inFlat(r.room_id));
  const kinds: Array<(r: PlacedRoom) => boolean> = [
    // a car porch is no entrance
    r => !/^(garage|carport|car_porch)$/.test(norm(typeOf(r.room_id))) && !/\bcar\b/i.test(named(r.room_id))
      && (norm(typeOf(r.room_id)) === 'foyer' || ENTRY_NAME.test(named(r.room_id))),
    r => r.room_id.startsWith('corridor_floor') || /^(hall|circulation)$/.test(norm(typeOf(r.room_id))),
    r => /^(living(_room)?|lounge|sitting_room)$/.test(norm(typeOf(r.room_id))),
    // no foyer, hall or lounge on the street: any day room there, never a
    // bedroom, bath, store or garage
    r => !/bed|bath|toilet|wc|ensuite|shower|wardrobe|dressing|store|storage|garage|carport|balcony|terrace|stair/.test(norm(typeOf(r.room_id))),
  ];
  for (const kind of kinds) {
    const r = onStreet.filter(kind).sort((a, b) => b.width - a.width)[0];
    if (r) return { room_id: r.room_id, type: DOOR_ENTRANCE, x: r.x + r.width / 2, y: r.y + r.depth };
  }
  return null;
}

const wallLength = (r: PlacedRoom, wall: WallSide) => wall === 'top' || wall === 'bottom' ? r.width : r.depth;

const GARAGES = /^(garage|carport|car_porch|parking)$/;
/** A garage's vehicle door: as many 2.5 m bays as the brief's cars ("3-car
 * garage"; else as the wall holds), on the street wall first, then a side
 * wall, then the rear; none when no outside wall can take one bay. */
function vehicleDoor(layout: SolvedLayout, r: PlacedRoom, W: number, D: number, typeOf: (id: string) => string): PlannedVehicleDoor | null {
  const brief: Array<{ room_id?: string; id?: string; name?: string }> = layout.program_reference?.rooms ?? [];
  const name = brief.find(q => q.room_id === r.room_id || q.id === r.room_id)?.name ?? '';
  if (!GARAGES.test(norm(typeOf(r.room_id))) && !/\bgarage\b/i.test(name)) return null;
  // only an enclosed garage has a door; a carport, car porch or parking bay is open to the street
  // (the building templates, TEMPLATE-FINDINGS.md §3.5)
  const open = !(norm(typeOf(r.room_id)) === 'garage' || /\bgarage\b/i.test(name)) || /\b(car ?port|porch|parking)\b/i.test(name);
  const ext = externalEdges(r, W, D);
  const cars = carsIn(name);
  for (const wall of ['bottom', 'left', 'right', 'top'] as WallSide[]) {
    const L = wallLength(r, wall);
    if (!ext[wall] || L < VEHICLE_BAY + 2 * VEHICLE_END) continue;
    const fit = Math.floor((L - 2 * VEHICLE_END) / VEHICLE_BAY + 1e-9);
    const w = open ? Math.round((L - 2 * VEHICLE_END) * 10) / 10 // the whole side between end posts
      : Math.round(Math.min(L - 2 * VEHICLE_END, (cars > 0 ? Math.min(cars, fit) : fit) * VEHICLE_BAY) * 10) / 10;
    return { room_id: r.room_id, wall, at: (L - w) / 2, type: open ? { kind: 'D', w, h: VEHICLE_H } : vehicleType(w), ...(open ? { open } : {}) };
  }
  return null;
}

/** One floor's doors (one per room, where it fits) and windows (one per
 * external wall of a room, the largest of its sizes that fits). */
export function planOpenings(layout: SolvedLayout, floor: number): FloorOpenings {
  const rooms = layout.placed_rooms.filter(r => r.floor === floor
    && !isNaN(r.x) && !isNaN(r.y) && r.width > 0 && r.depth > 0);
  const W = rooms.reduce((m, r) => Math.max(m, r.x + r.width), 0);
  const D = rooms.reduce((m, r) => Math.max(m, r.y + r.depth), 0);
  const typeOf = (id: string) => roomTypeOf(layout, id);
  const placement = rooms.length ? computePlacement(rooms.map(r => ({
    room_id: r.room_id, type: typeOf(r.room_id), x: r.x, y: r.y, width: r.width, depth: r.depth,
  })), W, D) : null;
  // A flat's rooms open into the flat's entrance, not onto the landing
  // (en-suites keep their bedroom): the wall they share with it.
  const program = (layout as any).program_reference;
  const graph = program?.rooms?.length ? buildGraph(hiveRooms(program)) : null;
  const intoUnit = graph && program.rooms.some((q: any) => q.unit) ? unitEntrances(graph, floor) : new Map<string, string>();
  // An en-suite bathroom or wardrobe opens into its own bedroom, never a
  // neighbouring one it also touches (Bathroom 4 into Bedroom 2, 2026-10-20)
  const suites = graph ? deriveSuites(graph, floor) : [];
  const suiteSubs = new Set(suites.flatMap(x => x.subIds));
  const ownBedroom = new Map(suites.flatMap(s => s.subIds.map(id => [id, s.bedroomId] as const)));
  // a store or pantry linked only to a kitchen opens into it (gapfree STORE_OFF_KITCHEN)
  for (const n of graph?.nodes.values() ?? []) {
    if (!/^(store|pantry)$/.test(n.type) || n.neighbors.size !== 1 || ownBedroom.has(n.id)) continue;
    const k = graph!.nodes.get([...n.neighbors][0]);
    if (k && k.floor === floor && /kitchen/.test(k.type)) ownBedroom.set(n.id, k.id);
  }
  // a restaurant's kitchen opens into the restaurant it serves, not the public hall
  for (const n of graph?.nodes.values() ?? []) {
    if (n.floor !== floor || !/kitchen/.test(n.type)) continue;
    const dining = [...n.neighbors].map(id => graph!.nodes.get(id)).find(q => q?.type === 'restaurant');
    if (dining) ownBedroom.set(n.id, dining.id);
  }
  const sharedWall = (a: PlacedRoom, b: PlacedRoom): WallSide | null => {
    const ov = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1);
    const e = 1e-6, need = DOOR_ROOM.w + DOOR_CLEAR;
    if (Math.abs(a.x - (b.x + b.width)) < e && ov(a.y, a.y + a.depth, b.y, b.y + b.depth) >= need) return 'left';
    if (Math.abs(a.x + a.width - b.x) < e && ov(a.y, a.y + a.depth, b.y, b.y + b.depth) >= need) return 'right';
    if (Math.abs(a.y - (b.y + b.depth)) < e && ov(a.x, a.x + a.width, b.x, b.x + b.width) >= need) return 'top';
    if (Math.abs(a.y + a.depth - b.y) < e && ov(a.x, a.x + a.width, b.x, b.x + b.width) >= need) return 'bottom';
    return null;
  };
  const doors = new Map<string, PlannedDoor>();
  const windows: PlannedWindow[] = [];
  for (const r of rooms) {
    const t = norm(typeOf(r.room_id));
    if (isOpen(t) || r.room_id.startsWith('corridor_floor')) continue;
    const ext = externalEdges(r, W, D, rooms);
    if (t !== 'stairwell' && !isPlatform(t)) {
      const spec = placement?.doors.find(d => d.room_id === r.room_id);
      // a flat's passage opens into its living room; the flat's rooms into the living room or the passage
      const entry = r.room_id.startsWith('passage_') ? r.room_id.slice('passage_'.length)
        : !suiteSubs.has(r.room_id) ? intoUnit.get(r.room_id) : undefined;
      const entryRoom = entry ? rooms.find(q => q.room_id === entry) : undefined;
      const passage = entry && !r.room_id.startsWith('passage_') ? rooms.find(q => q.room_id === `passage_${entry}`) : undefined;
      const bedroom = rooms.find(q => q.room_id === ownBedroom.get(r.room_id));
      const wall = (bedroom && sharedWall(r, bedroom)) || (entryRoom && sharedWall(r, entryRoom)) || (passage && sharedWall(r, passage)) || spec?.wall || heuristicDoorWall(r, rooms, typeOf, ext);
      // a store, pantry or meter room takes the 0.8 m service door too (a 1.0 m wide meter room fits it; owner 2026-10-21)
      const type = spec?.interior || SERVICE_ROOMS.test(t) || /^(store|storage|pantry)$/.test(t) ? DOOR_SERVICE : DOOR_ROOM;
      if (wallLength(r, wall) >= type.w + DOOR_CLEAR) doors.set(r.room_id, { room_id: r.room_id, wall, type, ...doorStretch(r, wall, type, rooms, typeOf, bedroom ?? entryRoom ?? passage) });
    }
    if (t === 'stairwell' || t === 'passage' || isOutside(t)) continue;
    const sizes = LARGE_ROOMS.test(t) ? [WIN_LARGE, WIN_ROOM, WIN_SMALL]
      : SMALL_ROOMS.test(t) ? [WIN_SMALL] : [WIN_ROOM, WIN_SMALL];
    for (const wall of ['top', 'bottom', 'left', 'right'] as WallSide[]) {
      if (!ext[wall]) continue;
      const type = sizes.find(s => wallLength(r, wall) >= s.w + WIN_CLEAR);
      if (type) windows.push({ room_id: r.room_id, wall, type });
    }
  }
  // The front door takes the place of the window on its wall.
  const entrance = floor === 0 ? frontEntrance(layout, rooms, D, typeOf) : null;
  // A garage's vehicle door, on its street wall where it has one, else another
  // outside wall; it takes the place of that wall's window.
  const vehicles = floor === 0 ? rooms.flatMap(r => {
    const v = vehicleDoor(layout, r, W, D, typeOf);
    return v ? [v] : [];
  }) : [];
  const kept = windows.filter(w => !(entrance && w.room_id === entrance.room_id && w.wall === 'bottom')
    && !vehicles.some(v => v.room_id === w.room_id && v.wall === w.wall));
  const yard = floor === 0 ? yardDoor(layout, rooms, W, D, typeOf, kept) : null;
  const laundry = floor === 0 ? laundryDoor(rooms, W, D, typeOf, kept, yard) : null;
  // a boys' quarters / staff room inside the house has its own way in from the yard, as a laundry does
  const briefRooms: Array<{ room_id?: string; id?: string; name?: string }> = layout.program_reference?.rooms ?? [];
  const named = (id: string) => briefRooms.find(q => q.room_id === id || q.id === id)?.name ?? '';
  const quarters = floor === 0 ? laundryDoor(rooms, W, D, typeOf, kept, yard, q => QUARTERS.test(norm(typeOf(q.room_id))) || QUARTERS_NAME.test(named(q.room_id))) : null;
  // a laundry's or quarters' own door into the house stays; the outside door is extra
  const yards = [yard, laundry, quarters].filter((y): y is PlannedYardDoor => !!y);
  // an assembly hall's exits, sized from its occupant load (gapfree/assembly.ts): the main
  // entrance on the foyer's street wall, the others in the hall's side walls
  const assembly = (layout as any).assembly as { exits: Array<{ wall: WallSide; at: number; width: number; main?: boolean }> } | undefined;
  let mainEntrance = entrance;
  // an assembly lobby the foyer's or hall's own door doesn't open into has a door of its own into
  // the foyer, else the hall (the vestry's lobby behind the stage had none, 2026-10-28)
  if (assembly) {
    const publicRooms = rooms.filter(q => /^(foyer|auditorium)$/.test(norm(typeOf(q.room_id))));
    // the hall's doors are from the foyer, centred on it and as wide as the main entrance (half
    // the load comes through them, NBC 2006 §7.8.4); a general door rule moved them into a lobby
    const hallRoom = publicRooms.find(q => norm(typeOf(q.room_id)) === 'auditorium');
    const foyerRoom = publicRooms.find(q => norm(typeOf(q.room_id)) === 'foyer');
    const main = assembly.exits?.find(e => e.main);
    const fw = hallRoom && foyerRoom ? sharedWall(hallRoom, foyerRoom) : null;
    if (hallRoom && foyerRoom && fw && main) {
      const type = exitType(main.width);
      const lo = fw === 'top' || fw === 'bottom' ? Math.max(hallRoom.x, foyerRoom.x) : Math.max(hallRoom.y, foyerRoom.y);
      const hi = fw === 'top' || fw === 'bottom' ? Math.min(hallRoom.x + hallRoom.width, foyerRoom.x + foyerRoom.width) : Math.min(hallRoom.y + hallRoom.depth, foyerRoom.y + foyerRoom.depth);
      const start = fw === 'top' || fw === 'bottom' ? hallRoom.x : hallRoom.y;
      if (hi - lo >= type.w + DOOR_CLEAR) doors.set(hallRoom.room_id, { room_id: hallRoom.room_id, wall: fw, type, at: (lo + hi) / 2 - type.w / 2 - start });
    }
    for (const l of rooms.filter(q => q.room_id.startsWith('corridor_floor'))) {
      const reached = publicRooms.some(q => { const d = doors.get(q.room_id); return !!d && sharedWall(q, l) === d.wall; });
      const target = reached ? undefined : publicRooms.find(q => norm(typeOf(q.room_id)) === 'foyer' && sharedWall(l, q)) ?? publicRooms.find(q => sharedWall(l, q));
      if (!target) continue;
      const wall = sharedWall(l, target)!;
      doors.set(l.room_id, { room_id: l.room_id, wall, type: DOOR_ROOM, ...doorStretch(l, wall, DOOR_ROOM, rooms, typeOf, target) });
    }
  }
  if (floor === 0 && assembly?.exits?.length) {
    const hall = rooms.find(r => roomTypeOf(layout, r.room_id) === 'auditorium' || /auditorium|sanctuary|nave/i.test(String((program?.rooms ?? []).find((q: any) => (q.room_id ?? q.id) === r.room_id)?.name ?? '')));
    for (const e of assembly.exits) {
      const type = exitType(e.width);
      if (e.main) { if (entrance) mainEntrance = { ...entrance, type, x: entrance.x }; continue; }
      if (!hall) continue;
      const start = e.wall === 'top' || e.wall === 'bottom' ? hall.x : hall.y;
      yards.push({ room_id: hall.room_id, wall: e.wall, type, at: Math.max(0, e.at - start) });
    }
    // no window where an exit stands
    for (let i = kept.length - 1; i >= 0; i--) {
      const w = kept[i];
      if (yards.some(y => y.room_id === w.room_id && y.wall === w.wall && w.at !== undefined && Math.abs(w.at - (y.at + y.type.w / 2)) < (w.type.w + y.type.w) / 2)) kept.splice(i, 1);
    }
  }
  return { doors, windows: kept, entrance: mainEntrance, yard, yards, vehicles };
}

export interface ScheduleRow { tag: string; type: OpeningType; count: number }

/** The plan's opening types, tagged as on the template: doors D1… by role —
 * the front door D1, then room doors, bath/wardrobe doors, and vehicle doors
 * last (the templates' schedules, TEMPLATE-FINDINGS.md §3.6; a garage door
 * was D1 when doors went widest first) — windows W1… largest first, over
 * every floor and outbuilding, so a tag means the same in every view. */
export function openingSchedule(layout: SolvedLayout): { tagOf: (t: OpeningType) => string; rows: ScheduleRow[] } {
  const floors = [...new Set(layout.placed_rooms.map(r => r.floor))];
  const used = new Map<OpeningType, number>();
  const add = (t: OpeningType) => used.set(t, (used.get(t) ?? 0) + 1);
  for (const f of floors) {
    const o = planOpenings(layout, f);
    o.doors.forEach(d => add(d.type));
    o.windows.forEach(w => add(w.type));
  }
  (layout.outbuildings ?? []).forEach(() => add(DOOR_ROOM));
  const ground = planOpenings(layout, 0);
  if (ground.entrance) add(ground.entrance.type);
  ground.yards.forEach(y => add(y.type));
  ground.vehicles.filter(v => !v.open).forEach(v => add(v.type)); // an open car side isn't a door
  const role = (t: OpeningType) => t === DOOR_ENTRANCE || t === ground.entrance?.type ? 0 : t === DOOR_ROOM ? 1 : t === DOOR_SERVICE ? 2 : 3;
  const kind = (k: 'D' | 'W') => [...used.keys()].filter(t => t.kind === k)
    .sort((a, b) => (k === 'D' ? role(a) - role(b) : 0) || b.w * b.h - a.w * a.h || b.w - a.w);
  const rows: ScheduleRow[] = [];
  for (const k of ['D', 'W'] as const)
    kind(k).forEach((type, i) => rows.push({ tag: `${k}${i + 1}`, type, count: used.get(type)! }));
  return { tagOf: t => rows.find(r => r.type === t)?.tag ?? '', rows };
}
