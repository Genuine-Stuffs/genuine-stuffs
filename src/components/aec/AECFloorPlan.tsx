import React, { useState, useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { computePlacement, DoorSpec, WindowSpec, WallSide } from '@/lib/aec/solver/engine_v2/doors';
import { structuralEngine } from '@/lib/aec/solver/structural';
import { computeWalls, WALL_THICKNESS, WallRoomKind } from './walls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Ruler, ShieldAlert, Layers } from 'lucide-react';

// ── ROOM FILL COLOURS ─────────────────────────────────────────────────────
const ROOM_FILLS: Record<string, { fill: string; stroke: string; textColor: string }> = {
  living:    { fill: '#FEF3C7', stroke: '#D97706', textColor: '#92400E' },
  lounge:    { fill: '#FEF3C7', stroke: '#D97706', textColor: '#92400E' },
  foyer:     { fill: '#FEF9C3', stroke: '#CA8A04', textColor: '#713F12' },
  dining:    { fill: '#DCFCE7', stroke: '#16A34A', textColor: '#14532D' },
  kitchen:   { fill: '#D1FAE5', stroke: '#059669', textColor: '#064E3B' },
  pantry:    { fill: '#D1FAE5', stroke: '#059669', textColor: '#064E3B' },
  bedroom:   { fill: '#DBEAFE', stroke: '#2563EB', textColor: '#1E3A8A' },
  master:    { fill: '#EDE9FE', stroke: '#7C3AED', textColor: '#4C1D95' },
  bath:      { fill: '#E0F2FE', stroke: '#0284C7', textColor: '#0C4A6E' },
  wc:        { fill: '#E0F2FE', stroke: '#0284C7', textColor: '#0C4A6E' },
  toilet:    { fill: '#E0F2FE', stroke: '#0284C7', textColor: '#0C4A6E' },
  office:    { fill: '#F1F5F9', stroke: '#475569', textColor: '#1E293B' },
  study:     { fill: '#F1F5F9', stroke: '#475569', textColor: '#1E293B' },
  garage:    { fill: '#F3F4F6', stroke: '#6B7280', textColor: '#1F2937' },
  corridor:  { fill: '#F8FAFC', stroke: '#CBD5E1', textColor: '#475569' },
  stairwell: { fill: '#E2E8F0', stroke: '#64748B', textColor: '#334155' },
  void:      { fill: '#E2E8F0', stroke: '#64748B', textColor: '#334155' },
  default:   { fill: '#F8FAFC', stroke: '#94A3B8', textColor: '#334155' },
};

// Hive `type` → ROOM_FILLS key. Primary path — avoids label-regex matching.
const TYPE_TO_FILL_KEY: Record<string, string> = {
  living_room: 'living', family_room: 'living', foyer: 'foyer',
  dining_room: 'dining', kitchen: 'kitchen', pantry: 'pantry',
  bedroom: 'bedroom', master_bedroom: 'master',
  bathroom: 'bath', office: 'office', study: 'study', garage: 'garage',
  circulation: 'corridor', hall: 'corridor', landing: 'corridor',
  stairwell: 'stairwell', void: 'void',
};

const getRoomFill = (room_id: string, type: string = 'unknown') => {
  if (type !== 'unknown' && TYPE_TO_FILL_KEY[type]) {
    return ROOM_FILLS[TYPE_TO_FILL_KEY[type]];
  }
  // Fallback ONLY when Hive omitted `type` — same as graph.ts's own
  // fallback path, not an independent classifier.
  const id = room_id.toLowerCase();
  const key = Object.keys(ROOM_FILLS).find(k => id.includes(k));
  return ROOM_FILLS[key ?? 'default'];
};

interface AECFloorPlanProps {
  layout?: SolvedLayout;
}

/** A floor's building extent in metres (the plot when it has no rooms). */
const floorBounds = (layout: SolvedLayout, floor: number, plot_width: number, plot_depth: number) => {
  const rooms = layout.placed_rooms.filter(r => r.floor === floor);
  const right  = rooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
  const bottom = rooms.reduce((max, r) => Math.max(max, r.y + r.depth), 0);
  return { w: right > 0 ? right : plot_width, h: bottom > 0 ? bottom : plot_depth };
};

const floorName = (f: number) => `${['GROUND', 'FIRST', 'SECOND', 'THIRD'][f] ?? `LEVEL ${f}`} FLOOR`;

/** One floor's drawing in the sheet's frame: the building's rear-left corner
 * at (xOffset, yOffset), `scale` sheet units per metre. */
interface FloorDrawingProps {
  layout: SolvedLayout;
  floor: number;
  scale: number;
  xOffset: number;
  yOffset: number;
  showStructure: boolean;
  skeleton: ReturnType<typeof structuralEngine.generateSkeleton>;
  plot_width: number;
  plot_depth: number;
  /** On the sheet the plot outline would run into the next floor's drawing. */
  showPlot: boolean;
  /** The floor's name under its drawing, as on the template's sheet. */
  captionY?: number;
}

const FloorDrawing: React.FC<FloorDrawingProps> = ({
  layout, floor: activeFloor, scale, xOffset, yOffset, showStructure, skeleton,
  plot_width, plot_depth, showPlot, captionY,
}) => {
  const { placed_rooms } = layout;
  const activeRooms = placed_rooms.filter(r => r.floor === activeFloor);
  // Outbuildings (BQ, generator house) stand behind the house on the ground
  // floor; their rooms have y < 0 in the house's frame.
  const outbuildings = activeFloor === 0 ? (layout.outbuildings ?? []) : [];
  const { w: buildingW, h: buildingH } = floorBounds(layout, activeFloor, plot_width, plot_depth);

  const activeBeams = skeleton.beams.filter(b => b.floor === activeFloor);
  const activeCols  = skeleton.columns.filter(c => c.floor === activeFloor);

  // ── BUG 3 FIX: room name lookup ─────────────────────────────────────────────
  // Old code:  layout.program_reference.rooms.find(r => r.id === room.room_id)
  // The Hive schema uses room_id as the key on both the placed_room AND the
  // source room in program_reference.rooms. The source rooms may use either
  // 'id' (old solver schema) or 'room_id' (new Hive schema).
  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];

  const resolveRoomName = (room_id: string): string => {
    if (room_id === 'stairwell_void') return 'STAIR VOID';
    // gap-free engine: the open roof of the floor below
    if (room_id.startsWith('terrace_f')) return 'Terrace';
    const match = sourceRooms.find(
      r => r.room_id === room_id || r.id === room_id
    );
    return match?.name ?? room_id.replace(/_/g, ' ').toUpperCase();
  };

  // Synthetic solver-placed rooms (corridor bands, stairwell) aren't Hive
  // rooms — matched by exact id since these are solver-generated constants,
  // not label guesses. Everything else defers to the Hive's own `type`.
  const resolveRoomType = (room_id: string): string => {
    if (room_id === 'stairwell' || room_id === 'stairwell_void') return 'stairwell';
    if (room_id.startsWith('corridor_floor')) return 'circulation';
    if (room_id.startsWith('terrace_f')) return 'balcony';
    const match = sourceRooms.find(r => r.room_id === room_id || r.id === room_id);
    return match?.type ?? 'unknown';
  };

  // ── Neighbour wall detection ──────────────────────────────────────────────
  // For a given room, finds which of its four walls is shared with a corridor,
  // circulation space, or another room — and returns that wall as the door wall.
  // Priority: corridor > stairwell > any adjacent room > fallback to non-external.
  const TOLERANCE_PX = 0.3; // metres — shared wall detection threshold

  const getDoorWall = (room: any): 'top' | 'bottom' | 'left' | 'right' => {
    const roomRight  = room.x + room.width;
    const roomBottom = room.y + room.depth;

    // Score each wall by what's on the other side
    // Higher score = better door position
    const scores = { top: 0, bottom: 0, left: 0, right: 0 };

    for (const neighbour of activeRooms) {
      if (neighbour.room_id === room.room_id) continue;
      const nRight  = neighbour.x + neighbour.width;
      const nBottom = neighbour.y + neighbour.depth;

      const nType = resolveRoomType(neighbour.room_id);
      const currentType = resolveRoomType(room.room_id);

      const isCorridor = ['circulation', 'hall', 'landing', 'stairwell'].includes(nType);

      const isLivingNeighbour =
        ['living_room', 'dining_room', 'family_room'].includes(nType);

      const isServiceNeighbour =
        ['bathroom', 'wardrobe', 'dressing', 'store', 'garage'].includes(nType);

      // Bathrooms open into their parent bedroom (score 9), not toward corridor
      const isBedroomNeighbour = ['bedroom', 'master_bedroom'].includes(nType);
      const currentRoomIsBath  = currentType === 'bathroom';

      const score = isCorridor ? 10
        : (currentRoomIsBath && isBedroomNeighbour) ? 9
        : isLivingNeighbour ? 8
        : isServiceNeighbour ? 0
        : 1;

      // Check if neighbour shares the bottom wall
      if (Math.abs(roomBottom - neighbour.y) < TOLERANCE_PX &&
          room.x < nRight - TOLERANCE_PX && roomRight > neighbour.x + TOLERANCE_PX) {
        scores.bottom += score;
      }
      // Check if neighbour shares the top wall
      if (Math.abs(room.y - nBottom) < TOLERANCE_PX &&
          room.x < nRight - TOLERANCE_PX && roomRight > neighbour.x + TOLERANCE_PX) {
        scores.top += score;
      }
      // Check if neighbour shares the right wall
      if (Math.abs(roomRight - neighbour.x) < TOLERANCE_PX &&
          room.y < nBottom - TOLERANCE_PX && roomBottom > neighbour.y + TOLERANCE_PX) {
        scores.right += score;
      }
      // Check if neighbour shares the left wall
      if (Math.abs(room.x - nRight) < TOLERANCE_PX &&
          room.y < nBottom - TOLERANCE_PX && roomBottom > neighbour.y + TOLERANCE_PX) {
        scores.left += score;
      }
    }

    // Pick the wall with the highest score that is also not external
    const edges = getExternalEdges(room);
    const candidates: Array<'top' | 'bottom' | 'left' | 'right'> = ['bottom', 'right', 'top', 'left'];
    const ranked = candidates
      .filter(w => !edges[w]) // exclude external walls
      .sort((a, b) => scores[b] - scores[a]);

    // Return best non-external wall with highest neighbour score
    if (ranked.length > 0) return ranked[0];

    // Absolute fallback: first non-external wall regardless of score
    if (!edges.bottom) return 'bottom';
    if (!edges.right)  return 'right';
    if (!edges.top)    return 'top';
    if (!edges.left)   return 'left';
    return 'bottom'; // all walls external (tiny room) — place anyway
  };

  // ── Solver-derived door + window placement ────────────────────────────
  // computePlacement() runs once per floor change (memoised).
  // When USE_SOLVER_V2 is true, door walls come from the solver graph.
  // When false, getDoorWall() above is used (existing behaviour).
  const solverPlacement = useMemo(() => {
    if (activeRooms.length === 0) return null;
    const rects = activeRooms.map(r => ({
      room_id: r.room_id,
      type: resolveRoomType(r.room_id),
      x: r.x, y: r.y, width: r.width, depth: r.depth,
    }));
    return computePlacement(rects, buildingW, buildingH);
  }, [activeRooms, buildingW, buildingH, sourceRooms]);

  const getSolverDoorWall = (room_id: string): WallSide | null => {
    const spec = solverPlacement?.doors.find(d => d.room_id === room_id);
    return spec?.wall ?? null;
  };

  const isSolverInteriorDoor = (room_id: string): boolean => {
    return solverPlacement?.doors.find(d => d.room_id === room_id)?.interior ?? false;
  };

  // ── External edge detection ───────────────────────────────────────────────
  // Returns which specific edges of a room touch the building boundary.
  // Used to render perimeter wall bands and place window symbols.
  const EDGE_TOLERANCE = 0.5; // metres
  const getExternalEdges = (room: any) => ({
    left:   room.x <= EDGE_TOLERANCE,
    top:    room.y <= EDGE_TOLERANCE,
    right:  (room.x + room.width) >= (buildingW - EDGE_TOLERANCE),
    bottom: (room.y + room.depth) >= (buildingH - EDGE_TOLERANCE),
  });
  const isExternalWall = (room: any) => {
    const e = getExternalEdges(room);
    return e.left || e.top || e.right || e.bottom;
  };

  const renderFurniture = (room: any, rx: number, ry: number, rw: number, rh: number) => {
    // Keyed on the room's TYPE, not its id: Hive ids are opaque (r01, r11…),
    // so matching "bedroom"/"kitchen" in the id never drew anything. The name
    // is only a fallback for untyped rooms — "Master Bathroom" by name would
    // match the bedroom rule.
    const type = resolveRoomType(room.room_id);
    const id = (type !== 'unknown' ? type : resolveRoomName(room.room_id)).toLowerCase();
    const pad = 4;
    const furniture: React.ReactNode[] = [];

    if (id.includes('master') || (id.includes('bedroom') && !id.includes('bath'))) {
      // Bed: centred, proportional
      const bw = Math.min(rw * 0.6, 48), bh = Math.min(rh * 0.5, 38);
      const bx = rx + (rw - bw) / 2, by = ry + pad + 4;
      furniture.push(
        <rect key="bed-frame" x={bx} y={by} width={bw} height={bh}
          fill="#BFDBFE" stroke="#3B82F6" strokeWidth={1} rx={2} />,
        <rect key="pillow-l" x={bx + 4} y={by + 3} width={bw * 0.35} height={bh * 0.28}
          fill="#EFF6FF" stroke="#93C5FD" strokeWidth={0.8} rx={2} />,
        <rect key="pillow-r" x={bx + bw - 4 - bw * 0.35} y={by + 3} width={bw * 0.35} height={bh * 0.28}
          fill="#EFF6FF" stroke="#93C5FD" strokeWidth={0.8} rx={2} />
      );
    }

    if (id.includes('dining')) {
      // Dining table: rectangle with chair dots
      const tw = Math.min(rw * 0.55, 44), th = Math.min(rh * 0.45, 30);
      const tx = rx + (rw - tw) / 2, ty = ry + (rh - th) / 2;
      furniture.push(
        <rect key="table" x={tx} y={ty} width={tw} height={th}
          fill="#BBF7D0" stroke="#16A34A" strokeWidth={1} rx={1} />
      );
      // Chairs — small circles around table
      const chairs = [
        [tx + tw * 0.25, ty - 5], [tx + tw * 0.75, ty - 5],
        [tx + tw * 0.25, ty + th + 5], [tx + tw * 0.75, ty + th + 5],
        [tx - 5, ty + th * 0.5], [tx + tw + 5, ty + th * 0.5],
      ];
      chairs.forEach(([cx, cy], i) => {
        furniture.push(
          <circle key={`chair-${i}`} cx={cx} cy={cy} r={3.5}
            fill="#86EFAC" stroke="#16A34A" strokeWidth={0.8} />
        );
      });
    }

    if (id.includes('garage')) {
      // Car outline — simple rectangle with wheels
      const cw = Math.min(rw * 0.45, 38), ch = Math.min(rh * 0.55, 22);
      const cx = rx + rw * 0.25 - cw / 2, cy2 = ry + (rh - ch) / 2;
      furniture.push(
        <rect key="car" x={cx} y={cy2} width={cw} height={ch}
          fill="#D1D5DB" stroke="#6B7280" strokeWidth={1} rx={3} />,
        <circle key="wfl" cx={cx + 6}      cy={cy2 + ch - 4} r={3} fill="#374151" />,
        <circle key="wfr" cx={cx + cw - 6} cy={cy2 + ch - 4} r={3} fill="#374151" />,
        <circle key="wrl" cx={cx + 6}      cy={cy2 + 4}      r={3} fill="#374151" />,
        <circle key="wrr" cx={cx + cw - 6} cy={cy2 + 4}      r={3} fill="#374151" />
      );
    }

    if (id.includes('living') || id.includes('lounge')) {
      // Sofa: L-shape suggestion
      const sw = Math.min(rw * 0.55, 44), sh = 10;
      const sx = rx + pad + 2, sy = ry + rh - sh - pad - 2;
      furniture.push(
        <rect key="sofa" x={sx} y={sy} width={sw} height={sh}
          fill="#FDE68A" stroke="#D97706" strokeWidth={1} rx={2} />,
        <rect key="sofa-arm" x={sx} y={sy - 18} width={10} height={18}
          fill="#FDE68A" stroke="#D97706" strokeWidth={1} rx={2} />
      );
    }

    if (id.includes('bath') || id.includes('wc') || id.includes('toilet')) {
      // WC: toilet bowl + tank
      const tw = Math.min(rw * 0.35, 18), th = Math.min(rh * 0.42, 22);
      const tx = rx + (rw - tw) / 2, ty2 = ry + rh - th - pad;
      furniture.push(
        <rect key="tank"  x={tx}       y={ty2}        width={tw}      height={th * 0.35} fill="#BAE6FD" stroke="#0284C7" strokeWidth={0.8} rx={1} />,
        <ellipse key="bowl" cx={tx + tw / 2} cy={ty2 + th * 0.72} rx={tw * 0.48} ry={th * 0.3} fill="#E0F2FE" stroke="#0284C7" strokeWidth={0.8} />
      );
      // Sink: small rectangle with circle drain
      if (rw > 30) {
        furniture.push(
          <rect key="sink" x={rx + pad} y={ry + pad} width={Math.min(rw * 0.4, 16)} height={Math.min(rh * 0.3, 14)}
            fill="#BAE6FD" stroke="#0284C7" strokeWidth={0.8} rx={2} />,
          <circle key="drain" cx={rx + pad + Math.min(rw * 0.2, 8)} cy={ry + pad + Math.min(rh * 0.15, 7)} r={2}
            fill="none" stroke="#0284C7" strokeWidth={0.6} />
        );
      }
    }

    if (id.includes('master') || (id.includes('bedroom') && !id.includes('bath'))) {
      // Wardrobe: slim rect along the top wall
      const wdW = Math.min(rw * 0.55, 44), wdH = 6;
      furniture.push(
        <rect key="wardrobe" x={rx + (rw - wdW) / 2} y={ry + pad}
          width={wdW} height={wdH} fill="#DDD6FE" stroke="#7C3AED" strokeWidth={0.8} rx={1} />,
        <line key="wd-div" x1={rx + rw / 2} y1={ry + pad} x2={rx + rw / 2} y2={ry + pad + wdH}
          stroke="#7C3AED" strokeWidth={0.5} />
      );
    }

    if (id.includes('kitchen') && !id.includes('pantry') && !id.includes('wet')) {
      // Counter L-shape along two walls
      const kw = rw - pad * 2;
      furniture.push(
        <rect key="counter-b" x={rx + pad} y={ry + rh - 7} width={kw} height={6}
          fill="#A7F3D0" stroke="#059669" strokeWidth={0.8} />,
        <rect key="counter-l" x={rx + pad} y={ry + pad} width={6} height={rh * 0.5}
          fill="#A7F3D0" stroke="#059669" strokeWidth={0.8} />
      );
    }

    return furniture.length > 0 ? <g key="furniture" opacity={0.75}>{furniture}</g> : null;
  };

  // The solver's circulation comes in pieces (corridor_floorN_i) that read
  // as one open hall, as on the target drawing: name it once per floor, on
  // its largest piece, with no strip dimensions.
  const hallPieces = activeRooms.filter(r => r.room_id.startsWith('corridor_floor'));
  const hallLabelId = hallPieces.reduce<any>((a, r) => (!a || r.width * r.depth > a.width * a.depth ? r : a), null)?.room_id;

  // A name short enough for a small room, so no room goes unlabelled.
  const shortName = (room_id: string, name: string): string => {
    const t = resolveRoomType(room_id).toLowerCase();
    if (/toilet|wc|powder/.test(t) || /toilet|\bwc\b/i.test(name)) return 'WC';
    if (/bath|ensuite|shower/.test(t) || /bath/i.test(name)) return 'Bath';
    if (/wardrobe|closet/.test(t) || /wardrobe|closet/i.test(name)) return 'Ward.';
    if (t === 'stairwell') return 'Stair';
    // Otherwise the room's own first word: the Hive's type can be loose
    // (a generator house typed "store").
    return name.split(/\s+/)[0];
  };

  // ── Walls: one band per wall line, built from the plan's own room edges ──
  // Hall, landing and void are open to each other; a terrace is outside.
  const wallKindOf = (room: any): WallRoomKind => {
    const t = resolveRoomType(room.room_id);
    if (t === 'balcony' || t === 'terrace') return 'outside';
    if (t === 'circulation' || t === 'hall' || t === 'landing' || t === 'void' ||
        t === 'stairwell') return 'open';
    return 'room';
  };
  const wallSegments = computeWalls(activeRooms
    .filter(r => !isNaN(r.x) && !isNaN(r.y) && r.width > 0 && r.depth > 0)
    .map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: wallKindOf(r) })));
  const WALL_PX = { ext: WALL_THICKNESS.ext * scale, int: WALL_THICKNESS.int * scale };

  const renderWalls = (segments = wallSegments) => (
    <g opacity={showStructure ? 0.4 : 1}>
      {segments.map((w, i) => {
        const t = WALL_THICKNESS[w.kind] * scale;
        // Run each band half a thickness past its ends so corners close.
        const ext = w.kind === 'rail' ? 0 : WALL_THICKNESS[w.kind] / 2;
        const horizontal = w.y0 === w.y1;
        const x = xOffset + (horizontal ? w.x0 - ext : w.x0) * scale - (horizontal ? 0 : t / 2);
        const y = yOffset + (horizontal ? w.y0 : w.y0 - ext) * scale - (horizontal ? t / 2 : 0);
        const len = ((horizontal ? w.x1 - w.x0 : w.y1 - w.y0) + ext * 2) * scale;
        return w.kind === 'rail'
          ? <rect key={i} x={x} y={y} width={horizontal ? len : t} height={horizontal ? t : len}
              fill="#ffffff" stroke="#1e293b" strokeWidth={0.8} />
          : <rect key={i} x={x} y={y} width={horizontal ? len : t} height={horizontal ? t : len}
              fill="#1e293b" />;
      })}
    </g>
  );

  // ── Stair: one straight flight along the stairwell's long side, starting
  // at the end that opens onto the hall. Upstairs the void shows the same
  // flight with DN from its top end.
  const TREAD = 0.28; // metres
  const isStair = (room: any) => room.room_id === 'stairwell' || room.room_id === 'stairwell_void';
  const groundStair = placed_rooms.find(r => r.floor === 0 && r.room_id === 'stairwell');
  const stairStartsAtMin = (st: any): boolean => {
    const floorRooms = placed_rooms.filter(r => r.floor === st.floor && r !== st);
    const alongX = st.width > st.depth;
    const openAt = (atMin: boolean) => floorRooms
      .filter(r => wallKindOf(r) === 'open')
      .reduce((sum, r) => {
        const touches = alongX
          ? Math.abs((atMin ? st.x : st.x + st.width) - (atMin ? r.x + r.width : r.x)) < 0.01
          : Math.abs((atMin ? st.y : st.y + st.depth) - (atMin ? r.y + r.depth : r.y)) < 0.01;
        const overlap = alongX
          ? Math.min(st.y + st.depth, r.y + r.depth) - Math.max(st.y, r.y)
          : Math.min(st.x + st.width, r.x + r.width) - Math.max(st.x, r.x);
        return touches && overlap > 0 ? sum + overlap : sum;
      }, 0);
    const atMin = openAt(true), atMax = openAt(false);
    // No hall at either end: start at the front (bottom / right), where the
    // entrance is drawn.
    return atMin !== atMax ? atMin > atMax : false;
  };

  const renderStair = (room: any, rx: number, ry: number, rw: number, rh: number) => {
    const alongX = room.width > room.depth;
    const up = room.room_id === 'stairwell';
    // The void repeats the ground flight; DN runs from the flight's top end.
    const base = up ? room : (groundStair ?? room);
    const startAtMin = stairStartsAtMin(base) === up;
    const run = alongX ? rw : rh;
    const n = Math.max(2, Math.round((alongX ? room.width : room.depth) / TREAD));
    const step = run / n;
    const c = '#334155';
    const treads = Array.from({ length: n - 1 }, (_, i) => {
      const o = (i + 1) * step;
      return alongX
        ? <line key={i} x1={rx + o} y1={ry} x2={rx + o} y2={ry + rh} stroke={c} strokeWidth={0.7} />
        : <line key={i} x1={rx} y1={ry + o} x2={rx + rw} y2={ry + o} stroke={c} strokeWidth={0.7} />;
    });
    // Arrow along the centre line, from the start end to the far end.
    const m = step * 0.6;
    const [ax0, ay0, ax1, ay1] = alongX
      ? (startAtMin ? [rx + m, ry + rh / 2, rx + rw - m, ry + rh / 2] : [rx + rw - m, ry + rh / 2, rx + m, ry + rh / 2])
      : (startAtMin ? [rx + rw / 2, ry + m, rx + rw / 2, ry + rh - m] : [rx + rw / 2, ry + rh - m, rx + rw / 2, ry + m]);
    const dx = Math.sign(ax1 - ax0), dy = Math.sign(ay1 - ay0), h = Math.min(6, step * 1.2);
    const head = `M ${ax1} ${ay1} L ${ax1 - dx * h - dy * h * 0.6} ${ay1 - dy * h - dx * h * 0.6} L ${ax1 - dx * h + dy * h * 0.6} ${ay1 - dy * h + dx * h * 0.6} Z`;
    return (
      <g opacity={up ? 1 : 0.6} style={{ pointerEvents: 'none' }}>
        {treads}
        <line x1={ax0} y1={ay0} x2={ax1} y2={ay1} stroke={c} strokeWidth={1} />
        <path d={head} fill={c} />
        <text x={ax0 + (alongX ? dx * 4 : 6)} y={ay0 + (alongX ? -4 : dy * 9)}
          textAnchor={alongX && dx < 0 ? 'end' : 'start'}
          style={{ fontSize: '8px', fontWeight: 900, fill: c, letterSpacing: '0.08em' }}>
          {up ? 'UP' : 'DN'}
        </text>
      </g>
    );
  };

  const renderRoom = (room: any, idx: number, layer: 'base' | 'over') => {
    if (isNaN(room.x) || isNaN(room.y) || isNaN(room.width) || isNaN(room.depth) ||
        room.width <= 0 || room.depth <= 0) return null;

    const rx = xOffset + (room.x * scale);
    const ry = yOffset + (room.y * scale);
    const rw = room.width * scale;
    const rh = room.depth * scale;

    const isHallPiece = room.room_id.startsWith('corridor_floor');
    const fullName = isHallPiece ? (activeFloor === 0 ? 'HALL' : 'LANDING') : resolveRoomName(room.room_id);
    // Too small for the full name: the short one, without dimensions.
    const compact = !isHallPiece && !(rw > 40 && rh > 30);
    const name = compact ? shortName(room.room_id, fullName) : fullName;
    const minDim = Math.min(rw, rh);
    
    // Dynamic font: scales with room, hard floors to stay readable
    const baseNameFontSize = Math.max(8, Math.min(14, minDim * 0.12));
    const dimFontSize  = Math.max(7, Math.min(11, minDim * 0.09));

    // Fit the name to the room instead of cutting it at 14 characters
    // ("3-Car Enclose…", "Wet Kitchen/P…" on the live villa): wrap onto two
    // lines, then shrink down to 6px, and only cut with "…" past that.
    // Width is estimated (heavy weight + 0.08em tracking ≈ 0.72em per char).
    const fitName = (name: string) => {
      const avail = rw - 8;
      const fits = (t: string, fs: number) => t.length * fs * 0.72 <= avail;
      const wrap = (fs: number): string[] => {
        const words = name.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        for (const w of words) {
          const last = lines[lines.length - 1];
          if (last !== undefined && fits(`${last} ${w}`, fs)) lines[lines.length - 1] = `${last} ${w}`;
          else lines.push(w);
        }
        return lines;
      };
      for (let fs = baseNameFontSize; fs >= 6; fs -= 0.5) {
        const lines = wrap(fs);
        if (lines.length <= 2 && lines.every(l => fits(l, fs))) return { nameLines: lines, nameFontSize: fs, cut: false };
      }
      const max = Math.max(1, Math.floor(avail / (6 * 0.72)) - 1);
      return { nameLines: [name.length > max ? name.substring(0, max) + '…' : name], nameFontSize: 6, cut: name.length > max };
    };
    // A full name that only fits cut ("Master…" for a master bathroom): the
    // short name instead ("Bath").
    const full = fitName(name);
    const { nameLines, nameFontSize } = full.cut && !compact ? fitName(shortName(room.room_id, fullName)) : full;
    const lineHeight   = nameFontSize * 1.4;

    // Hall pieces: only the largest carries the hall's name. Small rooms
    // show their short name if it fits at all.
    const showLabel = isHallPiece ? room.room_id === hallLabelId && rw > 24 && rh > 14
      : compact ? rw > 16 && rh > 12 : true;
    const showDims = !isHallPiece && !compact;

    const { fill, stroke, textColor } = getRoomFill(room.room_id, resolveRoomType(room.room_id));
    const rType = resolveRoomType(room.room_id);
    const isCorridorOrVoid = rType === 'circulation' || rType === 'hall' ||
                             rType === 'landing' || rType === 'void' ||
                             room.room_id.startsWith('corridor_floor');

    const edges = getExternalEdges(room);
    // Window symbol constants
    const WIN_INSET = 8;   // px inset from room corner
    const WIN_LEN   = Math.min(rw * 0.45, 40); // window length along wall
    const WIN_DEPTH = WALL_PX.ext; // window sits in the external wall
    // Door arc radius in px
    const DOOR_R = Math.min(rw * 0.18, 16);

    if (layer === 'base') return (
      <g key={`room-${idx}`} filter="url(#blueprint-shadow)">

        {/* ── Room fill (no stroke — walls drawn as explicit bands below) ── */}
        <rect
          x={rx} y={ry} width={rw} height={rh}
          fill={showStructure ? `${fill}55` : fill}
          stroke="none"
          strokeDasharray={isCorridorOrVoid ? '4 2' : undefined}
        />

        {/* ── Material hatching overlay ── */}
        {!showStructure && scale >= 6 && (() => {
          const id = room.room_id.toLowerCase();
          let patternId: string | null = null;
          if (id.includes('garage'))
            patternId = 'hatch-concrete';
          else if (id.includes('bath') || id.includes('wc') || id.includes('toilet'))
            patternId = 'hatch-tile';
          else if (id.includes('living') || id.includes('lounge') ||
                   id.includes('bedroom') || id.includes('master'))
            patternId = 'hatch-wood';
          if (!patternId) return null;
          return (
            <rect x={rx} y={ry} width={rw} height={rh}
              fill={`url(#${patternId})`} opacity={0.35} />
          );
        })()}

        {/* ── Furniture ── */}
        {!showStructure && rw > 35 && rh > 28 && renderFurniture(room, rx, ry, rw, rh)}

      </g>
    );

    return (
      <g key={`over-${idx}`}>
        {/* ── Window symbols on external walls ── */}
        {!isCorridorOrVoid && wallKindOf(room) === 'room' && !showStructure && rw > 40 && rh > 30 && (() => {
          const wins: React.ReactNode[] = [];
          const wc = '#0EA5E9'; // window colour
          // A gap in the external wall with two glazing lines, centred on the
          // wall line like the template's W tags.
          const win = (k: string, horizontal: boolean, x: number, y: number) => {
            const w = horizontal ? WIN_LEN : WIN_DEPTH, h = horizontal ? WIN_DEPTH : WIN_LEN;
            const g = WIN_DEPTH / 3;
            return (
              <g key={k}>
                <rect x={x} y={y} width={w} height={h} fill="white" stroke={wc} strokeWidth={0.8} />
                {horizontal
                  ? [g, 2 * g].map(o => <line key={o} x1={x} y1={y + o} x2={x + w} y2={y + o} stroke={wc} strokeWidth={0.6} />)
                  : [g, 2 * g].map(o => <line key={o} x1={x + o} y1={y} x2={x + o} y2={y + h} stroke={wc} strokeWidth={0.6} />)}
              </g>
            );
          };
          const half = WIN_DEPTH / 2;
          if (edges.top && rw > WIN_INSET * 2 + WIN_LEN)
            wins.push(win('win-top', true, rx + (rw - WIN_LEN) / 2, ry - half));
          if (edges.bottom && rw > WIN_INSET * 2 + WIN_LEN)
            wins.push(win('win-bot', true, rx + (rw - WIN_LEN) / 2, ry + rh - half));
          if (edges.left && rh > WIN_INSET * 2 + WIN_LEN)
            wins.push(win('win-left', false, rx - half, ry + (rh - WIN_LEN) / 2));
          if (edges.right && rh > WIN_INSET * 2 + WIN_LEN)
            wins.push(win('win-right', false, rx + rw - half, ry + (rh - WIN_LEN) / 2));
          return wins.length > 0 ? <g opacity={0.9}>{wins}</g> : null;
        })()}

        {/* ── Stair: treads and arrow instead of a door and a name ── */}
        {isStair(room) && !showStructure && renderStair(room, rx, ry, rw, rh)}

        {/* ── Door symbol — placed on wall facing corridor/circulation ── */}
        {!isCorridorOrVoid && !isStair(room) && rw > 30 && rh > 24 && (() => {
          // Prefer solver-derived door wall; fall back to heuristic
          const doorWall = getSolverDoorWall(room.room_id) ?? getDoorWall(room);
          const isInteriorDoor = isSolverInteriorDoor(room.room_id);
          const dR = DOOR_R;
          const wallColor = '#475569';

          // For bathrooms opening into their parent bedroom, use a smaller arc
          const isBath = room.room_id.toLowerCase().includes('bath') ||
                         room.room_id.toLowerCase().includes('wc') ||
                         room.room_id.toLowerCase().includes('toilet');
          const actualR = (isBath || isInteriorDoor) ? Math.min(dR, 10) : dR;
          // The opening: cut the wall band the width of the leaf.
          const t = (edges[doorWall] ? WALL_PX.ext : WALL_PX.int) + 1;
          const cut = (x: number, y: number, w: number, h: number) =>
            <rect x={x} y={y} width={w} height={h} fill="white" />;

          if (doorWall === 'bottom') {
            const dx = rx + rw * 0.25;
            const dy = ry + rh;
            return (
              <g>
                {cut(dx, dy - t / 2, actualR, t)}
                <line x1={dx} y1={dy} x2={dx} y2={dy - actualR}
                  stroke={wallColor} strokeWidth={1.5} />
                <path d={`M ${dx} ${dy - actualR} A ${actualR} ${actualR} 0 0 1 ${dx + actualR} ${dy}`}
                  fill="none" stroke={wallColor} strokeWidth={0.8} />
              </g>
            );
          }
          if (doorWall === 'top') {
            const dx = rx + rw * 0.25;
            const dy = ry;
            return (
              <g>
                {cut(dx, dy - t / 2, actualR, t)}
                <line x1={dx} y1={dy} x2={dx} y2={dy + actualR}
                  stroke={wallColor} strokeWidth={1.5} />
                <path d={`M ${dx} ${dy + actualR} A ${actualR} ${actualR} 0 0 0 ${dx + actualR} ${dy}`}
                  fill="none" stroke={wallColor} strokeWidth={0.8} />
              </g>
            );
          }
          if (doorWall === 'right') {
            const dx = rx + rw;
            const dy = ry + rh * 0.25;
            return (
              <g>
                {cut(dx - t / 2, dy, t, actualR)}
                <line x1={dx} y1={dy} x2={dx - actualR} y2={dy}
                  stroke={wallColor} strokeWidth={1.5} />
                <path d={`M ${dx - actualR} ${dy} A ${actualR} ${actualR} 0 0 1 ${dx} ${dy + actualR}`}
                  fill="none" stroke={wallColor} strokeWidth={0.8} />
              </g>
            );
          }
          // left wall
          const dx = rx;
          const dy = ry + rh * 0.25;
          return (
            <g>
              {cut(dx - t / 2, dy, t, actualR)}
              <line x1={dx} y1={dy} x2={dx + actualR} y2={dy}
                stroke={wallColor} strokeWidth={1.5} />
              <path d={`M ${dx + actualR} ${dy} A ${actualR} ${actualR} 0 0 0 ${dx} ${dy + actualR}`}
                fill="none" stroke={wallColor} strokeWidth={0.8} />
            </g>
          );
        })()}

        {/* ── Label ── */}
        {showLabel && !isStair(room) && (
          <text textAnchor="middle" style={{ pointerEvents: 'none' }}>
            {nameLines.map((line, i) => (
              <tspan
                key={i}
                x={rx + rw / 2}
                y={ry + rh / 2 - (nameLines.length - i) * lineHeight + lineHeight / 2}
                style={{
                  fontSize: `${nameFontSize}px`,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  fill: textColor,
                }}
              >
                {line}
              </tspan>
            ))}
            {showDims && <tspan
              x={rx + rw / 2}
              y={ry + rh / 2 + lineHeight / 2}
              style={{
                fontSize: `${dimFontSize}px`,
                fontWeight: 700,
                fill: stroke,
              }}
            >
              {room.width.toFixed(1)}M × {room.depth.toFixed(1)}M
            </tspan>}
          </text>
        )}
      </g>
    );
  };

  const renderStructure = () => {
    if (!showStructure) return null;
    return (
      <g className="animate-in fade-in duration-500">
        {activeBeams.map(beam => {
          const x = xOffset + (beam.start_x * scale);
          const y = yOffset + (beam.start_y * scale);
          const w = beam.end_x === beam.start_x
            ? beam.width_m * scale
            : beam.span_m  * scale;
          const h = beam.end_y === beam.start_y
            ? beam.width_m * scale
            : beam.span_m  * scale;
          const halfCol = (beam.width_m * scale) / 2;
          return (
            <rect
              key={beam.id}
              x={x - (beam.end_x === beam.start_x ? halfCol : 0)}
              y={y - (beam.end_y === beam.start_y ? halfCol : 0)}
              width={w}
              height={h}
              className={beam.kind === 'secondary'
                ? "fill-amber-500/20 stroke-amber-600 stroke-[1.5]"
                : "fill-blue-500/20 stroke-blue-600 stroke-[2] stroke-dasharray-4"}
            />
          );
        })}
        {activeCols.map(col => {
          const cx   = xOffset + (col.x * scale);
          const cy   = yOffset + (col.y * scale);
          const size = col.width_m * scale;
          return (
            <rect
              key={col.id}
              x={cx - size / 2}
              y={cy - size / 2}
              width={size}
              height={size}
              className="fill-red-500 stroke-red-700 stroke-[1]"
            />
          );
        })}
      </g>
    );
  };

  return (
          <g data-floor={activeFloor}>
            {/* Plot boundary — faint context outline; scale to plot ratio vs building */}
            {showPlot && (
              <rect
                x={xOffset - (layout.site_offset ? layout.site_offset.x : (plot_width  - buildingW) / 2) * scale}
                y={yOffset - (layout.site_offset ? layout.site_offset.y : (plot_depth - buildingH) / 2) * scale}
                width={plot_width  * scale}
                height={plot_depth * scale}
                fill="none"
                stroke="#93C5FD"
                strokeWidth={1}
                strokeDasharray="6 4"
                opacity={0.3}
              />
            )}
            {/* Building footprint boundary */}
            <rect
              x={xOffset} y={yOffset}
              width={buildingW * scale} height={buildingH * scale}
              fill="none"
              stroke="#475569"
              strokeWidth={1.5}
              opacity={0.4}
            />

            {/* Grid bubbles and dimension chains, as on the template: the
                structural grid's lines lettered A, B, C… under the drawing and
                numbered 1, 2, 3… from the rear on its left; the inner chain
                gives each bay, the outer one the overall size. */}
            {(() => {
              const g = skeleton.grid;
              const xs = g?.xs ?? [0, buildingW], ys = g?.ys ?? [0, buildingH];
              const ink = '#475569', red = '#b91c1c', R = 8, AT = 60;
              const fmt = (m: number) => `${+m.toFixed(2)}m`;
              const X = (m: number) => xOffset + m * scale, Y = (m: number) => yOffset + m * scale;
              const bot = Y(buildingH), left = X(0);
              const letter = (i: number): string => (i >= 26 ? letter(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));
              const text = { fontSize: '8px', fontWeight: 700, fill: '#1e293b' } as const;
              const chain = (ps: number[], off: number, horizontal: boolean, key: string) => (
                <g key={key}>
                  {horizontal
                    ? <line x1={X(ps[0])} y1={bot + off} x2={X(ps[ps.length - 1])} y2={bot + off} stroke={ink} strokeWidth={0.6} />
                    : <line x1={left - off} y1={Y(ps[0])} x2={left - off} y2={Y(ps[ps.length - 1])} stroke={ink} strokeWidth={0.6} />}
                  {ps.map((p, i) => horizontal
                    ? <line key={`t${i}`} x1={X(p) - 3} y1={bot + off + 3} x2={X(p) + 3} y2={bot + off - 3} stroke={ink} strokeWidth={1} />
                    : <line key={`t${i}`} x1={left - off - 3} y1={Y(p) + 3} x2={left - off + 3} y2={Y(p) - 3} stroke={ink} strokeWidth={1} />)}
                  {ps.slice(1).map((p, i) => {
                    const m = horizontal ? (X(ps[i]) + X(p)) / 2 : (Y(ps[i]) + Y(p)) / 2;
                    return horizontal
                      ? <text key={`d${i}`} x={m} y={bot + off - 3} textAnchor="middle" style={text}>{fmt(p - ps[i])}</text>
                      : <text key={`d${i}`} x={left - off - 3} y={m} textAnchor="middle" transform={`rotate(-90, ${left - off - 3}, ${m})`} style={text}>{fmt(p - ps[i])}</text>;
                  })}
                </g>
              );
              const bubble = (cx: number, cy: number, label: string) => (
                <g>
                  <circle cx={cx} cy={cy} r={R} fill="white" stroke={red} strokeWidth={0.8} />
                  <text x={cx} y={cy + 3} textAnchor="middle" style={{ fontSize: '8px', fontWeight: 700, fill: red }}>{label}</text>
                </g>
              );
              const extent = (ps: number[]) => [ps[0], ps[ps.length - 1]];
              return (
                <g className="grid-dimensions">
                  {g && xs.map((x, i) => (
                    <g key={`gx${i}`} data-bubble={letter(i)}>
                      <line x1={X(x)} y1={bot} x2={X(x)} y2={bot + AT - R} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                      {bubble(X(x), bot + AT, letter(i))}
                    </g>
                  ))}
                  {g && ys.map((y, i) => (
                    <g key={`gy${i}`} data-bubble={i + 1}>
                      <line x1={left} y1={Y(y)} x2={left - AT + R} y2={Y(y)} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                      {bubble(left - AT, Y(y), String(i + 1))}
                    </g>
                  ))}
                  {chain(xs, 20, true, 'bays-x')}
                  {xs.length > 2 && chain(extent(xs), 36, true, 'total-x')}
                  {chain(ys, 20, false, 'bays-y')}
                  {ys.length > 2 && chain(extent(ys), 36, false, 'total-y')}
                </g>
              );
            })()}

            {captionY !== undefined && (
              <text x={xOffset + (buildingW * scale) / 2} y={captionY} textAnchor="middle"
                style={{ fontSize: '11px', fontWeight: 800, fill: '#1e293b', letterSpacing: '0.12em' }}>
                {floorName(activeFloor)} PLAN
              </text>
            )}

            {/* Rooms */}
            {activeRooms.map((room, idx) => renderRoom(room, idx, 'base'))}
            {renderWalls()}
            {activeRooms.map((room, idx) => renderRoom(room, idx, 'over'))}

            {/* Outbuildings: each its own walls, rooms, door towards the house and the 3 m gap */}
            {outbuildings.map(b => {
              const segs = computeWalls(b.rooms.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: 'room' as WallRoomKind })));
              const head = b.rooms[0];
              const door = Math.min(0.9, head.width - 0.4) * scale;
              const dx = xOffset + (head.x + head.width / 2) * scale - door / 2, dy = yOffset + (head.y + head.depth) * scale;
              const gx = xOffset + (b.x + b.width / 2) * scale;
              return (
                <g key={b.id}>
                  {b.rooms.map(r => (
                    <rect key={r.room_id} x={xOffset + r.x * scale} y={yOffset + r.y * scale}
                      width={r.width * scale} height={r.depth * scale} fill="#f8fafc" />
                  ))}
                  {renderWalls(segs)}
                  {/* door opening on the wall facing the house */}
                  <rect x={dx} y={dy - WALL_PX.ext / 2 - 0.5} width={door} height={WALL_PX.ext + 1} fill="#ffffff" />
                  <path d={`M ${dx} ${dy} L ${dx} ${dy - door} A ${door} ${door} 0 0 1 ${dx + door} ${dy}`}
                    fill="none" stroke="#1e293b" strokeWidth={0.8} />
                  {b.rooms.map(r => {
                    // short name (brackets dropped), shrunk to the room's width
                    const name = resolveRoomName(r.room_id).replace(/\s*\(.*\)\s*/g, ' ').trim();
                    const fs = Math.max(4, Math.min(7, (r.width * scale - 4) / (name.length * 0.6)));
                    return (
                    <g key={`${r.room_id}-label`}>
                      <text x={xOffset + (r.x + r.width / 2) * scale} y={yOffset + (r.y + r.depth / 2) * scale - 3}
                        textAnchor="middle" style={{ fontSize: `${fs}px`, fontWeight: 800, fill: '#1e293b' }}>
                        {name}
                      </text>
                      <text x={xOffset + (r.x + r.width / 2) * scale} y={yOffset + (r.y + r.depth / 2) * scale + 7}
                        textAnchor="middle" style={{ fontSize: '6px', fontWeight: 600, fill: '#64748b' }}>
                        {r.width.toFixed(1)}M × {r.depth.toFixed(1)}M
                      </text>
                    </g>
                    );
                  })}
                  {/* gap to the house */}
                  <line x1={gx} y1={yOffset + (b.y + b.depth) * scale} x2={gx} y2={yOffset}
                    stroke="#64748b" strokeWidth={0.6} strokeDasharray="2 2" />
                  <text x={gx + 3} y={yOffset + (b.y + b.depth) * scale + 9}
                    style={{ fontSize: '6px', fontWeight: 700, fill: '#64748b' }}>
                    {(-(b.y + b.depth)).toFixed(1)}M
                  </text>
                </g>
              );
            })}

            {/* Structure overlay */}
            {renderStructure()}
          </g>
  );
};

// A floor shown alone gets a panel this wide (sheet units).
const PANEL_W = 720;
const SHEET_W = 1080, MAX_SCALE = 30, GUTTER = 80;

const AECFloorPlan: React.FC<AECFloorPlanProps> = ({ layout }) => {
  const [showStructure, setShowStructure] = useState(false);
  // 'sheet': every floor side by side at one scale, as on the template's
  // sheet; a number: that floor alone.
  const [view, setView] = useState<'sheet' | number>('sheet');

  if (!layout || !layout.placed_rooms || layout.placed_rooms.length === 0) return null;

  // ── BUG 1 FIX: plot_width / plot_depth ──────────────────────────────────────
  // The solver attaches these directly to solvedLayout. Guard against undefined
  // by falling back to derivation from brief_reference.plot_size_sqm.
  const plotSqm = layout.program_reference?.brief_reference?.plot_size_sqm ?? 2000;
  const plot_width  = (typeof layout.plot_width  === 'number' && !isNaN(layout.plot_width))
    ? layout.plot_width
    : Math.sqrt(plotSqm);
  const plot_depth  = (typeof layout.plot_depth  === 'number' && !isNaN(layout.plot_depth))
    ? layout.plot_depth
    : plotSqm / plot_width;

  const { placed_rooms } = layout;

  // ── BUG 2 FIX: storeys path ──────────────────────────────────────────────────
  // Old path: layout.program_reference.brief_reference.storeys
  // New Hive schema: layout.program_reference.brief_reference.floors
  // Guard both so this works with either schema version.
  const briefRef = layout.program_reference?.brief_reference ?? {};
  const storeys = (briefRef as any).storeys ?? (briefRef as any).floors ?? 1;
  const isDuplex = storeys > 1;

  const floors = isDuplex
    ? [...new Set(placed_rooms.map(r => r.floor))].sort((a, b) => a - b)
    : [0];
  const shown = view === 'sheet' || !isDuplex ? floors : [view];
  const sheet = shown.length > 1;

  // ── One frame for every floor shown: the same scale, rear walls on one line
  // (the BQ strip above the ground floor counts for all). Each floor has its
  // own panel, the drawing plus a GUTTER each side for the grid bubbles and
  // dimension chains, so the floors stand close together as on the template.
  // The scale fills the target width (one floor: PANEL_W; the sheet:
  // SHEET_W), up to MAX_SCALE (the labels are sized for 20–30 units a metre);
  // the sheet is never narrower than PANEL_W, so text never shows larger than
  // in a single floor's view, and it grows downwards as far as it needs.
  const obTop = (f: number) => f === 0 ? Math.max(0, ...(layout.outbuildings ?? []).map(b => -b.y)) : 0;
  const bounds = shown.map(f => floorBounds(layout, f, plot_width, plot_depth));
  const maxH = Math.max(...bounds.map(b => b.h));
  const top = Math.max(...shown.map(obTop));
  const metres = bounds.reduce((s, b) => s + b.w, 0);
  const gutters = shown.length * GUTTER * 2;
  const scale = Math.min(MAX_SCALE, ((sheet ? SHEET_W : PANEL_W) - gutters) / metres);
  const sheetW = Math.max(PANEL_W, metres * scale + gutters);
  const yOffset = top * scale + 40;
  const xOffsetOf = (k: number) => (sheetW - metres * scale - gutters) / 2
    + bounds.slice(0, k).reduce((s, b) => s + b.w * scale + GUTTER * 2, 0) + GUTTER;
  const bottom = yOffset + maxH * scale;
  // Under the drawings: the chains and bubbles (to +68), on the sheet the
  // floor names, then north arrow, scale bar and title block.
  const below = sheet ? 116 : 96;
  const sheetH = bottom + below + 30;

  // Generate structural skeleton
  const skeleton = useMemo(() => structuralEngine.generateSkeleton(layout), [layout]);

  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const resolveRoomName = (room_id: string): string => {
    if (room_id === 'stairwell_void') return 'STAIR VOID';
    if (room_id.startsWith('terrace_f')) return 'Terrace';
    const match = sourceRooms.find(r => r.room_id === room_id || r.id === room_id);
    return match?.name ?? room_id.replace(/_/g, ' ').toUpperCase();
  };

  const shownRooms = placed_rooms.filter(r => shown.includes(r.floor));
  // Safe total area — guard NaN per room (outbuildings count on the ground floor)
  const totalArea = [...shownRooms, ...(shown.includes(0) ? (layout.outbuildings ?? []).flatMap(b => b.rooms) : [])].reduce((acc, r) => {
    const area = r.width * r.depth;
    return acc + (isNaN(area) ? 0 : area);
  }, 0);

  const viewButton = (v: 'sheet' | number, label: string) => (
    <button
      key={String(v)}
      onClick={() => setView(v)}
      className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all ${
        view === v
          ? 'bg-white text-black shadow-sm'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] group bg-[#f8fafc] dark:bg-[#0a0c10]">
      <CardHeader className="bg-slate-900 dark:bg-black py-5 border-b dark:border-white/5 flex flex-row items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-inner">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white flex items-center gap-3">
              Derived Floor Plan (Solver Output)
              {isDuplex && (
                <div className="flex bg-white/10 rounded-full p-0.5 ml-2">
                  {viewButton('sheet', 'SHEET')}
                  {viewButton(0, 'GROUND FL.')}
                  {viewButton(1, 'UPPER FL.')}
                </div>
              )}
              <button
                onClick={() => setShowStructure(!showStructure)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] transition-all ${
                  showStructure
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20'
                }`}
              >
                <Layers className="w-3 h-3" />
                {showStructure ? 'STRUCTURAL GRID ON' : 'STRUCTURAL GRID OFF'}
              </button>
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                Procedurally Generated • Elev {shown.map(f => `+${f * 3.0}m`).join(' / ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black px-4 py-1.5 shadow-lg shadow-emerald-900/20">
            <CheckCircle2 className="w-3 h-3 mr-1.5" /> COMPILED
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={`relative bg-[#ffffff] dark:bg-[#0d0f14] ${sheet ? 'p-4 md:p-8 pb-20 md:pb-20' : 'p-12 md:p-20 min-h-[650px]'} flex items-center justify-center overflow-hidden`}>
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(200,210,220,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(200,210,220,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundColor: '#f8f9fa'
            }}
          />

          <svg
            viewBox={`0 0 ${sheetW} ${sheetH}`}
            className="w-full h-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.2)] relative z-10"
            style={{ maxWidth: sheet ? undefined : 900 }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="arch-grid" width={1 * scale} height={1 * scale} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${1 * scale} 0 L 0 0 0 ${1 * scale}`}
                  fill="none" stroke="currentColor" strokeWidth="0.5"
                  className="text-slate-200 dark:text-white/10"
                />
              </pattern>
              <filter id="blueprint-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="2" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.15" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Material hatching patterns */}
              <pattern id="hatch-concrete" width={6} height={6} patternUnits="userSpaceOnUse">
                <circle cx={3} cy={3} r={0.8} fill="#94a3b8" opacity={0.5} />
              </pattern>
              <pattern id="hatch-tile" width={8} height={8} patternUnits="userSpaceOnUse">
                <rect x={0} y={0} width={8} height={8} fill="none" stroke="#7dd3fc" strokeWidth={0.5} />
              </pattern>
              <pattern id="hatch-wood" width={6} height={3} patternUnits="userSpaceOnUse">
                <line x1={0} y1={1.5} x2={6} y2={1.5} stroke="#d97706" strokeWidth={0.4} opacity={0.4} />
              </pattern>
            </defs>

            {/* Background 1m grid */}
            <rect x="0" y="0" width={sheetW} height={sheetH} fill="url(#arch-grid)" />

            {shown.map((f, k) => (
              <FloorDrawing key={f} layout={layout} floor={f} scale={scale}
                xOffset={xOffsetOf(k)} yOffset={yOffset} showStructure={showStructure}
                skeleton={skeleton} plot_width={plot_width} plot_depth={plot_depth}
                showPlot={!sheet} captionY={sheet ? bottom + 88 : undefined} />
            ))}

            {/* North arrow — bottom-left */}
            <g transform={`translate(${xOffsetOf(0) + 12}, ${bottom + below})`}>
              <circle cx={0} cy={0} r={14} fill="white" stroke="#475569" strokeWidth={1} opacity={0.9} />
              {/* Arrow shaft */}
              <line x1={0} y1={-10} x2={0} y2={10} stroke="#1e293b" strokeWidth={1.5} />
              {/* Arrow north head (filled) */}
              <polygon points="0,-10 -4,-2 4,-2" fill="#1e293b" />
              {/* Arrow south head (open) */}
              <polygon points="0,10 -4,2 4,2" fill="white" stroke="#1e293b" strokeWidth={0.8} />
              <text x={0} y={-14} textAnchor="middle"
                style={{ fontSize: '7px', fontWeight: 900, fill: '#1e293b', letterSpacing: '0.1em' }}>
                N
              </text>
            </g>

            {/* Scale bar — bottom-right, shows 0–5m */}
            {(() => {
              const barM = 5; // metres represented
              const barPx = barM * scale;
              const last = shown.length - 1;
              const barX = xOffsetOf(last) + bounds[last].w * scale - barPx - 4;
              const barY = bottom + below;
              return (
                <g transform={`translate(${barX}, ${barY})`}>
                  {/* Alternating segments */}
                  <rect x={0}           y={-4} width={barPx / 2} height={6} fill="#1e293b" />
                  <rect x={barPx / 2}   y={-4} width={barPx / 2} height={6} fill="white" stroke="#1e293b" strokeWidth={0.8} />
                  {/* End ticks */}
                  <line x1={0}     y1={-6} x2={0}     y2={4} stroke="#1e293b" strokeWidth={1} />
                  <line x1={barPx} y1={-6} x2={barPx} y2={4} stroke="#1e293b" strokeWidth={1} />
                  {/* Labels */}
                  <text x={0}     y={-8} textAnchor="middle"
                    style={{ fontSize: '7px', fontWeight: 700, fill: '#1e293b' }}>0</text>
                  <text x={barPx} y={-8} textAnchor="middle"
                    style={{ fontSize: '7px', fontWeight: 700, fill: '#1e293b' }}>5m</text>
                </g>
              );
            })()}

            {/* Title block — below scale bar */}
            {(() => {
              const tbX = sheet ? sheetW / 2 : xOffsetOf(0) + bounds[0].w * scale / 2;
              const tbY = bottom + below + 16;
              const projectId = (layout as any).program_reference?.brief_reference?.project_id
                ?? (layout as any).program_reference?.brief_reference?.id
                ?? 'GS-PROJ';
              const floorLabel = shown.map(floorName).join(' & ');
              const dateStr = new Date().toISOString().slice(0, 10);
              return (
                <g>
                  <text x={tbX} y={tbY} textAnchor="middle"
                    style={{ fontSize: '8px', fontWeight: 900, fill: '#1e293b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {projectId} · PLOT {plot_width.toFixed(1)}M × {plot_depth.toFixed(1)}M · {floorLabel} · {dateStr}
                  </text>
                </g>
              );
            })()}
          </svg>

          <div className="absolute bottom-10 right-10">
            <div className="px-4 py-2 bg-white/10 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl backdrop-blur-xl">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Plot: {plot_width.toFixed(2)}m × {plot_depth.toFixed(2)}m
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-8 border-t dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
            {placed_rooms.filter(r => r.floor === shown[0]).slice(0, 6).map(room => {
              const name    = resolveRoomName(room.room_id);
              const area    = room.width * room.depth;
              const safeArea = isNaN(area) ? 0 : area;
              return (
                <div
                  key={room.room_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">
                      {name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-primary">
                      {safeArea.toFixed(1)}m²
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col justify-center border-l dark:border-white/5 pl-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Safety Factor</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">FS 1.5 Structural</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-end text-right">
            <div className="mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Floor Area</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">
                {totalArea.toFixed(2)}{' '}
                <span className="text-sm font-bold uppercase not-italic opacity-40">m²</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECFloorPlan;
