import React from 'react';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Ruler, MousePointer2 } from 'lucide-react';

interface AECFloorPlanProps {
  elements: SpatialElement[];
}

const FurnitureSymbols = {
  bed: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-60">
      <rect x="-12" y="-18" width="24" height="36" rx="1" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <rect x="-12" y="-18" width="24" height="8" rx="1" className="fill-slate-50 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <rect x="-10" y="-16" width="8" height="5" rx="0.5" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600 stroke-[0.3]" />
      <rect x="2" y="-16" width="8" height="5" rx="0.5" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600 stroke-[0.3]" />
    </g>
  ),
  sofa: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-60">
       <path d="M-18,-8 L18,-8 L18,8 L-18,8 Z" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
       <path d="M-18,-8 L-14,-8 L-14,8 L-18,8 Z" className="fill-slate-50 dark:fill-slate-700" />
       <path d="M14,-8 L18,-8 L18,8 L14,8 Z" className="fill-slate-50 dark:fill-slate-700" />
       <path d="M-14,4 L14,4 L14,8 L-14,8 Z" className="fill-slate-100 dark:fill-slate-600" />
    </g>
  ),
  toilet: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-60">
      <rect x="-5" y="-8" width="10" height="5" rx="1" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <ellipse cx="0" cy="2" rx="5" ry="7" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
    </g>
  ),
  dining: (x: number, y: number) => (
    <g transform={`translate(${x},${y})`} className="opacity-60">
      <rect x="-14" y="-14" width="28" height="28" rx="2" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <circle cx="-14" cy="0" r="2.5" className="fill-slate-100 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <circle cx="14" cy="0" r="2.5" className="fill-slate-100 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <circle cx="0" cy="-14" r="2.5" className="fill-slate-100 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
      <circle cx="0" cy="14" r="2.5" className="fill-slate-100 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500 stroke-[0.5]" />
    </g>
  ),
  car: (x: number, y: number, rotation: number = 0) => (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} className="opacity-40">
      <path d="M-12,-25 L12,-25 L14,-20 L14,20 L12,25 L-12,25 L-14,20 L-14,-20 Z" className="fill-slate-100/50 dark:fill-slate-700/50 stroke-slate-400 dark:stroke-slate-500 stroke-[0.8]" />
      <rect x="-10" y="-12" width="20" height="12" rx="2" className="fill-white/80 dark:fill-slate-800/80 stroke-slate-300 dark:stroke-slate-600 stroke-[0.5]" />
      <circle cx="-11" cy="-21" r="1.5" className="fill-amber-400/50" />
      <circle cx="11" cy="-21" r="1.5" className="fill-amber-400/50" />
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
    if (name.includes('living') || name.includes('parlor')) return FurnitureSymbols.sofa(x, y);
    if (name.includes('bath') || name.includes('toilet') || name.includes('wc')) return FurnitureSymbols.toilet(x, y);
    if (name.includes('dining')) return FurnitureSymbols.dining(x, y);
    if (name.includes('garage')) return FurnitureSymbols.car(x, y, 90);
    return null;
  };

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl transition-all hover:shadow-primary/5 group">
      <CardHeader className="bg-slate-900 dark:bg-black py-4 border-b dark:border-white/5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-[12px] font-black uppercase tracking-[0.2em] text-white">
              Executive Architectural Blueprint
            </CardTitle>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">High-Fidelity Engineering Node v2.4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black px-3 py-1">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> VALIDATED
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-[#ffffff] dark:bg-[#0f1115] p-16 flex items-center justify-center overflow-hidden min-h-[600px]">
          {/* Blueprint Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          
          <svg
            viewBox="-50 -50 700 500"
            className="w-full h-auto max-w-[850px] drop-shadow-[0_30px_60px_rgba(0,0,0,0.15)] relative z-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="arch-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/5" />
              </pattern>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="1" dy="1" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.2" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            <rect x="-50" y="-50" width="700" height="500" fill="url(#arch-grid)" />

            {/* 1. STRUCTURAL WALLS (Heavy Fill Style) */}
            {rooms.map((room, idx) => (
              <g key={`wall-${idx}`} filter="url(#shadow)">
                <path
                  d={room.svg_path}
                  className="fill-slate-900 dark:fill-white stroke-slate-900 dark:stroke-white stroke-[8] stroke-linejoin-miter"
                />
                <path
                  d={room.svg_path}
                  className="fill-white dark:fill-slate-900 stroke-none"
                />
              </g>
            ))}

            {/* 2. FURNITURE & RITUALS */}
            {rooms.map((room, idx) => (
              <g key={`furn-${idx}`}>
                {renderFurniture(room)}
              </g>
            ))}

            {/* 3. OPENINGS (Clean Break Style) */}
            {openings.map((op, idx) => (
              <g key={`op-${idx}`}>
                {op.type === 'window' ? (
                  <path d={op.svg_path} className="fill-white dark:fill-slate-900 stroke-slate-400 stroke-[1.5]" />
                ) : (
                  <path d={op.svg_path} className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-white stroke-[2]" />
                )}
              </g>
            ))}

            {/* 4. TECHNICAL ANNOTATIONS */}
            <g className="grid-labels">
              {/* Horizontal Bubbles */}
              {['A', 'B', 'C'].map((label, i) => (
                <g key={label} transform={`translate(${i * 200}, -30)`}>
                  <circle r="10" className="fill-white dark:fill-slate-800 stroke-slate-900 dark:stroke-white stroke-1" />
                  <text dy="3.5" textAnchor="middle" className="text-[10px] font-black fill-slate-900 dark:fill-white">{label}</text>
                  <line y1="10" y2="400" className="stroke-slate-200 dark:text-white/5 stroke-dasharray-4" />
                </g>
              ))}
              {/* Vertical Bubbles */}
              {['1', '2', '3'].map((label, i) => (
                <g key={label} transform={`translate(-30, ${i * 150})`}>
                  <circle r="10" className="fill-white dark:fill-slate-800 stroke-slate-900 dark:stroke-white stroke-1" />
                  <text dy="3.5" textAnchor="middle" className="text-[10px] font-black fill-slate-900 dark:fill-white">{label}</text>
                  <line x1="10" x2="600" className="stroke-slate-200 dark:text-white/5 stroke-dasharray-4" />
                </g>
              ))}
            </g>

            {/* 5. SPACE LABELS */}
            {rooms.map((room, idx) => {
              const { x, y } = getRoomCenter(room.svg_path);
              return (
                <text
                  key={`label-${idx}`}
                  x={x}
                  y={y + 25}
                  textAnchor="middle"
                  className="fill-slate-900 dark:fill-white font-black uppercase tracking-[0.1em]"
                  style={{ fontSize: '8px', pointerEvents: 'none' }}
                >
                  <tspan x={x} dy="0">{room.name}</tspan>
                  <tspan x={x} dy="10" className="fill-primary text-[6px] font-bold">
                    {room.dimensions.width}m x {room.dimensions.length}m
                  </tspan>
                </text>
              );
            })}
          </svg>
          
          <div className="absolute top-8 left-8 flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-full border border-white/10 shadow-xl">
            <MousePointer2 className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">AEC Contextual Engine Active</span>
          </div>

          <div className="absolute bottom-8 right-8 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/80 dark:bg-black/50 px-4 py-2 rounded-lg backdrop-blur-md border border-slate-200 dark:border-white/10">
            Stamp: GS-PRO-CERTIFIED
          </div>
        </div>
        
        {/* Detail Inventory */}
        <div className="p-8 border-t dark:border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8 bg-slate-50/50 dark:bg-black/40">
            {rooms.map(room => (
                <div key={room.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white dark:bg-slate-800 text-[8px] font-black">{room.zone || 'Spatial'}</Badge>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">{room.name}</span>
                    </div>
                    <div className="h-[1px] w-full bg-gradient-to-r from-primary/50 to-transparent" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                        {(room.dimensions.width * room.dimensions.length).toFixed(1)} <span className="text-[9px] text-slate-400">m² Area</span>
                    </span>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AECFloorPlan;
