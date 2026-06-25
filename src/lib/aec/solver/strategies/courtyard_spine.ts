/**
 * COURTYARD SPINE STRATEGY
 *
 * Layout pattern:
 *   ┌─────────────────────────────────┐
 *   │  PUBLIC ZONE (left block)       │
 *   │  Garage │ Living │ Dining/Kitch │
 *   ├─────────┴────────┴──────────────┤
 *   │         CORRIDOR SPINE          │ ← 1.5m, full building width
 *   ├──────────────────────────────────┤
 *   │  PRIVATE ZONE (bedroom wing)    │
 *   │  [Bed+Bath] │ [Bed+Bath] │ ...  │
 *   └─────────────────────────────────┘
 *
 * - Corridor runs the full building width separating public and private.
 * - Each bedroom bay contains its en-suite bathroom within the same depth zone.
 * - Stairwell sits at the right end of the corridor on duplex plans.
 * - All walls align to a structural bay grid (3.6m default).
 *
 * This matches the Nigerian residential reference plans most closely.
 */

import { PlacedRoom } from "../../../../../supabase/functions/ai-studio/schema";
import { InternalRoomNode } from "../types";
import { getConstraintForRoom } from "../nigerian_rules";
import { LayoutStrategy, BuildableEnvelope, StrategyOptions } from "./index";

// ── SERVICE ROOM DETECTION ────────────────────────────────────────────────────
const SERVICE_KW = ['bath','wc','toilet','shower','wardrobe','dressing','ensuite','en-suite'];
const isService  = (id: string) => SERVICE_KW.some(k => id.toLowerCase().includes(k));
const isBedroom  = (id: string) => {
  const lo = id.toLowerCase();
  return lo.includes('bedroom') || lo.includes('master') || lo.includes('suite');
};

// ── BAY SNAPPER ───────────────────────────────────────────────────────────────
const snap = (v: number, grid: number) => Math.round(v / grid) * grid;

// ── SUITE BUILDER ─────────────────────────────────────────────────────────────
/**
 * Groups bedrooms with their service rooms (bath, wardrobe) into suite units.
 * Each unit packs as: [bedroom anchor][bathroom right of bed][wardrobe right of bath]
 * The bathroom door faces the bedroom interior — no external corridor door.
 */
function buildSuiteUnits(
  privateNodes: InternalRoomNode[]
): Array<{ anchor: InternalRoomNode; services: InternalRoomNode[] }> {
  const anchors  = privateNodes.filter(n => isBedroom(n.id) || (!isService(n.id)));
  const services = privateNodes.filter(n => isService(n.id));
  const used     = new Set<string>();

  return anchors.map((anchor, idx) => {
    const unit: { anchor: InternalRoomNode; services: InternalRoomNode[] } = {
      anchor,
      services: [],
    };

    // Match services by name prefix or by index fallback
    const anchorBase = anchor.id.toLowerCase()
      .replace(/(bedroom|master|suite|_)/g, '')
      .slice(0, 5);

    for (const svc of services) {
      if (used.has(svc.id)) continue;
      const svcLo = svc.id.toLowerCase();
      if (anchorBase.length >= 2 && svcLo.includes(anchorBase)) {
        unit.services.push(svc);
        used.add(svc.id);
      }
    }

    // Index fallback: assign remaining services round-robin
    const remaining = services.filter(s => !used.has(s.id));
    if (unit.services.length === 0 && remaining.length > 0) {
      const svc = remaining[idx % remaining.length];
      if (svc) {
        unit.services.push(svc);
        used.add(svc.id);
      }
    }

    return unit;
  });
}

// ── PACK PUBLIC ZONE ──────────────────────────────────────────────────────────
/**
 * Packs public rooms (living, dining, kitchen, garage, foyer, office) into
 * a row across the full building width. Large rooms get more bay width.
 * Returns the depth of the public zone (curY after packing).
 */
function packPublicZone(
  publicNodes: InternalRoomNode[],
  floorIndex:  number,
  buildW:      number,
  startY:      number,
  grid:        number,
  placedRooms: PlacedRoom[]
): number {
  if (publicNodes.length === 0) return startY;

  // Sort largest first
  const sorted = [...publicNodes].sort((a, b) => b.target_area - a.target_area);
  const totalPublicArea = sorted.reduce((s, n) => s + (n.target_area || 9), 0);
  let curX  = 0;
  let rowH  = 0;

  for (let i = 0; i < sorted.length; i++) {
    const node    = sorted[i];
    const safeArea = Math.max(node.target_area || 9, 4);
    const constraint = getConstraintForRoom(node.id);

    // Width proportional to area share of building width
    let roomW = snap(buildW * (safeArea / totalPublicArea), grid);
    roomW = Math.max(roomW, 2.4);
    roomW = Math.min(roomW, constraint.maxWidth);

    // Last room fills remaining width
    if (i === sorted.length - 1) {
      roomW = snap(buildW - curX, grid);
    }
    roomW = Math.max(roomW, 2.4);

    let roomD = snap(safeArea / roomW, grid);
    roomD = Math.max(roomD, 2.4);

    // Enforce aspect ratio
    if (roomW > roomD * constraint.maxAspect) {
      roomD = snap(roomW / constraint.maxAspect, grid);
    }

    node.x = curX;
    node.y = startY;
    node.w = roomW;
    node.d = roomD;
    node.placed = true;

    placedRooms.push({
      room_id: node.id,
      floor:   floorIndex,
      x:       curX,
      y:       startY,
      width:   roomW,
      depth:   roomD,
    });

    curX += roomW;
    rowH  = Math.max(rowH, roomD);
  }

  return startY + rowH;
}

// ── PACK PRIVATE ZONE (SUITE-BASED) ──────────────────────────────────────────
/**
 * Packs bedroom suites into bays. Each bay = bedroom width × private zone depth.
 * The en-suite bathroom occupies the rear portion of the bedroom bay.
 * All bedroom doors face the corridor (at startY).
 */
function packPrivateZone(
  privateNodes: InternalRoomNode[],
  floorIndex:   number,
  buildW:       number,
  startY:       number,
  grid:         number,
  isDuplex:     boolean,
  stairX:       number,
  stairW:       number,
  placedRooms:  PlacedRoom[]
): number {
  if (privateNodes.length === 0) return startY;

  const suiteUnits = buildSuiteUnits(privateNodes);
  const nonSuitePrivate = privateNodes.filter(n =>
    !isBedroom(n.id) && !isService(n.id)
  );

  // Available width for bedrooms (exclude stairwell slot on duplex)
  const availW = isDuplex ? buildW - stairW : buildW;
  const bedroomUnits = suiteUnits.filter(u => isBedroom(u.anchor.id));
  const otherUnits   = suiteUnits.filter(u => !isBedroom(u.anchor.id));

  if (bedroomUnits.length === 0) {
    // No bedrooms — just pack whatever is here
    let curX = 0;
    for (const node of privateNodes) {
      const safeArea = Math.max(node.target_area || 9, 4);
      const constraint = getConstraintForRoom(node.id);
      let roomW = snap(Math.sqrt(safeArea * 1.5), grid);
      roomW = Math.min(roomW, constraint.maxWidth, availW - curX);
      roomW = Math.max(roomW, 2.4);
      let roomD = snap(safeArea / roomW, grid);
      roomD = Math.max(roomD, 2.4);
      placedRooms.push({ room_id: node.id, floor: floorIndex, x: curX, y: startY, width: roomW, depth: roomD });
      curX += roomW;
    }
    return startY + 4.0;
  }

  // Distribute bay widths evenly, minimum 3.6m per bedroom
  const totalBedroomArea = bedroomUnits.reduce((s, u) => s + (u.anchor.target_area || 12), 0);
  const MIN_BAY = 3.6;
  let curX = 0;
  let maxDepth = 0;

  for (let i = 0; i < bedroomUnits.length; i++) {
    const unit = bedroomUnits[i];
    const safeArea = Math.max(unit.anchor.target_area || 12, 10);
    const constraint = getConstraintForRoom(unit.anchor.id);

    // Bay width: area-proportional, minimum MIN_BAY, max constraint
    let bayW = snap(availW * (safeArea / totalBedroomArea), grid);
    bayW = Math.max(bayW, MIN_BAY);
    bayW = Math.min(bayW, constraint.maxWidth);

    // Last bedroom fills remaining width
    if (i === bedroomUnits.length - 1) {
      bayW = snap(availW - curX, grid);
      bayW = Math.max(bayW, MIN_BAY);
    }

    // Determine suite depth: bedroom depth + optional bathroom behind it
    const hasBath = unit.services.some(s =>
      s.id.toLowerCase().includes('bath') || s.id.toLowerCase().includes('wc')
    );
    const hasWardrobe = unit.services.some(s =>
      s.id.toLowerCase().includes('wardrobe') || s.id.toLowerCase().includes('dressing')
    );

    // Bedroom depth fills the bay
    let bedD = snap(safeArea / bayW, grid);
    bedD = Math.max(bedD, 2.4);
    // For en-suite: total bay depth = bed + bath depth
    const bathDepth   = hasBath    ? 2.4 : 0;
    const wardrobeD   = hasWardrobe ? 1.4 : 0;
    const totalBayD   = bedD + bathDepth + wardrobeD;

    // Place bedroom
    unit.anchor.x = curX;
    unit.anchor.y = startY;
    unit.anchor.w = bayW;
    unit.anchor.d = bedD;
    unit.anchor.placed = true;
    placedRooms.push({
      room_id: unit.anchor.id,
      floor:   floorIndex,
      x:       curX,
      y:       startY,
      width:   bayW,
      depth:   bedD,
    });

    let serviceY = startY + bedD;

    // Place services within the same bay, stacked behind the bedroom
    for (const svc of unit.services) {
      const svcConstraint = getConstraintForRoom(svc.id);
      const svcSafeArea   = Math.max(svc.target_area || 4, 2);
      const isWard = svc.id.toLowerCase().includes('wardrobe') ||
                     svc.id.toLowerCase().includes('dressing');

      let svcW = snap(Math.min(bayW * 0.6, svcConstraint.maxWidth), grid);
      svcW = Math.max(svcW, 1.8);
      let svcD = snap(svcSafeArea / svcW, grid);
      svcD = Math.max(svcD, isWard ? 1.2 : 1.8);

      svc.x = curX;
      svc.y = serviceY;
      svc.w = svcW;
      svc.d = svcD;
      svc.placed = true;

      placedRooms.push({
        room_id: svc.id,
        floor:   floorIndex,
        x:       curX,
        y:       serviceY,
        width:   svcW,
        depth:   svcD,
      });

      serviceY += svcD;
    }

    maxDepth = Math.max(maxDepth, serviceY - startY);
    curX += bayW;
  }

  // Pack other private rooms (corridor, office) after bedroom wing
  for (const unit of otherUnits) {
    const node = unit.anchor;
    const safeArea = Math.max(node.target_area || 6, 4);
    const constraint = getConstraintForRoom(node.id);
    let roomW = snap(Math.sqrt(safeArea * 1.5), grid);
    roomW = Math.min(roomW, constraint.maxWidth, buildW - curX);
    roomW = Math.max(roomW, 2.4);
    let roomD = snap(safeArea / roomW, grid);
    roomD = Math.max(roomD, 2.4);
    placedRooms.push({ room_id: node.id, floor: floorIndex, x: curX, y: startY, width: roomW, depth: roomD });
    curX += roomW;
    maxDepth = Math.max(maxDepth, roomD);
  }

  return startY + maxDepth;
}

// ── STRATEGY IMPLEMENTATION ───────────────────────────────────────────────────
export const courtyardSpineStrategy: LayoutStrategy = {
  id:          'courtyard_spine',
  name:        'Courtyard Spine',
  description: 'Central corridor separates public and private zones. Bedrooms open onto corridor. En-suites sit behind bedrooms in the same bay.',
  suitableFor: {
    minPlotSqm:  400,
    maxPlotSqm:  5000,
    minBedrooms: 2,
    maxBedrooms: 8,
    duplex:      'both',
  },

  pack(publicNodes, privateNodes, envelope, options): PlacedRoom[] {
    const { floorIndex, isDuplex, forceStairwell } = options;
    const { width: buildW, grid } = envelope;
    const placedRooms: PlacedRoom[] = [];

    const CORRIDOR_D = 1.5; // metres — corridor depth
    const STAIR_W    = 2.4;
    const STAIR_D    = 3.6;

    // Upper floor: mirror stairwell void
    if (floorIndex > 0 && forceStairwell) {
      placedRooms.push({
        room_id: 'stairwell_void',
        floor:   floorIndex,
        x:       forceStairwell.x,
        y:       forceStairwell.y,
        width:   forceStairwell.w,
        depth:   forceStairwell.d,
      });
    }

    // ── 1. Pack public zone at the top (y=0) ─────────────────────────────────
    const publicBottom = packPublicZone(
      publicNodes, floorIndex, buildW, 0, grid, placedRooms
    );

    // ── 2. Place corridor spine ───────────────────────────────────────────────
    const corridorY = snap(publicBottom, grid);
    placedRooms.push({
      room_id: `corridor_floor${floorIndex}`,
      floor:   floorIndex,
      x:       0,
      y:       corridorY,
      width:   isDuplex ? buildW - STAIR_W : buildW,
      depth:   CORRIDOR_D,
    });

    // ── 3. Place stairwell at right end of corridor (ground floor only) ───────
    let stairX = buildW - STAIR_W;
    if (isDuplex && floorIndex === 0) {
      placedRooms.push({
        room_id: 'stairwell',
        floor:   floorIndex,
        x:       stairX,
        y:       corridorY,
        width:   STAIR_W,
        depth:   STAIR_D,
      });
      // Return stairwell coords via side-effect on options
      (options as any).resolvedStairwellCoords = {
        x: stairX, y: corridorY, w: STAIR_W, d: STAIR_D
      };
    }

    // ── 4. Pack private zone (bedroom wing) below corridor ────────────────────
    const privateStartY = snap(corridorY + CORRIDOR_D, grid);
    packPrivateZone(
      privateNodes, floorIndex, buildW,
      privateStartY, grid, isDuplex,
      stairX, STAIR_W, placedRooms
    );

    return placedRooms;
  },
};
