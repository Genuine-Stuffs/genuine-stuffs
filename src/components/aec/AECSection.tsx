import React, { useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { section } from './section';
import { GROUND_DROP, RAIL_H } from './elevations';

/**
 * Section A–A (template findings #5): the cut marked A–A on the floor plans,
 * through the stair. Cut walls and slabs in solid black, the doors and
 * windows the cut passes through, the stair's flight with its risers, room
 * names, level marks and parapets.
 */
const INK = '#1e293b', MUTED = '#64748b';
const PAD_L = 30, PAD_R = 130, PAD_T = 24, PAD_B = 64;

export const AECSection: React.FC<{ layout: SolvedLayout }> = ({ layout }) => {
  const s = useMemo(() => section(layout), [layout]);
  if (!s) return null;
  const L = s.cut.length;
  const scale = Math.min(620 / L, 300 / s.top);
  const sheetW = L * scale + PAD_L + PAD_R, sheetH = (s.top + GROUND_DROP) * scale + PAD_T + PAD_B;
  const X = (a: number) => PAD_L + a * scale, Y = (h: number) => PAD_T + (s.top - h) * scale;
  const STOREY = s.levels.length > 1 ? s.levels[1].h : 3.2;

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] bg-[#f8fafc] dark:bg-[#0a0c10]">
      <CardHeader className="bg-slate-900 dark:bg-black py-5 border-b dark:border-white/5 flex flex-row items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-inner">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">Section A–A</CardTitle>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              A cut through the house at the line A–A on the floor plans
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-white dark:bg-[#0d0f14] p-4 md:p-8 flex items-center justify-center">
          <svg data-section viewBox={`0 0 ${sheetW} ${sheetH}`} className="w-full h-auto" style={{ maxWidth: 1000 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="section-earth" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={6} stroke="#94a3b8" strokeWidth={0.7} />
              </pattern>
            </defs>
            <rect width={sheetW} height={sheetH} fill="white" />
            {/* the ground */}
            <rect x={X(0) - 18} y={Y(-GROUND_DROP)} width={L * scale + 36} height={18} fill="url(#section-earth)" />
            <line x1={X(0) - 18} y1={Y(-GROUND_DROP)} x2={X(L) + 18} y2={Y(-GROUND_DROP)} stroke={INK} strokeWidth={1.6} />

            {/* room names, mid-height in each room */}
            {s.rooms.filter(r => !(s.stair && r.floor === 0 && r.name === 'Stair')).map((r, i) => (
              <text key={`n${i}`} data-section-room={r.name} x={X((r.a + r.b) / 2)} y={Y(r.floor * STOREY + 1.6)} textAnchor="middle"
                style={{ fontSize: '7px', fontWeight: 800, fill: r.kind === 'outside' ? MUTED : '#334155' }}>
                {(r.b - r.a) * scale < r.name.length * 4 ? `${r.name.slice(0, Math.max(3, Math.floor((r.b - r.a) * scale / 4.2)))}…` : r.name.toUpperCase()}
              </text>
            ))}

            {/* slabs: floors, the slab on grade, roofs */}
            {s.slabs.map((sl, i) => (
              <rect key={`s${i}`} data-section-slab x={X(sl.a)} y={Y(sl.top)} width={(sl.b - sl.a) * scale} height={sl.t * scale} fill={INK} />
            ))}

            {/* cut walls, with the openings the cut passes through */}
            {s.walls.map((w, i) => {
              const base = w.floor * STOREY, top = w.kind === 'rail' ? base + RAIL_H : base + STOREY;
              const x = X(w.at) - w.t * scale / 2, wd = w.t * scale;
              const solid: Array<[number, number]> = [];
              let from = base;
              for (const g of [...w.gaps].sort((p, q) => p.y0 - q.y0)) { if (g.y0 > from) solid.push([from, g.y0]); from = Math.max(from, g.y1); }
              if (top > from) solid.push([from, top]);
              return (
                <g key={`w${i}`} data-section-wall={w.kind}>
                  {w.kind === 'rail'
                    ? <rect x={x} y={Y(top)} width={wd} height={(top - base) * scale} fill="none" stroke={INK} strokeWidth={1} />
                    : solid.map(([a, b], k) => <rect key={k} x={x} y={Y(b)} width={wd} height={(b - a) * scale} fill={INK} />)}
                  {w.gaps.map((g, k) => (
                    <g key={`g${k}`}>
                      {g.glass && <line x1={x + wd / 2} y1={Y(g.y1)} x2={x + wd / 2} y2={Y(g.y0)} stroke="#0284c7" strokeWidth={1.2} />}
                      {g.tag && <text x={x + wd + 3} y={Y(g.y1) + 7} style={{ fontSize: '5.5px', fontWeight: 800, fill: '#0369a1' }}>{g.tag}</text>}
                    </g>
                  ))}
                </g>
              );
            })}

            {/* roof parapets */}
            {s.parapets.map((p, i) => (
              <rect key={`p${i}`} data-section-parapet x={X(p.at) - p.t * scale / 2} y={Y(p.base + p.h)} width={p.t * scale} height={p.h * scale} fill={INK} />
            ))}

            {/* the stair: one straight flight, risers drawn, its waist below */}
            {s.stair && (() => {
              const { a, b, up, risers, rise, going } = s.stair;
              const x0 = up === 1 ? a : b, dir = up;
              let d = `M ${X(x0)} ${Y(0)}`;
              for (let k = 0; k < risers; k++) {
                d += ` L ${X(x0 + dir * k * going)} ${Y((k + 1) * rise)} L ${X(x0 + dir * (k + 1) * going)} ${Y((k + 1) * rise)}`;
              }
              const waist = 0.18 * scale;
              return (
                <g data-section-stair>
                  <path d={d} fill="none" stroke={INK} strokeWidth={1.4} />
                  <line x1={X(x0 + dir * going)} y1={Y(0) + waist * 0.4} x2={X(x0 + dir * risers * going)} y2={Y(STOREY) + waist} stroke={INK} strokeWidth={1} />
                  <text x={X(x0 + dir * (b - a) * 0.72)} y={Y(0.45)} textAnchor="middle" style={{ fontSize: '6.5px', fontWeight: 800, fill: '#b91c1c' }}>
                    {risers} RISERS × {Math.round(rise * 1000)} mm, GOING {Math.round(going * 1000)} mm
                  </text>
                </g>
              );
            })()}

            {/* level marks */}
            {s.levels.map(l => (
              <g key={l.label} data-section-level={l.h}>
                <line x1={X(L) + 8} y1={Y(l.h)} x2={X(L) + 26} y2={Y(l.h)} stroke={MUTED} strokeWidth={0.7} strokeDasharray="2 2" />
                <polygon points={`${X(L) + 26},${Y(l.h)} ${X(L) + 22},${Y(l.h) - 4} ${X(L) + 30},${Y(l.h) - 4}`} fill={INK} />
                <text x={X(L) + 34} y={Y(l.h) + 2.5} style={{ fontSize: '6.5px', fontWeight: 700, fill: INK }}>{l.label}</text>
              </g>
            ))}

            {/* the ends, which way is which */}
            <text x={X(0)} y={Y(-GROUND_DROP) + 28} style={{ fontSize: '6.5px', fontWeight: 700, fill: MUTED }}>{s.cut.axis === 'x' ? 'STREET (FRONT)' : 'LEFT SIDE'}</text>
            <text x={X(L)} y={Y(-GROUND_DROP) + 28} textAnchor="end" style={{ fontSize: '6.5px', fontWeight: 700, fill: MUTED }}>{s.cut.axis === 'x' ? 'REAR' : 'RIGHT SIDE'}</text>
            <text x={X(L / 2)} y={Y(-GROUND_DROP) + 44} textAnchor="middle" style={{ fontSize: '8px', fontWeight: 900, fill: INK, letterSpacing: '0.15em' }}>SECTION A–A</text>
            {/* scale bar */}
            <g transform={`translate(${PAD_L}, ${sheetH - 10})`}>
              <rect y={-4} width={2.5 * scale} height={5} fill={INK} />
              <rect x={2.5 * scale} y={-4} width={2.5 * scale} height={5} fill="white" stroke={INK} strokeWidth={0.8} />
              <text x={5 * scale + 6} y={1} style={{ fontSize: '6.5px', fontWeight: 700, fill: INK }}>5 m</text>
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECSection;
