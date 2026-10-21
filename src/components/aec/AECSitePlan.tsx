import React, { useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map as MapIcon } from 'lucide-react';
import { sitePlan, type Setbacks, type SiteRect } from './sitePlan';

/**
 * The site plan (owner 2026-10-20): the whole compound at one scale — the
 * plot and its fence, the road and gate, the setback lines, the house where
 * the plan puts it with its distance to every boundary, and each outbuilding
 * (boys' quarters, generator house, gatehouse) — as a planning approval's
 * site plan shows it.
 */
const INK = '#1e293b', MUTED = '#64748b', SETBACK = '#dc2626';
const ROAD_M = 5;              // the road band drawn in front of the plot
const MARGIN = 46, TOP = 40;   // room for the dimension lines and labels

const m = (v: number) => `${+v.toFixed(1)} m`;

export const AECSitePlan: React.FC<{ layout: SolvedLayout; setbacks?: Setbacks }> = ({ layout, setbacks }) => {
  const site = useMemo(() => sitePlan(layout, setbacks), [layout, setbacks]);
  if (!site) return null;
  const { plot, house, outbuildings, gate, driveway, clear } = site;

  // one scale for the whole compound, the sheet about 720 units wide
  const scale = Math.min(560 / plot.w, 620 / (plot.d + ROAD_M));
  const W = plot.w * scale, D = plot.d * scale, road = ROAD_M * scale;
  const sheetW = W + MARGIN * 2 + 120, sheetH = TOP + D + road + 110;
  const X = (x: number) => MARGIN + x * scale, Y = (y: number) => TOP + y * scale;
  const box = (r: SiteRect) => ({ x: X(r.x), y: Y(r.y), width: r.w * scale, height: r.h * scale });

  // a dimension line between two points along x (horizontal) or y (vertical)
  const dim = (key: string, x1: number, y1: number, x2: number, y2: number, label: string, side = -1) => {
    const horiz = Math.abs(y1 - y2) < 1e-6, len = horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    if (len < 8) return null;
    const tick = (x: number, y: number) => horiz
      ? <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={MUTED} strokeWidth={0.8} />
      : <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke={MUTED} strokeWidth={0.8} />;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return (
      <g key={key} data-site-dim={key}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MUTED} strokeWidth={0.8} />
        {tick(x1, y1)}{tick(x2, y2)}
        <text x={horiz ? mx : mx + side * 5} y={horiz ? my + side * 5 + (side > 0 ? 6 : 0) : my}
          textAnchor={horiz ? 'middle' : side < 0 ? 'end' : 'start'} dominantBaseline={horiz ? undefined : 'middle'}
          style={{ fontSize: '8px', fontWeight: 700, fill: MUTED }}>{label}</text>
      </g>
    );
  };

  const hx = house.x, hy = house.y, hw = house.w, hd = house.h;
  const storeyWord = site.storeys === 1 ? 'single storey' : `${site.storeys} storeys`;
  const coverage = Math.round(site.coverage * 100);

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] bg-[#f8fafc] dark:bg-[#0a0c10]">
      <CardHeader className="bg-slate-900 dark:bg-black py-5 border-b dark:border-white/5 flex flex-row items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-inner">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">Site Plan</CardTitle>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              The whole plot: house, outbuildings, gate and setbacks
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-white dark:bg-[#0d0f14] p-4 md:p-8 flex items-center justify-center">
          <svg data-site-plan viewBox={`0 0 ${sheetW} ${sheetH}`} className="w-full h-auto" style={{ maxWidth: 900, maxHeight: '78vh' }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="site-hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={6} stroke="#94a3b8" strokeWidth={0.8} />
              </pattern>
              <pattern id="site-paving" width={8} height={8} patternUnits="userSpaceOnUse">
                <rect width={8} height={8} fill="#f1f5f9" />
                <rect width={4} height={4} fill="#e2e8f0" />
              </pattern>
            </defs>
            <rect width={sheetW} height={sheetH} fill="white" />

            {/* the road along the front boundary */}
            <rect x={MARGIN - 20} y={Y(plot.d) + 3} width={W + 40} height={road} fill="#cbd5e1" />
            <line x1={MARGIN - 20} y1={Y(plot.d) + 3 + road / 2} x2={MARGIN + W + 20} y2={Y(plot.d) + 3 + road / 2} stroke="white" strokeWidth={1.5} strokeDasharray="10 8" />
            <text x={MARGIN + W / 2} y={Y(plot.d) + 3 + road / 2 - 5} textAnchor="middle" style={{ fontSize: '9px', fontWeight: 900, fill: '#475569', letterSpacing: '0.3em' }}>ACCESS ROAD</text>

            {/* the plot, its fence (a gap at the gate) */}
            <rect x={X(0)} y={Y(0)} width={W} height={D} fill="#f0fdf4" />
            <path data-site-fence d={`M${X(gate.x)},${Y(plot.d)} L${X(0)},${Y(plot.d)} L${X(0)},${Y(0)} L${X(plot.w)},${Y(0)} L${X(plot.w)},${Y(plot.d)} L${X(gate.x + gate.w)},${Y(plot.d)}`}
              fill="none" stroke={INK} strokeWidth={2.2} />
            {/* survey beacons at the plot's corners, as a survey plan marks them, numbered clockwise from the rear left */}
            <g data-site-beacons>
              {[[0, 0, -1, -1], [plot.w, 0, 1, -1], [plot.w, plot.d, 1, 1], [0, plot.d, -1, 1]].map(([x, y, sx, sy], i) => (
                <g key={i} data-beacon={i + 1}>
                  <circle cx={X(x)} cy={Y(y)} r={3.4} fill={SETBACK} stroke="white" strokeWidth={0.8} />
                  <text x={X(x) + sx * 6} y={Y(y) + sy * 6 + (sy > 0 ? 4 : 0)} textAnchor={sx < 0 ? 'end' : 'start'} style={{ fontSize: '6.5px', fontWeight: 800, fill: SETBACK }}>B{i + 1}</text>
                </g>
              ))}
            </g>
            {/* the gate leaves */}
            <g data-site-gate stroke={INK} strokeWidth={1} fill="none">
              <line x1={X(gate.x)} y1={Y(plot.d)} x2={X(gate.x) + gate.w * scale / 2 * 0.7} y2={Y(plot.d) - gate.w * scale / 2 * 0.7} />
              <line x1={X(gate.x + gate.w)} y1={Y(plot.d)} x2={X(gate.x + gate.w) - gate.w * scale / 2 * 0.7} y2={Y(plot.d) - gate.w * scale / 2 * 0.7} />
            </g>
            <text x={X(gate.x + gate.w / 2)} y={Y(plot.d) + 3 + road - 4} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: '#334155' }}>
              {gate.vehicles ? `GATE ${m(gate.w)}` : `PEDESTRIAN GATE ${m(gate.w)}`}
            </text>

            {/* the driveway from the gate to the car space */}
            {driveway && <rect data-site-driveway {...box(driveway)} fill="url(#site-paving)" stroke="#94a3b8" strokeWidth={0.6} />}

            {/* the setback lines */}
            {setbacks && (
              <g data-site-setbacks>
                <rect x={X(setbacks.left)} y={Y(setbacks.rear)} width={(plot.w - setbacks.left - setbacks.right) * scale} height={(plot.d - setbacks.front - setbacks.rear) * scale}
                  fill="none" stroke={SETBACK} strokeWidth={0.9} strokeDasharray="6 4" />
                <text x={X(plot.w / 2)} y={Y(plot.d - setbacks.front) + 10} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: SETBACK }}>
                  FRONT SETBACK {m(setbacks.front)}
                </text>
                <text x={X(setbacks.left) + 4} y={Y(setbacks.rear) + 9} style={{ fontSize: '7px', fontWeight: 700, fill: SETBACK }}>
                  REAR SETBACK {m(setbacks.rear)}
                </text>
                <text transform={`translate(${X(setbacks.left) - 3}, ${Y(plot.d / 2)}) rotate(-90)`} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: SETBACK }}>
                  SIDE {m(setbacks.left)}
                </text>
                <text transform={`translate(${X(plot.w - setbacks.right) + 9}, ${Y(plot.d / 2)}) rotate(-90)`} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: SETBACK }}>
                  SIDE {m(setbacks.right)}
                </text>
              </g>
            )}

            {/* the house */}
            <g data-site-house>
              <rect {...box(house)} fill="#e2e8f0" stroke={INK} strokeWidth={2} />
              <rect {...box(house)} fill="url(#site-hatch)" opacity={0.6} />
              <rect x={X(hx + hw / 2) - 58} y={Y(hy + hd / 2) - 16} width={116} height={30} rx={3} fill="white" opacity={0.92} />
              <text x={X(hx + hw / 2)} y={Y(hy + hd / 2) - 4} textAnchor="middle" style={{ fontSize: '9px', fontWeight: 900, fill: INK, letterSpacing: '0.08em' }}>MAIN BUILDING</text>
              <text x={X(hx + hw / 2)} y={Y(hy + hd / 2) + 8} textAnchor="middle" style={{ fontSize: '7.5px', fontWeight: 600, fill: '#334155' }}>
                {storeyWord} · {m(hw)} × {m(hd)}
              </text>
            </g>

            {/* the outbuildings: boys' quarters, generator house, gatehouse */}
            {outbuildings.map(b => (
              <g key={b.id} data-site-outbuilding={b.kind}>
                <rect {...box(b)} fill="#fef3c7" stroke={INK} strokeWidth={1.5} />
                <text x={X(b.x + b.w / 2)} y={Y(b.y + b.h / 2) - 2} textAnchor="middle" style={{ fontSize: '6.5px', fontWeight: 800, fill: INK }}>
                  {b.label.length > 22 ? `${b.label.slice(0, 21)}…` : b.label}
                </text>
                <text x={X(b.x + b.w / 2)} y={Y(b.y + b.h / 2) + 7} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 600, fill: MUTED }}>
                  {m(b.w)} × {m(b.h)}
                </text>
              </g>
            ))}

            {/* plot size */}
            {dim('plot-w', X(0), TOP - 16, X(plot.w), TOP - 16, `PLOT ${m(plot.w)}`)}
            {dim('plot-d', MARGIN - 28, Y(0), MARGIN - 28, Y(plot.d), m(plot.d))}
            {/* the house's distance to each boundary */}
            {dim('clear-front', X(hx + hw) + 12, Y(hy + hd), X(hx + hw) + 12, Y(plot.d), m(clear.front), 1)}
            {dim('clear-rear', X(hx + hw) + 12, Y(0), X(hx + hw) + 12, Y(hy), m(clear.rear), 1)}
            {dim('clear-left', X(0), Y(hy + hd * 0.3), X(hx), Y(hy + hd * 0.3), m(clear.left))}
            {dim('clear-right', X(hx + hw), Y(hy + hd * 0.3), X(plot.w), Y(hy + hd * 0.3), m(clear.right))}

            {/* north arrow: the plan's north is up, the road at the bottom */}
            <g transform={`translate(${MARGIN + W + 52}, ${TOP + 26})`}>
              <circle r={14} fill="white" stroke="#475569" strokeWidth={1} />
              <line x1={0} y1={-10} x2={0} y2={10} stroke={INK} strokeWidth={1.5} />
              <polygon points="0,-10 -4,-2 4,-2" fill={INK} />
              <text y={-17} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 900, fill: INK }}>N</text>
            </g>

            {/* key and figures */}
            <g transform={`translate(${MARGIN + W + 28}, ${TOP + 70})`} style={{ fontSize: '7px', fontWeight: 700, fill: '#334155' }}>
              <rect width={10} height={7} fill="#e2e8f0" stroke={INK} /><text x={14} y={6.5}>Main building</text>
              <rect y={14} width={10} height={7} fill="#fef3c7" stroke={INK} /><text x={14} y={20.5}>Outbuilding</text>
              <line x1={0} y1={31} x2={10} y2={31} stroke={SETBACK} strokeDasharray="3 2" /><text x={14} y={34}>Setback line</text>
              {driveway && <><rect y={40} width={10} height={7} fill="url(#site-paving)" stroke="#94a3b8" /><text x={14} y={46.5}>Driveway</text></>}
              <circle cx={5} cy={53.5} r={3} fill={SETBACK} /><text x={14} y={56}>Beacon (B1–B4)</text>
              <text y={70} style={{ fontSize: '7.5px', fontWeight: 900, fill: INK }}>PLOT {Math.round(plot.w * plot.d)} m²</text>
              <text y={82}>Site coverage {coverage}%</text>
            </g>

            {/* scale bar */}
            <g transform={`translate(${MARGIN}, ${Y(plot.d) + road + 26})`}>
              <rect y={-4} width={2.5 * scale} height={6} fill={INK} />
              <rect x={2.5 * scale} y={-4} width={2.5 * scale} height={6} fill="white" stroke={INK} strokeWidth={0.8} />
              <text y={-8} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: INK }}>0</text>
              <text x={5 * scale} y={-8} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: INK }}>5m</text>
            </g>
            <text x={sheetW / 2} y={Y(plot.d) + road + 52} textAnchor="middle" style={{ fontSize: '8px', fontWeight: 900, fill: INK, letterSpacing: '0.15em' }}>
              SITE PLAN · PLOT {m(plot.w).toUpperCase()} × {m(plot.d).toUpperCase()}
            </text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECSitePlan;
