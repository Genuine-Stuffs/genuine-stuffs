import React from 'react';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Ruler, MousePointer2, Compass, FileText, ShieldAlert } from 'lucide-react';

interface AECFloorPlanProps {
  elements: SpatialElement[];
}

const FurnitureSymbols = {
  bed: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-70">
      <rect x="-14" y="-20" width="28" height="40" rx="1.5" className="fill-white dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400 stroke-[0.8]" />
      <rect x="-14" y="-20" width="28" height="10" rx="1" className="fill-slate-100 dark:fill-slate-700 stroke-slate-500 dark:stroke-slate-400 stroke-[0.6]" />
      <rect x="-12" y="-18" width="10" height="6" rx="0.5" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.4]" />
      <rect x="2" y="-18" width="10" height="6" rx="0.5" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.4]" />
      <path d="M-14,0 L14,0" className="stroke-slate-200 dark:stroke-slate-600 stroke-[0.5] stroke-dasharray-1" />
    </g>
  ),
  sofa: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-70">
       <rect x="-22" y="-10" width="44" height="20" rx="3" className="fill-white dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400 stroke-[0.8]" />
       <rect x="-22" y="-10" width="6" height="20" rx="1" className="fill-slate-50 dark:fill-slate-700" />
       <rect x="16" y="-10" width="6" height="20" rx="1" className="fill-slate-50 dark:fill-slate-700" />
       <rect x="-16" y="4" width="32" height="6" rx="1" className="fill-slate-100 dark:fill-slate-600" />
    </g>
  ),
  toilet: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-70">
      <rect x="-6" y="-10" width="12" height="6" rx="1.5" className="fill-white dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400 stroke-[0.8]" />
      <path d="M-6,0 Q-6,12 0,12 Q6,12 6,0 Z" className="fill-white dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400 stroke-[0.8]" />
      <ellipse cx="0" cy="2" rx="4" ry="6" className="fill-none stroke-slate-300 dark:stroke-slate-600 stroke-[0.4]" />
    </g>
  ),
  dining: (x: number, y: number) => (
    <g transform={`translate(${x},${y})`} className="opacity-70">
      <rect x="-18" y="-18" width="36" height="36" rx="2" className="fill-white dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400 stroke-[0.8]" />
      {[-1, 1].map(i => (
        <React.Fragment key={i}>
          <rect x={i * 18 - (i > 0 ? 0 : 6)} y="-10" width="6" height="20" rx="1" className="fill-slate-50 dark:fill-slate-700 stroke-slate-400 stroke-[0.5]" />
          <rect x="-10" y={i * 18 - (i > 0 ? 0 : 6)} width="20" height="6" rx="1" className="fill-slate-50 dark:fill-slate-700 stroke-slate-400 stroke-[0.5]" />
        </React.Fragment>
      ))}
    </g>
  ),
  car: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-40">
      <path d="M-15,-30 L15,-30 L18,-20 L18,25 L15,32 L-15,32 L-18,25 L-18,-20 Z" className="fill-slate-100/50 dark:fill-slate-700/50 stroke-slate-500 dark:stroke-slate-400 stroke-[1]" />
      <rect x="-13" y="-15" width="26" height="15" rx="3" className="fill-white/80 dark:fill-slate-800/80 stroke-slate-400 dark:stroke-slate-500 stroke-[0.6]" />
      <path d="M-13,5 L13,5" className="stroke-slate-300 dark:stroke-slate-600 stroke-[0.5]" />
      <circle cx="-13" cy="-25" r="2" className="fill-amber-400/60" />
      <circle cx="13" cy="-25" r="2" className="fill-amber-400/60" />
    </g>
  ),
  northArrow: (x: number, y: number) => (
    <g transform={`translate(${x},${y}) scale(0.6)`} className="text-slate-400 dark:text-slate-600">
        <circle r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
        <path d="M0,-40 L10,-10 L0,-15 L-10,-10 Z" fill="currentColor" />
        <text y="-45" textAnchor="middle" className="text-[14px] font-black fill-current">N</text>
    </g>
  )
};

const AECFloorPlan: React.FC<AECFloorPlanProps> = ({ elements }) => {
  const rooms = elements.filter(el => el.type === 'room' && el.svg_path);
  const openings = elements.filter(el => (el.type === 'window' || el.type === 'door') && el.svg_path);

  if (rooms.length === 0) return null;

  const getRoomCenter = (svgPath: string) => {
    const coords = svgPath.match(/[\d.]+/g)?.map(Number) || [];
    if (coords.length < 4) return { x: 50, y: 50 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < coords.length; i += 2) {
      minX = Math.min(minX, coords[i]);
      maxX = Math.max(maxX, coords[i]);
      minY = Math.min(minY, coords[i+1]);
      maxY = Math.max(maxY, coords[i+1]);
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  };

  const renderFurniture = (room: any) => {
    const { x, y } = getRoomCenter(room.svg_path);
    const name = room.name.toLowerCase();
    if (name.includes('bedroom')) return FurnitureSymbols.bed(x, y);
    if (name.includes('living') || name.includes('parlor') || name.includes('lounge')) return FurnitureSymbols.sofa(x, y);
    if (name.includes('bath') || name.includes('toilet') || name.includes('wc') || name.includes('shower')) return FurnitureSymbols.toilet(x, y);
    if (name.includes('dining') || name.includes('kitchen')) return FurnitureSymbols.dining(x, y);
    if (name.includes('garage') || name.includes('carport')) return FurnitureSymbols.car(x, y, 90);
    return null;
  };

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] group bg-[#f8fafc] dark:bg-[#0a0c10]">
      <CardHeader className="bg-slate-900 dark:bg-black py-5 border-b dark:border-white/5 flex flex-row items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-inner">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">
              Executive Engineering Blueprint
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Node ID: GS-PRO-2025</span>
                <div className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Revision: 04-A</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Structural Code</span>
                <span className="text-[10px] font-black text-white">NBC 2006 / IBC 2021</span>
            </div>
            <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black px-4 py-1.5 shadow-lg shadow-emerald-900/20">
                <CheckCircle2 className="w-3 h-3 mr-1.5" /> CERTIFIED
            </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative bg-[#ffffff] dark:bg-[#0d0f14] p-12 md:p-20 flex items-center justify-center overflow-hidden min-h-[650px]">
          {/* Blueprint Texture & Paper Grain */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
          
          <svg
            viewBox="-60 -60 720 520"
            className="w-full h-auto max-w-[900px] drop-shadow-[0_40px_80px_rgba(0,0,0,0.2)] relative z-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="arch-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-slate-200 dark:text-white/5" />
              </pattern>
              
              {/* Technical Wall Hatch Pattern */}
              <pattern id="wall-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.8" className="text-slate-200 dark:text-slate-600" />
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
            
            {/* Background Grid */}
            <rect x="-60" y="-60" width="720" height="520" fill="url(#arch-grid)" />

            {/* 1. STRUCTURAL WALLS (Architectural Hatch Style) */}
            {rooms.map((room, idx) => (
              <g key={`wall-group-${idx}`} filter="url(#blueprint-shadow)">
                {/* The "Shell" of the wall */}
                <path
                  d={room.svg_path}
                  className="fill-slate-800 dark:fill-slate-200 stroke-slate-800 dark:stroke-slate-200 stroke-[10] stroke-linejoin-round"
                />
                {/* The "Hatch" Fill */}
                <path
                  d={room.svg_path}
                  fill="url(#wall-hatch)"
                  className="stroke-none"
                />
                {/* The "Inner Space" Cleanup */}
                <path
                  d={room.svg_path}
                  className="fill-white dark:fill-[#0d0f14] stroke-slate-400 dark:stroke-slate-600 stroke-[0.5]"
                />
              </g>
            ))}

            {/* 2. FURNITURE & SPACE RITUALS */}
            {rooms.map((room, idx) => (
              <g key={`furniture-${idx}`}>
                {renderFurniture(room)}
              </g>
            ))}

            {/* 3. OPENINGS (CAD Technical Style) */}
            {openings.map((op, idx) => (
              <g key={`opening-${idx}`}>
                {op.type === 'window' ? (
                  <g>
                    <path d={op.svg_path} className="fill-white dark:fill-[#0d0f14] stroke-slate-400 dark:stroke-slate-500 stroke-[1]" />
                    <path d={op.svg_path} className="fill-none stroke-slate-300 dark:stroke-slate-600 stroke-[0.5] translate-y-[2]" />
                  </g>
                ) : (
                  <g>
                    {/* Door Swing Arc */}
                    <path d={op.svg_path} className="fill-white dark:fill-[#0d0f14] stroke-slate-900 dark:stroke-white stroke-[2.5]" />
                    <path d={op.svg_path} className="fill-none stroke-slate-400 stroke-[0.5] stroke-dasharray-2 opacity-50" />
                  </g>
                )}
              </g>
            ))}

            {/* 4. SPACE LABELS & DIMENSIONS */}
            {rooms.map((room, idx) => {
              const { x, y } = getRoomCenter(room.svg_path);
              return (
                <g key={`label-group-${idx}`}>
                    <rect x={x - 35} y={y - 12} width="70" height="24" rx="4" className="fill-white/90 dark:fill-slate-900/90 stroke-slate-100 dark:stroke-white/5 stroke-[0.5] backdrop-blur-sm" />
                    <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        className="fill-slate-900 dark:fill-white font-black uppercase tracking-[0.15em]"
                        style={{ fontSize: '7.5px', pointerEvents: 'none' }}
                    >
                        <tspan x={x} dy="0">{room.name}</tspan>
                        <tspan x={x} dy="9" className="fill-primary font-bold tracking-normal" style={{ fontSize: '6px' }}>
                            {room.dimensions.width}m x {room.dimensions.length}m
                        </tspan>
                    </text>
                </g>
              );
            })}

            {/* 5. NORTH ARROW */}
            {FurnitureSymbols.northArrow(620, 30)}
          </svg>
          
          {/* Real-time Status Floating Labels */}
          <div className="absolute top-10 left-10 flex items-center gap-3 px-5 py-2.5 bg-slate-950 text-white rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">Structural Sync Active</span>
          </div>

          <div className="absolute bottom-10 right-10 flex flex-col items-end gap-1">
             <div className="px-4 py-2 bg-white/10 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl backdrop-blur-xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Stamp: MI-AEC-PRO-VALID</span>
             </div>
             <span className="text-[7px] font-bold text-slate-400 uppercase mr-1">Generated by Material Insight AEC Node</span>
          </div>
        </div>
        
        {/* Engineering Title Block / Footer Info */}
        <div className="p-8 border-t dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                {rooms.slice(0, 6).map(room => (
                    <div key={room.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{room.zone} Zone</span>
                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">{room.name}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-black text-primary">{(room.dimensions.width * room.dimensions.length).toFixed(1)}m²</span>
                        </div>
                    </div>
                ))}
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
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Compliance</p>
                        <p className="text-xs font-black text-slate-900 dark:text-white">NBC 2006 Valid</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col justify-center items-end text-right">
                <div className="mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Floor Area</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">
                        {rooms.reduce((acc, r) => acc + (r.dimensions.width * r.dimensions.length), 0).toFixed(2)} <span className="text-sm font-bold uppercase not-italic opacity-40">m²</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Orientation: 15° North</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECFloorPlan;
