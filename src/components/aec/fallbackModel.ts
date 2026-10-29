/**
 * The building for the 3D view's drawn fallback (owner 2026-10-29: a browser without WebGL
 * should still see the building, not a stack of coloured rooms). The same model the 3D view
 * draws (buildingModel.ts): outside walls with the plan's doors and windows, glass, the floor
 * slabs, the roof and its parapets, and the street round the plot (siteContext.ts) — as boxes
 * in the building's frame (x across, y down the plan, z up), with the order to paint them.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { buildingModel, wallBlocks } from './buildingModel';
import { siteContext } from './siteContext';

export type FallbackMat = 'plaster' | 'rail' | 'glass' | 'roof' | 'coping' | 'timber' | 'metal' | 'slab'
  | 'wall' | 'gate' | 'driveway' | 'footway' | 'kerb' | 'road';
export interface FallbackBox { x0: number; y0: number; x1: number; y1: number; z0: number; z1: number; mat: FallbackMat }

/** Each material's colour, as the 3D view has it. */
export const FALLBACK_COLOURS: Record<FallbackMat, number> = {
  plaster: 0xf4efe6, rail: 0x475569, glass: 0x5d7f9c, roof: 0xb8b4ad, coping: 0xd6cfc2, timber: 0x8a5a33,
  metal: 0x6b7280, slab: 0xe8e4dc, wall: 0xf4efe6, gate: 0x2f3a46, driveway: 0xa89f92, footway: 0xbfbab0,
  kerb: 0xd9d5cc, road: 0x4a4e54,
};

/** The boxes to draw. Inside walls are left out: the roof and the slabs above hide them. */
export function fallbackBoxes(layout: SolvedLayout): FallbackBox[] {
  const m = buildingModel(layout), out: FallbackBox[] = [];
  const add = (mat: FallbackMat, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) =>
    out.push({ mat, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z0, z1 });
  for (const s of m.slabs) add('slab', s.x, s.y, s.x + s.w, s.y + s.d, s.floor === 0 ? s.z : s.z - s.t, s.floor === 0 ? s.z + s.t : s.z);
  for (const r of m.roofs) add('roof', r.x, r.y, r.x + r.w, r.y + r.d, r.z, r.z + r.t);
  for (const w of m.walls) {
    if (w.kind === 'int') continue;
    const horizontal = w.y0 === w.y1, t = w.thickness;
    // a piece along the wall from `a` to `b`, `d` thick about its line
    const piece = (mat: FallbackMat, a: number, b: number, z0: number, z1: number, d: number) => horizontal
      ? add(mat, w.x0 + a, w.y0 - d / 2, w.x0 + b, w.y0 + d / 2, z0, z1)
      : add(mat, w.x0 - d / 2, w.y0 + a, w.x0 + d / 2, w.y0 + b, z0, z1);
    for (const k of wallBlocks(w)) piece(w.kind === 'rail' ? 'rail' : 'plaster', k.a, k.b, k.z0, k.z1, t);
    if (w.parapet) { const L = Math.hypot(w.x1 - w.x0, w.y1 - w.y0); piece('coping', -t / 2, L + t / 2, w.z1, w.z1 + 0.06, t + 0.06); }
    for (const o of w.openings) {
      const mat: FallbackMat | null = o.kind === 'window' ? 'glass' : o.kind === 'door' ? 'timber' : o.kind === 'vehicle' ? 'metal' : null;
      if (mat) piece(mat, o.at, o.at + o.width, o.z0, o.z1, 0.04);
    }
  }
  // the street, cut to a few metres either side of the plot so the drawing stays on the building
  const off = layout.site_offset ?? { x: 0, y: 0 };
  const ctx = siteContext(layout);
  const lo = -4, hi = layout.plot_width + 4;
  for (const k of ctx?.boxes ?? []) {
    if (k.kind === 'marking' || k.kind === 'neighbour') continue;
    const x0 = Math.max(k.x0, lo), x1 = Math.min(k.x1, hi);
    if (x1 - x0 < 0.01) continue;
    const mat: FallbackMat = k.kind === 'pier' ? 'wall' : k.kind;
    add(mat, x0 - off.x, k.y0 - off.y, x1 - off.x, k.y1 - off.y, k.z0, k.z1);
  }
  return out;
}

const EPS = 1e-3;

/**
 * Which of two boxes to paint first, seen from the azimuth whose view direction on the plan is
 * (sa, ca) (towards the viewer) and from above. Two boxes that don't overlap have a plane between
 * them; the one on the far side of it can't cover the other, so it goes first. -1: a first, 1: b first,
 * 0: no plane tells (the plane runs along the line of sight, so neither covers the other).
 */
export function behind(a: FallbackBox, b: FallbackBox, sa: number, ca: number): number {
  if (a.x1 <= b.x0 + EPS && Math.abs(sa) > EPS) return sa > 0 ? -1 : 1;
  if (b.x1 <= a.x0 + EPS && Math.abs(sa) > EPS) return sa > 0 ? 1 : -1;
  if (a.y1 <= b.y0 + EPS && Math.abs(ca) > EPS) return ca > 0 ? -1 : 1;
  if (b.y1 <= a.y0 + EPS && Math.abs(ca) > EPS) return ca > 0 ? 1 : -1;
  if (a.z1 <= b.z0 + EPS) return -1;
  if (b.z1 <= a.z0 + EPS) return 1;
  // boxes that run into each other (a slab under a wall's foot): the lower, then the nearer, on top
  const za = (a.z0 + a.z1) / 2, zb = (b.z0 + b.z1) / 2;
  if (Math.abs(za - zb) > EPS) return za < zb ? -1 : 1;
  const da = ((a.x0 + a.x1) / 2) * sa + ((a.y0 + a.y1) / 2) * ca, db = ((b.x0 + b.x1) / 2) * sa + ((b.y0 + b.y1) / 2) * ca;
  return da < db ? -1 : da > db ? 1 : 0;
}

/**
 * The order to paint the boxes in, back to front: a box goes after every box it overlaps on the
 * sheet that is behind it (`screen` gives each box's extent on the sheet). Should boxes ever cover
 * each other in a ring, the farthest of them is painted next.
 */
export function paintOrder(boxes: FallbackBox[], screen: Array<{ x0: number; y0: number; x1: number; y1: number }>, sa: number, ca: number): number[] {
  const n = boxes.length, after: number[][] = Array.from({ length: n }, () => []), waiting = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const p = screen[i], q = screen[j];
    if (p.x1 <= q.x0 || q.x1 <= p.x0 || p.y1 <= q.y0 || q.y1 <= p.y0) continue;
    const s = behind(boxes[i], boxes[j], sa, ca);
    if (s < 0) { after[i].push(j); waiting[j]++; } else if (s > 0) { after[j].push(i); waiting[i]++; }
  }
  const depth = (i: number) => ((boxes[i].x0 + boxes[i].x1) / 2) * sa + ((boxes[i].y0 + boxes[i].y1) / 2) * ca + (boxes[i].z0 + boxes[i].z1) / 2;
  const done = new Array(n).fill(false), order: number[] = [];
  let ready = [...Array(n).keys()].filter(i => waiting[i] === 0);
  while (order.length < n) {
    if (!ready.length) {
      // a ring: paint its farthest box next
      let far = -1; for (let i = 0; i < n; i++) if (!done[i] && (far < 0 || depth(i) < depth(far))) far = i;
      ready = [far]; waiting[far] = 0;
    }
    const next: number[] = [];
    for (const i of ready) {
      if (done[i]) continue;
      done[i] = true; order.push(i);
      for (const j of after[i]) if (!done[j] && --waiting[j] === 0) next.push(j);
    }
    ready = next;
  }
  return order;
}
