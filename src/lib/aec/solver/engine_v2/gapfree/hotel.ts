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

type Rect = { x: number; y: number; w: number; h: number };

/** An L-shaped guest floor, for when one straight corridor is too short: a
 * wing along the long side and a wing across the rear, each with rooms both
 * sides of its corridor. The core (stair, lift, housekeeping) fills the
 * inside corner, which has no outside wall; the outer corner room has two
 * (a suite). Planned with the long side along y, turned when x is longer.
 *
 *   y=0  [outer corner][V][ rear row ......................]
 *        [   row A   ][V][==== corridor H =================]
 *        [   row A   ][V][ core ][ front row ...............]
 *        [   row A   ][V][ row B ]
 *   y=L1 [   row A   ][V][ row B ]
 */
export function planLFloor(rooms: FloorRoom[], BW: number, BD: number): GuestFloor | null {
    const turn = BW > BD, LONG = turn ? BW : BD, SHORT = turn ? BD : BW, C = CORRIDOR_W;
    const core = [...rooms.filter(r => r.kind === 'stair'), ...rooms.filter(r => r.kind === 'lift'), ...rooms.filter(r => r.kind === 'service')];
    const guests = rooms.filter(r => r.kind === 'room');
    if (!guests.length) return null;
    let best: { score: number; rects: Map<string, Rect>; L1: number; L2: number; d: number } | null = null;
    for (let d = BAY_MIN; d <= BAY_MAX + 1e-9; d += CELL) {
        const T = 2 * d + C;
        if (T > SHORT + 1e-9) break;
        // the core across the inside corner, d × d
        const cw = core.map(r => r.kind === 'stair' ? STAIR_W : Math.max(r.kind === 'lift' ? LIFT_MIN_W : CELL * 3, ceil(r.area / d)));
        const coreUsed = cw.reduce((s, v) => s + v, 0);
        if (core.length && coreUsed > d + 1e-9) continue;
        if (core.length) cw[cw.length - 1] += d - coreUsed;
        // the outer corner: the room whose area is nearest d²
        const corner = [...guests].sort((a, b) => Math.abs(a.area - d * d) - Math.abs(b.area - d * d) || a.room_id.localeCompare(b.room_id))[0];
        const rest = guests.filter(r => r !== corner).sort((a, b) => b.area - a.area || a.room_id.localeCompare(b.room_id));
        const w = new Map(rest.map(r => [r.room_id, Math.max(MIN_ROOM_W, ceil(r.area / d), ceil(d / ROOM_ASPECT))]));
        for (let L2 = T; L2 <= SHORT + 1e-9; L2 += CELL) for (let L1 = T; L1 <= LONG + 1e-9; L1 += CELL) {
            const caps = { A: L1 - d, B: L1 - T, R: L2 - d - C, F: L2 - T };
            const rows: Record<keyof typeof caps, FloorRoom[]> = { A: [], B: [], R: [], F: [] };
            const left = { ...caps };
            let ok = true;
            for (const r of rest) {
                const k = (Object.keys(left) as Array<keyof typeof caps>).filter(k => left[k] + 1e-9 >= w.get(r.room_id)!).sort((a, b) => left[b] - left[a])[0];
                if (!k) { ok = false; break; }
                rows[k].push(r); left[k] -= w.get(r.room_id)!;
            }
            // every row with length holds a room (the floor has no gaps)
            if (!ok || (Object.keys(caps) as Array<keyof typeof caps>).some(k => caps[k] > 1e-9 && !rows[k].length)) continue;
            const ww = new Map(w);
            for (const k of Object.keys(rows) as Array<keyof typeof caps>) {
                let slack = Math.round(left[k] / CELL);
                for (let i = 0; slack > 0; i = (i + 1) % rows[k].length, slack--) ww.set(rows[k][i].room_id, ww.get(rows[k][i].room_id)! + CELL);
            }
            const off = rest.reduce((s, r) => s + Math.abs(ww.get(r.room_id)! * d - r.area) / r.area, 0) + Math.abs(d * d - corner.area) / corner.area;
            const score = L1 * T + (L2 - T) * T + 4 * off;
            if (best && score >= best.score) continue;
            const rects = new Map<string, Rect>();
            rects.set(corner.room_id, { x: 0, y: 0, w: d, h: d });
            rects.set('corridor', { x: d, y: 0, w: C, h: L1 });
            if (L2 > d + C + 1e-9) rects.set('corridor2', { x: d + C, y: d, w: L2 - d - C, h: C });
            let at = d + C;
            core.forEach((r, i) => { rects.set(r.room_id, { x: at, y: d + C, w: cw[i], h: d }); at += cw[i]; });
            const run = (row: FloorRoom[], start: number, place: (r: FloorRoom, at: number, len: number) => Rect) => {
                let p = start;
                for (const r of row) { const len = ww.get(r.room_id)!; rects.set(r.room_id, place(r, p, len)); p += len; }
            };
            run(rows.A, d, (_, p, len) => ({ x: 0, y: p, w: d, h: len }));
            run(rows.B, T, (_, p, len) => ({ x: d + C, y: p, w: d, h: len }));
            run(rows.R, d + C, (_, p, len) => ({ x: p, y: 0, w: len, h: d }));
            run(rows.F, T, (_, p, len) => ({ x: p, y: d + C, w: len, h: d }));
            best = { score, rects, L1, L2, d };
        }
    }
    if (!best) return null;
    const rects = turn ? new Map([...best.rects].map(([k, q]) => [k, { x: q.y, y: q.x, w: q.h, h: q.w }])) : best.rects;
    return { rects, width: turn ? best.L1 : best.L2, depth: turn ? best.L2 : best.L1, bay: best.d };
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
    const plan = planGuestFloor(first, BW, BD, short) ?? planLFloor(first, BW, BD);
    if (!plan) {
        // the floor's shape, not its area: the rooms need more corridor than one straight corridor has
        const n = first.filter(r => r.kind === 'room').length;
        return { ...base, solver_status: 'UNSAT', solver_unsat_proven: false,
            solver_failure: { floor: floors[0], reasons: [{ code: 'H-001', detail: `${n} guest rooms need about ${Math.ceil(short.need)} m of corridor on each side; a straight corridor on this plot is at most ${Math.floor(short.have || Math.max(BW, BD))} m long, and an L-shaped floor doesn't hold them either`,
                values: { rooms: n, need_m: short.need, have_m: short.have || Math.max(BW, BD) } }] } };
    }
    const placed: PlacedRoom[] = [];
    const issues: SolvedLayout['placement_issues'] = [];
    const firstOrder = ordered(first);
    for (const f of floors) {
        const rooms = roomsOf(f);
        // a guest floor repeats the first: its outline sits on the floor below, and its core lines up.
        // A floor with other rooms isn't drawn yet (it would need its own outline), and the plan says so.
        if (signature(rooms) !== signature(first)) {
            issues.push({ room_id: rooms[0]?.room_id ?? `floor${f}`, rule: 'AREA_ADJUSTED',
                detail: `Floor ${f} has different rooms from floor ${floors[0]}, so it isn't drawn: guest floors repeat the first one, so their outline and core line up.` });
            continue;
        }
        const idOf = new Map<string, string>(ordered(rooms).map((r, k) => [firstOrder[k].room_id, r.room_id]));
        for (const [key, q] of plan.rects) {
            const kind = key.startsWith('corridor') ? 'corridor' : first.find(r => r.room_id === key)?.kind;
            const room_id = key === 'corridor' ? `corridor_floor${f}_0` : key === 'corridor2' ? `corridor_floor${f}_1` : kind === 'stair' ? 'stairwell_void' : idOf.get(key)!;
            placed.push({ room_id, floor: f, x: q.x, y: q.y, width: q.w, depth: q.h });
        }
    }
    issues.push({ room_id: 'corridor_floor1_0', rule: 'HOTEL_PENDING_CODE',
        detail: `The guest corridor (${CORRIDOR_W} m wide) and ${first.filter(r => r.kind === 'stair').length || 'no'} fire stair are planning defaults: exits, stairs and corridor widths will be sized from the number of guests under the building code. The ground floor isn't planned yet.` });
    return {
        ...base, placed_rooms: placed, building_width: plan.width, building_depth: plan.depth,
        site_offset: { x: s.left + (BW - plan.width) / 2, y: envelope.depth - s.front - plan.depth },
        solver_status: 'SOLVED', placement_issues: issues,
    };
}
