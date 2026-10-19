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
import { buildGraph, deriveSuites, unitEntrances } from '@/lib/aec/solver/engine_v2/graph';
import { hiveRooms } from '@/lib/aec/solver/engine_v2/gapfree/need';

export interface OpeningType { kind: 'D' | 'W'; w: number; h: number }

/** Room door; bath, WC and wardrobe door (opens inside the suite). */
export const DOOR_ROOM: OpeningType = { kind: 'D', w: 0.9, h: 2.1 };
export const DOOR_SERVICE: OpeningType = { kind: 'D', w: 0.8, h: 2.1 };
/** The front door, the template's own D1. */
export const DOOR_ENTRANCE: OpeningType = { kind: 'D', w: 0.9, h: 2.5 };
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
  if (room_id === 'stairwell' || room_id === 'stairwell_void') return 'stairwell';
  if (room_id.startsWith('corridor_floor')) return 'circulation';
  if (room_id.startsWith('terrace_f')) return 'balcony';
  const rooms: any[] = layout.program_reference?.rooms ?? [];
  return rooms.find(r => r.room_id === room_id || r.id === room_id)?.type ?? 'unknown';
}

const isOpen = (t: string) => t === 'circulation' || t === 'hall' || t === 'landing' || t === 'void';
const isOutside = (t: string) => t === 'balcony' || t === 'terrace';

/** Which of the room's walls are on the building's outline. */
export const externalEdges = (r: PlacedRoom, W: number, D: number): Record<WallSide, boolean> => ({
  left:   r.x <= EDGE_TOLERANCE,
  top:    r.y <= EDGE_TOLERANCE,
  right:  r.x + r.width >= W - EDGE_TOLERANCE,
  bottom: r.y + r.depth >= D - EDGE_TOLERANCE,
});

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
    const score = ['circulation', 'hall', 'landing', 'stairwell'].includes(nType) ? 10
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

export interface PlannedDoor { room_id: string; wall: WallSide; type: OpeningType }
/** `at`: the window's centre along its wall (m from the wall's start, x for
 * top/bottom, y for left/right); centred when absent. */
export interface PlannedWindow { room_id: string; wall: WallSide; type: OpeningType; at?: number }
/** The front door: on the street wall (the floor's bottom edge, y = D) of
 * the room it opens into, centred on that room's street frontage. */
export interface PlannedEntrance { room_id: string; type: OpeningType; x: number; y: number }
/** The kitchen's door to the yard: on an outside wall, never the street's;
 * `at` is where its leaf starts along the wall (m from the wall's start). */
export interface PlannedYardDoor { room_id: string; wall: WallSide; type: OpeningType; at: number }
export interface FloorOpenings { doors: Map<string, PlannedDoor>; windows: PlannedWindow[]; entrance: PlannedEntrance | null; yard: PlannedYardDoor | null }

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
  // the wall's window into the rest of the wall
  const i = windows.findIndex(w => w.room_id === r.room_id && w.wall === wall);
  if (i >= 0) {
    const [lo, hi] = at === YARD_END ? [at + DOOR_ROOM.w + YARD_END, L - YARD_END] : [YARD_END, at - YARD_END];
    const type = [windows[i].type, WIN_ROOM, WIN_SMALL].filter(s => s.w <= windows[i].type.w).find(s => hi - lo >= s.w);
    if (type) windows[i] = { ...windows[i], type, at: (lo + hi) / 2 };
    else windows.splice(i, 1);
  }
  return { room_id: r.room_id, wall, type: DOOR_ROOM, at };
}

const ENTRY_NAME = /foyer|entrance|entry|lobby|porch/i;

/** The ground floor's front door: into the foyer (or entrance, lobby,
 * porch) where one touches the street, else the hall, else the living
 * room, else another day room; the widest frontage of the first kind
 * found. None when only bedrooms, baths, stores or the garage face it. */
function frontEntrance(layout: SolvedLayout, rooms: PlacedRoom[], D: number, typeOf: (id: string) => string): PlannedEntrance | null {
  const onStreet = rooms.filter(r => Math.abs(r.y + r.depth - D) < EDGE_TOLERANCE && r.width >= DOOR_ENTRANCE.w + DOOR_CLEAR);
  const brief: Array<{ room_id?: string; id?: string; name?: string }> = layout.program_reference?.rooms ?? [];
  const named = (id: string) => brief.find(r => r.room_id === id || r.id === id)?.name ?? '';
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
  const graph = program?.rooms?.some((q: any) => q.unit) ? buildGraph(hiveRooms(program)) : null;
  const intoUnit = graph ? unitEntrances(graph, floor) : new Map<string, string>();
  const suiteSubs = graph ? new Set(deriveSuites(graph, floor).flatMap(x => x.subIds)) : new Set<string>();
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
    const ext = externalEdges(r, W, D);
    if (t !== 'stairwell') {
      const spec = placement?.doors.find(d => d.room_id === r.room_id);
      const entry = !suiteSubs.has(r.room_id) ? intoUnit.get(r.room_id) : undefined;
      const entryRoom = entry ? rooms.find(q => q.room_id === entry) : undefined;
      const wall = (entryRoom && sharedWall(r, entryRoom)) || spec?.wall || heuristicDoorWall(r, rooms, typeOf, ext);
      const type = spec?.interior || SERVICE_ROOMS.test(t) ? DOOR_SERVICE : DOOR_ROOM;
      if (wallLength(r, wall) >= type.w + DOOR_CLEAR) doors.set(r.room_id, { room_id: r.room_id, wall, type });
    }
    if (t === 'stairwell' || isOutside(t)) continue;
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
  const kept = entrance ? windows.filter(w => !(w.room_id === entrance.room_id && w.wall === 'bottom')) : windows;
  const yard = floor === 0 ? yardDoor(layout, rooms, W, D, typeOf, kept) : null;
  return { doors, windows: kept, entrance, yard };
}

export interface ScheduleRow { tag: string; type: OpeningType; count: number }

/** The plan's opening types, tagged as on the template: doors D1… widest
 * first, windows W1… largest first, over every floor and outbuilding, so a
 * tag means the same in every view. */
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
  if (ground.yard) add(ground.yard.type);
  const kind = (k: 'D' | 'W') => [...used.keys()].filter(t => t.kind === k)
    .sort((a, b) => b.w * b.h - a.w * a.h || b.w - a.w);
  const rows: ScheduleRow[] = [];
  for (const k of ['D', 'W'] as const)
    kind(k).forEach((type, i) => rows.push({ tag: `${k}${i + 1}`, type, count: used.get(type)! }));
  return { tagOf: t => rows.find(r => r.type === t)?.tag ?? '', rows };
}
