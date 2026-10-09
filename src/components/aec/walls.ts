// Wall layer for the 2D floor plan: one band per wall line, not one per room
// edge. Every room edge is cut where other edges start or stop; each piece
// becomes an external wall (room on one side only), an internal wall (rooms on
// both sides), a parapet (terrace/balcony edge to open air), or nothing (open
// plan: hall, landing, void). Pieces of the same kind on a line are merged.

export type WallRoomKind = 'room' | 'open' | 'outside';

export interface WallRoom {
  x: number; y: number; width: number; depth: number;
  kind: WallRoomKind;
}

export type WallKind = 'ext' | 'int' | 'rail';

/** Centreline from (x0,y0) to (x1,y1), metres; horizontal or vertical. */
export interface WallSegment {
  x0: number; y0: number; x1: number; y1: number;
  kind: WallKind;
}

// Template drawing: 230 mm block outside, 150 mm partitions.
export const WALL_THICKNESS: Record<WallKind, number> = { ext: 0.23, int: 0.15, rail: 0.1 };

const EPS = 1e-3;
const key = (v: number) => Math.round(v * 1000);

const classify = (a: WallRoomKind | null, b: WallRoomKind | null): WallKind | null => {
  const inside = (k: WallRoomKind | null) => k === 'room' || k === 'open';
  if (inside(a) && inside(b)) return a === 'open' && b === 'open' ? null : 'int';
  if (inside(a) || inside(b)) return 'ext';
  if (a === 'outside' && b === 'outside') return null;
  return a === 'outside' || b === 'outside' ? 'rail' : null;
};

interface Edge { line: number; from: number; to: number; side: 0 | 1; kind: WallRoomKind }

// side 0 = the room lies before the line (above / left of it), 1 = after it.
const linesOf = (edges: Edge[], horizontal: boolean): WallSegment[] => {
  const byLine = new Map<number, Edge[]>();
  for (const e of edges) {
    const k = key(e.line);
    const list = byLine.get(k);
    if (list) list.push(e); else byLine.set(k, [e]);
  }
  const out: WallSegment[] = [];
  for (const list of byLine.values()) {
    const line = list[0].line;
    const cuts = [...new Set(list.flatMap(e => [key(e.from), key(e.to)]))].sort((p, q) => p - q);
    let open: WallSegment | null = null;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i] / 1000, b = cuts[i + 1] / 1000, m = (a + b) / 2;
      const at = (side: 0 | 1) =>
        list.find(e => e.side === side && e.from < m - EPS && e.to > m + EPS)?.kind ?? null;
      const kind = classify(at(0), at(1));
      if (open && (kind !== open.kind || Math.abs((horizontal ? open.x1 : open.y1) - a) > EPS)) {
        out.push(open); open = null;
      }
      if (!kind) continue;
      if (open) { if (horizontal) open.x1 = b; else open.y1 = b; continue; }
      open = horizontal ? { x0: a, y0: line, x1: b, y1: line, kind } : { x0: line, y0: a, x1: line, y1: b, kind };
    }
    if (open) out.push(open);
  }
  return out;
};

export const computeWalls = (rooms: WallRoom[]): WallSegment[] => {
  const h: Edge[] = [], v: Edge[] = [];
  for (const r of rooms) {
    if (!(r.width > 0 && r.depth > 0)) continue;
    h.push({ line: r.y, from: r.x, to: r.x + r.width, side: 1, kind: r.kind });
    h.push({ line: r.y + r.depth, from: r.x, to: r.x + r.width, side: 0, kind: r.kind });
    v.push({ line: r.x, from: r.y, to: r.y + r.depth, side: 1, kind: r.kind });
    v.push({ line: r.x + r.width, from: r.y, to: r.y + r.depth, side: 0, kind: r.kind });
  }
  return [...linesOf(h, true), ...linesOf(v, false)];
};
