import React, { useEffect, useRef, useState } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Sparkles, AlertTriangle } from 'lucide-react';
import { buildingModel, wallBlocks } from './buildingModel';

interface AECMassingViewProps {
  layout?: SolvedLayout;
}

const ROOM_COLOURS: Record<string, number> = {
  living_room:   0x3B82F6,
  lounge:        0x3B82F6,
  sunken_lounge: 0x2563EB,
  bedroom:       0x8B5CF6,
  master_suite:  0x7C3AED,
  master:        0x7C3AED,
  kitchen:       0xF59E0B,
  dining:        0xF97316,
  bathroom:      0x06B6D4,
  toilet:        0x0891B2,
  foyer:         0x10B981,
  entrance:      0x10B981,
  garage:        0x6B7280,
  office:        0xEC4899,
  study:         0xEC4899,
  stairwell:     0xEF4444,
  stair:         0xEF4444,
  family:        0x6366F1,
  default:       0x94A3B8,
};

function getRoomColour(type: string): number {
  if (!type) return ROOM_COLOURS.default;
  const key = type.toLowerCase().replace(/[\s\-\/]/g, '_');
  for (const [pattern, colour] of Object.entries(ROOM_COLOURS)) {
    if (key.includes(pattern)) return colour;
  }
  return ROOM_COLOURS.default;
}

async function mountThreeViewer(
  container: HTMLDivElement,
  layout: SolvedLayout
): Promise<() => void> {
  const THREE = await import('three');

  let OrbitControls: any;
  try {
    const mod = await import('three/addons/controls/OrbitControls.js' as any);
    OrbitControls = mod.OrbitControls;
  } catch {
    const mod = await import('three/examples/jsm/controls/OrbitControls.js' as any);
    OrbitControls = mod.OrbitControls;
  }

  const W = container.clientWidth  || 900;
  const H = container.clientHeight || 650;

  const scene = new THREE.Scene();
  // Beautiful architectural sky gradient alternative: solid light architectural blue
  scene.background = new THREE.Color(0xf1f5f9);
  scene.fog = new THREE.FogExp2(0xf1f5f9, 0.008);

  // A browser that refuses the full settings (weak or busy GPU) gets a lighter
  // context; one that refuses WebGL entirely gets an explained message.
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false });
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  // Dynamic camera — scale to actual plot size
  const plotW  = typeof layout.plot_width  === 'number' && !isNaN(layout.plot_width)  ? layout.plot_width  : 20;
  const plotD  = typeof layout.plot_depth  === 'number' && !isNaN(layout.plot_depth)  ? layout.plot_depth  : 20;
  const maxDim = Math.max(plotW, plotD);
  const camDist   = maxDim * 1.3;
  // the building where the site plan puts it on the plot (inside the setbacks), and the camera on the building
  const off = layout.site_offset ?? { x: 0, y: 0 };
  const all = [...layout.placed_rooms, ...(layout.outbuildings ?? []).flatMap(b => b.rooms)].filter(r => r.width > 0 && r.depth > 0);
  const bx0 = Math.min(...all.map(r => r.x)), bx1 = Math.max(...all.map(r => r.x + r.width));
  const by0 = Math.min(...all.map(r => r.y)), by1 = Math.max(...all.map(r => r.y + r.depth));
  const storeys = Math.max(1, ...layout.placed_rooms.map(r => r.floor + 1));
  const focus = new THREE.Vector3((bx0 + bx1) / 2 + off.x - plotW / 2, storeys * 1.6, (by0 + by1) / 2 + off.y - plotD / 2);
  const span = Math.max(bx1 - bx0, by1 - by0, storeys * 3.2, 6);

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, camDist * 12);
  camera.position.set(focus.x + span * 1.15, focus.y + span * 0.8, focus.z + span * 1.35);
  camera.lookAt(focus);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.target.copy(focus);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(maxDim, maxDim * 2, maxDim);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  const sc = maxDim * 1.5;
  Object.assign(sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 0.1, far: camDist * 4 });
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xe0f2fe, 0.6);
  fill.position.set(-maxDim, maxDim * 0.5, -maxDim);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(maxDim * 10, maxDim * 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);
  
  const gridHelper = new THREE.GridHelper(maxDim * 4, Math.floor(maxDim * 4), 0xe2e8f0, 0xf1f5f9);
  gridHelper.position.y = -0.04;
  scene.add(gridHelper);

  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const cx = plotW / 2;
  const cz = plotD / 2;

  // The building itself, from the plan (buildingModel.ts): every wall at its thickness with the
  // plan's doors and windows cut through it, glass in the windows, and a slab under every room
  // tinted by what the room is. No roof yet (step 2): the rooms read from above.
  const model = buildingModel(layout);
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.92, metalness: 0 });
  const partition = new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 0.95, metalness: 0 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9cc9e8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.38 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.35 });
  const typeOf = (id: string) => (sourceRooms.find(r => r.room_id === id || r.id === id)?.type ?? '') as string;
  const tint = (c: number) => { const k = 0.55; const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return ((r + (255 - r) * k) << 16) | ((g + (255 - g) * k) << 8) | (b + (255 - b) * k); };
  const floorMats = new Map<number, InstanceType<typeof THREE.MeshStandardMaterial>>();
  const floorMat = (c: number) => { let m = floorMats.get(c); if (!m) { m = new THREE.MeshStandardMaterial({ color: tint(c), roughness: 0.8 }); floorMats.set(c, m); } return m; };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: any, edges = true) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + off.x - cx, y, z + off.y - cz);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); e.position.copy(mesh.position); scene.add(e); }
  };

  for (const s of model.slabs) box(s.w, s.t, s.d, s.x + s.w / 2, s.z + (s.floor === 0 ? s.t / 2 : -s.t / 2), s.y + s.d / 2, floorMat(getRoomColour(typeOf(s.room_id))), false);
  let blocks = 0;
  for (const w of model.walls) {
    const horizontal = w.y0 === w.y1, t = w.thickness;
    const mat = w.kind === 'rail' ? railMat : w.kind === 'ext' ? plaster : partition;
    for (const k of wallBlocks(w)) {
      const len = k.b - k.a, h = k.z1 - k.z0, mid = (k.a + k.b) / 2;
      if (horizontal) box(len, h, t, w.x0 + mid, k.z0 + h / 2, w.y0, mat);
      else box(t, h, len, w.x0, k.z0 + h / 2, w.y0 + mid, mat);
      blocks++;
    }
    for (const o of w.openings) {
      if (o.kind !== 'window') continue;
      const h = o.z1 - o.z0, mid = o.at + o.width / 2;
      if (horizontal) box(o.width, h, 0.03, w.x0 + mid, o.z0 + h / 2, w.y0, glass, false);
      else box(0.03, h, o.width, w.x0, o.z0 + h / 2, w.y0 + mid, glass, false);
    }
  }
  const roomsRendered = model.slabs.length;
  if (model.unplaced.length) console.warn('[AECMassingView] openings not in a wall:', model.unplaced);
  console.log(`[AECMassingView] building model: ${model.walls.length} walls (${blocks} blocks), ${model.counts.reduce((t, c) => t + c.placed, 0)} of ${model.counts.reduce((t, c) => t + c.planned, 0)} doors and windows, ${model.slabs.length} slabs.`);

  console.log(`[AECMassingView] Three.js rendered ${roomsRendered} rooms on a ${plotW.toFixed(1)}m x ${plotD.toFixed(1)}m plot.`);

  // Plot boundary
  const plotBoundary = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(plotW, 0.02, plotD)),
    new THREE.LineBasicMaterial({ color: 0x3B82F6, transparent: true, opacity: 0.4 })
  );
  scene.add(plotBoundary);

  let animId: number;
  const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
  animate();

  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    scene.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    renderer.dispose();
    // free the browser's WebGL context now: each redraw makes a new one, and
    // browsers refuse new ones (or block the site) once too many are held
    renderer.forceContextLoss();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}



// ── The massing model without WebGL (owner 2026-10-28: Chrome with graphics acceleration off, or
// a blocked GPU, has no WebGL at all since Chrome dropped its software fallback). Each room a
// block in its colour, stacked storey by storey; drag across to turn the building, up and down to
// tilt. Drawn as SVG, back to front, so it works in every browser.

interface MassBox { x: number; y: number; w: number; d: number; z: number; h: number; colour: number; label: string }

/** The same blocks the 3D viewer draws: each room inset by its wall, at its storey's height. */
function massBoxes(layout: SolvedLayout): MassBox[] {
  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const rooms = [...layout.placed_rooms, ...(layout.outbuildings ?? []).flatMap(b => b.rooms)];
  const FLOOR_H = 3.2, WALL_T = 0.12;
  return rooms.filter(r => [r.x, r.y, r.width, r.depth].every(v => typeof v === 'number' && !isNaN(v)) && r.width > 0 && r.depth > 0
      && !r.room_id.startsWith('stairwell_void') && !r.room_id.startsWith('atrium_'))
    .map(r => {
      const src = sourceRooms.find(q => q.room_id === r.room_id || q.id === r.room_id);
      const id = r.room_id.toLowerCase();
      const h = id.includes('garage') ? 4.0 : r.floor === 0 ? 3.2 : 3.0;
      return { x: r.x + WALL_T / 2, y: r.y + WALL_T / 2, w: r.width - WALL_T, d: r.depth - WALL_T, z: r.floor * FLOOR_H, h: h - 0.1,
        colour: getRoomColour(src?.type ?? ''), label: String(src?.name ?? r.room_id) };
    });
}

const hex = (c: number, k = 1) => {
  const r = Math.round(((c >> 16) & 255) * k), g = Math.round(((c >> 8) & 255) * k), b = Math.round((c & 255) * k);
  return `rgb(${r},${g},${b})`;
};

function MassingSvg({ layout }: { layout: SolvedLayout }) {
  const [az, setAz] = useState(-35);   // degrees round the building
  const [el, setEl] = useState(32);    // degrees above the ground
  const drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null);
  const boxes = React.useMemo(() => massBoxes(layout), [layout]);
  const plotW = layout.plot_width || 15, plotD = layout.plot_depth || 30;
  const off = layout.site_offset ?? { x: 0, y: 0 };
  const cx = (layout.building_width ?? plotW) / 2, cy = (layout.building_depth ?? plotD) / 2;
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a), se = Math.sin(e), ce = Math.cos(e);
  // plan (x, y) and height z to the sheet; `depth` grows towards the viewer
  const P = (x: number, y: number, z: number) => {
    const X = (x - cx) * ca - (y - cy) * sa, Y = (x - cx) * sa + (y - cy) * ca;
    return { sx: X, sy: Y * se - z * ce, depth: Y };
  };
  const faces: Array<{ pts: string; fill: string; key: string }> = [];
  // storey by storey from the ground up, each storey back to front
  const order = [...boxes].sort((p, q) => p.z - q.z || P(p.x + p.w / 2, p.y + p.d / 2, 0).depth - P(q.x + q.w / 2, q.y + q.d / 2, 0).depth);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const pt = (x: number, y: number, z: number) => {
    const q = P(x, y, z); minX = Math.min(minX, q.sx); maxX = Math.max(maxX, q.sx); minY = Math.min(minY, q.sy); maxY = Math.max(maxY, q.sy);
    return `${q.sx.toFixed(3)},${q.sy.toFixed(3)}`;
  };
  // the plot, under everything (in the building's frame: the plot starts at -site_offset)
  const px0 = -off.x, py0 = -off.y;
  const plot = [pt(px0, py0, 0), pt(px0 + plotW, py0, 0), pt(px0 + plotW, py0 + plotD, 0), pt(px0, py0 + plotD, 0)].join(' ');
  order.forEach((b, i) => {
    const x0 = b.x, x1 = b.x + b.w, y0 = b.y, y1 = b.y + b.d, z0 = b.z, z1 = b.z + b.h;
    // the four sides, each with its outward normal; a side faces the viewer when its normal's depth is positive
    const sides: Array<[number, number, number, number, number, number]> = [
      [x0, y1, x1, y1, 0, 1], [x1, y0, x0, y0, 0, -1], [x1, y1, x1, y0, 1, 0], [x0, y0, x0, y1, -1, 0],
    ];
    for (const [ax, ay, bx, by, nx, ny] of sides) {
      const facing = nx * sa + ny * ca;
      if (facing <= 0) continue;
      faces.push({ key: `${i}s${nx}${ny}`, fill: hex(b.colour, 0.55 + 0.3 * facing), pts: [pt(ax, ay, z0), pt(bx, by, z0), pt(bx, by, z1), pt(ax, ay, z1)].join(' ') });
    }
    faces.push({ key: `${i}t`, fill: hex(b.colour, 1), pts: [pt(x0, y0, z1), pt(x1, y0, z1), pt(x1, y1, z1), pt(x0, y1, z1)].join(' ') });
  });
  const pad = Math.max(maxX - minX, maxY - minY) * 0.06;
  const onDown = (ev: React.PointerEvent) => { (ev.target as Element).setPointerCapture?.(ev.pointerId); drag.current = { x: ev.clientX, y: ev.clientY, az, el }; };
  const onMove = (ev: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    setAz(d.az + (ev.clientX - d.x) * 0.4);
    setEl(Math.max(12, Math.min(75, d.el - (ev.clientY - d.y) * 0.25)));
  };
  return (
    <div className="absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <polygon points={plot} fill="#e2e8f0" stroke="#3B82F6" strokeOpacity={0.5} strokeWidth={0.06} />
        {faces.map(f => <polygon key={f.key} points={f.pts} fill={f.fill} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.03} />)}
      </svg>
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setAz(v => v - 45)} className="px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-white">⟲ Turn</button>
        <button onClick={() => setAz(v => v + 45)} className="px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-white">Turn ⟳</button>
        <button onClick={() => { setAz(-35); setEl(32); }} className="px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-white">Reset view</button>
      </div>
      <p className="absolute top-4 left-4 text-[10px] font-bold text-slate-500 bg-white/80 rounded-lg px-2 py-1 pointer-events-none">Drag to turn and tilt the building</p>
    </div>
  );
}

type RenderMode = 'loading' | 'three' | 'svg' | 'error';

const AECMassingView: React.FC<AECMassingViewProps> = ({ layout }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<RenderMode>('loading');
  const [noWebGL, setNoWebGL] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Redraw only when the geometry changes. (A guard that skipped a remount
  // when plot size and room count matched left the panel blank: the cleanup
  // had already removed the previous drawing.)
  const geometryKey = layout ? JSON.stringify([layout.plot_width, layout.plot_depth,
    (layout.placed_rooms ?? []).map(r => [r.room_id, r.floor, r.x, r.y, r.width, r.depth]),
    (layout.outbuildings ?? []).map(b => b.rooms.map(r => [r.room_id, r.x, r.y, r.width, r.depth]))]) : null;

  useEffect(() => {
    if (!containerRef.current || !layout) return;

    let cancelled = false;

    const mount = async () => {
      setMode('loading');
      try {
        const cleanup = await mountThreeViewer(containerRef.current!, layout);
        if (!cancelled) {
          cleanupRef.current = cleanup;
          setMode('three');
        } else {
          cleanup();
        }
      } catch (err) {
        const noGL = /webgl/i.test(String((err as Error)?.message ?? err));
        console.warn(`[AECMassingView] ${noGL ? 'no WebGL in this browser: drawing the massing model without it' : 'Three.js render failed'}:`, err);
        if (!cancelled) { setNoWebGL(noGL); setMode(noGL ? 'svg' : 'error'); }
      }
    };

    mount();
    return () => { cancelled = true; cleanupRef.current?.(); cleanupRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the geometry key stands for the layout
  }, [geometryKey]);

  if (!layout) return null;

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-[#020617]">
      <CardHeader className="bg-black/60 py-5 border-b border-white/5 backdrop-blur-xl px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <BoxIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">Your 3D Massing Model</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                  {mode === 'three' ? 'Drag to orbit, scroll to zoom' : mode === 'svg' ? 'Drag to turn and tilt' : mode === 'error' ? 'Could not be drawn' : 'Building the model...'}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-black border-primary/40 text-primary bg-primary/10 px-4 py-1.5">
            <Sparkles className="w-3 h-3 mr-1.5" />
            {mode === 'three' || mode === 'svg' ? '3D MASSING' : mode === 'error' ? 'UNAVAILABLE' : 'LOADING'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative h-[650px] bg-[#f1f5f9]">
        {mode === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f1f5f9] z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Building your massing model...</p>
            </div>
          </div>
        )}
        {mode === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617] z-10">
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">3D Viewer Unavailable</p>
              {noWebGL ? (
                <p className="text-[10px] text-slate-400 max-w-sm">Your browser didn't allow 3D graphics (WebGL) for this page. Turn on "Use graphics acceleration when available" in your browser's settings, then restart the browser and reload this page.</p>
              ) : null}
              <p className="text-[10px] text-slate-500 max-w-xs">The floor plan and all document outputs above are unaffected.</p>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
        {mode === 'svg' && layout && <MassingSvg layout={layout} />}

        {(mode === 'three' || mode === 'svg') && (
          <>
            <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
              {[
                ['#3B82F6','Living / Lounge'],['#8B5CF6','Bedrooms'],['#F59E0B','Kitchen'],
                ['#F97316','Dining'],['#10B981','Foyer / Entrance'],['#6B7280','Garage / Service'],['#6366F1','Family Lounge'],
              ].map(([colour, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm opacity-80" style={{ backgroundColor: colour }} />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
