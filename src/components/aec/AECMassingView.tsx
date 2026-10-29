import React, { useEffect, useRef, useState } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Sparkles, AlertTriangle } from 'lucide-react';
import { buildingModel, wallBlocks } from './buildingModel';
import { siteContext, type ContextKind } from './siteContext';
import { fallbackBoxes, paintOrder, FALLBACK_COLOURS } from './fallbackModel';
import { withSiteOffset, type Setbacks } from './sitePlan';

interface AECMassingViewProps {
  layout?: SolvedLayout;
  /** the plan's setbacks, so a saved plan without its place on the plot stands where the site plan draws it */
  setbacks?: Setbacks;
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

// Step 3: the sun where it really is. Lagos (6.5° N) at 09:30 on 21 December, the dry season:
// low in the south-east, so the shadows are long enough to read the massing. A unit vector in
// the scene's axes: x east, y up, z south (the plan's north arrow points up, which is -z).
const SITE_LATITUDE = 6.5, SUN_DAY = 355, SUN_HOUR = 9.5;
function sunDirection(latDeg = SITE_LATITUDE, day = SUN_DAY, hour = SUN_HOUR) {
  const rad = Math.PI / 180, lat = latDeg * rad;
  const decl = -23.44 * rad * Math.cos((2 * Math.PI / 365) * (day + 10));
  const H = 15 * (hour - 12) * rad;
  const east = -Math.cos(decl) * Math.sin(H);
  const north = Math.sin(decl) * Math.cos(lat) - Math.cos(decl) * Math.cos(H) * Math.sin(lat);
  const up = Math.sin(decl) * Math.sin(lat) + Math.cos(decl) * Math.cos(H) * Math.cos(lat);
  return { x: east, y: up, z: -north };
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
  let Sky: any;
  try { Sky = (await import('three/addons/objects/Sky.js' as any)).Sky; }
  catch { Sky = (await import('three/examples/jsm/objects/Sky.js' as any)).Sky; }

  const W = container.clientWidth  || 900;
  const H = container.clientHeight || 650;

  const scene = new THREE.Scene();
  // the horizon's haze; the sky itself is the Sky dome below
  scene.background = new THREE.Color(0xdbe7f1);
  scene.fog = new THREE.FogExp2(0xdbe7f1, 0.004);

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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // the Sky shader is physically scaled: filmic tone mapping brings it, and the sunlit walls, into range
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
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

  // the sky, with the sun in it. Its light in the shade is a hemisphere light, not an environment map
  // made from the sky: some browsers (software WebGL, older GPUs) render that map black, and the model with it
  const sunDir = sunDirection();
  const sky = new Sky();
  sky.scale.setScalar(camDist * 10);
  sky.material.uniforms.turbidity.value = 6;
  sky.material.uniforms.rayleigh.value = 1.6;
  sky.material.uniforms.mieCoefficient.value = 0.005;
  sky.material.uniforms.mieDirectionalG.value = 0.8;
  sky.material.uniforms.sunPosition.value.set(sunDir.x, sunDir.y, sunDir.z);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xcfe3f5, 0x8a7f6a, 0.9));

  // the sun: its shadow box fitted to the plot and the tallest storey, so the shadows stay sharp
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  const reach = Math.hypot(plotW, plotD) / 2 + storeys * 3.2 + 2;
  sun.position.set(sunDir.x * reach * 2, sunDir.y * reach * 2, sunDir.z * reach * 2);
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: reach * 4 });
  scene.add(sun);

  // grass round the plot, out to the haze
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(maxDim * 10, maxDim * 10),
    new THREE.MeshStandardMaterial({ color: 0x7f9a5c, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  const sourceRooms: any[] = layout.program_reference?.rooms ?? [];
  const cx = plotW / 2;
  const cz = plotD / 2;

  // The building itself, from the plan (buildingModel.ts): every wall at its thickness with the
  // plan's doors and windows cut through it, glass in the windows, and a slab under every room
  // tinted by what the room is, under the roof and parapets of step 2.
  const model = buildingModel(layout);
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.92, metalness: 0 });
  const partition = new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 0.95, metalness: 0 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9cc9e8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.38 });
  // step 2: the roof (concrete), its parapet (plaster, a darker coping), timber doors, metal
  // vehicle doors, aluminium window frames, and paving under the plot
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb8b4ad, roughness: 0.95 });
  const coping = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.85 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.45, metalness: 0.3 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.25 });
  const paving = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 1 });
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

  // the plot, paved, under the building
  const plotPaving = new THREE.Mesh(new THREE.BoxGeometry(plotW, 0.02, plotD), paving);
  plotPaving.position.set(0, 0.0, 0); plotPaving.receiveShadow = true; scene.add(plotPaving);
  for (const r of model.roofs) box(r.w, r.t, r.d, r.x + r.w / 2, r.z + r.t / 2, r.y + r.d / 2, roofMat, false);
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
    // a parapet's coping: a slightly wider cap on its top
    if (w.parapet) {
      const L = Math.hypot(w.x1 - w.x0, w.y1 - w.y0), c = 0.06;
      if (horizontal) box(L + t, c, t + 0.06, w.x0 + L / 2, w.z1 + c / 2, w.y0, coping, false);
      else box(t + 0.06, c, L + t, w.x0, w.z1 + c / 2, w.y0 + L / 2, coping, false);
    }
    // a panel along the wall at `a`..`b`, `z0`..`z1`, `d` thick
    const panel = (a: number, b: number, z0: number, z1: number, d: number, m: any) => {
      const h = z1 - z0, mid = (a + b) / 2;
      if (horizontal) box(b - a, h, d, w.x0 + mid, z0 + h / 2, w.y0, m, false);
      else box(d, h, b - a, w.x0, z0 + h / 2, w.y0 + mid, m, false);
    };
    for (const o of w.openings) {
      const a = o.at, b = o.at + o.width, f = 0.05;
      if (o.kind === 'window') {
        panel(a, b, o.z0, o.z1, 0.03, glass);
        // the frame: head, sill and both jambs
        panel(a, b, o.z1 - f, o.z1, t * 0.6, frame); panel(a, b, o.z0, o.z0 + f, t * 0.6, frame);
        panel(a, a + f, o.z0, o.z1, t * 0.6, frame); panel(b - f, b, o.z0, o.z1, t * 0.6, frame);
      } else if (o.kind === 'door') panel(a + 0.02, b - 0.02, o.z0, o.z1 - 0.02, 0.045, timber);
      else if (o.kind === 'vehicle') panel(a, b, o.z0, o.z1, 0.06, metal);
    }
  }
  const roomsRendered = model.slabs.length;
  if (model.unplaced.length) console.warn('[AECMassingView] openings not in a wall:', model.unplaced);
  console.log(`[AECMassingView] building model: ${model.walls.length} walls (${blocks} blocks), ${model.counts.reduce((t, c) => t + c.placed, 0)} of ${model.counts.reduce((t, c) => t + c.planned, 0)} doors and windows, ${model.slabs.length} slabs.`);

  console.log(`[AECMassingView] Three.js rendered ${roomsRendered} rooms on a ${plotW.toFixed(1)}m x ${plotD.toFixed(1)}m plot.`);

  // step 4, the street: the boundary wall, gate and driveway from the site plan; the footways, kerbs,
  // road and faint neighbouring blocks to give the building its scale. Neighbours cast no shadow:
  // the sun's shadow box covers this plot only, and a shadow cut off at its edge would read as an error.
  const context = siteContext(layout);
  if (context) {
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.95 });
    const footway = new THREE.MeshStandardMaterial({ color: 0xbfbab0, roughness: 0.95 });
    const kerb = new THREE.MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.9 });
    const marking = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
    const pavers = new THREE.MeshStandardMaterial({ color: 0xa89f92, roughness: 0.95 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x2f3a46, roughness: 0.5, metalness: 0.3 });
    // the neighbours are faint shapes: they give the street its scale but never hide the building as it turns
    const neighbour = new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.95, transparent: true, opacity: 0.4, depthWrite: false });
    const mats: Record<ContextKind, any> = { wall: plaster, coping, pier: plaster, gate: gateMat, driveway: pavers, footway, kerb, road: asphalt, marking, neighbour };
    for (const k of context.boxes) {
      const w = k.x1 - k.x0, d = k.y1 - k.y0, hh = k.z1 - k.z0;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mats[k.kind]);
      mesh.position.set((k.x0 + k.x1) / 2 - cx, (k.z0 + k.z1) / 2, (k.y0 + k.y1) / 2 - cz);
      mesh.receiveShadow = true;
      mesh.castShadow = k.kind === 'wall' || k.kind === 'pier' || k.kind === 'gate' || k.kind === 'coping';
      scene.add(mesh);
      if (k.kind === 'neighbour') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat); e.position.copy(mesh.position); scene.add(e); }
    }
  }

  // the plot's outline, where there is no boundary wall to show it
  if (!context) {
    const plotBoundary = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(plotW, 0.02, plotD)),
      new THREE.LineBasicMaterial({ color: 0x3B82F6, transparent: true, opacity: 0.4 })
    );
    scene.add(plotBoundary);
  }

  // one slow turn round the building when it first shows; the first touch stops it, and a
  // browser set to reduce motion never starts it
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !still;
  controls.autoRotateSpeed = 3; // a turn in about 20 s
  let turned = 0, lastAz = controls.getAzimuthalAngle();
  const stopTurn = () => { controls.autoRotate = false; };
  controls.addEventListener('start', stopTurn);

  // the turn is timed by the clock, not by frames, so a slow GPU still finishes it in 20 s
  const clock = new THREE.Clock();
  let animId: number;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    controls.update(Math.min(clock.getDelta(), 0.25));
    if (controls.autoRotate) {
      const az = controls.getAzimuthalAngle();
      let d = Math.abs(az - lastAz); if (d > Math.PI) d = 2 * Math.PI - d;
      turned += d; lastAz = az;
      if (turned >= 2 * Math.PI) stopTurn();
    }
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    controls.removeEventListener('start', stopTurn);
    controls.dispose();
    scene.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    renderer.dispose();
    // free the browser's WebGL context now: each redraw makes a new one, and
    // browsers refuse new ones (or block the site) once too many are held
    renderer.forceContextLoss();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}



// ── The building without WebGL (owner 2026-10-28: Chrome with graphics acceleration off, or a
// blocked GPU, has no WebGL at all since Chrome dropped its software fallback). The same building
// the 3D view draws (fallbackModel.ts): outside walls with their doors and windows, the roof and
// parapets, the boundary wall, gate and street, lit from the same sun. Drag across to turn it, up
// and down to tilt; drawn as SVG, back to front, so it works in every browser.

const hex = (c: number, k = 1) => {
  const r = Math.round(((c >> 16) & 255) * k), g = Math.round(((c >> 8) & 255) * k), b = Math.round((c & 255) * k);
  return `rgb(${r},${g},${b})`;
};

function MassingSvg({ layout }: { layout: SolvedLayout }) {
  const [az, setAz] = useState(-35);   // degrees round the building
  const [el, setEl] = useState(32);    // degrees above the ground
  const drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null);
  const boxes = React.useMemo(() => fallbackBoxes(layout), [layout]);
  const plotW = layout.plot_width || 15, plotD = layout.plot_depth || 30;
  const off = layout.site_offset ?? { x: 0, y: 0 };
  const roadEnd = React.useMemo(() => siteContext(layout)?.roadEnd ?? plotD, [layout, plotD]);
  const cx = (layout.building_width ?? plotW) / 2, cy = (layout.building_depth ?? plotD) / 2;
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a), se = Math.sin(e), ce = Math.cos(e);
  // plan (x, y) and height z to the sheet; `depth` grows towards the viewer
  const P = (x: number, y: number, z: number) => {
    const X = (x - cx) * ca - (y - cy) * sa, Y = (x - cx) * sa + (y - cy) * ca;
    return { sx: X, sy: Y * se - z * ce, depth: Y };
  };
  // the sun of the 3D view, in the plan's axes (x east, y south, z up), for each face's light
  const sun = sunDirection(), L = { x: sun.x, y: sun.z, z: sun.y };
  const shade = (c: number, nx: number, ny: number, nz: number) => hex(c, 0.6 + 0.4 * Math.max(0, nx * L.x + ny * L.y + nz * L.z));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const pt = (x: number, y: number, z: number) => {
    const q = P(x, y, z); minX = Math.min(minX, q.sx); maxX = Math.max(maxX, q.sx); minY = Math.min(minY, q.sy); maxY = Math.max(maxY, q.sy);
    return `${q.sx.toFixed(3)},${q.sy.toFixed(3)}`;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number) => [pt(x0, y0, 0), pt(x1, y0, 0), pt(x1, y1, 0), pt(x0, y1, 0)].join(' ');
  // grass round the plot and out past the road; the plot paved (the plot starts at -site_offset)
  const px0 = -off.x, py0 = -off.y;
  const grass = rect(px0 - 4, py0 - 4, px0 + plotW + 4, py0 + roadEnd + 4);
  const plot = rect(px0, py0, px0 + plotW, py0 + plotD);
  // each box's extent on the sheet, the order to paint them, then each box's top and the sides facing the viewer
  const screen = boxes.map(b => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) {
      const q = P(x, y, z); x0 = Math.min(x0, q.sx); x1 = Math.max(x1, q.sx); y0 = Math.min(y0, q.sy); y1 = Math.max(y1, q.sy);
    }
    return { x0, y0, x1, y1 };
  });
  const order = paintOrder(boxes, screen, sa, ca);
  const faces: Array<{ pts: string; fill: string; key: string; line: number }> = [];
  // roofs, slabs and paving are drawn in pieces: no outline, so the joins don't show as seams
  const LINE: Partial<Record<string, number>> = { glass: 0.5, plaster: 0.18, wall: 0.18, coping: 0.18, timber: 0.3, metal: 0.3, gate: 0.3, rail: 0.3 };
  for (const i of order) {
    const b = boxes[i], c = FALLBACK_COLOURS[b.mat], line = LINE[b.mat] ?? 0;
    const { x0, x1, y0, y1, z0, z1 } = b;
    const sides: Array<[number, number, number, number, number, number]> = [
      [x0, y1, x1, y1, 0, 1], [x1, y0, x0, y0, 0, -1], [x1, y1, x1, y0, 1, 0], [x0, y0, x0, y1, -1, 0],
    ];
    for (const [ax, ay, bx, by, nx, ny] of sides) {
      if (nx * sa + ny * ca <= 0) continue;
      faces.push({ key: `${i}s${nx}${ny}`, line, fill: shade(c, nx, ny, 0), pts: [pt(ax, ay, z0), pt(bx, by, z0), pt(bx, by, z1), pt(ax, ay, z1)].join(' ') });
    }
    faces.push({ key: `${i}t`, line, fill: shade(c, 0, 0, 1), pts: [pt(x0, y0, z1), pt(x1, y0, z1), pt(x1, y1, z1), pt(x0, y1, z1)].join(' ') });
  }
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
        <polygon points={grass} fill="#7f9a5c" />
        <polygon points={plot} fill="#d9d6cf" />
        {faces.map(f => <polygon key={f.key} points={f.pts} fill={f.fill} stroke={f.line ? "#334155" : f.fill} strokeOpacity={f.line || 1} strokeWidth={0.02} strokeLinejoin="round" />)}
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

const AECMassingView: React.FC<AECMassingViewProps> = ({ layout: given, setbacks }) => {
  const layout = React.useMemo(() => given && withSiteOffset(given, setbacks), [given, setbacks]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<RenderMode>('loading');
  const [noWebGL, setNoWebGL] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Redraw only when the geometry changes. (A guard that skipped a remount
  // when plot size and room count matched left the panel blank: the cleanup
  // had already removed the previous drawing.)
  const geometryKey = layout ? JSON.stringify([layout.plot_width, layout.plot_depth, layout.site_offset,
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
        {mode === 'three' && (
          <p className="absolute left-4 bottom-3 z-10 text-[10px] text-slate-600 bg-white/70 rounded px-2 py-1 pointer-events-none">
            The boundary wall, gate and driveway are from the site plan. The road and the neighbouring buildings are only there to show scale.
          </p>
        )}
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

      </CardContent>
    </Card>
  );
};

export default AECMassingView;
