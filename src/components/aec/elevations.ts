/**
 * The four elevations of a plan (template findings #5): what each face of the
 * house shows, worked out from the placed rooms and the doors and windows of
 * openings.ts, so an elevation never disagrees with the plan or the schedule.
 *
 * Heights follow the templates' level marks (T6/T7: ±0.00, +3.20, +6.40): a
 * 3.2 m storey, window heads at 2.1 m, and a flat roof behind a 0.9 m parapet
 * (most templates: T1, T3–T5, T8–T10). A terrace or balcony has a 1.0 m rail.
 *
 * Plan coordinates: x to the right, y down the page, the street at y = D
 * (the plan's bottom edge). Each face is drawn as seen standing outside it:
 * `a` runs left to right along the face, `depth` is the distance back from
 * the face's outermost plane (nearer things are drawn over farther ones).
 */
import type { SolvedLayout, PlacedRoom } from 'supabase/functions/ai-studio/schema';
import type { WallSide } from '@/lib/aec/solver/engine_v2/doors';
import { planOpenings, roomTypeOf, openingSchedule, type OpeningType } from './openings';

export const STOREY_H = 3.2;
export const PARAPET_H = 0.9;
export const RAIL_H = 1.0;
export const GROUND_DROP = 0.15; // natural ground below the ground floor's finished level
const HEAD_H = 2.1;
const E = 1e-6;

export type Face = 'front' | 'rear' | 'left' | 'right';
export const FACES: Face[] = ['front', 'rear', 'left', 'right'];
const SIDE: Record<Face, WallSide> = { front: 'bottom', rear: 'top', left: 'left', right: 'right' };

/** A rectangle on the face: `a`–`b` along it (m), `y0`–`y1` above ±0.00. */
export interface FaceRect { a: number; b: number; y0: number; y1: number; depth: number }
export interface FaceWall extends FaceRect { floor: number }
export interface FaceOpening extends FaceRect {
  kind: 'window' | 'door' | 'vehicle' | 'open'; // `open`: a carport's open side
  tag: string; room_id: string; floor: number;
}
export interface Elevation {
  face: Face;
  length: number;                 // the face's width (m)
  walls: FaceWall[];
  openings: FaceOpening[];
  parapets: FaceRect[];           // roof edges where nothing stands above
  rails: FaceRect[];              // terrace and balcony rails
  levels: Array<{ h: number; label: string }>;
  top: number;                    // the highest point drawn (m above ±0.00)
}

const OPEN_AIR = /^(balcony|terrace|veranda|courtyard)$/;
const isOpenAir = (layout: SolvedLayout, r: PlacedRoom) => r.room_id.startsWith('terrace_f') || OPEN_AIR.test(roomTypeOf(layout, r.room_id));

/** Parts of [lo, hi] not covered by any of `cover`. */
function minus(lo: number, hi: number, cover: Array<[number, number]>): Array<[number, number]> {
  let out: Array<[number, number]> = [[lo, hi]];
  for (const [c0, c1] of cover) out = out.flatMap(([s, t]) => c1 <= s + E || c0 >= t - E ? [[s, t] as [number, number]]
    : [...(c0 > s + E ? [[s, c0] as [number, number]] : []), ...(c1 < t - E ? [[c1, t] as [number, number]] : [])]);
  return out.filter(([s, t]) => t - s > 0.05);
}

/** The stretches of a room's wall on `side` with no room of `others` beyond it (plan coordinates along the wall). */
function exposed(r: PlacedRoom, side: WallSide, others: PlacedRoom[]): Array<[number, number]> {
  const horiz = side === 'top' || side === 'bottom';
  const lo = horiz ? r.x : r.y, hi = horiz ? r.x + r.width : r.y + r.depth;
  const line = side === 'top' ? r.y : side === 'bottom' ? r.y + r.depth : side === 'left' ? r.x : r.x + r.width;
  const cover = others.filter(q => q !== r && (
    side === 'top' ? Math.abs(q.y + q.depth - line) < E : side === 'bottom' ? Math.abs(q.y - line) < E
    : side === 'left' ? Math.abs(q.x + q.width - line) < E : Math.abs(q.x - line) < E))
    .map(q => (horiz ? [q.x, q.x + q.width] : [q.y, q.y + q.depth]) as [number, number]);
  return minus(lo, hi, cover);
}

/** The elevations of the house (outbuildings are separate buildings, drawn on the site plan). */
export function elevations(layout: SolvedLayout): Elevation[] {
  const rooms = layout.placed_rooms.filter(r => r.width > 0 && r.depth > 0 && !isNaN(r.x) && !isNaN(r.y));
  if (!rooms.length) return [];
  const W = Math.max(...rooms.map(r => r.x + r.width)), D = Math.max(...rooms.map(r => r.y + r.depth));
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  const top = floors[floors.length - 1] + 1;
  const { tagOf } = openingSchedule(layout);

  // along the face, as seen from outside it, for a stretch [s, t] of a wall (plan coordinates)
  const along = (face: Face, s: number, t: number): [number, number] =>
    face === 'front' || face === 'left' ? [s, t] : face === 'rear' ? [W - t, W - s] : [D - t, D - s];
  const depthOf = (face: Face, r: PlacedRoom) =>
    face === 'front' ? D - r.y - r.depth : face === 'rear' ? r.y : face === 'left' ? r.x : W - r.x - r.width;
  const span = (face: Face, r: PlacedRoom) => along(face, ...((face === 'front' || face === 'rear') ? [r.x, r.x + r.width] : [r.y, r.y + r.depth]) as [number, number]);
  const wallStart = (r: PlacedRoom, side: WallSide) => side === 'top' || side === 'bottom' ? r.x : r.y;

  const opening = floors.map(f => ({ f, o: planOpenings(layout, f) }));

  return FACES.map(face => {
    const side = SIDE[face], length = face === 'front' || face === 'rear' ? W : D;
    const walls: FaceWall[] = [], openings: FaceOpening[] = [], parapets: FaceRect[] = [], rails: FaceRect[] = [];
    for (const f of floors) {
      const here = rooms.filter(r => r.floor === f);
      // an open-to-below void is inside the house: its outside walls stand like any room's
      const enclosed = here.filter(r => !isOpenAir(layout, r));
      const base = f * STOREY_H;
      // walls: every stretch of an enclosed room's wall with no enclosed room beyond it
      for (const r of enclosed) for (const [s, t] of exposed(r, side, enclosed)) {
        const [a, b] = along(face, s, t);
        walls.push({ a, b, y0: base, y1: base + STOREY_H, depth: depthOf(face, r), floor: f });
      }
      // rails: a terrace or balcony above the ground, on its outward edge
      if (f > 0) for (const r of here.filter(q => isOpenAir(layout, q))) for (const [s, t] of exposed(r, side, here)) {
        const [a, b] = along(face, s, t);
        rails.push({ a, b, y0: base, y1: base + RAIL_H, depth: depthOf(face, r) });
      }
      // the roof edge: over the enclosed rooms of this floor where no room of the floor above stands
      const above = rooms.filter(r => r.floor === f + 1).map(r => span(face, r));
      for (const r of enclosed) for (const [a, b] of minus(...span(face, r), above))
        parapets.push({ a, b, y0: base + STOREY_H, y1: base + STOREY_H + PARAPET_H, depth: depthOf(face, r) });
    }
    // openings on this face: windows, the front door, the yard door, vehicle doors
    const isOut = (r: PlacedRoom, wall: WallSide, s: number, t: number) => {
      const encl = rooms.filter(q => q.floor === r.floor && !isOpenAir(layout, q));
      return exposed(r, wall, encl).some(([u, v]) => s >= u - 0.05 && t <= v + 0.05);
    };
    const put = (r: PlacedRoom, kind: FaceOpening['kind'], type: OpeningType, s: number, sill: number) => {
      if (!isOut(r, side, s, s + type.w)) return;
      const [a, b] = along(face, s, s + type.w), base = r.floor * STOREY_H;
      openings.push({ a, b, y0: base + sill, y1: base + sill + type.h, depth: depthOf(face, r), kind, tag: kind === 'open' ? '' : tagOf(type), room_id: r.room_id, floor: r.floor });
    };
    for (const { f, o } of opening) {
      const byId = (id: string) => rooms.find(r => r.room_id === id && r.floor === f);
      for (const w of o.windows) {
        const r = byId(w.room_id); if (!r || w.wall !== side) continue;
        const len = side === 'top' || side === 'bottom' ? r.width : r.depth;
        put(r, 'window', w.type, wallStart(r, side) + (w.at ?? len / 2) - w.type.w / 2, HEAD_H - w.type.h);
      }
      if (o.entrance && side === 'bottom') { const r = byId(o.entrance.room_id); if (r) put(r, 'door', o.entrance.type, o.entrance.x - o.entrance.type.w / 2, 0); }
      for (const y of o.yards) if (y.wall === side) { const r = byId(y.room_id); if (r) put(r, 'door', y.type, wallStart(r, side) + y.at, 0); }
      for (const v of o.vehicles) if (v.wall === side) { const r = byId(v.room_id); if (r) put(r, v.open ? 'open' : 'vehicle', v.type, wallStart(r, side) + v.at, 0); }
    }
    const levels = [{ h: 0, label: '±0.00 GROUND FLOOR' },
      ...floors.slice(1).map(f => ({ h: f * STOREY_H, label: `+${(f * STOREY_H).toFixed(2)} ${f === 1 ? 'FIRST' : f === 2 ? 'SECOND' : f === 3 ? 'THIRD' : `FLOOR ${f}`} FLOOR` })),
      { h: top * STOREY_H, label: `+${(top * STOREY_H).toFixed(2)} ROOF` },
      { h: top * STOREY_H + PARAPET_H, label: `+${(top * STOREY_H + PARAPET_H).toFixed(2)} PARAPET` }];
    return { face, length, walls, openings, parapets, rails, levels, top: top * STOREY_H + PARAPET_H };
  });
}
