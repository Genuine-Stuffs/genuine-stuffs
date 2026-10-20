/**
 * Hotel guest floors (owner's engine brief, 2026-10-20, Brief 4): a
 * double-loaded corridor — guest rooms either side of a central corridor —
 * with the core (stair, lift, housekeeping store) set into one row, and
 * every guest floor with the same rooms stacked on the first one, so the
 * core, walls and plumbing line up floor to floor.
 *
 * A guest room is a module: its en-suite is inside it, it spans the bay
 * from the corridor to the outside wall (its window), and its width is its
 * area over the bay depth. The corridor runs along the longer side of the
 * buildable area.
 *
 * Not yet: the ground floor (the next step), and the code's figures —
 * corridor width and the number of fire stairs come with the occupancy
 * engine (capability C); until then the defaults below are said on the plan.
 */
import type { PlacedRoom, SolvedLayout, SpatialProgram } from '../../../../../../supabase/functions/ai-studio/schema';
import type { PlotEnvelope, SolverOptions } from '../../types';
import { catalogueEntry } from '../room_catalogue';
import { hiveRooms } from './need';
import { maxAspectFor, minWidthFor } from '../solver/room_shape';

const CELL = 0.5;
/** Planning defaults until capability C sizes them from the building code. */
export const CORRIDOR_W = 1.8, STAIR_W = 2.5, LIFT_MIN_W = 2.0;
/** A guest room is shaped as a bedroom is elsewhere in the planner. */
const ROOM_ASPECT = maxAspectFor({ type: 'bedroom' }), MIN_ROOM_W = minWidthFor({ type: 'bedroom', zone: 'private' });
const BAY_MIN = 4.5, BAY_MAX = 8.0;
const ceil = (m: number) => Math.ceil(m / CELL - 1e-9) * CELL;

type Kind = 'stair' | 'lift' | 'service' | 'corridor' | 'room';
interface FloorRoom { room_id: string; name: string; area: number; kind: Kind }

const kindOf = (r: { type?: string; name?: string }): Kind => {
    const t = String(r.type ?? '').toLowerCase();
    if (/stair/.test(t) || /\bstair/i.test(r.name ?? '')) return 'stair';
    const e = catalogueEntry(r);
    if (e?.type === 'lift_core') return 'lift';
    if (/corridor|circulation|landing|hall/.test(t)) return 'corridor';
    if (e?.category === 'service') return 'service';
    return 'room';
};

export interface GuestFloor {
    /** rects in the floor frame, by the room they hold; the corridor and stair by role */
    rects: Map<string, { x: number; y: number; w: number; h: number }>;
    width: number; depth: number;
    bay: number;
}

/** One guest floor on a buildable area BW × BD (m): the bay depth that fits
 * every room in two rows along the corridor with the smallest footprint, or
 * null when no bay depth does. */
export function planGuestFloor(rooms: FloorRoom[], BW: number, BD: number, short?: { need: number; have: number }): GuestFloor | null {
    const alongY = BD >= BW, L = alongY ? BD : BW, C = alongY ? BW : BD;
    const core = [...rooms.filter(r => r.kind === 'stair'), ...rooms.filter(r => r.kind === 'lift'), ...rooms.filter(r => r.kind === 'service')];
    const guests = rooms.filter(r => r.kind === 'room').sort((a, b) => b.area - a.area || a.room_id.localeCompare(b.room_id));
    let best: { d: number; A: FloorRoom[]; B: FloorRoom[]; w: Map<string, number>; len: number; score: number } | null = null;
    for (let d = BAY_MIN; d <= BAY_MAX + 1e-9 && 2 * d + CORRIDOR_W <= C + 1e-9; d += CELL) {
        const w = new Map<string, number>();
        for (const r of core) w.set(r.room_id, Math.max(r.kind === 'stair' ? STAIR_W : r.kind === 'lift' ? LIFT_MIN_W : CELL * 3, ceil(r.area / d)));
        // as wide as its area over the bay asks, and no narrower than the bay over the bedroom proportion
        for (const r of guests) w.set(r.room_id, Math.max(MIN_ROOM_W, ceil(r.area / d), ceil(d / ROOM_ASPECT)));
        const A: FloorRoom[] = [], B: FloorRoom[] = [];
        let la = core.reduce((s, r) => s + w.get(r.room_id)!, 0), lb = 0;
        for (const r of guests) { if (lb <= la) { B.push(r); lb += w.get(r.room_id)!; } else { A.push(r); la += w.get(r.room_id)!; } }
        const len = Math.max(la, lb);
        if (short && (!short.need || len < short.need)) { short.need = len; short.have = L; }
        if (len > L + 1e-9) continue;
        // the smallest footprint, then the rooms closest to their asked areas
        const off = guests.reduce((s, r) => s + Math.abs(w.get(r.room_id)! * d - r.area) / r.area, 0);
        const score = len * (2 * d + CORRIDOR_W) + off;
        if (!best || score < best.score) best = { d, A, B, w, len, score };
    }
    if (!best) return null;
    const { d, A, B, w, len } = best;
    // the shorter row's rooms take the slack, half a metre each in turn
    const pad = (row: FloorRoom[], has: number) => {
        let slack = Math.round((len - has) / CELL);
        for (let k = 0; slack > 0 && row.length; k = (k + 1) % row.length, slack--) w.set(row[k].room_id, w.get(row[k].room_id)! + CELL);
    };
    const lenA = core.reduce((s, r) => s + w.get(r.room_id)!, 0) + A.reduce((s, r) => s + w.get(r.room_id)!, 0);
    const lenB = B.reduce((s, r) => s + w.get(r.room_id)!, 0);
    pad(A.length ? A : core.filter(r => r.kind === 'service'), lenA);
    pad(B, lenB);
    // row A: half its guest rooms, the core in the middle of the floor, the rest
    const half = Math.ceil(A.length / 2);
    const rowA = [...A.slice(0, half), ...core, ...A.slice(half)];
    const rects = new Map<string, { x: number; y: number; w: number; h: number }>();
    const put = (row: FloorRoom[], across: number) => {
        let at = 0;
        for (const r of row) {
            const ww = w.get(r.room_id)!;
            rects.set(r.room_id, alongY ? { x: across, y: at, w: d, h: ww } : { x: at, y: across, w: ww, h: d });
            at += ww;
        }
    };
    put(rowA, 0);
    put(B, d + CORRIDOR_W);
    rects.set('corridor', alongY ? { x: d, y: 0, w: CORRIDOR_W, h: len } : { x: 0, y: d, w: len, h: CORRIDOR_W });
    const across = 2 * d + CORRIDOR_W;
    return { rects, width: alongY ? across : len, depth: alongY ? len : across, bay: d };
}

/** The same rooms (by role and size), so the floor repeats the first one. */
const signature = (rooms: FloorRoom[]) => rooms.map(r => `${r.kind}:${r.area}`).sort().join('|');
const ordered = (rooms: FloorRoom[]) => [...rooms].sort((a, b) => a.kind.localeCompare(b.kind) || b.area - a.area || a.room_id.localeCompare(b.room_id));

/** The hotel's guest floors (every floor above the ground floor), stacked. */
export function hotelLayout(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): SolvedLayout {
    const s = envelope.setbacks;
    const BW = Math.max(0, envelope.width - s.left - s.right), BD = Math.max(0, envelope.depth - s.front - s.rear);
    const all = hiveRooms(program);
    const floors = [...new Set(all.map(r => r.floor))].filter(f => f > 0).sort((a, b) => a - b);
    const roomsOf = (f: number): FloorRoom[] => all.filter(r => r.floor === f)
        .map(r => ({ room_id: r.room_id, name: String(r.name ?? r.room_id), area: r.area_m2 ?? 9, kind: kindOf(r) }))
        .filter(r => r.kind !== 'corridor'); // the corridor is drawn, not asked for
    const base: SolvedLayout = {
        program_reference: program, plot_width: envelope.width, plot_depth: envelope.depth,
        placed_rooms: [], solver_iterations_used: 0, is_fully_connected: true, placement_issues: [],
    };
    if (!floors.length) return { ...base, solver_status: 'UNSAT', solver_failure: { floor: 1, reasons: [{ code: 'S-001', detail: 'no guest floors in the brief' }] } };
    const first = roomsOf(floors[0]);
    const short = { need: 0, have: 0 };
    const plan = planGuestFloor(first, BW, BD, short);
    if (!plan) {
        // the floor's shape, not its area: the rooms need more corridor than one straight corridor has
        const n = first.filter(r => r.kind === 'room').length;
        return { ...base, solver_status: 'UNSAT', solver_unsat_proven: false,
            solver_failure: { floor: floors[0], reasons: [{ code: 'H-001', detail: `${n} guest rooms need about ${Math.ceil(short.need)} m of corridor on each side; a straight corridor on this plot is at most ${Math.floor(short.have || Math.max(BW, BD))} m long`,
                values: { rooms: n, need_m: short.need, have_m: short.have || Math.max(BW, BD) } }] } };
    }
    const placed: PlacedRoom[] = [];
    const issues: SolvedLayout['placement_issues'] = [];
    const firstOrder = ordered(first);
    for (const f of floors) {
        const rooms = roomsOf(f);
        // a floor with the same rooms repeats the first; any other is planned on its own
        const own = signature(rooms) === signature(first) ? null : planGuestFloor(rooms, BW, BD);
        const src = own ?? plan;
        const idOf = new Map<string, string>(own ? rooms.map(r => [r.room_id, r.room_id]) : ordered(rooms).map((r, k) => [firstOrder[k].room_id, r.room_id]));
        if (!own && signature(rooms) !== signature(first)) {
            issues.push({ room_id: rooms[0]?.room_id ?? `floor${f}`, rule: 'AREA_ADJUSTED', detail: `Floor ${f}'s rooms don't fit as a guest floor, so it isn't drawn.` });
            continue;
        }
        for (const [key, q] of src.rects) {
            const kindKey = key === 'corridor' ? 'corridor' : (own ? rooms : first).find(r => r.room_id === key)?.kind;
            const room_id = key === 'corridor' ? `corridor_floor${f}_0` : kindKey === 'stair' ? 'stairwell_void' : idOf.get(key)!;
            placed.push({ room_id, floor: f, x: q.x, y: q.y, width: q.w, depth: q.h });
        }
        if (own && own.width !== plan.width) issues.push({ room_id: rooms[0].room_id, rule: 'AREA_ADJUSTED', detail: `Floor ${f} has different rooms from floor ${floors[0]}, so it doesn't repeat it.` });
    }
    issues.push({ room_id: 'corridor_floor1_0', rule: 'HOTEL_PENDING_CODE',
        detail: `The guest corridor (${CORRIDOR_W} m wide) and ${first.filter(r => r.kind === 'stair').length || 'no'} fire stair are planning defaults: exits, stairs and corridor widths will be sized from the number of guests under the building code. The ground floor isn't planned yet.` });
    return {
        ...base, placed_rooms: placed, building_width: plan.width, building_depth: plan.depth,
        site_offset: { x: s.left + (BW - plan.width) / 2, y: envelope.depth - s.front - plan.depth },
        solver_status: 'SOLVED', placement_issues: issues,
    };
}
