/**
 * Section A–A (template findings #5): a vertical cut through the house, as
 * the templates draw it, through the stair (T1, T6, T7, T8, T14–T16 mark the
 * cut on the plan). Worked out from the placed rooms, the plan's own walls
 * (walls.ts) and doors and windows (openings.ts), and the same 3.2 m storey,
 * parapet and window heads as the elevations.
 *
 * The cut runs along the stair's flight. Plan coordinates: x right, y down,
 * the street at y = D. A cut along y is drawn with the street on the left
 * (looking towards the plan's left side); a cut along x with the plan's
 * left on the left (looking towards the rear).
 */
import type { SolvedLayout, PlacedRoom } from 'supabase/functions/ai-studio/schema';
import type { WallSide } from '@/lib/aec/solver/engine_v2/doors';
import { computeWalls, WALL_THICKNESS, type WallRoomKind, type WallKind } from './walls';
import { planOpenings, roomTypeOf, openingSchedule } from './openings';
import { STOREY_H, PARAPET_H } from './elevations';

export const SLAB_T = 0.15;
const HEAD_H = 2.1, TREAD = 0.28, E = 1e-6;

/** The cut on the plan: the line x = at (`axis` 'x', running front to back) or y = at. */
export interface SectionCut { axis: 'x' | 'y'; at: number; length: number }
export interface CutRoom { a: number; b: number; floor: number; name: string; kind: WallRoomKind }
export interface CutWall { at: number; t: number; floor: number; kind: WallKind; gaps: Array<{ y0: number; y1: number; glass: boolean; tag: string }> }
export interface Slab { a: number; b: number; top: number; t: number; roof?: boolean }
export interface Section {
  cut: SectionCut;
  rooms: CutRoom[];
  walls: CutWall[];
  slabs: Slab[];
  parapets: Array<{ at: number; base: number; h: number; t: number }>;
  stair: { a: number; b: number; up: 1 | -1; risers: number; rise: number; going: number } | null;
  levels: Array<{ h: number; label: string }>;
  top: number;
}

const wallKind = (layout: SolvedLayout, r: PlacedRoom): WallRoomKind => {
  const t = roomTypeOf(layout, r.room_id);
  if (r.room_id.startsWith('terrace_f') || t === 'balcony' || t === 'terrace') return 'outside';
  if (/^(circulation|hall|landing|void|stairwell)$/.test(t)) return 'open';
  return 'room';
};

const nameOf = (layout: SolvedLayout, r: PlacedRoom): string => {
  if (r.room_id === 'stairwell') return 'Stair';
  if (r.room_id === 'stairwell_void') return 'Stair void';
  if (r.room_id.startsWith('corridor_floor')) return r.floor === 0 ? 'Hall' : 'Landing';
  if (r.room_id.startsWith('terrace_f')) return 'Terrace';
  if (r.room_id.startsWith('atrium_')) return 'Open to below';
  if (r.room_id.startsWith('passage_')) return 'Passage';
  const src: any = (layout.program_reference?.rooms ?? []).find((q: any) => q.room_id === r.room_id || q.id === r.room_id);
  return src?.name ?? r.room_id;
};

/** Where the section cuts: along the ground-floor stair's flight, through its middle;
 * with no stair, front to back through the middle of the house. */
export function sectionCut(layout: SolvedLayout): SectionCut | null {
  const rooms = layout.placed_rooms.filter(r => r.width > 0 && r.depth > 0);
  if (!rooms.length) return null;
  const W = Math.max(...rooms.map(r => r.x + r.width)), D = Math.max(...rooms.map(r => r.y + r.depth));
  const st = rooms.find(r => r.floor === 0 && r.room_id === 'stairwell');
  if (st) return st.depth >= st.width ? { axis: 'x', at: st.x + st.width / 2, length: D } : { axis: 'y', at: st.y + st.depth / 2, length: W };
  // off any wall line: the middle of the ground room at the house's centre
  const mid = rooms.find(r => r.floor === 0 && r.x < W / 2 && r.x + r.width > W / 2 && r.y < D / 2 && r.y + r.depth > D / 2);
  return { axis: 'x', at: mid ? mid.x + mid.width / 2 : W / 2, length: D };
}

/** The stair's flight starts at the end that opens onto the hall (as the floor plan draws it). */
function flightStartsAtMin(layout: SolvedLayout, st: PlacedRoom): boolean {
  const alongX = st.width > st.depth;
  const others = layout.placed_rooms.filter(r => r.floor === st.floor && r !== st && wallKind(layout, r) === 'open');
  const openAt = (atMin: boolean) => others.reduce((sum, r) => {
    const touches = alongX ? Math.abs((atMin ? st.x : st.x + st.width) - (atMin ? r.x + r.width : r.x)) < 0.01
      : Math.abs((atMin ? st.y : st.y + st.depth) - (atMin ? r.y + r.depth : r.y)) < 0.01;
    const overlap = alongX ? Math.min(st.y + st.depth, r.y + r.depth) - Math.max(st.y, r.y) : Math.min(st.x + st.width, r.x + r.width) - Math.max(st.x, r.x);
    return touches && overlap > 0 ? sum + overlap : sum;
  }, 0);
  const atMin = openAt(true), atMax = openAt(false);
  return atMin !== atMax ? atMin > atMax : false;
}

export function section(layout: SolvedLayout): Section | null {
  const cut = sectionCut(layout);
  if (!cut) return null;
  const rooms = layout.placed_rooms.filter(r => r.width > 0 && r.depth > 0 && !isNaN(r.x) && !isNaN(r.y));
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  const topFloor = floors[floors.length - 1];
  const { tagOf } = openingSchedule(layout);
  const L = cut.length;
  // along the section, left to right
  const along = (v: number) => cut.axis === 'x' ? L - v : v;
  const crosses = (r: PlacedRoom) => cut.axis === 'x' ? r.x < cut.at - E && r.x + r.width > cut.at + E : r.y < cut.at - E && r.y + r.depth > cut.at + E;
  const spanOf = (r: PlacedRoom): [number, number] => {
    const [s, t] = cut.axis === 'x' ? [r.y, r.y + r.depth] : [r.x, r.x + r.width];
    const [p, q] = [along(s), along(t)];
    return [Math.min(p, q), Math.max(p, q)];
  };

  const out: Section = { cut, rooms: [], walls: [], slabs: [], parapets: [], stair: null, levels: [], top: (topFloor + 1) * STOREY_H + PARAPET_H };
  const byFloor = new Map(floors.map(f => [f, rooms.filter(r => r.floor === f && crosses(r))]));

  for (const f of floors) {
    const here = byFloor.get(f)!, base = f * STOREY_H;
    for (const r of here) { const [a, b] = spanOf(r); out.rooms.push({ a, b, floor: f, name: nameOf(layout, r), kind: wallKind(layout, r) }); }
    // the plan's walls that the cut crosses, with the doors and windows in them
    const all = rooms.filter(r => r.floor === f);
    const segs = computeWalls(all.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: wallKind(layout, r) })));
    const o = planOpenings(layout, f);
    for (const w of segs) {
      const across = cut.axis === 'x' ? w.y0 === w.y1 && w.x0 < cut.at - E && w.x1 > cut.at + E : w.x0 === w.x1 && w.y0 < cut.at - E && w.y1 > cut.at + E;
      if (!across) continue;
      const line = cut.axis === 'x' ? w.y0 : w.x0;
      const gaps: CutWall['gaps'] = [];
      // a room's wall on this line, and where along it the cut falls
      for (const r of all) {
        const side: WallSide | null = cut.axis === 'x'
          ? (Math.abs(r.y - line) < E ? 'top' : Math.abs(r.y + r.depth - line) < E ? 'bottom' : null)
          : (Math.abs(r.x - line) < E ? 'left' : Math.abs(r.x + r.width - line) < E ? 'right' : null);
        if (!side || !crosses(r)) continue;
        const start = cut.axis === 'x' ? r.x : r.y, len = cut.axis === 'x' ? r.width : r.depth, at = cut.at - start;
        const hit = (s: number, w: number) => at > s + E && at < s + w - E;
        for (const win of o.windows) if (win.room_id === r.room_id && win.wall === side) {
          const c = win.at ?? len / 2;
          if (hit(c - win.type.w / 2, win.type.w)) gaps.push({ y0: base + HEAD_H - win.type.h, y1: base + HEAD_H, glass: true, tag: tagOf(win.type) });
        }
        const d = o.doors.get(r.room_id);
        if (d && d.wall === side && hit(d.at ?? Math.max(0, Math.min(len * 0.25, len - d.type.w)), d.type.w)) gaps.push({ y0: base, y1: base + d.type.h, glass: false, tag: tagOf(d.type) });
        if (o.yard && o.yard.room_id === r.room_id && o.yard.wall === side && hit(o.yard.at, o.yard.type.w)) gaps.push({ y0: base, y1: base + o.yard.type.h, glass: false, tag: tagOf(o.yard.type) });
        for (const v of o.vehicles) if (v.room_id === r.room_id && v.wall === side && hit(v.at, v.type.w)) gaps.push({ y0: base, y1: base + v.type.h, glass: false, tag: v.open ? '' : tagOf(v.type) });
        if (o.entrance && o.entrance.room_id === r.room_id && side === 'bottom' && cut.axis === 'x' && Math.abs(cut.at - o.entrance.x) < o.entrance.type.w / 2)
          gaps.push({ y0: base, y1: base + o.entrance.type.h, glass: false, tag: tagOf(o.entrance.type) });
      }
      // one opening per wall: the doors and windows of the rooms either side are the same opening
      const uniq = gaps.filter((g, i) => gaps.findIndex(h => h.y0 === g.y0 && h.y1 === g.y1) === i);
      out.walls.push({ at: along(line), t: WALL_THICKNESS[w.kind], floor: f, kind: w.kind, gaps: uniq });
    }
    // the floor slab (on the ground, a slab on grade); none in an open-to-below void or over the stair
    for (const r of here) {
      if (f > 0 && (r.room_id === 'stairwell_void' || r.room_id.startsWith('atrium_'))) continue;
      const [a, b] = spanOf(r);
      out.slabs.push({ a, b, top: base, t: SLAB_T });
    }
    // the roof slab: over this floor's covered rooms where the floor above has no room
    const above = (byFloor.get(f + 1) ?? []).map(spanOf);
    for (const r of here) {
      if (wallKind(layout, r) === 'outside') continue;
      let parts: Array<[number, number]> = [spanOf(r)];
      for (const [c0, c1] of above) parts = parts.flatMap(([s, t]) => c1 <= s + E || c0 >= t - E ? [[s, t] as [number, number]]
        : [...(c0 > s + E ? [[s, c0] as [number, number]] : []), ...(c1 < t - E ? [[c1, t] as [number, number]] : [])]);
      for (const [a, b] of parts) out.slabs.push({ a, b, top: base + STOREY_H, t: SLAB_T, roof: true });
    }
  }
  // parapets at the ends of each roof, where it meets the open air
  const roofs = out.slabs.filter(s => s.roof);
  const ends = new Map<string, { at: number; base: number }>();
  for (const s of roofs) {
    const f = Math.round(s.top / STOREY_H) - 1;
    const upper = (byFloor.get(f + 1) ?? []).map(spanOf);
    for (const at of [s.a, s.b]) {
      const joined = roofs.some(o => o !== s && Math.abs(o.top - s.top) < E && (Math.abs(o.a - at) < E || Math.abs(o.b - at) < E));
      const againstUpper = upper.some(([u0, u1]) => Math.abs(u0 - at) < E || Math.abs(u1 - at) < E);
      if (!joined && !againstUpper) ends.set(`${at.toFixed(3)}|${s.top}`, { at, base: s.top });
    }
  }
  out.parapets = [...ends.values()].map(e => ({ ...e, h: PARAPET_H, t: WALL_THICKNESS.ext }));
  // the stair: one straight flight along the stairwell, as the plan draws it
  const st = rooms.find(r => r.floor === 0 && r.room_id === 'stairwell');
  if (st && crosses(st) && floors.length > 1) {
    const [a, b] = spanOf(st), run = b - a;
    const n = Math.max(2, Math.round(run / TREAD));
    const startMin = flightStartsAtMin(layout, st);
    // plan-min end, on the section, is at the left when the section runs with the plan, else at the right
    const startLeft = cut.axis === 'x' ? !startMin : startMin;
    out.stair = { a, b, up: startLeft ? 1 : -1, risers: n, rise: STOREY_H / n, going: run / n };
  }
  out.levels = [{ h: 0, label: '±0.00 GROUND FLOOR' },
    ...floors.slice(1).map(f => ({ h: f * STOREY_H, label: `+${(f * STOREY_H).toFixed(2)} ${['', 'FIRST', 'SECOND', 'THIRD'][f] ?? `FLOOR ${f}`} FLOOR` })),
    { h: (topFloor + 1) * STOREY_H, label: `+${((topFloor + 1) * STOREY_H).toFixed(2)} ROOF` }];
  return out;
}
