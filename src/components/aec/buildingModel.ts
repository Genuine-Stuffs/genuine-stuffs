// The building as a 3D model, read from the plan itself (owner 2026-10-28: a 3D view that is
// exactly the AI Studio plan; ledger §6 item 12, step 1). Every wall of every floor from the
// plan's wall lines (walls.ts) at its own thickness, with the plan's doors and windows cut
// through it where the door/window schedule puts them (openings.ts, placed as the elevations
// and the section place them), and a floor slab under every room. Pure geometry: the 3D viewer
// draws it, and the IFC export (next) writes it.

import type { SolvedLayout, PlacedRoom } from 'supabase/functions/ai-studio/schema';
import type { WallSide } from '@/lib/aec/solver/engine_v2/doors';
import { computeWalls, WALL_THICKNESS, type WallKind } from './walls';
import { planOpenings, type OpeningType } from './openings';
import { wallKind, SLAB_T } from './section';
import { STOREY_H, PARAPET_H } from './elevations';
import { roomTypeOf } from './openings';

/** Window heads at 2.1 m, as on the elevations and the section. */
const HEAD_H = 2.1;
/** A balcony or terrace edge: a rail this high. */
const RAIL_H = 1.0;
const E = 1e-3;

export type OpeningKind = 'door' | 'window' | 'vehicle' | 'open';

/** An opening in a wall: `at` metres along the wall from its start (x0, y0), `width` wide, from `z0` to `z1` above the ground. */
export interface ModelOpening { kind: OpeningKind; at: number; width: number; z0: number; z1: number; room_id: string; type: OpeningType }

/** A wall from (x0, y0) to (x1, y1) on the plan (metres, y down the sheet), centred on that line, `thickness` thick, from `z0` to `z1`. `parapet`: the low wall round a roof's edge. */
export interface ModelWall { floor: number; x0: number; y0: number; x1: number; y1: number; thickness: number; kind: WallKind; z0: number; z1: number; openings: ModelOpening[]; parapet?: boolean }

/** A floor slab under a room: its top at `z`. */
export interface ModelSlab { floor: number; room_id: string; x: number; y: number; w: number; d: number; z: number; t: number }

export interface BuildingModel {
  walls: ModelWall[];
  slabs: ModelSlab[];
  /** The roof: a slab over every part of a floor's enclosed rooms with no room of the floor above on it (as the elevations draw the roof edge); its underside at `z`. */
  roofs: Array<{ floor: number; x: number; y: number; w: number; d: number; z: number; t: number }>;
  /** Openings the plan lists that no wall on their line can hold: the check that the model is the plan (expected none). */
  unplaced: Array<{ floor: number; room_id: string; kind: OpeningKind; detail: string }>;
  /** Openings on the plan and in the model, per floor, for the check. */
  counts: Array<{ floor: number; planned: number; placed: number }>;
  storeyH: number;
}

const valid = (r: PlacedRoom) => [r.x, r.y, r.width, r.depth].every(v => typeof v === 'number' && !isNaN(v)) && r.width > 0 && r.depth > 0;
const horizontalSide = (s: WallSide) => s === 'top' || s === 'bottom';
/** The plan line a room's side lies on, and where along that line the side starts. */
const sideLine = (r: PlacedRoom, s: WallSide) => ({
  horizontal: horizontalSide(s),
  line: s === 'top' ? r.y : s === 'bottom' ? r.y + r.depth : s === 'left' ? r.x : r.x + r.width,
  start: horizontalSide(s) ? r.x : r.y,
  length: horizontalSide(s) ? r.width : r.depth,
});

export function buildingModel(layout: SolvedLayout): BuildingModel {
  const rooms = layout.placed_rooms.filter(valid);
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  const walls: ModelWall[] = [], slabs: ModelSlab[] = [], unplaced: BuildingModel['unplaced'] = [], counts: BuildingModel['counts'] = [];
  const roofs: BuildingModel['roofs'] = [];

  for (const f of floors) {
    const here = rooms.filter(r => r.floor === f);
    const base = f * STOREY_H;
    const floorWalls: ModelWall[] = computeWalls(here.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: wallKind(layout, r) })))
      // a raised platform's edge is a step in the floor, not a wall
      .filter(w => w.kind !== 'edge')
      .map(w => ({ floor: f, x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1, thickness: WALL_THICKNESS[w.kind], kind: w.kind,
        z0: base, z1: base + (w.kind === 'rail' ? RAIL_H : STOREY_H), openings: [] }));

    // the floor's openings, each as a stretch of a plan line
    const o = planOpenings(layout, f);
    const byId = (id: string) => here.find(r => r.room_id === id);
    const wanted: Array<{ room_id: string; side: WallSide; start: number; type: OpeningType; kind: OpeningKind; z0: number; z1: number }> = [];
    for (const d of o.doors.values()) {
      const r = byId(d.room_id); if (!r) continue;
      const { start, length } = sideLine(r, d.wall);
      wanted.push({ room_id: r.room_id, side: d.wall, start: start + (d.at ?? Math.max(0, Math.min(length * 0.25, length - d.type.w))), type: d.type, kind: 'door', z0: base, z1: base + d.type.h });
    }
    for (const w of o.windows) {
      const r = byId(w.room_id); if (!r) continue;
      const { start, length } = sideLine(r, w.wall);
      wanted.push({ room_id: r.room_id, side: w.wall, start: start + (w.at ?? length / 2) - w.type.w / 2, type: w.type, kind: 'window', z0: base + HEAD_H - w.type.h, z1: base + HEAD_H });
    }
    if (o.entrance) {
      const r = byId(o.entrance.room_id);
      if (r) wanted.push({ room_id: r.room_id, side: 'bottom', start: o.entrance.x - o.entrance.type.w / 2, type: o.entrance.type, kind: 'door', z0: base, z1: base + o.entrance.type.h });
    }
    for (const y of [...o.yards, ...o.inner]) {
      const r = byId(y.room_id); if (!r) continue;
      wanted.push({ room_id: r.room_id, side: y.wall, start: sideLine(r, y.wall).start + y.at, type: y.type, kind: 'door', z0: base, z1: base + y.type.h });
    }
    for (const v of o.vehicles) {
      const r = byId(v.room_id); if (!r) continue;
      wanted.push({ room_id: r.room_id, side: v.wall, start: sideLine(r, v.wall).start + v.at, type: v.type, kind: v.open ? 'open' : 'vehicle', z0: base, z1: base + v.type.h });
    }

    // each opening into the wall that runs along its line and covers it
    let placed = 0;
    for (const q of wanted) {
      const r = byId(q.room_id)!;
      const { horizontal, line } = sideLine(r, q.side);
      const end = q.start + q.type.w;
      const wall = floorWalls.find(w => (horizontal ? w.y0 === w.y1 && Math.abs(w.y0 - line) < E : w.x0 === w.x1 && Math.abs(w.x0 - line) < E)
        && (horizontal ? w.x0 : w.y0) <= q.start + 0.05 && (horizontal ? w.x1 : w.y1) >= end - 0.05);
      if (!wall) {
        unplaced.push({ floor: f, room_id: q.room_id, kind: q.kind, detail: `${q.type.w} m ${q.kind} on the ${q.side} side at ${q.start.toFixed(2)}–${end.toFixed(2)} m: no wall on that line covers it` });
        continue;
      }
      const at = Math.max(0, q.start - (horizontal ? wall.x0 : wall.y0));
      wall.openings.push({ kind: q.kind, at, width: q.type.w, z0: q.z0, z1: Math.min(q.z1, wall.z1), room_id: q.room_id, type: q.type });
      placed++;
    }
    for (const w of floorWalls) w.openings.sort((p, q) => p.at - q.at);
    counts.push({ floor: f, planned: wanted.length, placed });
    walls.push(...floorWalls);

    // a slab under every room (none under an open-to-below void or over the stair)
    for (const r of here) {
      if (f > 0 && (r.room_id.startsWith('stairwell_void') || r.room_id.startsWith('atrium_'))) continue;
      slabs.push({ floor: f, room_id: r.room_id, x: r.x, y: r.y, w: r.width, d: r.depth, z: base, t: f === 0 ? 0.1 : SLAB_T });
    }
  }

  // the roof: over each floor's enclosed rooms, less what the floor above covers (balconies,
  // terraces, verandas and courtyards are open to the sky, as on the elevations); a parapet
  // round each roof's edge
  const enclosed = (r: PlacedRoom) => !r.room_id.startsWith('terrace_f') && !OPEN_AIR.test(roomTypeOf(layout, r.room_id));
  for (const f of floors) {
    const above = rooms.filter(r => r.floor === f + 1);
    const pieces = rooms.filter(r => r.floor === f && enclosed(r)).flatMap(r => minus({ x: r.x, y: r.y, w: r.width, d: r.depth }, above.map(q => ({ x: q.x, y: q.y, w: q.width, d: q.depth }))));
    const z = (f + 1) * STOREY_H;
    for (const q of pieces) roofs.push({ floor: f, ...q, z, t: SLAB_T });
    addParapets(pieces, f, z + SLAB_T, PARAPET_H, above);
  }

  // the outbuildings (boys' quarters, generator house): their walls on the ground
  for (const b of layout.outbuildings ?? []) {
    const rs = b.rooms.filter(valid);
    for (const w of computeWalls(rs.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: 'room' as const }))))
      walls.push({ floor: 0, x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1, thickness: WALL_THICKNESS[w.kind], kind: w.kind, z0: 0, z1: 3.0, openings: [] });
    for (const r of rs) slabs.push({ floor: 0, room_id: r.room_id, x: r.x, y: r.y, w: r.width, d: r.depth, z: 0, t: 0.1 });
    const rects = rs.map(r => ({ x: r.x, y: r.y, w: r.width, d: r.depth }));
    for (const q of rects) roofs.push({ floor: 0, ...q, z: 3.0, t: SLAB_T });
    addParapets(rects, 0, 3.0 + SLAB_T, 0.3);
  }

  /** The low wall round the outside edge of a roof made of `pieces`, its top `height` above `z`;
   * none where the edge runs against a room of the floor above (that room's wall stands there). */
  function addParapets(pieces: Rect[], floor: number, z: number, height = PARAPET_H, above: PlacedRoom[] = []) {
    if (!pieces.length) return;
    const inAbove = (x: number, y: number) => above.some(q => x > q.x + E && x < q.x + q.width - E && y > q.y + E && y < q.y + q.depth - E);
    for (const w of computeWalls(pieces.map(q => ({ x: q.x, y: q.y, width: q.w, depth: q.d, kind: 'room' as const }))))
      if (w.kind === 'ext' && !(() => { const mx = (w.x0 + w.x1) / 2, my = (w.y0 + w.y1) / 2, h = w.y0 === w.y1;
        return inAbove(h ? mx : mx - 0.05, h ? my - 0.05 : my) || inAbove(h ? mx : mx + 0.05, h ? my + 0.05 : my); })()) walls.push({ floor, x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1, thickness: WALL_T_EXT, kind: 'ext', z0: z, z1: z + height, openings: [], parapet: true });
  }

  return { walls, slabs, roofs, unplaced, counts, storeyH: STOREY_H };
}

const OPEN_AIR = /^(balcony|terrace|veranda|courtyard)$/;
const WALL_T_EXT = WALL_THICKNESS.ext;
type Rect = { x: number; y: number; w: number; d: number };

/** `a` less the rectangles `cut`: the parts of `a` none of them covers, as rectangles. */
export function minus(a: Rect, cut: Rect[]): Rect[] {
  let parts: Rect[] = [a];
  for (const c of cut) {
    const next: Rect[] = [];
    for (const p of parts) {
      const x0 = Math.max(p.x, c.x), x1 = Math.min(p.x + p.w, c.x + c.w), y0 = Math.max(p.y, c.y), y1 = Math.min(p.y + p.d, c.y + c.d);
      if (x1 <= x0 + E || y1 <= y0 + E) { next.push(p); continue; }
      // the strips of p above, below, left and right of the overlap
      if (y0 > p.y + E) next.push({ x: p.x, y: p.y, w: p.w, d: y0 - p.y });
      if (p.y + p.d > y1 + E) next.push({ x: p.x, y: y1, w: p.w, d: p.y + p.d - y1 });
      if (x0 > p.x + E) next.push({ x: p.x, y: y0, w: x0 - p.x, d: y1 - y0 });
      if (p.x + p.w > x1 + E) next.push({ x: x1, y: y0, w: p.x + p.w - x1, d: y1 - y0 });
    }
    parts = next;
  }
  return parts;
}

/** A wall as solid blocks around its openings: the full-height parts between openings, and the
 * parts under each window and over each opening. Each block: `a`–`b` along the wall, `z0`–`z1`. */
export function wallBlocks(w: ModelWall): Array<{ a: number; b: number; z0: number; z1: number }> {
  const L = Math.hypot(w.x1 - w.x0, w.y1 - w.y0);
  const out: Array<{ a: number; b: number; z0: number; z1: number }> = [];
  let cursor = 0;
  for (const o of w.openings) {
    const a = Math.max(cursor, o.at), b = Math.min(L, o.at + o.width);
    if (b <= a) continue;
    if (a > cursor + E) out.push({ a: cursor, b: a, z0: w.z0, z1: w.z1 });
    if (o.z0 > w.z0 + E) out.push({ a, b, z0: w.z0, z1: o.z0 });
    if (o.z1 < w.z1 - E) out.push({ a, b, z0: o.z1, z1: w.z1 });
    cursor = b;
  }
  if (L > cursor + E) out.push({ a: cursor, b: L, z0: w.z0, z1: w.z1 });
  return out;
}
