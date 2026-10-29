/**
 * The street round the plot for the 3D view (3D step 4, ledger §6 item 12):
 * the boundary wall with its gate, the driveway, the footway and kerb, the
 * road, and plain neighbouring blocks. The wall, gate and driveway come from
 * the site plan (sitePlan.ts), so the 3D street matches the site drawing; the
 * road's footways and the neighbours are indicative, there to give the
 * building its scale. Everything is a box in the plot frame: x from the left
 * boundary, y from the rear boundary (the road is past y = plot depth), z up.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { sitePlan, ROAD_M } from './sitePlan';

export type ContextKind = 'wall' | 'coping' | 'pier' | 'gate' | 'driveway' | 'footway' | 'kerb' | 'road' | 'marking' | 'neighbour';
export interface ContextBox { kind: ContextKind; x0: number; y0: number; x1: number; y1: number; z0: number; z1: number }

// typical values, not a code requirement yet: a 225 mm block fence 1.8 m high, piers either side of the gate
export const BOUNDARY_WALL = { thickness: 0.225, height: 1.8, coping: 0.05, pier: 0.45, pierHeight: 2.1 };
const FOOTWAY = 1.2, FOOTWAY_H = 0.15, KERB = 0.15;
const STOREY = 3.2;
// a neighbour is a house-sized block whatever the plot: at most 16 m wide and 18 m deep
const NEIGHBOUR = { front: 4.5, rear: 3, side: 3, maxW: 16, maxD: 18 };
// how many storeys each neighbour has, in order: varied so the street doesn't read as a copy
const NEIGHBOUR_STOREYS = [2, 1, 2, 3, 1, 2, 2, 1];

/** what is left of [a, b] once the intervals in `cut` are taken out */
function minusIntervals(a: number, b: number, cut: [number, number][]): [number, number][] {
  let out: [number, number][] = [[a, b]];
  for (const [c0, c1] of cut) out = out.flatMap(([p, q]) => (c1 <= p || c0 >= q ? [[p, q]] : [[p, c0], [c1, q]].filter(([s, e]) => e - s > 0.05)) as [number, number][]);
  return out;
}

export function siteContext(layout: SolvedLayout): { boxes: ContextBox[]; roadEnd: number } | null {
  const site = sitePlan(layout);
  if (!site) return null;
  const { plot, gate, driveway, outbuildings } = site;
  const { thickness: t, height: h, coping: c, pier: p, pierHeight: ph } = BOUNDARY_WALL;
  const boxes: ContextBox[] = [];
  const add = (kind: ContextKind, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) => boxes.push({ kind, x0, y0, x1, y1, z0, z1 });

  // the boundary wall, inside the plot line, stopping where an outbuilding stands against it
  // (the outbuilding's own wall is the fence there) and at the gate
  const against = (side: 'front' | 'rear' | 'left' | 'right'): [number, number][] => outbuildings.flatMap(b => {
    const on = side === 'rear' ? b.y < t : side === 'front' ? b.y + b.h > plot.d - t : side === 'left' ? b.x < t : b.x + b.w > plot.w - t;
    return on ? [side === 'rear' || side === 'front' ? [b.x, b.x + b.w] : [b.y, b.y + b.h]] as [number, number][] : [];
  });
  const run = (kind: 'h' | 'v', at0: number, at1: number, a: number, b: number) => {
    // a wall run along x (kind h, between y = at0..at1) or along y (kind v, between x = at0..at1)
    if (kind === 'h') { add('wall', a, at0, b, at1, 0, h); add('coping', a, at0 - 0.025, b, at1 + 0.025, h, h + c); }
    else { add('wall', at0, a, at1, b, 0, h); add('coping', at0 - 0.025, a, at1 + 0.025, b, h, h + c); }
  };
  const gateCut: [number, number] = [gate.x - p, gate.x + gate.w + p];
  for (const [a, b] of minusIntervals(0, plot.w, [...against('front'), gateCut])) run('h', plot.d - t, plot.d, a, b);
  for (const [a, b] of minusIntervals(0, plot.w, against('rear'))) run('h', 0, t, a, b);
  for (const [a, b] of minusIntervals(t, plot.d - t, against('left'))) run('v', 0, t, a, b);
  for (const [a, b] of minusIntervals(t, plot.d - t, against('right'))) run('v', plot.w - t, plot.w, a, b);

  // the gate: a pier each side and the leaves shut, a solid metal gate as most compounds have
  const py0 = plot.d - t / 2 - p / 2, py1 = py0 + p;
  add('pier', gate.x - p, py0, gate.x, py1, 0, ph);
  add('pier', gate.x + gate.w, py0, gate.x + gate.w + p, py1, 0, ph);
  add('gate', gate.x, plot.d - t / 2 - 0.03, gate.x + gate.w, plot.d - t / 2 + 0.03, 0.05, h);

  if (driveway) add('driveway', driveway.x, driveway.y, driveway.x + driveway.w, driveway.y + driveway.h, 0, 0.03);

  // the street, running out of sight both ways: a raised footway with its kerb (dropped at the
  // gate), the carriageway with a dashed centre line, and the far footway
  const reach = Math.max(plot.w, plot.d) * 4, x0 = -reach, x1 = plot.w + reach;
  const fy = plot.d, ry = fy + FOOTWAY, roadEnd = ry + ROAD_M + FOOTWAY;
  for (const [a, b] of minusIntervals(x0, x1, [[gate.x, gate.x + gate.w]])) {
    add('footway', a, fy, b, ry - KERB, 0, FOOTWAY_H);
    add('kerb', a, ry - KERB, b, ry, 0, FOOTWAY_H + 0.01);
  }
  add('driveway', gate.x, fy, gate.x + gate.w, ry, 0, 0.03);
  add('road', x0, ry, x1, ry + ROAD_M, 0, 0.02);
  for (let x = x0; x + 1.5 <= x1; x += 3) add('marking', x, ry + ROAD_M / 2 - 0.06, x + 1.5, ry + ROAD_M / 2 + 0.06, 0.02, 0.025);
  add('kerb', x0, ry + ROAD_M, x1, ry + ROAD_M + KERB, 0, FOOTWAY_H + 0.01);
  add('footway', x0, ry + ROAD_M + KERB, x1, roadEnd, 0, FOOTWAY_H);

  // the neighbours: the plots beside this one, behind it, and across the road, each with a plain
  // house-sized block set back from its own road side (or from the rear for the plots behind)
  const bw = Math.min(plot.w - 2 * NEIGHBOUR.side, NEIGHBOUR.maxW), bd = Math.min(plot.d - NEIGHBOUR.front - NEIGHBOUR.rear, NEIGHBOUR.maxD);
  if (bw > 3 && bd > 3) {
    const plots: { px: number; py: number; facesRoad: 'down' | 'up' }[] = [
      { px: -plot.w, py: 0, facesRoad: 'down' }, { px: plot.w, py: 0, facesRoad: 'down' },
      ...[-plot.w, 0, plot.w].map(px => ({ px, py: -plot.d, facesRoad: 'up' as const })),
      ...[-plot.w, 0, plot.w].map(px => ({ px, py: roadEnd, facesRoad: 'up' as const })),
    ];
    plots.forEach(({ px, py, facesRoad }, i) => {
      const bx = px + (plot.w - bw) / 2;
      // 'down': the road is past the plot's far edge (this side of the street); 'up': before its near edge
      const by = facesRoad === 'down' ? py + plot.d - NEIGHBOUR.front - bd : py + (py === roadEnd ? NEIGHBOUR.front : NEIGHBOUR.rear);
      add('neighbour', bx, by, bx + bw, by + bd, 0, NEIGHBOUR_STOREYS[i % NEIGHBOUR_STOREYS.length] * STOREY);
    });
  }
  return { boxes, roadEnd };
}
