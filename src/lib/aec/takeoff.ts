/**
 * The material takeoff, measured from the drawn plan (feasibility study §9.2: "attach a material
 * takeoff to every plan and wire it to your supplier network"). Quantities come from the same
 * model the 3D view draws (buildingModel.ts: walls with their door and window openings, floor
 * slabs, roofs) and the structural skeleton (columns and beams), not from the AI's guess; each line
 * is priced from the cheapest verified marketplace listing that sells it, or left unpriced when none
 * does. The rates below are common Nigerian quantity-surveying rules of thumb for an early estimate,
 * each stated on its line, so a quantity surveyor can check every figure.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { buildingModel } from '@/components/aec/buildingModel';
import { openingSchedule, DOOR_ENTRANCE } from '@/components/aec/openings';
import { structuralEngine } from '@/lib/aec/solver/structural';

/** Rules of thumb for an early estimate (Nigerian practice; waste included). */
export const RATES = {
  blocksPerM2: 10,              // 450 × 225 mm block face, with mortar joints and 5–10 % waste
  mortarBagsPerM2_9in: 1 / 3,   // a 50 kg bag lays about 30 nine-inch blocks
  mortarBagsPerM2_6in: 1 / 4,   // and about 40 six-inch blocks
  mortarSandT_9in: 0.05,        // tonnes of sharp sand per m² of nine-inch wall
  mortarSandT_6in: 0.035,
  plasterBagsPerM2: 0.07,       // 12 mm render 1:6, each face
  plasterSandTPerM2: 0.02,
  concrete: { bags: 6.4, sandT: 0.7, graniteT: 1.3 },  // per m³ of 1:2:4 concrete (C20)
  steelKgPerM3: { column: 160, beam: 140, slab: 90, footing: 50 },
  footing: { width: 0.675, depth: 0.225 },              // strip footing under ground-floor walls
  paintM2PerBucket: 100,        // 20 L, two coats
  tileWaste: 1.05,
  sheetLap: 1.1,                // long-span sheets, 1 m cover width, laps and ridges
  storeyColumnH: 3.0,
};

export type TakeoffKey = 'block9' | 'block6' | 'cement' | 'sand' | 'granite' | 'rebar' | 'paint_int' | 'paint_ext'
  | 'tiles' | 'roof_sheet' | 'steel_frame' | 'door_entrance' | 'door_internal' | 'window';

export interface TakeoffLine {
  key: TakeoffKey;
  category: string;
  item: string;
  quantity: number;
  unit: string;
  /** How the quantity was measured, in plain words. */
  basis: string;
  /** For a window: its area, to scale a listing of another size. */
  area_m2?: number;
}

const round = (v: number, dp = 1) => Math.round(v * 10 ** dp) / 10 ** dp;

/** The takeoff of a solved plan. */
export function planTakeoff(layout: SolvedLayout): TakeoffLine[] {
  const model = buildingModel(layout);
  const lines: TakeoffLine[] = [];
  const len = (w: { x0: number; y0: number; x1: number; y1: number }) => Math.hypot(w.x1 - w.x0, w.y1 - w.y0);

  // blockwork: each wall's face, less its openings; 230 mm walls in nine-inch blocks, 150 mm in six-inch
  let ext = 0, int = 0, extFaces = 0, groundWallM = 0;
  for (const w of model.walls) {
    if (w.kind !== 'ext' && w.kind !== 'int') continue;
    const net = len(w) * (w.z1 - w.z0) - w.openings.reduce((s, o) => s + o.width * (o.z1 - o.z0), 0);
    if (w.kind === 'ext') { ext += net; extFaces += net; } else int += net;
    if (w.floor === 0 && !w.parapet) groundWallM += len(w);
  }
  // outside faces get the exterior paint, every other face the interior emulsion
  const plasterFaces = 2 * (ext + int), intFaces = plasterFaces - extFaces;

  const sk = structuralEngine.generateSkeleton(layout);
  const colM3 = sk.columns.reduce((s, c) => s + c.width_m * c.depth_m * RATES.storeyColumnH, 0);
  // a hall's clear span is a steel portal frame under a sheet roof, not concrete (structural.ts, long-span system)
  const frames = sk.beams.filter(b => b.kind === 'long_span');
  const beamM3 = sk.beams.filter(b => b.kind !== 'long_span').reduce((s, b) => s + b.width_m * b.depth_m * b.span_m, 0);
  const hallRects = sk.halls.map(h => layout.placed_rooms.find(r => r.room_id === h.room_id && r.floor === h.floor)).filter(Boolean) as SolvedLayout['placed_rooms'];
  const overHall = (q: { x: number; y: number; w: number; d: number }) => hallRects.some(r => q.x + q.w / 2 > r.x && q.x + q.w / 2 < r.x + r.width && q.y + q.d / 2 > r.y && q.y + q.d / 2 < r.y + r.depth);
  const sheetM2 = model.roofs.filter(overHall).reduce((s, r) => s + r.w * r.d, 0);
  const slabM3 = model.slabs.reduce((s, q) => s + q.w * q.d * q.t, 0) + model.roofs.filter(r => !overHall(r)).reduce((s, r) => s + r.w * r.d * r.t, 0);
  const footM3 = groundWallM * RATES.footing.width * RATES.footing.depth;
  const concreteM3 = colM3 + beamM3 + slabM3 + footM3;

  if (ext > 0) lines.push({ key: 'block9', category: 'Blocks', item: '9-inch sandcrete block (230 mm walls)', quantity: Math.ceil(ext * RATES.blocksPerM2), unit: 'blocks',
    basis: `${round(ext)} m² of outside and parapet walls less doors and windows, at ${RATES.blocksPerM2} blocks per m²` });
  if (int > 0) lines.push({ key: 'block6', category: 'Blocks', item: '6-inch sandcrete block (150 mm walls)', quantity: Math.ceil(int * RATES.blocksPerM2), unit: 'blocks',
    basis: `${round(int)} m² of inside walls less doors, at ${RATES.blocksPerM2} blocks per m²` });

  const mortarBags = ext * RATES.mortarBagsPerM2_9in + int * RATES.mortarBagsPerM2_6in;
  const plasterBags = plasterFaces * RATES.plasterBagsPerM2;
  const concreteBags = concreteM3 * RATES.concrete.bags;
  lines.push({ key: 'cement', category: 'Cement', item: 'Cement, 50 kg bag', quantity: Math.ceil(mortarBags + plasterBags + concreteBags), unit: 'bags',
    basis: `concrete ${round(concreteM3)} m³ (columns ${round(colM3)}, beams ${round(beamM3)}, slabs and roof ${round(slabM3)}, strip footings ${round(footM3)}) at ${RATES.concrete.bags} bags per m³ of 1:2:4; block mortar ${Math.ceil(mortarBags)} bags; plaster ${Math.ceil(plasterBags)} bags on ${round(plasterFaces)} m² of wall faces` });
  const sandT = ext * RATES.mortarSandT_9in + int * RATES.mortarSandT_6in + plasterFaces * RATES.plasterSandTPerM2 + concreteM3 * RATES.concrete.sandT;
  lines.push({ key: 'sand', category: 'Sand & Gravel', item: 'Sharp sand', quantity: round(sandT), unit: 'tonnes',
    basis: `concrete ${round(concreteM3 * RATES.concrete.sandT)} t, block mortar and plaster ${round(sandT - concreteM3 * RATES.concrete.sandT)} t` });
  lines.push({ key: 'granite', category: 'Sand & Gravel', item: 'Granite (3/4 inch)', quantity: round(concreteM3 * RATES.concrete.graniteT), unit: 'tonnes',
    basis: `${round(concreteM3)} m³ of concrete at ${RATES.concrete.graniteT} t per m³` });
  const steelT = (colM3 * RATES.steelKgPerM3.column + beamM3 * RATES.steelKgPerM3.beam + slabM3 * RATES.steelKgPerM3.slab + footM3 * RATES.steelKgPerM3.footing) / 1000;
  lines.push({ key: 'rebar', category: 'Steel & Iron', item: 'Reinforcement steel (Y12/Y16)', quantity: round(steelT, 2), unit: 'tonnes',
    basis: `columns ${RATES.steelKgPerM3.column}, beams ${RATES.steelKgPerM3.beam}, slabs ${RATES.steelKgPerM3.slab}, footings ${RATES.steelKgPerM3.footing} kg per m³ of concrete; ${sk.columns.length} columns and ${sk.beams.length} beams on the plan's grid` });

  if (intFaces > 0) lines.push({ key: 'paint_int', category: 'Paints', item: 'Interior emulsion, 20 L', quantity: Math.ceil(intFaces / RATES.paintM2PerBucket), unit: 'buckets',
    basis: `${round(intFaces)} m² of inside wall faces, two coats, ${RATES.paintM2PerBucket} m² per bucket` });
  if (extFaces > 0) lines.push({ key: 'paint_ext', category: 'Paints', item: 'Exterior paint, 20 L', quantity: Math.ceil(extFaces / RATES.paintM2PerBucket), unit: 'buckets',
    basis: `${round(extFaces)} m² of outside wall faces, two coats, ${RATES.paintM2PerBucket} m² per bucket` });

  // floor tiles over every enclosed room's floor (not balconies and terraces, whose slabs the model gives too)
  const floorM2 = model.slabs.reduce((s, q) => s + q.w * q.d, 0);
  if (floorM2 > 0) lines.push({ key: 'tiles', category: 'Flooring', item: 'Floor tiles', quantity: Math.ceil(floorM2 * RATES.tileWaste), unit: 'm²',
    basis: `${round(floorM2)} m² of floor on every storey, plus ${Math.round((RATES.tileWaste - 1) * 100)} % for cutting` });

  if (sheetM2 > 0) lines.push({ key: 'roof_sheet', category: 'Roofing', item: 'Long-span roofing sheet (0.55 mm)', quantity: Math.ceil(sheetM2 * RATES.sheetLap), unit: 'm',
    basis: `${round(sheetM2)} m² of roof over the clear-span hall, in 1 m wide sheets, plus ${Math.round((RATES.sheetLap - 1) * 100)} % for laps` });
  if (frames.length) lines.push({ key: 'steel_frame', category: 'Steel & Iron', item: 'Steel portal frames (clear-span hall)', quantity: Math.round(frames.reduce((s, b) => s + b.span_m, 0)), unit: 'm',
    basis: `${frames.length} long-span members across the hall; sized by the structural engineer` });

  // doors and windows from the plan's own schedule
  const sched = openingSchedule(layout).rows;
  const entrance = sched.filter(r => r.type === DOOR_ENTRANCE).reduce((s, r) => s + r.count, 0);
  const inner = sched.filter(r => r.type.kind === 'D' && r.type !== DOOR_ENTRANCE).reduce((s, r) => s + r.count, 0);
  if (entrance) lines.push({ key: 'door_entrance', category: 'Doors & Windows', item: `Entrance door (${DOOR_ENTRANCE.w} × ${DOOR_ENTRANCE.h} m)`, quantity: entrance, unit: 'doors', basis: 'the front door on the plan\'s door schedule' });
  if (inner) lines.push({ key: 'door_internal', category: 'Doors & Windows', item: 'Room and service doors', quantity: inner, unit: 'doors', basis: `the other doors on the plan's schedule (${sched.filter(r => r.type.kind === 'D' && r.type !== DOOR_ENTRANCE).map(r => `${r.tag} × ${r.count}`).join(', ')})` });
  for (const r of sched.filter(r => r.type.kind === 'W'))
    lines.push({ key: 'window', category: 'Doors & Windows', item: `Window ${r.tag} (${r.type.w} × ${r.type.h} m)`, quantity: r.count, unit: 'windows', basis: `${r.tag} on the plan's window schedule`, area_m2: r.type.w * r.type.h });
  return lines;
}

/** A verified marketplace listing (the `materials` table). */
export interface Listing { id: string; name: string; category?: string; price: number; unit: string; vendor_name?: string }

/** Which listings sell a takeoff line, and how many of the listing's units the line needs. */
const SELLS: Record<TakeoffKey, { name: RegExp; per: (unit: string, line: TakeoffLine) => number | null }> = {
  block9: { name: /\b9[- ]?inch\b.*block|block.*\b9[- ]?inch\b/i, per: () => 1 },
  block6: { name: /\b6[- ]?inch\b.*block|block.*\b6[- ]?inch\b/i, per: () => 1 },
  cement: { name: /\bcement\b/i, per: u => /50\s*kg/i.test(u) || /bag/i.test(u) ? 1 : null },
  // bulk materials sell by the truck: the unit names its tonnage ("20 Ton Truck")
  sand: { name: /\bsharp\b.*\bsand\b/i, per: u => tonnesPer(u) },
  granite: { name: /\bgranite\b(?!.*slab)/i, per: u => tonnesPer(u) },
  rebar: { name: /\b(rebar|reinforcement steel)\b/i, per: u => /\bton/i.test(u) && !/truck/i.test(u) ? 1 : null },
  paint_int: { name: /\b(emulsion|wall paint)\b/i, per: u => /20\s*l/i.test(u) ? 1 : null },
  paint_ext: { name: /\b(texcote|exterior)\b/i, per: u => /20\s*l/i.test(u) ? 1 : null },
  roof_sheet: { name: /\blong ?span\b.*\broof/i, per: u => /linear\s*met/i.test(u) || /^\s*m\s*$/i.test(u) ? 1 : null },
  steel_frame: { name: /\b(portal frame|structural steel|i-?beam|universal beam)\b/i, per: u => /^\s*(m|meter|metre|linear meter)\s*$/i.test(u) ? 1 : null },
  tiles: { name: /\bfloor tiles?\b/i, per: u => /^\s*(sqm|m²|m2)\s*$/i.test(u) ? 1 : null },
  door_entrance: { name: /\bsecurity door\b/i, per: u => /unit/i.test(u) ? 1 : null },
  door_internal: { name: /\b(flush|panel|wooden|room|internal|hdf)\b.*\bdoor\b/i, per: u => /unit/i.test(u) ? 1 : null },
  // a window listing of another size: priced by the window's area against the listing's ("1.2x1.2m")
  window: { name: /\bwindow\b/i, per: (u, line) => line.area_m2 ? 1 : null },
};
/** "20 Ton Truck" -> 20 tonnes a unit; null for anything not sold by weight. */
const tonnesPer = (unit: string): number | null => { const m = unit.match(/(\d+(?:\.\d+)?)\s*-?\s*ton/i); return m ? Number(m[1]) : null; };
/** "Aluminium Casement Window (1.2x1.2m)" -> 1.44 m². */
const listingArea = (name: string): number | null => { const m = name.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/i); return m ? Number(m[1]) * Number(m[2]) : null; };

export interface PricedLine extends TakeoffLine {
  listing: Listing | null;
  /** How many of the listing's units to buy (trucks, bags, windows...). */
  buy: number | null;
  unitPrice: number | null;
  total: number | null;
  /** Why the price is what it is, in plain words. */
  priceNote: string;
}

/** Each line priced from the cheapest verified listing that sells it; unpriced when none does. */
export function priceTakeoff(lines: TakeoffLine[], listings: Listing[]): PricedLine[] {
  return lines.map(line => {
    const sells = SELLS[line.key];
    const offers = listings.flatMap(l => {
      if (!sells.name.test(l.name) || !(l.price > 0)) return [];
      const per = sells.per(l.unit ?? '', line);
      if (per === null) return [];
      if (line.key === 'window') {
        const a = listingArea(l.name);
        if (!a || !line.area_m2) return [];
        const unitPrice = Math.round(l.price * line.area_m2 / a);
        return [{ l, buy: line.quantity, unitPrice, total: unitPrice * line.quantity, note: `scaled by area from ${l.name} at ₦${l.price.toLocaleString()}` }];
      }
      // sold by the truck: whole trucks
      const buy = per === 1 ? line.quantity : Math.ceil(line.quantity / per);
      return [{ l, buy, unitPrice: l.price, total: Math.round(l.price * buy), note: per === 1 ? `${l.unit}` : `${buy} × ${l.unit} for ${line.quantity} t` }];
    }).sort((a, b) => a.total - b.total);
    const best = offers[0];
    return best
      ? { ...line, listing: best.l, buy: best.buy, unitPrice: best.unitPrice, total: best.total, priceNote: best.note }
      : { ...line, listing: null, buy: null, unitPrice: null, total: null, priceNote: 'No verified supplier lists this yet' };
  });
}
