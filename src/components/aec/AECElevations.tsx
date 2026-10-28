import React, { useMemo } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { elevations, GROUND_DROP, type Elevation, type FaceRect, type Face } from './elevations';

/**
 * The four elevations (template findings #5): front, rear and both sides at
 * one scale, with level marks, window and door tags as in the schedule, a
 * flat roof behind its parapet and the terrace rails, as the templates'
 * drawing sets show them (T6/T7, T13, T14, T16).
 */
const INK = '#1e293b', MUTED = '#64748b';
const TITLES: Record<Face, string> = {
  front: 'FRONT ELEVATION (STREET SIDE)', rear: 'REAR ELEVATION',
  left: 'LEFT SIDE ELEVATION', right: 'RIGHT SIDE ELEVATION',
};
const PAD_L = 24, PAD_R = 118, PAD_T = 22, PAD_B = 58;

/** Touching or overlapping stretches at the same depth and heights, as one band. */
function merge<T extends FaceRect>(rs: T[]): FaceRect[] {
  const groups = new Map<string, FaceRect[]>();
  for (const r of rs) {
    const k = `${r.depth.toFixed(3)}|${r.y0.toFixed(3)}|${r.y1.toFixed(3)}`;
    groups.set(k, [...(groups.get(k) ?? []), { a: r.a, b: r.b, y0: r.y0, y1: r.y1, depth: r.depth }]);
  }
  return [...groups.values()].flatMap(g => g.sort((p, q) => p.a - q.a).reduce<FaceRect[]>((out, r) => {
    const last = out[out.length - 1];
    if (last && r.a <= last.b + 1e-6) last.b = Math.max(last.b, r.b); else out.push({ ...r });
    return out;
  }, []));
}

const ElevationView: React.FC<{ e: Elevation; scale: number; x0: number; y0: number }> = ({ e, scale, x0, y0 }) => {
  const X = (a: number) => x0 + PAD_L + a * scale;
  const Y = (h: number) => y0 + PAD_T + (e.top - h) * scale;
  const rect = (r: FaceRect) => ({ x: X(r.a), y: Y(r.y1), width: (r.b - r.a) * scale, height: (r.y1 - r.y0) * scale });
  // farther first, so nearer walls hide what stands behind them
  const items: Array<{ depth: number; order: number; el: React.ReactNode }> = [];
  merge(e.walls).forEach((w, i) => items.push({ depth: w.depth, order: 0, el: <rect key={`w${i}`} {...rect(w)} fill={w.depth > 0.3 ? '#e5e9f0' : '#f8fafc'} stroke={INK} strokeWidth={1.2} /> })); // set back: a shade darker
  merge(e.parapets).forEach((p, i) => items.push({ depth: p.depth, order: 0, el: (
    <g key={`p${i}`} data-elev-parapet>
      <rect {...rect(p)} fill={p.depth > 0.3 ? '#cfd6e0' : '#e2e8f0'} stroke={INK} strokeWidth={1.2} />
      <line x1={X(p.a)} y1={Y(p.y1) + 2.5} x2={X(p.b)} y2={Y(p.y1) + 2.5} stroke={MUTED} strokeWidth={0.6} />
    </g>) }));
  e.openings.forEach((o, i) => {
    const r = rect(o), cx = r.x + r.width / 2;
    const tag = o.tag && <text x={cx} y={r.y + r.height + 8} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 800, fill: '#0369a1' }}>{o.tag}</text>;
    const el = o.kind === 'window' ? (
      <g key={`o${i}`} data-elev-window={o.tag}>
        <rect {...r} fill="#bae6fd" stroke={INK} strokeWidth={0.9} />
        <line x1={cx} y1={r.y} x2={cx} y2={r.y + r.height} stroke={INK} strokeWidth={0.6} />
        <line x1={r.x - 1.5} y1={r.y + r.height} x2={r.x + r.width + 1.5} y2={r.y + r.height} stroke={INK} strokeWidth={1.4} />
        {tag}
      </g>
    ) : o.kind === 'open' ? (
      <g key={`o${i}`} data-elev-open>
        <rect {...r} fill="#475569" opacity={0.35} stroke={INK} strokeWidth={0.9} />
        <text x={cx} y={r.y + r.height / 2} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 800, fill: 'white' }}>OPEN</text>
      </g>
    ) : o.kind === 'vehicle' ? (
      <g key={`o${i}`} data-elev-door={o.tag}>
        <rect {...r} fill="#cbd5e1" stroke={INK} strokeWidth={0.9} />
        {Array.from({ length: 5 }, (_, k) => <line key={k} x1={r.x} x2={r.x + r.width} y1={r.y + (k + 1) * r.height / 6} y2={r.y + (k + 1) * r.height / 6} stroke={MUTED} strokeWidth={0.5} />)}
        <text x={cx} y={r.y - 3} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 800, fill: '#0369a1' }}>{o.tag}</text>
      </g>
    ) : (
      <g key={`o${i}`} data-elev-door={o.tag}>
        <rect {...r} fill="#d6b48a" stroke={INK} strokeWidth={0.9} />
        <rect x={r.x + r.width * 0.18} y={r.y + r.height * 0.08} width={r.width * 0.64} height={r.height * 0.84} fill="none" stroke="#7c5a34" strokeWidth={0.5} />
        <text x={cx} y={r.y - 3} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 800, fill: '#0369a1' }}>{o.tag}</text>
      </g>
    );
    items.push({ depth: o.depth, order: 1, el });
  });
  merge(e.rails).forEach((r, i) => {
    const n = Math.max(2, Math.round((r.b - r.a) / 0.15));
    items.push({ depth: r.depth, order: 2, el: (
      <g key={`r${i}`} data-elev-rail stroke={INK}>
        <line x1={X(r.a)} y1={Y(r.y1)} x2={X(r.b)} y2={Y(r.y1)} strokeWidth={1.4} />
        {Array.from({ length: n + 1 }, (_, k) => <line key={k} x1={X(r.a + (r.b - r.a) * k / n)} x2={X(r.a + (r.b - r.a) * k / n)} y1={Y(r.y1)} y2={Y(r.y0)} strokeWidth={0.45} />)}
      </g>) });
  });
  items.sort((p, q) => q.depth - p.depth || p.order - q.order);

  const right = X(e.length);
  return (
    <g data-elevation={e.face}>
      {/* the ground: finished level ±0.00 on a plinth above natural ground */}
      <rect x={X(0) - 14} y={Y(0)} width={e.length * scale + 28} height={GROUND_DROP * scale} fill="#e2e8f0" />
      <line x1={X(0) - 14} y1={Y(-GROUND_DROP)} x2={right + 14} y2={Y(-GROUND_DROP)} stroke={INK} strokeWidth={2} />
      {items.map(it => it.el)}
      {/* level marks */}
      {e.levels.map(l => (
        <g key={l.label} data-elev-level={l.h}>
          <line x1={right + 6} y1={Y(l.h)} x2={right + 22} y2={Y(l.h)} stroke={MUTED} strokeWidth={0.7} strokeDasharray="2 2" />
          <polygon points={`${right + 22},${Y(l.h)} ${right + 18},${Y(l.h) - 4} ${right + 26},${Y(l.h) - 4}`} fill={INK} />
          <text x={right + 30} y={Y(l.h) + 2.5} style={{ fontSize: '6.5px', fontWeight: 700, fill: INK }}>{l.label}</text>
        </g>
      ))}
      {/* overall width */}
      <line x1={X(0)} y1={Y(-GROUND_DROP) + 14} x2={right} y2={Y(-GROUND_DROP) + 14} stroke={MUTED} strokeWidth={0.8} />
      <line x1={X(0)} y1={Y(-GROUND_DROP) + 10} x2={X(0)} y2={Y(-GROUND_DROP) + 18} stroke={MUTED} strokeWidth={0.8} />
      <line x1={right} y1={Y(-GROUND_DROP) + 10} x2={right} y2={Y(-GROUND_DROP) + 18} stroke={MUTED} strokeWidth={0.8} />
      <text x={(X(0) + right) / 2} y={Y(-GROUND_DROP) + 11} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: MUTED }}>{+e.length.toFixed(2)} m</text>
      <text x={(X(0) + right) / 2} y={Y(-GROUND_DROP) + 34} textAnchor="middle" style={{ fontSize: '8px', fontWeight: 900, fill: INK, letterSpacing: '0.15em' }}>{TITLES[e.face]}</text>
    </g>
  );
};

export const AECElevations: React.FC<{ layout: SolvedLayout }> = ({ layout }) => {
  const els = useMemo(() => elevations(layout), [layout]);
  if (!els.length) return null;
  // one scale for all four faces
  const longest = Math.max(...els.map(e => e.length)), tall = els[0].top;
  const scale = Math.min(360 / longest, 220 / tall);
  const cellW = Math.max(...els.map(e => e.length)) * scale + PAD_L + PAD_R;
  const cellH = (tall + GROUND_DROP) * scale + PAD_T + PAD_B;
  const sheetW = cellW * 2, sheetH = cellH * 2 + 40;

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] bg-[#f8fafc] dark:bg-[#0a0c10]">
      <CardHeader className="bg-slate-900 dark:bg-black py-5 border-b dark:border-white/5 flex flex-row items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-inner">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">Your Elevations</CardTitle>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              The four faces of the house, drawn from the plan
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-white dark:bg-[#0d0f14] p-4 md:p-8 flex items-center justify-center">
          <svg data-elevations viewBox={`0 0 ${sheetW} ${sheetH}`} className="w-full h-auto" style={{ maxWidth: 1000 }} xmlns="http://www.w3.org/2000/svg">
            <rect width={sheetW} height={sheetH} fill="white" />
            {els.map((e, i) => <ElevationView key={e.face} e={e} scale={scale} x0={(i % 2) * cellW} y0={Math.floor(i / 2) * cellH} />)}
            {/* scale bar */}
            <g transform={`translate(${PAD_L}, ${cellH * 2 + 14})`}>
              <rect y={-4} width={2.5 * scale} height={6} fill={INK} />
              <rect x={2.5 * scale} y={-4} width={2.5 * scale} height={6} fill="white" stroke={INK} strokeWidth={0.8} />
              <text y={-8} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: INK }}>0</text>
              <text x={5 * scale} y={-8} textAnchor="middle" style={{ fontSize: '7px', fontWeight: 700, fill: INK }}>5m</text>
              <text x={5 * scale + 16} y={1} style={{ fontSize: '7px', fontWeight: 600, fill: MUTED }}>
                Storey 3.2 m floor to floor · flat roof behind a 0.9 m parapet · window heads at 2.1 m · tags as in the door and window schedule
              </text>
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECElevations;
