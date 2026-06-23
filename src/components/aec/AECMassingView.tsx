import React, { useEffect, useRef, useState } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Sparkles, AlertTriangle } from 'lucide-react';

interface AECMassingViewProps {
  layout?: SolvedLayout;
}

// ── Room colour palette by type ───────────────────────────────────────────────
const ROOM_COLOURS: Record<string, number> = {
  living_room:  0x3B82F6,
  lounge:       0x3B82F6,
  sunken_lounge:0x2563EB,
  bedroom:      0x8B5CF6,
  master_suite: 0x7C3AED,
  kitchen:      0xF59E0B,
  dining:       0xF97316,
  bathroom:     0x06B6D4,
  toilet:       0x0891B2,
  foyer:        0x10B981,
  garage:       0x6B7280,
  office:       0xEC4899,
  stairwell:    0xEF4444,
  default:      0x94A3B8,
};

function getRoomColour(type: string): number {
  const key = type.toLowerCase().replace(/[\s-]/g, '_');
  for (const [pattern, colour] of Object.entries(ROOM_COLOURS)) {
    if (key.includes(pattern)) return colour;
  }
  return ROOM_COLOURS.default;
}

// ── Three.js fallback renderer ────────────────────────────────────────────────
async function mountThreeViewer(
  container: HTMLDivElement,
  layout: SolvedLayout
): Promise<() => void> {
  const THREE = await import('three');
  const { OrbitControls } = await import(
    // @ts-ignore — three/examples not always typed
    'three/examples/jsm/controls/OrbitControls.js'
  );

  const W = container.clientWidth  || 900;
  const H = container.clientHeight || 650;

  // Scene
  const scene    = new THREE.Scene();
  scene.background = new THREE.Color(0x020617);
  scene.fog        = new THREE.FogExp2(0x020617, 0.018);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
  camera.position.set(35, 28, 35);
  camera.lookAt(0, 0, 0);

  // Orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2.05;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 300;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
  sun.shadow.camera.right = sun.shadow.camera.top   =  80;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8ab4f8, 0.5);
  fill.position.set(-20, 10, -20);
  scene.add(fill);

  // Grid
  const grid = new THREE.GridHelper(120, 60, 0x1e293b, 0x1e293b);
  scene.add(grid);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x0a0f1e });
  const ground    = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Build massing from solvedLayout ─────────────────────────────────────────
  const { placed_rooms, plot_width, plot_depth } = layout;
  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const FLOOR_H = 3.0;  // metres per storey
  const WALL_T  = 0.15; // visual wall thickness offset

  // Centre the massing on origin
  const cx = (plot_width  ?? 20) / 2;
  const cz = (plot_depth  ?? 20) / 2;

  placed_rooms.forEach(room => {
    if (
      isNaN(room.x) || isNaN(room.y) ||
      isNaN(room.width) || isNaN(room.depth) ||
      room.width <= 0 || room.depth <= 0
    ) return;

    const sourceRoom = sourceRooms.find(
      r => r.room_id === room.room_id || r.id === room.room_id
    );
    const roomType  = sourceRoom?.type ?? 'default';
    const isVoid    = room.room_id === 'stairwell_void';
    const floorBase = room.floor * FLOOR_H;

    // Box geometry — slightly inset so walls read as separate masses
    const geo = new THREE.BoxGeometry(
      room.width - WALL_T,
      FLOOR_H - 0.08,
      room.depth - WALL_T
    );

    const colour = isVoid ? 0x1e293b : getRoomColour(roomType);
    const mat    = new THREE.MeshLambertMaterial({
      color: colour,
      transparent: isVoid,
      opacity: isVoid ? 0.3 : 0.88,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      room.x + room.width  / 2 - cx,
      floorBase + FLOOR_H / 2,
      room.y + room.depth  / 2 - cz
    );
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Wireframe edge lines for legibility
    const edges   = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.copy(mesh.position);
    scene.add(wireframe);
  });

  // Plot boundary marker
  const plotGeo = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(plot_width ?? 20, 0.05, plot_depth ?? 20)
  );
  const plotLine = new THREE.LineSegments(
    plotGeo,
    new THREE.LineBasicMaterial({ color: 0x3B82F6, opacity: 0.5, transparent: true })
  );
  plotLine.position.set(0, 0, 0);
  scene.add(plotLine);

  // ── Render loop ─────────────────────────────────────────────────────────────
  let animId: number;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // Resize handler
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    renderer.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
}

// ── That Open Engine (IFC) path ───────────────────────────────────────────────
async function mountIfcViewer(
  container: HTMLDivElement,
  layout: SolvedLayout
): Promise<() => void> {
  // Dynamically import — keeps build clean on Netlify
  const OBC = await import('@thatopen/components');

  const { ifcEngine } = await import('@/lib/aec/ifc/authoring');

  const components = new OBC.Components();
  const worlds     = components.get(OBC.Worlds);

  const world = worlds.create<
    typeof OBC.SimpleScene,
    typeof OBC.SimpleCamera,
    typeof OBC.SimpleRenderer
  >();

  world.scene    = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera   = new OBC.SimpleCamera(components);

  components.init();
  world.scene.setup();
  world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);

  await ifcEngine.init();
  const ifcBuffer = await ifcEngine.generateModel(layout);

  const fragments          = components.get(OBC.FragmentsManager);
  const fragmentIfcLoader  = components.get(OBC.IfcLoader);

  await fragmentIfcLoader.setup();
  const model = await fragmentIfcLoader.load(ifcBuffer);
  world.scene.three.add(model);

  console.log('[AECMassingView] IFC model loaded via That Open Engine.');

  return () => {
    components.dispose();
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
type RenderMode = 'loading' | 'ifc' | 'three' | 'error';

const AECMassingView: React.FC<AECMassingViewProps> = ({ layout }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode]       = useState<RenderMode>('loading');
  const cleanupRef            = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !layout) return;

    let cancelled = false;

    const mount = async () => {
      setMode('loading');

      // ── Path A: attempt That Open Engine (IFC) ─────────────────────────────
      // Requires COOP/COEP headers (Vercel native, Netlify via coi-serviceworker).
      // If SharedArrayBuffer is unavailable or the IFC library fails, we fall
      // through to Path B immediately — never a black canvas.
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

      if (hasSharedArrayBuffer) {
        try {
          const cleanup = await mountIfcViewer(containerRef.current!, layout);
          if (!cancelled) {
            cleanupRef.current = cleanup;
            setMode('ifc');
          } else {
            cleanup();
          }
          return;
        } catch (err) {
          console.warn(
            '[AECMassingView] That Open Engine unavailable, falling back to Three.js:',
            err
          );
          // Fall through to Path B
        }
      }

      // ── Path B: Three.js deterministic massing (always works) ─────────────
      try {
        const cleanup = await mountThreeViewer(containerRef.current!, layout);
        if (!cancelled) {
          cleanupRef.current = cleanup;
          setMode('three');
        } else {
          cleanup();
        }
      } catch (err) {
        console.error('[AECMassingView] Three.js fallback also failed:', err);
        if (!cancelled) setMode('error');
      }
    };

    mount();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [layout]);

  if (!layout) return null;

  const engineLabel = mode === 'ifc'
    ? 'IFC Mode — That Open Engine'
    : mode === 'three'
    ? '3D Massing — Three.js Renderer'
    : 'Compiling Mesh...';

  const badgeLabel = mode === 'ifc'
    ? 'DYNAMIC IFC MODE'
    : mode === 'three'
    ? '3D MASSING MODE'
    : 'INITIALISING';

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-[#020617]">
      <CardHeader className="bg-black/60 py-5 border-b border-white/5 backdrop-blur-xl px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <BoxIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">
                Structural Massing View
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                  {engineLabel}
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] font-black border-primary/40 text-primary bg-primary/10 px-4 py-1.5"
          >
            <Sparkles className="w-3 h-3 mr-1.5" /> {badgeLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative h-[650px] bg-[#020617]">
        {/* Loading spinner */}
        {mode === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617] z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.2)]" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">
                Compiling Massing Model...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {mode === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617] z-10">
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                3D Viewer Unavailable
              </p>
              <p className="text-[10px] text-slate-500 max-w-xs">
                The massing viewer could not initialise. The floor plan and all
                document outputs above are unaffected.
              </p>
            </div>
          </div>
        )}

        {/* That Open Engine / Three.js canvas mounts here */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Three.js mode — legend overlay */}
        {mode === 'three' && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
            {[
              { colour: '#3B82F6', label: 'Living / Lounge' },
              { colour: '#8B5CF6', label: 'Bedrooms' },
              { colour: '#F59E0B', label: 'Kitchen' },
              { colour: '#F97316', label: 'Dining' },
              { colour: '#10B981', label: 'Foyer / Entrance' },
              { colour: '#6B7280', label: 'Garage / Service' },
            ].map(({ colour, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm opacity-80"
                  style={{ backgroundColor: colour }}
                />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Vercel upgrade callout — only shown in Three.js fallback mode */}
        {mode === 'three' && (
          <div className="absolute bottom-4 right-4 px-3 py-2 bg-black/60 border border-white/10 rounded-xl backdrop-blur-sm pointer-events-none">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
              IFC Mode available on Vercel hosting
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
