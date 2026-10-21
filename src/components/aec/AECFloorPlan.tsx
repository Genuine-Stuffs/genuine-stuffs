import React, { useState, useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { structuralEngine } from '@/lib/aec/solver/structural';
import { computeWalls, WALL_THICKNESS, WallRoomKind } from './walls';
import { planOpenings, openingSchedule, roomTypeOf, externalEdges, DOOR_ROOM, type OpeningType } from './openings';
import { sectionCut } from './section';
import { stairPlan, STAIR_STOREY_H } from './stair';
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

interface Box { x: number; y: number; w: number; h: number }
const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** The boxes of a furniture group's shapes, from their own attributes. */
const furnitureBoxes = (group: React.ReactNode): Box[] => {
  if (!React.isValidElement(group)) return [];
  const { children } = (group as React.ReactElement<{ children?: React.ReactNode }>).props;
  return React.Children.toArray(children).flatMap((el): Box[] => {
    if (!React.isValidElement(el)) return [];
    const p = el.props as Record<string, number>;
    switch (el.type) {
      case 'rect': return [{ x: p.x, y: p.y, w: p.width, h: p.height }];
      case 'circle': return [{ x: p.cx - p.r, y: p.cy - p.r, w: 2 * p.r, h: 2 * p.r }];
      case 'ellipse': return [{ x: p.cx - p.rx, y: p.cy - p.ry, w: 2 * p.rx, h: 2 * p.ry }];
      case 'line': return [{ x: Math.min(p.x1, p.x2), y: Math.min(p.y1, p.y2), w: Math.abs(p.x2 - p.x1), h: Math.abs(p.y2 - p.y1) }];
      default: return [];
    }
  });
};

/** Grid line letters: A…Z, then AA, AB… */
const gridLetter = (i: number): string => (i >= 26 ? gridLetter(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

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
  /** D1…/W1… for an opening type, the same on every floor (openings.ts). */
  tagOf: (t: OpeningType) => string;
}

/** Metres with feet and inches in brackets, as the templates dimension (T1–T10): 4.5m (14'-9"). */
const feet = (m: number) => { const inch = Math.round(m / 0.0254); return `${Math.floor(inch / 12)}'-${inch % 12}"`; };
/** The dimension label for a length that has `px` of drawing to sit in (metres alone when the feet don't fit). */
const dimLabel = (m: number, px: number) => { const both = `${+m.toFixed(2)}m (${feet(m)})`; return px >= both.length * 4.6 ? both : `${+m.toFixed(2)}m`; };

const FloorDrawing: React.FC<FloorDrawingProps> = ({
  layout, floor: activeFloor, scale, xOffset, yOffset, showStructure, skeleton,
  plot_width, plot_depth, showPlot, captionY, tagOf,
}) => {
  const { placed_rooms } = layout;
  const activeRooms = placed_rooms.filter(r => r.floor === activeFloor);
  // Outbuildings (BQ, generator house) stand behind the house on the ground
  // floor; their rooms have y < 0 in the house's frame. A gatehouse (at_gate)
  // stands in front, against the front boundary (y > the house's depth).
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
    if (room_id.startsWith('passage_')) return 'Passage';
    if (room_id.startsWith('atrium_')) return 'Open to Below';
    const match = sourceRooms.find(
      r => r.room_id === room_id || r.id === room_id
    );
    return match?.name ?? room_id.replace(/_/g, ' ').toUpperCase();
  };

  // Synthetic solver-placed rooms (corridor bands, stairwell) by id; the
  // rest by the Hive's own `type` (openings.ts).
  const resolveRoomType = (room_id: string): string => roomTypeOf(layout, room_id);

  // ── Doors and windows: decided once for the floor (openings.ts) ──────
  const openings = planOpenings(layout, activeFloor);
  const getExternalEdges = (room: any) => externalEdges(room, buildingW, buildingH, layout.placed_rooms.filter(q => q.floor === activeFloor));

  // The front door in sheet units: centred on the entry room's street
  // frontage, swinging in from the street.
  const entrance = openings.entrance && (() => {
    const e = openings.entrance, R = e.type.w * scale;
    const x0 = xOffset + e.x * scale - R / 2, y = yOffset + e.y * scale;
    return { ...e, R, x0, y, swing: { x: x0, y: y - R, w: R, h: R } as Box };
  })();

  // The kitchen's yard door in sheet units: its leaf `at` along the outside
  // wall, swinging in, its tag outside.
  const yard = openings.yard && (() => {
    const d = openings.yard, r = activeRooms.find(q => q.room_id === d.room_id);
    if (!r) return null;
    // (WALL_PX is set further down)
    const T = WALL_THICKNESS.ext * scale;
    const R = d.type.w * scale, rx = xOffset + r.x * scale, ry = yOffset + r.y * scale;
    if (d.wall === 'top') {
      const x0 = rx + d.at * scale;
      return { ...d, R, leaf: [x0, ry, x0, ry + R], arc: `M ${x0} ${ry + R} A ${R} ${R} 0 0 0 ${x0 + R} ${ry}`,
        gap: { x: x0, y: ry - T / 2 - 0.5, w: R, h: T + 1 }, tag: [x0 + R / 2, ry - 16], swing: { x: x0, y: ry, w: R, h: R } as Box };
    }
    const x = d.wall === 'left' ? rx : rx + r.width * scale, y0 = ry + d.at * scale, s = d.wall === 'left' ? 1 : -1;
    return { ...d, R, leaf: [x, y0, x + s * R, y0], arc: `M ${x + s * R} ${y0} A ${R} ${R} 0 0 ${s > 0 ? 0 : 1} ${x} ${y0 + R}`,
      gap: { x: x - T / 2 - 0.5, y: y0, w: T + 1, h: R }, tag: [x - s * 16, y0 + R / 2], swing: { x: s > 0 ? x : x - R, y: y0, w: R, h: R } as Box };
  })();

  // A tag as on the template: the type's name in a small circle.
  const renderTag = (tag: string, x: number, y: number) => tag ? (
    <g data-tag={tag} style={{ pointerEvents: 'none' }}>
      <circle cx={x} cy={y} r={7} fill="white" stroke="#1e293b" strokeWidth={0.6} />
      <text x={x} y={y + 2.2} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 700, fill: '#1e293b' }}>{tag}</text>
    </g>
  ) : null;

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
  const shortName = (room_id: string, fullName: string): string => {
    const t = resolveRoomType(room_id).toLowerCase();
    // a flat's rooms are named "Flat 3 Master Bedroom": the flat isn't the room
    const name = fullName.replace(/^(flat|unit|apartment|apt\.?)\s+\w+\s+/i, '');
    if (/toilet|wc|powder/.test(t) || /toilet|\bwc\b/i.test(name)) return 'WC';
    if (/bath|ensuite|shower/.test(t) || /bath/i.test(name)) return 'Bath';
    if (/wardrobe|closet/.test(t) || /wardrobe|closet/i.test(name)) return 'Ward.';
    if (t === 'stairwell') return 'Stair';
    if (/bedroom/.test(t)) return 'Bedroom';
    // "Master Private Balcony" is a balcony, not a "Master"
    if (/balcony|terrace|veranda|patio/.test(t) || /balcony|terrace|veranda|patio/i.test(name))
      return (name.match(/balcony|terrace|veranda|patio/i)?.[0] ?? 'Balcony').replace(/^./, c => c.toUpperCase());
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

  // ── Stair: the dog-leg in its stairwell (stair.ts; owner 2026-10-21) — two
  // flights and a half landing, the walking line from the hall end. Upstairs
  // the void shows the same stair with DN from its top.
  const isStair = (room: any) => room.room_id === 'stairwell' || room.room_id === 'stairwell_void';
  const groundStair = placed_rooms.find(r => r.floor === 0 && r.room_id === 'stairwell');

  const renderStair = (room: any) => {
    const up = room.room_id === 'stairwell';
    const sp = stairPlan(layout, up ? room : (groundStair ?? room));
    const X = (x: number) => xOffset + x * scale, Y = (y: number) => yOffset + y * scale;
    const c = '#334155';
    const lines: React.ReactNode[] = [];
    sp.flights.forEach((f, fi) => {
      const r = f.rect;
      lines.push(<rect key={`f${fi}`} x={X(r.x)} y={Y(r.y)} width={r.w * scale} height={r.h * scale} fill="none" stroke={c} strokeWidth={0.8} />);
      const n = Math.round(Math.abs(f.to - f.from) / sp.going);
      for (let k = 1; k < n; k++) {
        const v = f.from + Math.sign(f.to - f.from) * k * sp.going;
        lines.push(sp.alongX
          ? <line key={`t${fi}-${k}`} x1={X(v)} y1={Y(r.y)} x2={X(v)} y2={Y(r.y + r.h)} stroke={c} strokeWidth={0.7} />
          : <line key={`t${fi}-${k}`} x1={X(r.x)} y1={Y(v)} x2={X(r.x + r.w)} y2={Y(v)} stroke={c} strokeWidth={0.7} />);
      }
    });
    // the walking line: up the first flight, across the landing, up the second
    const mid = (f: typeof sp.flights[0]) => sp.alongX ? f.rect.y + f.rect.h / 2 : f.rect.x + f.rect.w / 2;
    const pt = (along: number, across: number) => sp.alongX ? [X(along), Y(across)] : [X(across), Y(along)];
    const inset = sp.going * 0.5;
    const f1 = sp.flights[0], f2 = sp.flights[1];
    const s1 = Math.sign(f1.to - f1.from);
    let path: number[][] = [pt(f1.from + s1 * inset, mid(f1))];
    if (f2 && sp.landing) {
      const lm = sp.alongX ? (Math.min(sp.landing.x, sp.landing.x + sp.landing.w) + sp.landing.w / 2) : sp.landing.y + sp.landing.h / 2;
      path.push(pt(lm, mid(f1)), pt(lm, mid(f2)), pt(f2.to - s1 * -inset, mid(f2)));
    } else path.push(pt(f1.to - s1 * inset, mid(f1)));
    if (!up) path = path.reverse();
    const [ax1, ay1] = path[path.length - 1], [bx, by] = path[path.length - 2];
    const L = Math.hypot(ax1 - bx, ay1 - by) || 1, dx = (ax1 - bx) / L, dy = (ay1 - by) / L, h = 5;
    const head = `M ${ax1} ${ay1} L ${ax1 - dx * h - dy * h * 0.6} ${ay1 - dy * h + dx * h * 0.6} L ${ax1 - dx * h + dy * h * 0.6} ${ay1 - dy * h - dx * h * 0.6} Z`;
    // the label just past the start of the walking line, away from the stair
    const [lx0, ly0] = path[0], [nx, ny] = path[1], ln = Math.hypot(lx0 - nx, ly0 - ny) || 1;
    const [lx, ly] = [lx0, ly0];
    const [tx, ty] = [lx0 + (lx0 - nx) / ln * 11, ly0 + (ly0 - ny) / ln * 11 + 3];
    return (
      <g data-stair={sp.kind} opacity={up ? 1 : 0.6} style={{ pointerEvents: 'none' }}>
        {sp.landing && <rect x={X(sp.landing.x)} y={Y(sp.landing.y)} width={sp.landing.w * scale} height={sp.landing.h * scale} fill="none" stroke={c} strokeWidth={0.8} />}
        {lines}
        <polyline points={path.map(p => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={1} />
        <path d={head} fill={c} />
        <circle cx={lx} cy={ly} r={1.8} fill={c} />
        <text x={tx} y={ty} textAnchor="middle" style={{ fontSize: '8px', fontWeight: 900, fill: c, letterSpacing: '0.08em' }}>
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
    const WIN_DEPTH = WALL_PX.ext; // window sits in the external wall

    // The door: a quarter along its wall at its real width, swinging into the
    // room; its tag past the leaf's free end, or before it when that's
    // outside the room.
    const dg = (() => {
      const door = openings.doors.get(room.room_id);
      if (!door) return null;
      const R = door.type.w * scale;
      const wall = door.wall;
      const horizontal = wall === 'top' || wall === 'bottom';
      const along = horizontal ? rw : rh;
      const start = door.at !== undefined ? door.at * scale : Math.max(0, Math.min(along * 0.25, along - R - 2));
      const tagAt = start + R + 9 <= along - 7 ? start + R + 9 : Math.max(7, start - 9);
      const inset = Math.min(9, (horizontal ? rh : rw) / 2);
      const dx = wall === 'right' ? rx + rw : wall === 'left' ? rx : rx + start;
      const dy = wall === 'bottom' ? ry + rh : wall === 'top' ? ry : ry + start;
      const [tagX, tagY] = wall === 'bottom' ? [rx + tagAt, dy - inset] : wall === 'top' ? [rx + tagAt, dy + inset]
        : wall === 'right' ? [dx - inset, ry + tagAt] : [dx + inset, ry + tagAt];
      const swing: Box = wall === 'bottom' ? { x: dx, y: dy - R, w: R, h: R } : wall === 'top' ? { x: dx, y: dy, w: R, h: R }
        : wall === 'right' ? { x: dx - R, y: dy, w: R, h: R } : { x: dx, y: dy, w: R, h: R };
      return { door, R, wall, dx, dy, tagX, tagY, swing, tag: { x: tagX - 7, y: tagY - 7, w: 14, h: 14 } };
    })();

    // ── Label place: the spot nearest the room's centre that is clear of
    // its furniture, door swing and door tag (least overlap when none is),
    // as the template sets names in the open floor beside the furniture.
    const dimsText = `${room.width.toFixed(1)}M × ${room.depth.toFixed(1)}M`;
    // A crowded room's last resort, as the template labels small baths: its
    // short name without dimensions ("Bath").
    const short = fitName(shortName(room.room_id, fullName));
    const variants = [
      { lines: nameLines, fs: nameFontSize, dims: showDims },
      ...(!isHallPiece && !compact ? [{ lines: short.nameLines, fs: short.nameFontSize, dims: false }] : []),
    ];
    const label = (() => {
      const cx = rx + rw / 2, cy = ry + rh / 2;
      const centre = { x: cx, y: cy, k: 1, v: variants[0], cost: 0 };
      if (isHallPiece) return centre;
      const obstacles: Box[] = [
        ...(rw > 35 && rh > 28 ? furnitureBoxes(renderFurniture(room, rx, ry, rw, rh)) : []),
        ...(dg ? [dg.swing, dg.tag] : []),
        ...(entrance?.room_id === room.room_id ? [entrance.swing] : []),
        ...(yard?.room_id === room.room_id ? [yard.swing] : []),
      ].map(b => ({ x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 4 }));
      if (!obstacles.length) return centre;
      const range = (lo: number, hi: number, mid: number) => {
        if (hi < lo) return [mid];
        const out: number[] = [];
        for (let v = lo; v <= hi + 1e-6; v += 3) out.push(v);
        return out;
      };
      // Full size first; smaller (never under 6 units) only where that is
      // what clears it, as the template sets small rooms' names small.
      const place = (v: typeof variants[0], k: number) => {
        const fs = v.fs * k, dfs = dimFontSize * k, lh = v.fs * 1.4 * k;
        const bw = Math.max(...v.lines.map(l => l.length * fs * 0.72), v.dims ? dimsText.length * dfs * 0.62 : 0);
        // the text block about its anchor: name lines above, dimensions below
        const up = (v.lines.length - 0.5) * lh + fs * 0.95; // a line's box: 0.95 em above its baseline
        const down = v.dims ? lh / 2 + dfs * 0.25 : -lh / 2 + fs * 0.25;
        let best = { ...centre, k, v, cost: Infinity };
        for (const x of range(rx + bw / 2 + 3, rx + rw - bw / 2 - 3, cx))
          for (const y of range(ry + up + 3, ry + rh - down - 3, cy)) {
            const b = { x: x - bw / 2, y: y - up, w: bw, h: up + down };
            const overlap = obstacles.reduce((a, o) => a + overlapArea(b, o), 0);
            const cost = overlap * 100 + Math.hypot(x - cx, y - (up - down) / 2 - cy);
            if (cost < best.cost) best = { x, y, k, v, cost };
          }
        return best;
      };
      // nothing clears it: the full name where it is least covered
      const first = place(variants[0], 1);
      if (first.cost < 100) return first;
      let least = first;
      for (const v of variants)
        for (const k of [1, 0.85, 0.72].filter(k => v.fs * k >= 6)) {
          if (v === variants[0] && k === 1) continue;
          const p = place(v, k);
          if (p.cost < 100) return p;
          if (v === variants[0] && p.cost < least.cost) least = p;
        }
      return least;
    })();
    const { x: labelX, y: labelY, k: labelK } = label;
    const labelLines = label.v.lines, labelFs = label.v.fs, labelDims = label.v.dims;

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

        {/* ── Open to below (double-volume void): balustrade outline and the opening's cross ── */}
        {room.room_id.startsWith('atrium_') && (
          <g data-atrium stroke="#475569" fill="none">
            <rect x={rx + 1.5} y={ry + 1.5} width={rw - 3} height={rh - 3} strokeWidth={1.2} />
            <path d={`M${rx + 1.5},${ry + 1.5} L${rx + rw - 1.5},${ry + rh - 1.5} M${rx + rw - 1.5},${ry + 1.5} L${rx + 1.5},${ry + rh - 1.5}`} strokeWidth={0.8} strokeDasharray="6 4" />
          </g>
        )}

        {/* ── Furniture ── */}
        {!showStructure && rw > 35 && rh > 28 && renderFurniture(room, rx, ry, rw, rh)}

      </g>
    );

    return (
      <g key={`over-${idx}`}>
        {/* ── Windows at their real width, centred on each external wall,
            tagged outside it ── */}
        {!showStructure && openings.windows.filter(wd => wd.room_id === room.room_id).map(wd => {
          const wc = '#0EA5E9'; // window colour
          const L = wd.type.w * scale, half = WIN_DEPTH / 2, g = WIN_DEPTH / 3;
          const horizontal = wd.wall === 'top' || wd.wall === 'bottom';
          // A gap in the external wall with two glazing lines.
          // centred, or where the yard door leaves room for it
          const mid = wd.at !== undefined ? wd.at * scale : (horizontal ? rw : rh) / 2;
          const x = horizontal ? rx + mid - L / 2 : (wd.wall === 'left' ? rx : rx + rw) - half;
          const y = horizontal ? (wd.wall === 'top' ? ry : ry + rh) - half : ry + mid - L / 2;
          const w = horizontal ? L : WIN_DEPTH, h = horizontal ? WIN_DEPTH : L;
          const out = 16;
          const [tx, ty] = wd.wall === 'top' ? [rx + mid, ry - out] : wd.wall === 'bottom' ? [rx + mid, ry + rh + out]
            : wd.wall === 'left' ? [rx - out, ry + mid] : [rx + rw + out, ry + mid];
          return (
            <g key={`win-${wd.wall}`} opacity={0.9}>
              <rect x={x} y={y} width={w} height={h} fill="white" stroke={wc} strokeWidth={0.8} />
              {horizontal
                ? [g, 2 * g].map(o => <line key={o} x1={x} y1={y + o} x2={x + w} y2={y + o} stroke={wc} strokeWidth={0.6} />)
                : [g, 2 * g].map(o => <line key={o} x1={x + o} y1={y} x2={x + o} y2={y + h} stroke={wc} strokeWidth={0.6} />)}
              {renderTag(tagOf(wd.type), tx, ty)}
            </g>
          );
        })}

        {/* ── Stair: treads and arrow instead of a door and a name ── */}
        {isStair(room) && !showStructure && renderStair(room)}

        {/* ── Door at its real width, a quarter along its wall, tagged
            beside its swing inside the room ── */}
        {dg && (() => {
          const { R: actualR, wall: doorWall, dx, dy } = dg;
          const wallColor = '#475569';
          // The opening: cut the wall band the width of the leaf.
          const t = (edges[doorWall] ? WALL_PX.ext : WALL_PX.int) + 1;
          const cut = (x: number, y: number, w: number, h: number) =>
            <rect x={x} y={y} width={w} height={h} fill="white" />;
          const tag = renderTag(tagOf(dg.door.type), dg.tagX, dg.tagY);

          if (doorWall === 'bottom') return (
            <g>
              {cut(dx, dy - t / 2, actualR, t)}
              <line x1={dx} y1={dy} x2={dx} y2={dy - actualR}
                stroke={wallColor} strokeWidth={1.5} />
              <path d={`M ${dx} ${dy - actualR} A ${actualR} ${actualR} 0 0 1 ${dx + actualR} ${dy}`}
                fill="none" stroke={wallColor} strokeWidth={0.8} />
              {tag}
            </g>
          );
          if (doorWall === 'top') return (
            <g>
              {cut(dx, dy - t / 2, actualR, t)}
              <line x1={dx} y1={dy} x2={dx} y2={dy + actualR}
                stroke={wallColor} strokeWidth={1.5} />
              <path d={`M ${dx} ${dy + actualR} A ${actualR} ${actualR} 0 0 0 ${dx + actualR} ${dy}`}
                fill="none" stroke={wallColor} strokeWidth={0.8} />
              {tag}
            </g>
          );
          if (doorWall === 'right') return (
            <g>
              {cut(dx - t / 2, dy, t, actualR)}
              <line x1={dx} y1={dy} x2={dx - actualR} y2={dy}
                stroke={wallColor} strokeWidth={1.5} />
              <path d={`M ${dx - actualR} ${dy} A ${actualR} ${actualR} 0 0 1 ${dx} ${dy + actualR}`}
                fill="none" stroke={wallColor} strokeWidth={0.8} />
              {tag}
            </g>
          );
          // left wall
          return (
            <g>
              {cut(dx - t / 2, dy, t, actualR)}
              <line x1={dx} y1={dy} x2={dx + actualR} y2={dy}
                stroke={wallColor} strokeWidth={1.5} />
              <path d={`M ${dx + actualR} ${dy} A ${actualR} ${actualR} 0 0 0 ${dx} ${dy + actualR}`}
                fill="none" stroke={wallColor} strokeWidth={0.8} />
              {tag}
            </g>
          );
        })()}

        {/* ── Label ── */}
        {showLabel && !isStair(room) && (
          <text textAnchor="middle" style={{ pointerEvents: 'none' }}>
            {labelLines.map((line, i) => (
              <tspan
                key={i}
                x={labelX}
                y={labelY - ((labelLines.length - i) - 0.5) * labelFs * 1.4 * labelK}
                style={{
                  fontSize: `${labelFs * labelK}px`,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  fill: textColor,
                }}
              >
                {line}
              </tspan>
            ))}
            {labelDims && <tspan
              x={labelX}
              y={labelY + labelFs * 0.7 * labelK}
              style={{
                fontSize: `${dimFontSize * labelK}px`,
                fontWeight: 700,
                fill: stroke,
              }}
            >
              {dimsText}
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
          // a hall's long-span member (truss / portal frame), or a car space's transfer beam: drawn heavier, with its span
          if (beam.kind === 'long_span' || beam.kind === 'transfer') return (
            <g key={beam.id} data-long-span>
              <rect x={x - (beam.end_x === beam.start_x ? halfCol * 2 : 0)} y={y - (beam.end_y === beam.start_y ? halfCol * 2 : 0)}
                width={beam.end_x === beam.start_x ? w * 2 : w} height={beam.end_y === beam.start_y ? h * 2 : h}
                className={beam.kind === 'transfer' ? "fill-orange-500/25 stroke-orange-700 stroke-[2]" : "fill-violet-500/25 stroke-violet-700 stroke-[2]"} />
              {/* along its member: members side by side keep their labels apart */}
              <text transform={beam.end_x === beam.start_x
                  ? `translate(${x - 5}, ${y + (beam.end_y - beam.start_y) * scale / 2}) rotate(-90)`
                  : `translate(${x + (beam.end_x - beam.start_x) * scale / 2}, ${y - 5})`}
                textAnchor="middle" style={{ fontSize: '7px', fontWeight: 800, fill: beam.kind === 'transfer' ? '#c2410c' : '#5b21b6' }}>
                {beam.kind === 'transfer' ? `TRANSFER BEAM ${beam.span_m.toFixed(1)} m, MIN ${Math.round(beam.depth_m * 1000)} mm DEEP` : `LONG-SPAN TRUSS ${beam.span_m.toFixed(1)} m`}
              </text>
            </g>
          );
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
        {/* a long-span hall that needs an engineer's eye: beyond the range, or carrying columns above */}
        {(skeleton?.halls ?? []).filter(h => h.floor === activeFloor && (!h.within_range || h.columns_above)).map(h => {
          const r = layout.placed_rooms.find(q => q.room_id === h.room_id && q.floor === h.floor);
          if (!r) return null;
          const lines = [
            ...(!h.within_range ? [`${+h.span_m.toFixed(1)} m SPAN: BEYOND THE LONG-SPAN RANGE`] : []),
            ...(h.columns_above ? [h.car ? `NO COLUMNS IN THE PARKING: ${h.columns_above} COLUMN${h.columns_above > 1 ? 'S' : ''} ABOVE ON A TRANSFER BEAM` : `CARRIES ${h.columns_above} COLUMN${h.columns_above > 1 ? 'S' : ''} ABOVE: TRANSFER STRUCTURE`] : []),
          ];
          const cx = xOffset + (r.x + r.width / 2) * scale, top = yOffset + r.y * scale + 14;
          return (
            <g key={`hall-${h.room_id}`} data-hall-flag>
              <rect x={cx - 150} y={top - 10} width={300} height={lines.length * 11 + 6} rx={3} fill="#fef2f2" stroke="#dc2626" strokeWidth={1} />
              {lines.map((t, i) => (
                <text key={i} x={cx} y={top + i * 11} textAnchor="middle" style={{ fontSize: '7.5px', fontWeight: 800, fill: '#b91c1c' }}>{t}</text>
              ))}
            </g>
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
              const ink = '#475569', red = '#b91c1c', R = 8, AT = 70;
              const X = (m: number) => xOffset + m * scale, Y = (m: number) => yOffset + m * scale;
              const bot = Y(buildingH), left = X(0);
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
                      ? <text key={`d${i}`} x={m} y={bot + off - 3} textAnchor="middle" style={text}>{dimLabel(p - ps[i], (p - ps[i]) * scale)}</text>
                      : <text key={`d${i}`} x={left - off - 3} y={m} textAnchor="middle" transform={`rotate(-90, ${left - off - 3}, ${m})`} style={text}>{dimLabel(p - ps[i], (p - ps[i]) * scale)}</text>;
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
                    <g key={`gx${i}`} data-bubble={gridLetter(i)}>
                      <line x1={X(x)} y1={bot} x2={X(x)} y2={bot + AT - R} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                      {bubble(X(x), bot + AT, gridLetter(i))}
                    </g>
                  ))}
                  {g && ys.map((y, i) => (
                    <g key={`gy${i}`} data-bubble={i + 1}>
                      <line x1={left} y1={Y(y)} x2={left - AT + R} y2={Y(y)} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                      {bubble(left - AT, Y(y), String(i + 1))}
                    </g>
                  ))}
                  {chain(xs, 36, true, 'bays-x')}
                  {xs.length > 2 && chain(extent(xs), 52, true, 'total-x')}
                  {chain(ys, 36, false, 'bays-y')}
                  {ys.length > 2 && chain(extent(ys), 52, false, 'total-y')}
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

            {/* Front door: a gap in the street wall, the leaf swinging in, its tag outside */}
            {entrance && !showStructure && (
              <g data-entrance={entrance.room_id}>
                <rect x={entrance.x0} y={entrance.y - WALL_PX.ext / 2 - 0.5} width={entrance.R} height={WALL_PX.ext + 1} fill="white" />
                <line x1={entrance.x0} y1={entrance.y} x2={entrance.x0} y2={entrance.y - entrance.R} stroke="#1e293b" strokeWidth={1.5} />
                <path d={`M ${entrance.x0} ${entrance.y - entrance.R} A ${entrance.R} ${entrance.R} 0 0 1 ${entrance.x0 + entrance.R} ${entrance.y}`}
                  fill="none" stroke="#1e293b" strokeWidth={0.8} />
                {renderTag(tagOf(entrance.type), entrance.x0 + entrance.R / 2, entrance.y + 16)}
              </g>
            )}

            {/* Kitchen yard door: a gap in the outside wall, the leaf swinging in, its tag outside */}
            {yard && !showStructure && (
              <g data-yard={yard.room_id} data-wall={yard.wall}>
                <rect x={yard.gap.x} y={yard.gap.y} width={yard.gap.w} height={yard.gap.h} fill="white" />
                <line x1={yard.leaf[0]} y1={yard.leaf[1]} x2={yard.leaf[2]} y2={yard.leaf[3]} stroke="#1e293b" strokeWidth={1.5} />
                <path d={yard.arc} fill="none" stroke="#1e293b" strokeWidth={0.8} />
                {renderTag(tagOf(yard.type), yard.tag[0], yard.tag[1])}
              </g>
            )}

            {/* Garage vehicle doors: a gap in the outside wall, the overhead door dashed inside, its tag outside */}
            {!showStructure && openings.vehicles.map(v => {
              const r = activeRooms.find(q => q.room_id === v.room_id);
              if (!r) return null;
              const T = WALL_PX.ext, w = v.type.w * scale, a = v.at * scale, IN = 6, OUT = 16;
              const rx = xOffset + r.x * scale, ry = yOffset + r.y * scale, rw = r.width * scale, rh = r.depth * scale;
              const horizontal = v.wall === 'top' || v.wall === 'bottom';
              const edge = v.wall === 'bottom' ? ry + rh : v.wall === 'top' ? ry : v.wall === 'left' ? rx : rx + rw;
              const sgn = v.wall === 'bottom' || v.wall === 'right' ? -1 : 1; // into the room
              const s0 = (horizontal ? rx : ry) + a, s1 = s0 + w;
              const gap = horizontal ? { x: s0, y: edge - T / 2 - 0.5, width: w, height: T + 1 } : { x: edge - T / 2 - 0.5, y: s0, width: T + 1, height: w };
              const tag: [number, number] = horizontal ? [(s0 + s1) / 2, edge - sgn * OUT] : [edge - sgn * OUT, (s0 + s1) / 2];
              return (
                <g key={`veh-${v.room_id}`} data-vehicle-door={v.room_id} data-wall={v.wall}>
                  <rect {...gap} fill="white" />
                  {/* an open carport side: the gap only, no door */}
                  {!v.open && (horizontal
                    ? <line x1={s0} y1={edge + sgn * IN} x2={s1} y2={edge + sgn * IN} stroke="#1e293b" strokeWidth={0.8} strokeDasharray="4 2" />
                    : <line x1={edge + sgn * IN} y1={s0} x2={edge + sgn * IN} y2={s1} stroke="#1e293b" strokeWidth={0.8} strokeDasharray="4 2" />)}
                  {!v.open && renderTag(tagOf(v.type), tag[0], tag[1])}
                </g>
              );
            })}

            {/* Outbuildings: each its own walls, rooms, door towards the house and the 3 m gap */}
            {outbuildings.map(b => {
              const segs = computeWalls(b.rooms.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: 'room' as WallRoomKind })));
              const head = b.rooms[0];
              const door = DOOR_ROOM.w * scale;
              // the door faces the house: a BQ's on its front wall, a gatehouse's on its rear wall
              const gate = !!b.at_gate;
              const dx = xOffset + (head.x + head.width / 2) * scale - door / 2, dy = yOffset + (gate ? head.y : head.y + head.depth) * scale;
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
                  <path d={gate ? `M ${dx} ${dy} L ${dx} ${dy + door} A ${door} ${door} 0 0 0 ${dx + door} ${dy}` : `M ${dx} ${dy} L ${dx} ${dy - door} A ${door} ${door} 0 0 1 ${dx + door} ${dy}`}
                    fill="none" stroke="#1e293b" strokeWidth={0.8} />
                  {renderTag(tagOf(DOOR_ROOM), gate ? dx - 9 : dx + door + 9, gate ? dy + 9 : dy - 9)}
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
                  {/* gap to the house (a gatehouse: to the house front) */}
                  {gate ? (<>
                    <line x1={gx} y1={yOffset + buildingH * scale} x2={gx} y2={yOffset + b.y * scale}
                      stroke="#64748b" strokeWidth={0.6} strokeDasharray="2 2" />
                    <text x={gx + 3} y={yOffset + b.y * scale - 4}
                      style={{ fontSize: '6px', fontWeight: 700, fill: '#64748b' }}>
                      {(b.y - buildingH).toFixed(1)}M
                    </text>
                  </>) : (<>
                    <line x1={gx} y1={yOffset + (b.y + b.depth) * scale} x2={gx} y2={yOffset}
                      stroke="#64748b" strokeWidth={0.6} strokeDasharray="2 2" />
                    <text x={gx + 3} y={yOffset + (b.y + b.depth) * scale + 9}
                      style={{ fontSize: '6px', fontWeight: 700, fill: '#64748b' }}>
                      {(-(b.y + b.depth)).toFixed(1)}M
                    </text>
                  </>)}
                </g>
              );
            })}

            {/* Outbuildings' own grids: bubbles carrying on the house's series
                (letters above each, numbers on its left), a chain of its bays */}
            {activeFloor === 0 && (() => {
              let nx = skeleton.grid?.xs.length ?? 0, ny = skeleton.grid?.ys.length ?? 0;
              const ink = '#475569', red = '#b91c1c', R = 8;
              const text = { fontSize: '8px', fontWeight: 700, fill: '#1e293b' } as const;
              // a gatehouse is a booth: no grid of its own on the drawing
              const gates = new Set((layout.outbuildings ?? []).filter(b => b.at_gate).map(b => b.id));
              return skeleton.outbuildings.map(o => {
                if (!o.grid || gates.has(o.id)) return null;
                const xs = o.grid.xs.map(v => xOffset + (o.x + v) * scale), ys = o.grid.ys.map(v => yOffset + (o.y + v) * scale);
                const top = ys[0], left = xs[0];
                const lx = nx, ly = ny;
                nx += xs.length; ny += ys.length;
                const bubble = (cx: number, cy: number, label: string) => (
                  <g key={label} data-bubble={label}>
                    <circle cx={cx} cy={cy} r={R} fill="white" stroke={red} strokeWidth={0.8} />
                    <text x={cx} y={cy + 3} textAnchor="middle" style={{ fontSize: '8px', fontWeight: 700, fill: red }}>{label}</text>
                  </g>
                );
                return (
                  <g key={o.id} className="grid-dimensions" data-outbuilding={o.id}>
                    {xs.map((x, i) => (
                      <g key={`x${i}`}>
                        <line x1={x} y1={top} x2={x} y2={top - 40 + R} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                        {bubble(x, top - 40, gridLetter(lx + i))}
                      </g>
                    ))}
                    {ys.map((y, i) => (
                      <g key={`y${i}`}>
                        <line x1={left} y1={y} x2={left - 24 + R} y2={y} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="6 2 1 2" />
                        {bubble(left - 24, y, String(ly + i + 1))}
                      </g>
                    ))}
                    <line x1={xs[0]} y1={top - 16} x2={xs[xs.length - 1]} y2={top - 16} stroke={ink} strokeWidth={0.6} />
                    {xs.map((x, i) => <line key={`t${i}`} x1={x - 3} y1={top - 13} x2={x + 3} y2={top - 19} stroke={ink} strokeWidth={1} />)}
                    {xs.slice(1).map((x, i) => (
                      <text key={`d${i}`} x={(xs[i] + x) / 2} y={top - 19} textAnchor="middle" style={text}>
                        {dimLabel((x - xs[i]) / scale, x - xs[i])}
                      </text>
                    ))}
                  </g>
                );
              });
            })()}

            {/* the section line A–A (through the stair), as the templates mark it on every plan */}
            {(() => {
              const c = sectionCut(layout);
              if (!c) return null;
              const ink = '#b91c1c', over = 15; // px past the outline: inside the dimension chains and their labels
              const P = (x: number, y: number) => [xOffset + x * scale, yOffset + y * scale] as const;
              const [s0, s1] = c.axis === 'x' ? [P(c.at, 0), P(c.at, c.length)] : [P(0, c.at), P(c.length, c.at)];
              const ends = c.axis === 'x' ? [[s0[0], s0[1] - over], [s1[0], s1[1] + over]] : [[s0[0] - over, s0[1]], [s1[0] + over, s1[1]]];
              // looking towards the plan's left (a cut along y) or towards the rear (a cut along x)
              const [dx, dy] = c.axis === 'x' ? [-1, 0] : [0, -1];
              return (
                <g data-section-line style={{ pointerEvents: 'none' }}>
                  <line x1={ends[0][0]} y1={ends[0][1]} x2={ends[1][0]} y2={ends[1][1]} stroke={ink} strokeWidth={0.9} strokeDasharray="10 3 2 3" />
                  {ends.map(([x, y], i) => (
                    <g key={i}>
                      <polygon points={`${x + dx * 13},${y + dy * 13} ${x + dx * 5 - dy * 4},${y + dy * 5 - dx * 4} ${x + dx * 5 + dy * 4},${y + dy * 5 + dx * 4}`} fill={ink} />
                      <circle cx={x} cy={y} r={6} fill="white" stroke={ink} strokeWidth={1} />
                      <text x={x} y={y + 2.6} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 900, fill: ink }}>A</text>
                    </g>
                  ))}
                </g>
              );
            })()}

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
  // a gatehouse at the plot's front corner may stand further left than the ground floor's gutter
  const gateLeft = shown[0] === 0 ? Math.max(0, ...(layout.outbuildings ?? []).filter(b => b.at_gate).map(b => -b.x)) : 0;
  const extraLeft = Math.max(0, gateLeft * scale + 8 - GUTTER);
  const sheetW = Math.max(PANEL_W, metres * scale + gutters + extraLeft);
  // room above for the outbuildings' bubbles
  const yOffset = top * scale + (top > 0 ? 60 : 40);
  const xOffsetOf = (k: number) => (sheetW - metres * scale - gutters - extraLeft) / 2 + extraLeft
    + bounds.slice(0, k).reduce((s, b) => s + b.w * scale + GUTTER * 2, 0) + GUTTER;
  // a gatehouse stands in the front setback, below the ground floor's drawing
  const gateFront = shown.includes(0) ? Math.max(0, ...(layout.outbuildings ?? []).filter(b => b.at_gate).map(b => b.y + b.depth)) : 0;
  const bottom = yOffset + Math.max(maxH * scale, gateFront > 0 ? gateFront * scale + 24 : 0);
  // Under the drawings: window tags (to +23), the chains and bubbles (to
  // +78), on the sheet the floor names, then north arrow, scale bar, title
  // block and the door and window schedule.
  const below = sheet ? 124 : 104;
  const schedule = openingSchedule(layout);
  const SCHED_ROW = 16;
  const schedRows = Math.max(...(['D', 'W'] as const).map(k => schedule.rows.filter(r => r.type.kind === k).length), 0);
  const schedY = bottom + below + 42;
  const sheetH = schedY + schedRows * SCHED_ROW + 20;

  // Generate structural skeleton
  const skeleton = useMemo(() => structuralEngine.generateSkeleton(layout), [layout]);

  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const resolveRoomName = (room_id: string): string => {
    if (room_id === 'stairwell_void') return 'STAIR VOID';
    if (room_id.startsWith('terrace_f')) return 'Terrace';
    if (room_id.startsWith('passage_')) return 'Passage';
    if (room_id.startsWith('atrium_')) return 'Open to Below';
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
              Floor Plan (Drawn by Our AI)
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
                {showStructure ? 'COLUMNS & BEAMS SHOWN' : 'SHOW COLUMNS & BEAMS'}
              </button>
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                Drawn automatically • Floor levels {shown.map(f => f === 0 ? '±0.00' : `+${(f * STAIR_STOREY_H).toFixed(2)}`).join(' / ')} m
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black px-4 py-1.5 shadow-lg shadow-emerald-900/20">
            <CheckCircle2 className="w-3 h-3 mr-1.5" /> READY
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
                showPlot={!sheet} captionY={sheet ? bottom + 96 : undefined} tagOf={schedule.tagOf} />
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

            {/* Door and window schedule, as on the template: each tag's size */}
            {(() => {
              const cx = sheetW / 2;
              const col = (k: 'D' | 'W', x: number, title: string) => (
                <g key={k}>
                  <text x={x} y={schedY - 12} style={{ fontSize: '7px', fontWeight: 900, fill: '#64748b', letterSpacing: '0.15em' }}>{title}</text>
                  {schedule.rows.filter(r => r.type.kind === k).map((r, i) => {
                    const y = schedY + i * SCHED_ROW;
                    return (
                      <g key={r.tag} data-schedule-row={r.tag}>
                        <circle cx={x + 7} cy={y} r={7} fill="white" stroke="#1e293b" strokeWidth={0.6} />
                        <text x={x + 7} y={y + 2.2} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 700, fill: '#1e293b' }}>{r.tag}</text>
                        <text x={x + 20} y={y + 3} style={{ fontSize: '8px', fontWeight: 600, fill: '#1e293b' }}>
                          {r.type.w} × {r.type.h} m
                        </text>
                        <text x={x + 82} y={y + 3} style={{ fontSize: '7px', fontWeight: 600, fill: '#64748b' }}>× {r.count}</text>
                      </g>
                    );
                  })}
                </g>
              );
              return schedule.rows.length ? (
                <g className="opening-schedule">
                  {col('D', cx - 130, 'DOORS')}
                  {col('W', cx + 20, 'WINDOWS')}
                </g>
              ) : null;
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
                <p className="text-xs font-black text-slate-900 dark:text-white">FS (factor of safety) 1.5 for the structure</p>
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
