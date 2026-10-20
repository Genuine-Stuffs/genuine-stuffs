/**
 * Outbuildings (template step (k), owner 2026-10-13): the boys' quarters
 * (with the rooms that serve only it, e.g. its bathroom) and the generator
 * house stand as separate buildings behind the house, 3 m from it, inside
 * the setbacks; in the rear setback only when the user allows it
 * (SolverOptions.outbuildings_in_rear_setback). When they don't fit, the
 * house keeps them inside as before and the plan says why, with the options.
 */
import type { PlacedRoom, Outbuilding } from "../../../../../../supabase/functions/ai-studio/schema";

/** Separation from the house and between outbuildings (owner: 3 m). */
export const OB_GAP = 3;
const CELL = 0.5, MIN_DEPTH = 3, MAX_DEPTH = 4.5, MIN_ROOM_W = 1.5;
const OUT_TYPE = /^(bq|boys?_?quarters?|gen_?house|generator(_house)?)$/;
const OUT_NAME = /\bboys'? ?quarters?\b|\bbq\b|\bgen(erator)? house\b/i;
// a "BQ Bathroom" serves the BQ: it joins that building, it isn't one
const SERVING = /^(bathroom|toilet|wc|shower|ensuite|kitchenette)$/;

interface ObRoom { room_id: string; name: string; area: number }
export interface ObUnit { id: string; label: string; rooms: ObRoom[]; near?: string }

const norm = (t: unknown) => String(t ?? "").toLowerCase().replace(/[\s-]+/g, "_");
const ceilCell = (m: number) => Math.ceil(m / CELL - 1e-9) * CELL;

/** The brief's ground-floor outbuilding rooms grouped one building each, and
 * the program without them (their links into the house dropped). */
export function splitOutbuildings(program: any): { house: any; units: ObUnit[] } {
    const rooms: any[] = program?.rooms ?? [];
    const id = (r: any, i: number) => r.room_id ?? r.id ?? `room_${i}`;
    const adj = new Map<string, Set<string>>();
    rooms.forEach((r, i) => adj.set(id(r, i), new Set(r.adjacencies ?? r.adjacent_to ?? [])));
    for (const [a, s] of adj) for (const b of s) adj.get(b)?.add(a);
    const ground = (r: any) => (r.floor ?? r.target_floor ?? 0) === 0;
    const heads = rooms.map((r, i) => [r, id(r, i)] as const)
        .filter(([r]) => ground(r) && (OUT_TYPE.test(norm(r.type)) || (OUT_NAME.test(String(r.name ?? "")) && !SERVING.test(norm(r.type)))));
    const units: ObUnit[] = heads.map(([r, rid]) => ({ id: rid, label: r.name ?? rid, rooms: [{ room_id: rid, name: r.name ?? rid, area: r.area_m2 ?? 9 }] }));
    const taken = new Set(units.map(u => u.id));
    // a room linked only to one outbuilding serves it (the BQ's bathroom)
    rooms.forEach((r, i) => {
        const rid = id(r, i), s = adj.get(rid)!;
        if (taken.has(rid) || !ground(r) || s.size !== 1) return;
        const u = units.find(u => s.has(u.id));
        if (u) { u.rooms.push({ room_id: rid, name: r.name ?? rid, area: r.area_m2 ?? 9 }); taken.add(rid); }
    });
    // the house room each building faces (the kitchen's back door for the BQ)
    for (const u of units) u.near = [...adj.get(u.id)!].find(m => !taken.has(m));
    const house = { ...program, rooms: rooms.filter((r, i) => !taken.has(id(r, i))).map(r => ({ ...r, adjacencies: (r.adjacencies ?? r.adjacent_to ?? []).filter((m: string) => !taken.has(m)) })) };
    return { house, units };
}

/** A generator house: never planned inside the house (fumes, fire; owner 2026-10-20). */
export const isGenerator = (u: ObUnit) => /\bgen(erator)?\b/i.test(u.label) || /^gen/.test(norm(u.id));

/** The program without these units' rooms (and links to them). */
export function withoutUnits(program: any, units: ObUnit[]): any {
    const gone = new Set(units.flatMap(u => u.rooms.map(r => r.room_id)));
    const rooms: any[] = program?.rooms ?? [];
    return { ...program, rooms: rooms.filter((r, i) => !gone.has(r.room_id ?? r.id ?? `room_${i}`)).map(r => ({ ...r, adjacencies: (r.adjacencies ?? r.adjacent_to ?? []).filter((m: string) => !gone.has(m)) })) };
}

/** A building's own depth: near square, at least 3 m, no deeper than the strip. */
const depthOf = (u: ObUnit, dMax: number) => Math.min(dMax, Math.max(MIN_DEPTH, ceilCell(Math.sqrt(u.rooms.reduce((s, r) => s + r.area, 0)))));
const widthOf = (u: ObUnit, dMax: number) => u.rooms.reduce((s, r) => s + Math.max(MIN_ROOM_W, ceilCell(r.area / depthOf(u, dMax))), 0);

/** The shallowest strip depth (m) in which every outbuilding stands in a
 * row `stripW` wide, 3 m apart; null when none does. */
export function outbuildingDepth(units: ObUnit[], stripW: number): number | null {
    for (let d = MIN_DEPTH; d <= MAX_DEPTH + 1e-9; d += CELL)
        if (units.reduce((s, u) => s + widthOf(u, d), 0) + OB_GAP * (units.length - 1) <= stripW + 1e-9) return d;
    return null;
}

/** Each outbuilding as a row of rooms 3 m behind a W-wide house, in a strip
 * d deep (house frame: the rear wall is y = 0, so outbuildings have y < 0),
 * the BQ facing the room it links to. Null when they don't fit across W. */
export function placeOutbuildings(units: ObUnit[], d: number, W: number, house: PlacedRoom[], inSetback: (depth: number) => boolean): Outbuilding[] | null {
    const near = (u: ObUnit) => house.find(r => r.room_id === u.near && r.floor === 0);
    const linked = units.map(near).filter((n): n is PlacedRoom => !!n);
    // one with no link (the generator house) takes the end away from the linked ones
    const far = linked.length && linked.reduce((s, n) => s + n.x + n.width / 2, 0) / linked.length > W / 2 ? 0 : 1;
    const want = units.map(u => {
        const w = widthOf(u, d), n = near(u);
        return { u, w, x: n ? n.x + n.width / 2 - w / 2 : far * (W - w) };
    }).sort((a, b) => a.x - b.x);
    // left to right without overlap, then pulled back inside the house width
    let at = 0;
    for (const b of want) { b.x = Math.max(Math.round(Math.max(b.x, 0) / CELL) * CELL, at); at = b.x + b.w + OB_GAP; }
    let end = W;
    for (let k = want.length - 1; k >= 0; k--) { want[k].x = Math.min(want[k].x, end - want[k].w); end = want[k].x - OB_GAP; }
    if (want.some(b => b.x < -1e-9)) return null;
    return want.map(({ u, w, x }) => {
        const du = depthOf(u, d), y = -(OB_GAP + du);
        let rx = x;
        const rooms = u.rooms.map(r => {
            const rw = Math.max(MIN_ROOM_W, ceilCell(r.area / du));
            const p: PlacedRoom = { room_id: r.room_id, floor: 0, x: rx, y, width: rw, depth: du };
            rx += rw;
            return p;
        });
        return { id: `outbuilding_${u.id}`, label: u.label, x, y, width: w, depth: du, in_rear_setback: inSetback(du), rooms };
    });
}

/** Gatehouse (owner 2026-10-19): a security post stands at the gate, in the
 * front setback against the front boundary, beside the house's line; the
 * plan says to confirm it with the planning authority. */
const GATE_TYPE = /^(security(_post|_house|_room)?|gate_?house|guard_?house|gatehouse)$/;
const GATE_NAME = /\bsecurity (post|house|room)\b|\bgate ?house\b|\bguard ?house\b/i;
const GATE_MIN = 2.4, GATE_CLEAR = 1, GATE_SIDE = 0.5;
const gateSize = (u: ObUnit) => {
    const a = u.rooms.reduce((s, r) => s + r.area, 0), w = Math.max(GATE_MIN, ceilCell(Math.sqrt(a)));
    return { w, d: Math.max(GATE_MIN, ceilCell(a / w)) };
};

/** The brief's ground-floor security posts, one gatehouse each, and the
 * program without them; none when the front setback can't hold one with
 * GATE_CLEAR to the house. */
export function splitGatehouses(program: any, front: number): { house: any; units: ObUnit[] } {
    const rooms: any[] = program?.rooms ?? [];
    const id = (r: any, i: number) => r.room_id ?? r.id ?? `room_${i}`;
    const units: ObUnit[] = rooms.map((r, i) => [r, id(r, i)] as const)
        .filter(([r]) => (r.floor ?? r.target_floor ?? 0) === 0 && (GATE_TYPE.test(norm(r.type)) || GATE_NAME.test(String(r.name ?? ""))))
        .map(([r, rid]) => ({ id: rid, label: r.name ?? rid, rooms: [{ room_id: rid, name: r.name ?? rid, area: r.area_m2 ?? 4 }] }))
        .filter(u => gateSize(u).d + GATE_CLEAR <= front + 1e-9);
    const taken = new Set(units.map(u => u.id));
    const house = { ...program, rooms: rooms.filter((r, i) => !taken.has(id(r, i))).map(r => ({ ...r, adjacencies: (r.adjacencies ?? r.adjacent_to ?? []).filter((m: string) => !taken.has(m)) })) };
    return { house, units };
}

/** Each gatehouse in the plot's front left corner, where the gate post
 * stands (house frame: the house front is y = D, the boundary y = D + front;
 * `left`: the plot's edge, metres left of the house), the next beside it. */
export function placeGatehouses(units: ObUnit[], D: number, front: number, left: number): Outbuilding[] {
    let at = -left;
    return units.map(u => {
        const { w, d } = gateSize(u), y = D + front - d, x = at;
        at += w + GATE_SIDE;
        const room: PlacedRoom = { room_id: u.rooms[0].room_id, floor: 0, x, y, width: w, depth: d };
        return { id: `outbuilding_${u.id}`, label: u.label, x, y, width: w, depth: d, in_rear_setback: false, at_gate: true, rooms: [room] };
    });
}
