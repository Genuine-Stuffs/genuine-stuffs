import React, { useEffect, useRef, useState } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Sparkles, AlertTriangle } from 'lucide-react';

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
  scene.background = new THREE.Color(0x020617);
  scene.fog = new THREE.FogExp2(0x020617, 0.006);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
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
  const camHeight = maxDim * 0.75;

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, camDist * 12);
  camera.position.set(camDist, camHeight, camDist);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(maxDim, maxDim * 1.5, maxDim * 0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = maxDim;
  Object.assign(sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 0.5, far: camDist * 4 });
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8ab4f8, 0.4);
  fill.position.set(-maxDim * 0.5, maxDim * 0.3, -maxDim * 0.5);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(maxDim * 4, maxDim * 4),
    new THREE.MeshLambertMaterial({ color: 0x0a0f1e })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);
  scene.add(new THREE.GridHelper(maxDim * 3, Math.floor(maxDim * 1.5), 0x1e293b, 0x1e293b));

  const { placed_rooms } = layout;
  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const FLOOR_H = 3.2;
  const WALL_T  = 0.12;
  const cx = plotW / 2;
  const cz = plotD / 2;

  let roomsRendered = 0;

  placed_rooms.forEach(room => {
    if (
      typeof room.x     !== 'number' || isNaN(room.x)    ||
      typeof room.y     !== 'number' || isNaN(room.y)    ||
      typeof room.width !== 'number' || isNaN(room.width) || room.width  <= 0 ||
      typeof room.depth !== 'number' || isNaN(room.depth) || room.depth  <= 0
    ) return;

    const sourceRoom = sourceRooms.find(r => r.room_id === room.room_id || r.id === room.room_id);
    const roomType   = sourceRoom?.type ?? '';
    const isVoid     = room.room_id === 'stairwell_void';
    const floorBase  = room.floor * FLOOR_H;

    const geo = new THREE.BoxGeometry(room.width - WALL_T, FLOOR_H - 0.1, room.depth - WALL_T);
    const mat = new THREE.MeshLambertMaterial({
      color: isVoid ? 0x1e293b : getRoomColour(roomType),
      transparent: isVoid,
      opacity: isVoid ? 0.25 : 0.9,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      room.x + room.width / 2 - cx,
      floorBase + (FLOOR_H - 0.1) / 2,
      room.y + room.depth / 2 - cz
    );
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })
    );
    edges.position.copy(mesh.position);
    scene.add(edges);
    roomsRendered++;
  });

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
    renderer.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}

async function mountIfcViewer(container: HTMLDivElement, layout: SolvedLayout): Promise<() => void> {
  const OBC = await import('@thatopen/components');
  const { ifcEngine } = await import('@/lib/aec/ifc/authoring');
  const webIfc = await import('web-ifc');
  (webIfc as any).SetWasmPath?.('/');

  const components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<typeof OBC.SimpleScene, typeof OBC.SimpleCamera, typeof OBC.SimpleRenderer>();
  world.scene    = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera   = new OBC.SimpleCamera(components);
  components.init();
  world.scene.setup();

  const maxDim = Math.max(layout.plot_width ?? 20, layout.plot_depth ?? 20);
  world.camera.controls.setLookAt(maxDim, maxDim * 0.6, maxDim, 0, 0, 0);

  await ifcEngine.init();
  const ifcBuffer = await ifcEngine.generateModel(layout);
  const fragmentIfcLoader = components.get(OBC.IfcLoader);
  await fragmentIfcLoader.setup();
  const model = await fragmentIfcLoader.load(ifcBuffer);
  world.scene.three.add(model);
  console.log('[AECMassingView] IFC model loaded via That Open Engine.');
  return () => { components.dispose(); };
}

type RenderMode = 'loading' | 'ifc' | 'three' | 'error';

const AECMassingView: React.FC<AECMassingViewProps> = ({ layout }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<RenderMode>('loading');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !layout) return;
    let cancelled = false;

    const mount = async () => {
      setMode('loading');
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

      if (hasSharedArrayBuffer) {
        try {
          const cleanup = await mountIfcViewer(containerRef.current!, layout);
          if (!cancelled) { cleanupRef.current = cleanup; setMode('ifc'); } else cleanup();
          return;
        } catch (err) {
          console.warn('[AECMassingView] That Open Engine unavailable, falling back to Three.js:', err);
        }
      }

      try {
        const cleanup = await mountThreeViewer(containerRef.current!, layout);
        if (!cancelled) { cleanupRef.current = cleanup; setMode('three'); } else cleanup();
      } catch (err) {
        console.error('[AECMassingView] Three.js fallback also failed:', err);
        if (!cancelled) setMode('error');
      }
    };

    mount();
    return () => { cancelled = true; cleanupRef.current?.(); cleanupRef.current = null; };
  }, [layout]);

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
              <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">Structural Massing View</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                  {mode === 'ifc' ? 'IFC Mode — That Open Engine' : mode === 'three' ? '3D Massing — Three.js Renderer' : 'Compiling Mesh...'}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-black border-primary/40 text-primary bg-primary/10 px-4 py-1.5">
            <Sparkles className="w-3 h-3 mr-1.5" />
            {mode === 'ifc' ? 'DYNAMIC IFC MODE' : mode === 'three' ? '3D MASSING MODE' : 'INITIALISING'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative h-[650px] bg-[#020617]">
        {mode === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617] z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Compiling Massing Model...</p>
            </div>
          </div>
        )}
        {mode === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617] z-10">
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">3D Viewer Unavailable</p>
              <p className="text-[10px] text-slate-500 max-w-xs">The floor plan and all document outputs above are unaffected.</p>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />

        {mode === 'three' && (
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
            <div className="absolute bottom-4 right-4 px-3 py-2 bg-black/60 border border-white/10 rounded-xl backdrop-blur-sm pointer-events-none">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Copy web-ifc.wasm to /public for full IFC mode</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
