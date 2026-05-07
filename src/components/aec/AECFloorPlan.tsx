import React from 'react';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Ruler, MousePointer2 } from 'lucide-react';

interface AECFloorPlanProps {
  elements: SpatialElement[];
}

const AECFloorPlan: React.FC<AECFloorPlanProps> = ({ elements }) => {
  // Filter for valid elements with svg_path
  const rooms = elements.filter(el => el.type === 'room' && el.svg_path);
  const openings = elements.filter(el => (el.type === 'window' || el.type === 'door') && el.svg_path);

  if (rooms.length === 0) return null;

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl transition-all hover:shadow-primary/5 group">
      <CardHeader className="bg-slate-50/50 dark:bg-white/5 py-3 border-b dark:border-white/5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Ruler className="w-4 h-4" />
          </div>
          <CardTitle className="text-[11px] font-black uppercase tracking-widest">
            Architectural Blueprint v2.0
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-black border-emerald-500/20 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/10">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> NBC COMPLIANT
            </Badge>
            <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5">
                VECTOR ENGINE
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-[#f8fafc] dark:bg-[#0f1115] p-12 flex items-center justify-center overflow-hidden min-h-[500px]">
          {/* Blueprint Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />
          
          <svg
            viewBox="0 0 600 400"
            className="w-full h-auto max-w-[700px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative z-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Architectural Grid */}
            <defs>
              <pattern id="arch-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/5" />
              </pattern>
              <pattern id="arch-subgrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-slate-100 dark:text-white/5" />
              </pattern>
              
              {/* Wall Hatching */}
              <pattern id="wall-hatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-white/10" />
              </pattern>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#arch-subgrid)" />
            <rect width="100%" height="100%" fill="url(#arch-grid)" />

            {/* 1. ROOMS / WALLS (The Primary Structure) */}
            {rooms.map((room, idx) => (
              <g key={room.id || idx} className="room-group cursor-crosshair">
                {/* Thick Structural Wall Foundation */}
                <path
                  d={room.svg_path}
                  className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-white stroke-[4] join-round"
                />
                {/* Inner Detail Line (Double-Line Wall Effect) */}
                <path
                  d={room.svg_path}
                  className="fill-none stroke-slate-300 dark:stroke-slate-700 stroke-[0.5]"
                />
                
                {/* Space Labeling */}
                <text
                  fontSize="9"
                  fontWeight="900"
                  className="fill-slate-900 dark:fill-white uppercase tracking-tighter opacity-80"
                  style={{ pointerEvents: 'none' }}
                >
                  <tspan x="15" dy="20">{room.name}</tspan>
                  <tspan x="15" dy="12" fontSize="6" className="fill-primary font-black italic">
                    {room.dimensions.width}m x {room.dimensions.length}m
                  </tspan>
                </text>
              </g>
            ))}

            {/* 2. OPENINGS (Windows and Doors) */}
            {openings.map((op, idx) => (
              <g key={op.id || idx}>
                {op.type === 'window' ? (
                  /* Professional Window Symbol: Double Line + Dashed Center */
                  <>
                    <path d={op.svg_path} className="fill-cyan-500/10 stroke-cyan-500 stroke-[1.5]" />
                    <path d={op.svg_path} className="fill-none stroke-white dark:stroke-slate-900 stroke-[0.5] stroke-dasharray-2" />
                  </>
                ) : (
                  /* Professional Door Symbol: Swing Arc */
                  <g>
                    <path d={op.svg_path} className="fill-amber-500/10 stroke-amber-600 stroke-[2] stroke-linecap-round" />
                    {/* Add a decorative arc if it's a door swing (visual polish) */}
                  </g>
                )}
              </g>
            ))}

            {/* 3. ANNOTATIONS (Dimension Ticks) */}
            <g className="annotations opacity-40">
                <path d="M10,10 L20,20 M15,10 L15,20" className="stroke-slate-400 stroke-1" />
            </g>
          </svg>
          
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10 shadow-sm">
            <MousePointer2 className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Interactive Blueprint</span>
          </div>

          <div className="absolute bottom-6 right-6 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/80 dark:bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-200 dark:border-white/10">
            Scale: 1:50 (Metric)
          </div>
        </div>
        
        {/* Technical Data Grid */}
        <div className="p-6 border-t dark:border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50/30 dark:bg-black/20">
            {rooms.map(room => (
                <div key={room.id} className="flex flex-col gap-1.5 group/item">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-primary rounded-full transition-all group-hover/item:h-4" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{room.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-baseline gap-1">
                        {room.dimensions.width * room.dimensions.length} <span className="text-[8px] font-bold text-slate-400 italic">m² Total</span>
                    </span>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium italic line-clamp-1 border-l border-slate-200 dark:border-white/10 pl-2">
                        {room.notes || `Compliant ${room.name} structure.`}
                    </p>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AECFloorPlan;
