import React, { useState, useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { computePlacement, DoorSpec, WindowSpec, WallSide } from '@/lib/aec/solver/engine_v2/doors';
import { structuralEngine } from '@/lib/aec/solver/structural';
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

const getRoomFill = (room_id: string) => {
  const id = room_id.toLowerCase();
  const key = Object.keys(ROOM_FILLS).find(k => id.includes(k));
  return ROOM_FILLS[key ?? 'default'];
};

interface AECFloorPlanProps {
  layout?: SolvedLayout;
}

const AECFloorPlan: React.FC<AECFloorPlanProps> = ({ layout }) => {
  const [showStructure, setShowStructure] = useState(false);
  const [activeFloor, setActiveFloor] = useState(0);

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

  // Filter rooms by active floor
  const activeRooms = placed_rooms.filter(r => r.floor === activeFloor);

  // ── BUILDING BOUNDING BOX ─────────────────────────────────────────────────
  // Scale the SVG to the building footprint, not the full plot boundary.
  // The plot boundary renders as a faint context outline behind the rooms.
  // This keeps land parcel data intact while filling the canvas with building.
  const buildingRight  = activeRooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
  const buildingBottom = activeRooms.reduce((max, r) => Math.max(max, r.y + r.depth), 0);
  const buildingW = buildingRight  > 0 ? buildingRight  : plot_width;
  const buildingH = buildingBottom > 0 ? buildingBottom : plot_depth;

  const padding = 2;
  const viewWidth  = buildingW + padding * 2;
  const viewHeight = buildingH + padding * 2;
  const scale = Math.min(620 / viewWidth, 420 / viewHeight);

  const xOffset = (720 - (buildingW * scale)) / 2;
  const yOffset = (480 - (buildingH * scale)) / 2;

  // Generate structural skeleton
  const skeleton = useMemo(() => structuralEngine.generateSkeleton(layout), [layout]);
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
    const match = sourceRooms.find(
      r => r.room_id === room_id || r.id === room_id
    );
    return match?.name ?? room_id.replace(/_/g, ' ').toUpperCase();
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

      const isCorridor = neighbour.room_id.toLowerCase().includes('corridor') ||
                         neighbour.room_id.toLowerCase().includes('hall') ||
                         neighbour.room_id.toLowerCase().includes('foyer') ||
                         neighbour.room_id.toLowerCase().includes('landing') ||
                         neighbour.room_id.toLowerCase().includes('stair');

      const isLivingNeighbour =
        neighbour.room_id.toLowerCase().includes('living') ||
        neighbour.room_id.toLowerCase().includes('lounge') ||
        neighbour.room_id.toLowerCase().includes('dining') ||
        neighbour.room_id.toLowerCase().includes('family');

      const isServiceNeighbour =
        neighbour.room_id.toLowerCase().includes('bath') ||
        neighbour.room_id.toLowerCase().includes('wc') ||
        neighbour.room_id.toLowerCase().includes('toilet') ||
        neighbour.room_id.toLowerCase().includes('wet') ||
        neighbour.room_id.toLowerCase().includes('store') ||
        neighbour.room_id.toLowerCase().includes('garage');

      // Bathrooms open into their parent bedroom (score 9), not toward corridor
      const isBedroomNeighbour =
        neighbour.room_id.toLowerCase().includes('bedroom') ||
        neighbour.room_id.toLowerCase().includes('master') ||
        neighbour.room_id.toLowerCase().includes('suite');
      const currentRoomIsBath =
        room.room_id.toLowerCase().includes('bath') ||
        room.room_id.toLowerCase().includes('wc') ||
        room.room_id.toLowerCase().includes('toilet');

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
      x: r.x, y: r.y, width: r.width, depth: r.depth,
    }));
    return computePlacement(rects, buildingW, buildingH);
  }, [activeRooms, buildingW, buildingH]);

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
    const id = room.room_id.toLowerCase();
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

  const renderRoom = (room: any, idx: number) => {
    if (isNaN(room.x) || isNaN(room.y) || isNaN(room.width) || isNaN(room.depth) ||
        room.width <= 0 || room.depth <= 0) return null;

    const rx = xOffset + (room.x * scale);
    const ry = yOffset + (room.y * scale);
    const rw = room.width * scale;
    const rh = room.depth * scale;

    const name = resolveRoomName(room.room_id);
    const minDim = Math.min(rw, rh);
    
    // Dynamic font: scales with room, hard floors to stay readable
    const nameFontSize = Math.max(8, Math.min(14, minDim * 0.12));
    const dimFontSize  = Math.max(7, Math.min(11, minDim * 0.09));
    const lineHeight   = nameFontSize * 1.4;

    // Only show label if room is large enough to hold it
    const showLabel = rw > 40 && rh > 30;

    const { fill, stroke, textColor } = getRoomFill(room.room_id);
    const isCorridorOrVoid = room.room_id.toLowerCase().includes('corridor') ||
                             room.room_id.toLowerCase().includes('void');

    const edges = getExternalEdges(room);
    // Wall band thickness in px: external=5, internal=2
    const EXT_W = 5;
    const INT_W = 1.5;
    // Window symbol constants
    const WIN_INSET = 8;   // px inset from room corner
    const WIN_LEN   = Math.min(rw * 0.45, 40); // window length along wall
    const WIN_DEPTH = 5;   // px depth of window recess symbol
    // Door arc radius in px
    const DOOR_R = Math.min(rw * 0.18, 16);

    // Door placement: open toward building interior (bottom or right edge of room)
    // If room touches bottom of building, door opens upward from top internal edge
    // Otherwise door opens from bottom internal edge
    const doorOnTop    = edges.bottom && !edges.top;
    const doorOnLeft   = edges.right  && !edges.left;
    const doorX = doorOnLeft ? rx + INT_W : rx + INT_W;
    const doorY = doorOnTop  ? ry + INT_W : ry + rh - DOOR_R - INT_W;

    return (
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

        {/* ── Wall bands — drawn as filled rectangles per edge ── */}
        {!isCorridorOrVoid && (() => {
          const tw = edges.top    ? EXT_W : INT_W;
          const bw = edges.bottom ? EXT_W : INT_W;
          const lw = edges.left   ? EXT_W : INT_W;
          const rw2 = edges.right  ? EXT_W : INT_W;
          const wallColor = '#1e293b';
          return (
            <g opacity={showStructure ? 0.4 : 1}>
              {/* Top wall */}
              <rect x={rx} y={ry} width={rw} height={tw} fill={wallColor} />
              {/* Bottom wall */}
              <rect x={rx} y={ry + rh - bw} width={rw} height={bw} fill={wallColor} />
              {/* Left wall */}
              <rect x={rx} y={ry} width={lw} height={rh} fill={wallColor} />
              {/* Right wall */}
              <rect x={rx + rw - rw2} y={ry} width={rw2} height={rh} fill={wallColor} />
            </g>
          );
        })()}

        {/* ── Window symbols on external walls ── */}
        {!isCorridorOrVoid && !showStructure && rw > 40 && rh > 30 && (() => {
          const wins: React.ReactNode[] = [];
          const wc = '#0EA5E9'; // window colour
          // Top external wall window
          if (edges.top && rw > WIN_INSET * 2 + WIN_LEN) {
            const wx = rx + (rw - WIN_LEN) / 2;
            wins.push(
              <g key="win-top">
                <rect x={wx} y={ry} width={WIN_LEN} height={WIN_DEPTH}
                  fill="white" stroke={wc} strokeWidth={0.8} />
                <line x1={wx} y1={ry} x2={wx} y2={ry + WIN_DEPTH}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={wx + WIN_LEN / 2} y1={ry} x2={wx + WIN_LEN / 2} y2={ry + WIN_DEPTH}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={wx + WIN_LEN} y1={ry} x2={wx + WIN_LEN} y2={ry + WIN_DEPTH}
                  stroke={wc} strokeWidth={0.6} />
              </g>
            );
          }
          // Bottom external wall window
          if (edges.bottom && rw > WIN_INSET * 2 + WIN_LEN) {
            const wx = rx + (rw - WIN_LEN) / 2;
            wins.push(
              <g key="win-bot">
                <rect x={wx} y={ry + rh - WIN_DEPTH} width={WIN_LEN} height={WIN_DEPTH}
                  fill="white" stroke={wc} strokeWidth={0.8} />
                <line x1={wx} y1={ry + rh - WIN_DEPTH} x2={wx} y2={ry + rh}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={wx + WIN_LEN / 2} y1={ry + rh - WIN_DEPTH} x2={wx + WIN_LEN / 2} y2={ry + rh}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={wx + WIN_LEN} y1={ry + rh - WIN_DEPTH} x2={wx + WIN_LEN} y2={ry + rh}
                  stroke={wc} strokeWidth={0.6} />
              </g>
            );
          }
          // Left external wall window
          if (edges.left && rh > WIN_INSET * 2 + WIN_LEN) {
            const wy = ry + (rh - WIN_LEN) / 2;
            wins.push(
              <g key="win-left">
                <rect x={rx} y={wy} width={WIN_DEPTH} height={WIN_LEN}
                  fill="white" stroke={wc} strokeWidth={0.8} />
                <line x1={rx} y1={wy} x2={rx + WIN_DEPTH} y2={wy}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={rx} y1={wy + WIN_LEN / 2} x2={rx + WIN_DEPTH} y2={wy + WIN_LEN / 2}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={rx} y1={wy + WIN_LEN} x2={rx + WIN_DEPTH} y2={wy + WIN_LEN}
                  stroke={wc} strokeWidth={0.6} />
              </g>
            );
          }
          // Right external wall window
          if (edges.right && rh > WIN_INSET * 2 + WIN_LEN) {
            const wy = ry + (rh - WIN_LEN) / 2;
            wins.push(
              <g key="win-right">
                <rect x={rx + rw - WIN_DEPTH} y={wy} width={WIN_DEPTH} height={WIN_LEN}
                  fill="white" stroke={wc} strokeWidth={0.8} />
                <line x1={rx + rw - WIN_DEPTH} y1={wy} x2={rx + rw} y2={wy}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={rx + rw - WIN_DEPTH} y1={wy + WIN_LEN / 2} x2={rx + rw} y2={wy + WIN_LEN / 2}
                  stroke={wc} strokeWidth={0.6} />
                <line x1={rx + rw - WIN_DEPTH} y1={wy + WIN_LEN} x2={rx + rw} y2={wy + WIN_LEN}
                  stroke={wc} strokeWidth={0.6} />
              </g>
            );
          }
          return wins.length > 0 ? <g opacity={0.9}>{wins}</g> : null;
        })()}

        {/* ── Door symbol — placed on wall facing corridor/circulation ── */}
        {!isCorridorOrVoid && rw > 30 && rh > 24 && (() => {
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

          if (doorWall === 'bottom') {
            const dx = rx + rw * 0.25;
            const dy = ry + rh;
            return (
              <g opacity={0.75}>
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
              <g opacity={0.75}>
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
              <g opacity={0.75}>
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
            <g opacity={0.75}>
              <line x1={dx} y1={dy} x2={dx + actualR} y2={dy}
                stroke={wallColor} strokeWidth={1.5} />
              <path d={`M ${dx + actualR} ${dy} A ${actualR} ${actualR} 0 0 0 ${dx} ${dy + actualR}`}
                fill="none" stroke={wallColor} strokeWidth={0.8} />
            </g>
          );
        })()}

        {/* ── Label ── */}
        {showLabel && (
          <text textAnchor="middle" style={{ pointerEvents: 'none' }}>
            <tspan
              x={rx + rw / 2}
              y={ry + rh / 2 - lineHeight / 2}
              style={{
                fontSize: `${nameFontSize}px`,
                fontWeight: 900,
                letterSpacing: '0.08em',
                fill: textColor,
              }}
            >
              {name.length > 14 ? name.substring(0, 13) + '…' : name}
            </tspan>
            <tspan
              x={rx + rw / 2}
              y={ry + rh / 2 + lineHeight / 2}
              style={{
                fontSize: `${dimFontSize}px`,
                fontWeight: 700,
                fill: stroke,
              }}
            >
              {room.width.toFixed(1)}M × {room.depth.toFixed(1)}M
            </tspan>
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
              className="fill-blue-500/20 stroke-blue-600 stroke-[2] stroke-dasharray-4"
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

  // Safe total area — guard NaN per room
  const totalArea = activeRooms.reduce((acc, r) => {
    const area = r.width * r.depth;
    return acc + (isNaN(area) ? 0 : area);
  }, 0);

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
                  <button
                    onClick={() => setActiveFloor(0)}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all ${
                      activeFloor === 0
                        ? 'bg-white text-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    GROUND FL.
                  </button>
                  <button
                    onClick={() => setActiveFloor(1)}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all ${
                      activeFloor === 1
                        ? 'bg-white text-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    UPPER FL.
                  </button>
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
                Procedurally Generated • Elev +{activeFloor * 3.0}m
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
        <div className="relative bg-[#ffffff] dark:bg-[#0d0f14] p-12 md:p-20 flex items-center justify-center overflow-hidden min-h-[650px]">
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
            viewBox="0 0 720 580"
            className="w-full h-auto max-w-[900px] drop-shadow-[0_40px_80px_rgba(0,0,0,0.2)] relative z-10"
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
            <rect x="0" y="0" width="720" height="520" fill="url(#arch-grid)" />

            {/* Plot boundary — faint context outline; scale to plot ratio vs building */}
            <rect
              x={xOffset - ((plot_width  - buildingW) / 2) * scale}
              y={yOffset - ((plot_depth - buildingH) / 2) * scale}
              width={plot_width  * scale}
              height={plot_depth * scale}
              fill="none"
              stroke="#93C5FD"
              strokeWidth={1}
              strokeDasharray="6 4"
              opacity={0.3}
            />
            {/* Building footprint boundary */}
            <rect
              x={xOffset} y={yOffset}
              width={buildingW * scale} height={buildingH * scale}
              fill="none"
              stroke="#475569"
              strokeWidth={1.5}
              opacity={0.4}
            />

            {/* Dimension lines — building width (top) and building depth (left) */}
            <g className="dimension-lines" opacity={0.7}>
              {/* Top dimension — building width */}
              <line
                x1={xOffset} y1={yOffset - 20}
                x2={xOffset + buildingW * scale} y2={yOffset - 20}
                stroke="#475569" strokeWidth={0.8}
              />
              <line x1={xOffset} y1={yOffset - 25} x2={xOffset} y2={yOffset - 15}
                stroke="#475569" strokeWidth={0.8} />
              <line x1={xOffset + buildingW * scale} y1={yOffset - 25}
                x2={xOffset + buildingW * scale} y2={yOffset - 15}
                stroke="#475569" strokeWidth={0.8} />
              <line x1={xOffset} y1={yOffset} x2={xOffset} y2={yOffset - 28}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              <line x1={xOffset + buildingW * scale} y1={yOffset}
                x2={xOffset + buildingW * scale} y2={yOffset - 28}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              <text
                x={xOffset + (buildingW * scale) / 2}
                y={yOffset - 24}
                textAnchor="middle"
                style={{ fontSize: '9px', fontWeight: 700, fill: '#1e293b', letterSpacing: '0.05em' }}
              >
                {buildingW.toFixed(2)} M
              </text>

              {/* Left dimension — building depth */}
              <line
                x1={xOffset - 20} y1={yOffset}
                x2={xOffset - 20} y2={yOffset + buildingH * scale}
                stroke="#475569" strokeWidth={0.8}
              />
              <line x1={xOffset - 25} y1={yOffset} x2={xOffset - 15} y2={yOffset}
                stroke="#475569" strokeWidth={0.8} />
              <line x1={xOffset - 25} y1={yOffset + buildingH * scale}
                x2={xOffset - 15} y2={yOffset + buildingH * scale}
                stroke="#475569" strokeWidth={0.8} />
              <line x1={xOffset} y1={yOffset} x2={xOffset - 28} y2={yOffset}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              <line x1={xOffset} y1={yOffset + buildingH * scale}
                x2={xOffset - 28} y2={yOffset + buildingH * scale}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              <text
                x={xOffset - 24}
                y={yOffset + (buildingH * scale) / 2}
                textAnchor="middle"
                transform={`rotate(-90, ${xOffset - 24}, ${yOffset + (buildingH * scale) / 2})`}
                style={{ fontSize: '9px', fontWeight: 700, fill: '#1e293b', letterSpacing: '0.05em' }}
              >
                {buildingH.toFixed(2)} M
              </text>
            </g>

            {/* North arrow — bottom-left */}
            <g transform={`translate(${xOffset + 12}, ${yOffset + buildingH * scale + 36})`}>
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
              const barX = xOffset + buildingW * scale - barPx - 4;
              const barY = yOffset + buildingH * scale + 36;
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
              const tbX = xOffset + buildingW * scale / 2;
              const tbY = yOffset + buildingH * scale + 52;
              const projectId = (layout as any).program_reference?.brief_reference?.project_id
                ?? (layout as any).program_reference?.brief_reference?.id
                ?? 'GS-PROJ';
              const floorLabel = activeFloor === 0 ? 'GROUND FLOOR' : 'UPPER FLOOR';
              const dateStr = new Date().toISOString().slice(0, 10);
              return (
                <g>
                  <text x={tbX} y={tbY} textAnchor="middle"
                    style={{ fontSize: '8px', fontWeight: 900, fill: '#1e293b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {projectId} · {plot_width.toFixed(1)}M × {plot_depth.toFixed(1)}M · {floorLabel} · {dateStr}
                  </text>
                </g>
              );
            })()}

            {/* Rooms */}
            {activeRooms.map((room, idx) => renderRoom(room, idx))}

            {/* Structure overlay */}
            {renderStructure()}
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
            {activeRooms.slice(0, 6).map(room => {
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
