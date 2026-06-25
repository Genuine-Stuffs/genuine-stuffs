/**
 * FRONT-BACK SPLIT STRATEGY
 *
 * Layout pattern:
 *   ┌──────────────────────────────────────┐
 *   │  GARAGE  │    LIVING    │   DINING   │  ← FRONT (road-facing, y=0)
 *   ├──────────┼──────────────┼────────────┤
 *   │  FOYER   │   KITCHEN    │   OFFICE   │  ← MID PUBLIC
 *   ╠══════════╩══════════════╩════════════╣
 *   ║           HALL / CORRIDOR            ║  ← CIRCULATION BAND
 *   ╠══════════╦══════════════╦════════════╣
 *   │ BED+BATH │   BED+BATH   │  BED+BATH  │  ← REAR PRIVATE
 *   └──────────┴──────────────┴────────────┘
 *
 * - Public zone occupies front depth (road-facing).
 * - Hall/corridor band separates public from private.
 * - Private zone occupies rear depth.
 * - En-suites sit beside their bedroom (not behind), sharing a side wall.
 * - Matches bungalow and single-storey reference plans.
 */

import { PlacedRoom } from "../../../../../supabase/functions/ai-studio/schema";
import { InternalRoomNode } from "../types";
import { getConstraintForRoom } from "../nigerian_rules";
import { LayoutStrategy, BuildableEnvelope, StrategyOptions } from "./index";

const snap      = (v: number, g: number) => Math.round(v / g) * g;
const SERVICE_KW = ['bath','wc','toilet','shower','wardrobe','dressing','ensuite'];
const isService  = (id: string) => SERVICE_KW.some(k => id.toLowerCase().includes(k));
const isBedroom  = (id: string) => {
  const lo = id.toLowerCase();
  return lo.includes('bedroom') || lo.includes('master') || lo.includes('suite');
};

export const frontBackSplitStrategy: LayoutStrategy = {
  id:          'front_back_split',
  name:        'Front-Back Split',
  description: 'Public rooms face the road, private bedroom wing sits at the rear, separated by a full-width hall.',
  suitableFor: {
    minPlotSqm:  300,
    maxPlotSqm:  3000,
    minBedrooms: 2,
    maxBedrooms: 6,
    duplex:      'both',
  },

  pack(publicNodes, privateNodes, envelope, options): PlacedRoom[] {
    const { floorIndex, isDuplex, forceStairwell } = options;
    const { width: buildW, grid } = envelope;
    const placedRooms: PlacedRoom[] = [];

    const HALL_D    = 1.5;
    const STAIR_W   = 2.4;
    const STAIR_D   = 3.6;

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

    // ── 1. Pack public rooms across full width in up to 2 rows ───────────────
    const sortedPublic = [...publicNodes].sort((a, b) => b.target_area - a.target_area);
    const totalPublicArea = sortedPublic.reduce((s, n) => s + (n.target_area || 9), 0);
    let curX = 0;
    let row1H = 0;

    // Split public into two rows if more than 3 rooms
    const row1 = sortedPublic.slice(0, Math.ceil(sortedPublic.length / 2));
    const row2 = sortedPublic.slice(Math.ceil(sortedPublic.length / 2));

    const packPublicRow = (
      nodes: InternalRoomNode[],
      startY: number,
      totalArea: number
    ): number => {
      let x = 0;
      let rowH = 0;
      nodes.forEach((node, i) => {
        const safeArea = Math.max(node.target_area || 9, 4);
        const constraint = getConstraintForRoom(node.id);
        let w = snap(buildW * (safeArea / totalArea), grid);
        w = Math.max(w, 2.4);
        w = Math.min(w, constraint.maxWidth);
        if (i === nodes.length - 1) w = snap(buildW - x, grid);
        w = Math.max(w, 2.4);
        let d = snap(safeArea / w, grid);
        d = Math.max(d, 2.4);
        node.x = x; node.y = startY; node.w = w; node.d = d; node.placed = true;
        placedRooms.push({ room_id: node.id, floor: floorIndex, x, y: startY, width: w, depth: d });
        x += w;
        rowH = Math.max(rowH, d);
      });
      return rowH;
    };

    const row1Area = row1.reduce((s, n) => s + (n.target_area || 9), 0);
    const row2Area = row2.reduce((s, n) => s + (n.target_area || 9), 0);

    row1H = packPublicRow(row1, 0, row1Area);
    let publicBottom = row1H;
    if (row2.length > 0) {
      const row2H = packPublicRow(row2, row1H, row2Area);
      publicBottom += row2H;
    }

    // ── 2. Hall band ──────────────────────────────────────────────────────────
    const hallY = snap(publicBottom, grid);
    const hallW = isDuplex ? buildW - STAIR_W : buildW;
    placedRooms.push({
      room_id: `corridor_floor${floorIndex}`,
      floor:   floorIndex,
      x:       0,
      y:       hallY,
      width:   hallW,
      depth:   HALL_D,
    });

    // ── 3. Stairwell beside hall ──────────────────────────────────────────────
    if (isDuplex && floorIndex === 0) {
      const stairX = buildW - STAIR_W;
      placedRooms.push({
        room_id: 'stairwell',
        floor:   floorIndex,
        x:       stairX,
        y:       hallY,
        width:   STAIR_W,
        depth:   STAIR_D,
      });
      (options as any).resolvedStairwellCoords = {
        x: stairX, y: hallY, w: STAIR_W, d: STAIR_D
      };
    }

    // ── 4. Pack private zone — bedrooms with side-by-side en-suites ──────────
    const privateStartY = snap(hallY + HALL_D, grid);
    const bedrooms  = privateNodes.filter(n => isBedroom(n.id));
    const bathrooms = privateNodes.filter(n => isService(n.id));
    const others    = privateNodes.filter(n => !isBedroom(n.id) && !isService(n.id));

    // Pair bathrooms to bedrooms by index
    const pairs: Array<{ bed: InternalRoomNode; bath: InternalRoomNode | null }> =
      bedrooms.map((bed, i) => ({ bed, bath: bathrooms[i] ?? null }));

    const totalPairArea = pairs.reduce((s, p) => {
      const bArea = p.bed.target_area || 12;
      const tArea = p.bath ? (p.bath.target_area || 4) : 0;
      return s + bArea + tArea;
    }, 0);

    let pairX = 0;
    let maxPrivateD = 0;

    for (let i = 0; i < pairs.length; i++) {
      const { bed, bath } = pairs[i];
      const bedArea  = Math.max(bed.target_area  || 12, 10);
      const bathArea = bath ? Math.max(bath.target_area || 4, 2.5) : 0;
      const pairArea = bedArea + bathArea;
      const constraint = getConstraintForRoom(bed.id);

      // Pair width proportional to combined area
      let pairW = snap(buildW * (pairArea / totalPairArea), grid);
      if (i === pairs.length - 1) pairW = snap(buildW - pairX, grid);
      pairW = Math.max(pairW, 3.6);

      if (bath) {
        // Bed gets 65%, bath gets 35% of pair width
        const bathConstraint = getConstraintForRoom(bath.id);
        let bathW = snap(pairW * 0.35, grid);
        bathW = Math.min(bathW, bathConstraint.maxWidth);
        bathW = Math.max(bathW, 1.8);
        let bedW = snap(pairW - bathW, grid);
        bedW = Math.max(bedW, 2.4);

        let bedD = snap(bedArea / bedW, grid);
        bedD = Math.max(bedD, 2.4);

        let bathD = snap(bathArea / bathW, grid);
        bathD = Math.max(bathD, 1.8);
        bathD = Math.min(bathD, bedD); // bath never deeper than bedroom

        // Place bedroom
        bed.x = pairX; bed.y = privateStartY; bed.w = bedW; bed.d = bedD; bed.placed = true;
        placedRooms.push({ room_id: bed.id, floor: floorIndex, x: pairX, y: privateStartY, width: bedW, depth: bedD });

        // Place bathroom beside bedroom (right side)
        bath.x = pairX + bedW; bath.y = privateStartY; bath.w = bathW; bath.d = bathD; bath.placed = true;
        placedRooms.push({ room_id: bath.id, floor: floorIndex, x: pairX + bedW, y: privateStartY, width: bathW, depth: bathD });

        maxPrivateD = Math.max(maxPrivateD, bedD);
      } else {
        // No bath — bedroom fills pair width
        let bedW = Math.min(pairW, constraint.maxWidth);
        bedW = Math.max(bedW, 2.4);
        let bedD = snap(bedArea / bedW, grid);
        bedD = Math.max(bedD, 2.4);
        bed.x = pairX; bed.y = privateStartY; bed.w = bedW; bed.d = bedD; bed.placed = true;
        placedRooms.push({ room_id: bed.id, floor: floorIndex, x: pairX, y: privateStartY, width: bedW, depth: bedD });
        maxPrivateD = Math.max(maxPrivateD, bedD);
      }

      pairX += pairW;
    }

    // Pack remaining non-bedroom private rooms
    for (const node of others) {
      const safeArea = Math.max(node.target_area || 6, 4);
      const constraint = getConstraintForRoom(node.id);
      let w = snap(Math.min(Math.sqrt(safeArea * 1.5), constraint.maxWidth), grid);
      w = Math.max(w, 2.4);
      let d = snap(safeArea / w, grid);
      d = Math.max(d, 2.4);
      placedRooms.push({ room_id: node.id, floor: floorIndex, x: pairX, y: privateStartY, width: w, depth: d });
      pairX += w;
    }

    return placedRooms;
  },
};
