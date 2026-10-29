/**
 * The site plan's geometry (owner 2026-10-20: show the whole compound, not
 * only the house): the plot, its setbacks, the house's footprint where the
 * plan puts it, every outbuilding (BQ, generator house, gatehouse), the gate
 * and the driveway. Plot frame: x from the left boundary, y from the rear
 * boundary, so the front boundary (on the road) is y = plot depth.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { roomTypeOf } from './openings';

export interface SiteRect { x: number; y: number; w: number; h: number }
export interface SiteBuilding extends SiteRect { id: string; label: string; kind: 'house' | 'outbuilding' | 'gatehouse' }
export interface Setbacks { front: number; rear: number; left: number; right: number }
export interface SitePlan {
    plot: { w: number; d: number };
    setbacks?: Setbacks;
    house: SiteBuilding;
    storeys: number;
    outbuildings: SiteBuilding[];
    /** the gap in the front boundary, and whether cars use it */
    gate: { x: number; w: number; vehicles: boolean };
    driveway?: SiteRect;
    /** the house's clear distance to each boundary */
    clear: Setbacks;
    /** ground covered by buildings, as a share of the plot */
    coverage: number;
}

/** the access road's width in front of the plot, in the site plan and the 3D street */
export const ROAD_M = 5;
const VEHICLE_GATE = 3.6, PEDESTRIAN_GATE = 1.2;
const CAR = /garage|carport/;
const CAR_NAME = /\bcars?\b|garage|carport/i;
// the uses whose rules here require parking bays on the plot (regulations/assembly.ts worshipParking,
// regulations/hotel.ts hotelParking): cars come in through the gate though no room of the plan is a garage
const PARKING_USES = /^(assembly|hospitality)$/;

export function sitePlan(layout: SolvedLayout, setbacks?: Setbacks): SitePlan | null {
    const ground = layout.placed_rooms.filter(r => r.floor === 0);
    if (!ground.length || !(layout.plot_width > 0) || !(layout.plot_depth > 0)) return null;
    const plot = { w: layout.plot_width, d: layout.plot_depth };
    const W = Math.max(...ground.map(r => r.x + r.width)), D = Math.max(...ground.map(r => r.y + r.depth));
    // where the plan puts the house: its own offset, else on the front setback line, centred
    const off = layout.site_offset ?? (setbacks
        ? { x: setbacks.left + (plot.w - setbacks.left - setbacks.right - W) / 2, y: plot.d - setbacks.front - D }
        : { x: (plot.w - W) / 2, y: (plot.d - D) / 2 });
    const house: SiteBuilding = { id: 'house', label: 'Main building', kind: 'house', x: off.x, y: off.y, w: W, h: D };
    const outbuildings: SiteBuilding[] = (layout.outbuildings ?? []).map(b => ({
        id: b.id, label: b.label, kind: b.at_gate ? 'gatehouse' : 'outbuilding',
        x: off.x + b.x, y: off.y + b.y, w: b.width, h: b.depth,
    }));
    const storeys = Math.max(...layout.placed_rooms.map(r => r.floor)) + 1;

    // the gate: beside a gatehouse; else before the garage or car porch; else before the front door's room.
    // Cars use it when the plan has a car room or its use needs parking on the plot
    const names = new Map((layout.program_reference?.rooms ?? []).map((r: any) => [r.room_id ?? r.id, String(r.name ?? '')]));
    const car = ground.find(r => CAR.test(roomTypeOf(layout, r.room_id).toLowerCase()) || CAR_NAME.test(names.get(r.room_id) ?? ''));
    const gatehouse = outbuildings.find(b => b.kind === 'gatehouse');
    const vehicles = !!car || PARKING_USES.test(String((layout.program_reference as any)?.brief_reference?.use_type ?? ''));
    const gw = vehicles ? VEHICLE_GATE : PEDESTRIAN_GATE;
    const centre = car ? off.x + car.x + car.width / 2
        : gatehouse ? gatehouse.x + gatehouse.w + 0.5 + gw / 2
        : off.x + W / 2;
    let gx = Math.min(Math.max(centre - gw / 2, 0), plot.w - gw);
    if (gatehouse && gx < gatehouse.x + gatehouse.w + 0.5) gx = Math.min(gatehouse.x + gatehouse.w + 0.5, plot.w - gw);
    const front = off.y + D;
    const driveway = car && plot.d - front > 0.5
        ? { x: Math.max(off.x + car.x, Math.min(gx, off.x + car.x + car.width - gw)), y: front, w: Math.min(gw, car.width), h: plot.d - front }
        : undefined;

    const clear = { front: plot.d - front, rear: off.y, left: off.x, right: plot.w - off.x - W };
    const covered = W * D + outbuildings.reduce((s, b) => s + b.w * b.h, 0);
    return { plot, setbacks, house, storeys, outbuildings, gate: { x: gx, w: gw, vehicles }, driveway, clear, coverage: covered / (plot.w * plot.d) };
}
