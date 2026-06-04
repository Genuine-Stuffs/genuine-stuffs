import React, { useState } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { structuralEngine } from '@/lib/aec/solver/structural';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Ruler, Compass, ShieldAlert, Layers } from 'lucide-react';

interface AECFloorPlanProps {
  layout?: SolvedLayout;
}

const AECFloorPlan: React.FC<AECFloorPlanProps> = ({ layout }) => {
  const [showStructure, setShowStructure] = useState(false);

  if (!layout || !layout.placed_rooms || layout.placed_rooms.length === 0) return null;

  const { plot_width, plot_depth, placed_rooms } = layout;

  const padding = 2; // meters
  const viewWidth = plot_width + padding * 2;
  const viewHeight = plot_depth + padding * 2;
  const scale = Math.min(720 / viewWidth, 520 / viewHeight);
  
  const xOffset = (720 - (plot_width * scale)) / 2;
  const yOffset = (520 - (plot_depth * scale)) / 2;

  // Generate structural skeleton
  const skeleton = structuralEngine.generateSkeleton(layout);

  const renderRoom = (room: any, idx: number) => {
    const rx = xOffset + (room.x * scale);
    const ry = yOffset + (room.y * scale);
    const rw = room.width * scale;
    const rh = room.depth * scale;
    
    const intent = layout.program_reference.rooms.find(r => r.id === room.room_id);
    const name = intent?.name || room.room_id;

    return (
      <g key={`room-${idx}`} filter="url(#blueprint-shadow)" className={showStructure ? "opacity-30 transition-opacity" : "transition-opacity"}>
        <rect 
          x={rx} y={ry} width={rw} height={rh}
          className="fill-white dark:fill-[#0d0f14] stroke-slate-800 dark:stroke-slate-200 stroke-[4]"
        />
        <text
          x={rx + rw/2} y={ry + rh/2}
          textAnchor="middle"
          className="fill-slate-900 dark:fill-white font-black uppercase tracking-[0.15em]"
          style={{ fontSize: '10px', pointerEvents: 'none' }}
        >
          <tspan x={rx + rw/2} dy="0">{name}</tspan>
          <tspan x={rx + rw/2} dy="12" className="fill-primary font-bold tracking-normal" style={{ fontSize: '8px' }}>
            {room.width.toFixed(1)}m x {room.depth.toFixed(1)}m
          </tspan>
        </text>
      </g>
    );
  };

  const renderStructure = () => {
    if (!showStructure) return null;
    return (
      <g className="animate-in fade-in duration-500">
        {/* Render Beams */}
        {skeleton.beams.map(beam => {
           const x = xOffset + (beam.start_x * scale);
           const y = yOffset + (beam.start_y * scale);
           const w = beam.end_x === beam.start_x ? beam.width_m * scale : beam.span_m * scale;
           const h = beam.end_y === beam.start_y ? beam.width_m * scale : beam.span_m * scale;
           // Offset slightly to center on column
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
           )
        })}
        {/* Render Columns */}
        {skeleton.columns.map(col => {
           const cx = xOffset + (col.x * scale);
           const cy = yOffset + (col.y * scale);
           const size = col.width_m * scale;
           return (
             <rect 
               key={col.id}
               x={cx - size/2}
               y={cy - size/2}
               width={size}
               height={size}
               className="fill-red-500 stroke-red-700 stroke-[1]"
             />
           )
        })}
      </g>
    );
  };

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
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Procedurally Generated</span>
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
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
          
          <svg
            viewBox="0 0 720 520"
            className="w-full h-auto max-w-[900px] drop-shadow-[0_40px_80px_rgba(0,0,0,0.2)] relative z-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="arch-grid" width={1 * scale} height={1 * scale} patternUnits="userSpaceOnUse">
                <path d={`M ${1*scale} 0 L 0 0 0 ${1*scale}`} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/10" />
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
            
            {/* Background 1m Grid */}
            <rect x="0" y="0" width="720" height="520" fill="url(#arch-grid)" />

            {/* Plot Boundary */}
            <rect 
                x={xOffset} y={yOffset} 
                width={plot_width * scale} height={plot_depth * scale}
                className="fill-none stroke-blue-500 stroke-dasharray-4 stroke-[2] opacity-50"
            />

            {/* Render Solved Rooms */}
            {placed_rooms.map((room, idx) => renderRoom(room, idx))}

            {/* Render Structure Overlay */}
            {renderStructure()}

          </svg>
          
          <div className="absolute bottom-10 right-10 flex flex-col items-end gap-1">
             <div className="px-4 py-2 bg-white/10 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl backdrop-blur-xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Plot: {plot_width}m x {plot_depth}m</span>
             </div>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="p-8 border-t dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                {placed_rooms.slice(0, 6).map(room => {
                    const intent = layout.program_reference.rooms.find(r => r.id === room.room_id);
                    return (
                        <div key={room.room_id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">{intent?.name || room.room_id}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black text-primary">{(room.width * room.depth).toFixed(1)}m²</span>
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
                        {placed_rooms.reduce((acc, r) => acc + (r.width * r.depth), 0).toFixed(2)} <span className="text-sm font-bold uppercase not-italic opacity-40">m²</span>
                    </p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECFloorPlan;
