/**
 * The stair in its stairwell (owner 2026-10-21: a dog-leg stair). Two flights
 * side by side with a half landing at the far end, the most common stair in
 * the templates: the 2.5 × 4.0 m stairwell the planner reserves takes 18
 * risers of about 178 mm (3.2 m storey) at a 300 mm going. The first flight
 * starts at the end that opens onto the hall; the second arrives back at that
 * end. A stairwell too narrow for two flights gets one straight flight,
 * flagged when it comes out steeper than a house stair should be.
 *
 * Everything in plan coordinates (m): x right, y down.
 */
import type { SolvedLayout, PlacedRoom } from 'supabase/functions/ai-studio/schema';
import { roomTypeOf } from './openings';

export const STAIR_STOREY_H = 3.2;
/** Riser limit for a house stair (common practice; the NBC figure is still to be confirmed with the owner). */
export const MAX_RISE = 0.19;
const MAX_GOING = 0.3, MIN_GOING = 0.25, WELL = 0.2, MIN_FLIGHT_W = 0.9;

export interface Rect { x: number; y: number; w: number; h: number }
export interface Flight {
  rect: Rect;
  /** Unit direction of travel up the flight. */
  dx: number; dy: number;
  risers: number;
  /** Plan coordinate (along the run) where the flight starts and ends. */
  from: number; to: number;
}
export interface StairPlan {
  kind: 'dogleg' | 'straight';
  alongX: boolean;          // the run is along x
  risers: number; rise: number; going: number;
  flights: Flight[];
  landing: Rect | null;     // the half landing (dog-leg)
  landingH: number;         // its height above the floor
  steep: boolean;           // riser over MAX_RISE
}

const isOpen = (t: string) => /^(circulation|hall|landing|void|stairwell)$/.test(t);

/** True when the flight starts at the stairwell's low end (x or y smallest): the end that opens onto the hall. */
export function startsAtMin(layout: SolvedLayout, st: PlacedRoom): boolean {
  const alongX = st.width > st.depth;
  const others = layout.placed_rooms.filter(r => r.floor === st.floor && r !== st && (r.room_id.startsWith('corridor_floor') || isOpen(roomTypeOf(layout, r.room_id))));
  const openAt = (atMin: boolean) => others.reduce((sum, r) => {
    const touches = alongX ? Math.abs((atMin ? st.x : st.x + st.width) - (atMin ? r.x + r.width : r.x)) < 0.01
      : Math.abs((atMin ? st.y : st.y + st.depth) - (atMin ? r.y + r.depth : r.y)) < 0.01;
    const overlap = alongX ? Math.min(st.y + st.depth, r.y + r.depth) - Math.max(st.y, r.y) : Math.min(st.x + st.width, r.x + r.width) - Math.max(st.x, r.x);
    return touches && overlap > 0 ? sum + overlap : sum;
  }, 0);
  const atMin = openAt(true), atMax = openAt(false);
  // no hall at either end: start at the front (bottom / right), where the entrance is drawn
  return atMin !== atMax ? atMin > atMax : false;
}

/** The stair in a stairwell (the ground floor's `stairwell`; the void above shows the same stair). */
export function stairPlan(layout: SolvedLayout, st: PlacedRoom, storeyH = STAIR_STOREY_H): StairPlan {
  const alongX = st.width > st.depth;
  const L = alongX ? st.width : st.depth, Wd = alongX ? st.depth : st.width;
  const lo = alongX ? st.x : st.y, across0 = alongX ? st.y : st.x;
  const atMin = startsAtMin(layout, st);
  const s = atMin ? 1 : -1, start = atMin ? lo : lo + L; // travel direction along the run, from the start end
  const rect = (a: number, b: number, c0: number, c1: number): Rect => {
    const [p, q] = [Math.min(a, b), Math.max(a, b)];
    return alongX ? { x: p, y: c0, w: q - p, h: c1 - c0 } : { x: c0, y: p, w: c1 - c0, h: q - p };
  };
  const dir = (k: number) => alongX ? { dx: k, dy: 0 } : { dx: 0, dy: k };
  const risers = Math.ceil(storeyH / 0.18 - 1e-9), rise = storeyH / risers;
  const fw = (Wd - WELL) / 2;
  const half = Math.ceil(risers / 2), treads = half - 1; // each flight's last riser lands on the landing / the floor
  const going = Math.min(MAX_GOING, (L - fw) / treads);
  if (fw >= MIN_FLIGHT_W && going >= MIN_GOING) {
    const run = treads * going, end = start + s * run;
    const f1: Flight = { rect: rect(start, end, across0, across0 + fw), ...dir(s), risers: half, from: start, to: end };
    const f2: Flight = { rect: rect(end, start, across0 + fw + WELL, across0 + Wd), ...dir(-s), risers: risers - half, from: end, to: start };
    return { kind: 'dogleg', alongX, risers, rise, going, flights: [f1, f2], landing: rect(end, start + s * L, across0, across0 + Wd), landingH: half * rise, steep: rise > MAX_RISE + 1e-9 };
  }
  // one straight flight along the whole run
  const n = Math.max(2, Math.round(L / 0.28));
  const r = storeyH / n;
  return { kind: 'straight', alongX, risers: n, rise: r, going: L / n, flights: [{ rect: rect(start, start + s * L, across0, across0 + Wd), ...dir(s), risers: n, from: start, to: start + s * L }], landing: null, landingH: 0, steep: r > MAX_RISE + 1e-9 };
}
