import React from 'react';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Ruler } from 'lucide-react';

interface AECFloorPlanProps {
  elements: SpatialElement[];
}

const AECFloorPlan: React.FC<AECFloorPlanProps> = ({ elements }) => {
  // Filter for valid rooms with svg_path
  const rooms = elements.filter(el => el.svg_path);

  if (rooms.length === 0) return null;

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
      <CardHeader className="bg-slate-50/50 dark:bg-white/5 py-3 border-b dark:border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
            <Ruler className="w-3 h-3 text-primary" />
            Parametric Floor Plan (Beta)
          </CardTitle>
          <Badge variant="outline" className="text-[9px] font-black border-green-500/20 text-green-600 bg-green-50/50 dark:bg-green-500/10">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> NBC COMPLIANT
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-white dark:bg-[#1c1d21] p-8 flex items-center justify-center">
          <svg
            viewBox="0 0 600 400"
            className="w-full h-auto max-w-[600px] drop-shadow-2xl"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-100 dark:text-white/5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Room Rendering */}
            {rooms.map((room, idx) => (
              <g key={room.id || idx} className="room-group group transition-all duration-300">
                <path
                  d={room.svg_path}
                  className="fill-primary/5 stroke-primary/40 stroke-[1.5] group-hover:fill-primary/10 group-hover:stroke-primary transition-colors"
                />
                <text
                  fontSize="8"
                  fontWeight="bold"
                  className="fill-slate-500 dark:fill-slate-400 uppercase tracking-tighter"
                  style={{ pointerEvents: 'none' }}
                >
                  {/* Simplistic label placement - usually would need centroid calculation */}
                  <tspan x="10" dy="10">{room.name}</tspan>
                  <tspan x="10" dy="10" fontSize="6">{room.dimensions.width}m x {room.dimensions.length}m</tspan>
                </text>
              </g>
            ))}
          </svg>
          
          <div className="absolute bottom-4 right-4 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/80 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
            Scale: 1m = 20px
          </div>
        </div>
        
        <div className="p-4 border-t dark:border-white/5 grid grid-cols-2 gap-4 bg-slate-50/30 dark:bg-black/20">
            {rooms.map(room => (
                <div key={room.id} className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{room.name}</span>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-white">
                        {room.dimensions.width}m x {room.dimensions.length}m ({room.dimensions.width * room.dimensions.length}m²)
                    </span>
                    {room.notes && <p className="text-[9px] text-slate-500 dark:text-slate-400 italic line-clamp-1">{room.notes}</p>}
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AECFloorPlan;
