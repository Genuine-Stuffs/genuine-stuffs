import React, { useState, useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
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
  stairwell: { fill: '#FEE2E2', stroke: '#DC2626', textColor: '#7F1D1D' },
  void:      { fill: '#FEE2E2', stroke: '#DC2626', textColor: '#7F1D1D' },
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

  const padding = 2;
  const viewWidth  = plot_width  + padding * 2;
  const viewHeight = plot_depth + padding * 2;
  const scale = Math.min(720 / viewWidth, 520 / viewHeight);

  const xOffset = (720 - (plot_width  * scale)) / 2;
  const yOffset = (520 - (plot_depth * scale)) / 2;

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

  // ── External wall detection — checks if a room touches the plot boundary
  // Used to render perimeter walls thicker (4px) than internal partitions (2px)
  const EDGE_TOLERANCE = 0.5; // metres
  const isExternalWall = (room: any) => {
    const touchesLeft   = room.x <= EDGE_TOLERANCE;
    const touchesTop    = room.y <= EDGE_TOLERANCE;
    const touchesRight  = (room.x + room.width)  >= (plot_width  - EDGE_TOLERANCE);
    const touchesBottom = (room.y + room.depth)  >= (plot_depth - EDGE_TOLERANCE);
    return touchesLeft || touchesTop || touchesRight || touchesBottom;
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
    // External walls render thicker (4) than internal partitions (2.5)
    const isExt = isExternalWall(room);
    const wallStroke = isCorridorOrVoid ? 1 : (isExt ? 4 : 2);

    return (
      <g key={`room-${idx}`} filter="url(#blueprint-shadow)">
        {/* Room fill */}
        <rect
          x={rx} y={ry} width={rw} height={rh}
          fill={showStructure ? `${fill}55` : fill}
          stroke={stroke}
          strokeWidth={wallStroke}
          strokeDasharray={isCorridorOrVoid ? '4 2' : undefined}
        />
        {/* Furniture footprints — only when not in structure mode and room is large enough */}
        {!showStructure && rw > 35 && rh > 28 && renderFurniture(room, rx, ry, rw, rh)}
        {/* Door symbol — short line + arc at bottom-left of room entry */}
        {!isCorridorOrVoid && rw > 30 && rh > 24 && (
          <g opacity={0.6}>
            <line
              x1={rx + 1} y1={ry + rh - 12}
              x2={rx + 1} y2={ry + rh - 1}
              stroke={stroke} strokeWidth={1.5}
            />
            <path
              d={`M ${rx + 1} ${ry + rh - 12} A 11 11 0 0 1 ${rx + 12} ${ry + rh - 1}`}
              fill="none" stroke={stroke} strokeWidth={0.8}
            />
          </g>
        )}
        {/* Label */}
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
            viewBox="0 0 720 520"
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
            </defs>

            {/* Background 1m grid */}
            <rect x="0" y="0" width="720" height="520" fill="url(#arch-grid)" />

            {/* Plot boundary */}
            <rect
              x={xOffset} y={yOffset}
              width={plot_width * scale} height={plot_depth * scale}
              className="fill-none stroke-blue-500 stroke-dasharray-4 stroke-[2] opacity-50"
            />

            {/* Dimension lines — plot width (top) and plot depth (left) */}
            <g className="dimension-lines" opacity={0.7}>
              {/* Top dimension — plot width */}
              <line
                x1={xOffset} y1={yOffset - 20}
                x2={xOffset + plot_width * scale} y2={yOffset - 20}
                stroke="#475569" strokeWidth={0.8}
              />
              {/* Top tick marks */}
              <line x1={xOffset} y1={yOffset - 25} x2={xOffset} y2={yOffset - 15}
                stroke="#475569" strokeWidth={0.8} />
              <line x1={xOffset + plot_width * scale} y1={yOffset - 25}
                x2={xOffset + plot_width * scale} y2={yOffset - 15}
                stroke="#475569" strokeWidth={0.8} />
              {/* Top extension lines */}
              <line x1={xOffset} y1={yOffset} x2={xOffset} y2={yOffset - 28}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              <line x1={xOffset + plot_width * scale} y1={yOffset}
                x2={xOffset + plot_width * scale} y2={yOffset - 28}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              {/* Top dimension text */}
              <text
                x={xOffset + (plot_width * scale) / 2}
                y={yOffset - 24}
                textAnchor="middle"
                style={{ fontSize: '9px', fontWeight: 700, fill: '#1e293b', letterSpacing: '0.05em' }}
              >
                {plot_width.toFixed(2)} M
              </text>

              {/* Left dimension — plot depth */}
              <line
                x1={xOffset - 20} y1={yOffset}
                x2={xOffset - 20} y2={yOffset + plot_depth * scale}
                stroke="#475569" strokeWidth={0.8}
              />
              {/* Left tick marks */}
              <line x1={xOffset - 25} y1={yOffset} x2={xOffset - 15} y2={yOffset}
                stroke="#475569" strokeWidth={0.8} />
              <line x1={xOffset - 25} y1={yOffset + plot_depth * scale}
                x2={xOffset - 15} y2={yOffset + plot_depth * scale}
                stroke="#475569" strokeWidth={0.8} />
              {/* Left extension lines */}
              <line x1={xOffset} y1={yOffset} x2={xOffset - 28} y2={yOffset}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              <line x1={xOffset} y1={yOffset + plot_depth * scale}
                x2={xOffset - 28} y2={yOffset + plot_depth * scale}
                stroke="#94a3b8" strokeWidth={0.4} strokeDasharray="2 2" />
              {/* Left dimension text — rotated */}
              <text
                x={xOffset - 24}
                y={yOffset + (plot_depth * scale) / 2}
                textAnchor="middle"
                transform={`rotate(-90, ${xOffset - 24}, ${yOffset + (plot_depth * scale) / 2})`}
                style={{ fontSize: '9px', fontWeight: 700, fill: '#1e293b', letterSpacing: '0.05em' }}
              >
                {plot_depth.toFixed(2)} M
              </text>
            </g>

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
