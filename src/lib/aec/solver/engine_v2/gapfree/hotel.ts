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
import * as HR from '../../../regulations/hotel';

const CELL = 0.5;
/** Planning defaults until capability C sizes them from the building code. */
export const CORRIDOR_W = 1.8, STAIR_W = 2.5, LIFT_MIN_W = 2.0;
/** A guest room module holds its bathroom, so it runs longer than a house bedroom (2:1): the midscale
 * module is 3.66 x 7.9 m and upscale 4.1 x 8.7 m (Cornell, regulations/hotel.ts ROOM_BAY), so 2.4:1. */
const ROOM_ASPECT = Math.max(maxAspectFor({ type: 'bedroom' }), 2.4), MIN_ROOM_W = minWidthFor({ type: 'bedroom', zone: 'private' });
const BAY_MIN = 4.5, BAY_MAX = 8.0;
const ceil = (m: number) => Math.ceil(m / CELL - 1e-9) * CELL;
/** centimetres: sums of half-metres and the 1.8 m corridor drift in the last digits */
const cm = (m: number) => Math.round(m * 100) / 100;
const TOL = 1e-3;

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
    /** the runs of rooms along the corridors, as placed */
    strips: Strip[];
}

/** One guest floor on a buildable area BW × BD (m): the bay depth that fits
 * every room in two rows along the corridor with the smallest footprint, or
 * null when no bay depth does. */
export function planGuestFloor(rooms: FloorRoom[], BW: number, BD: number, short?: { need: number; have: number }): GuestFloor | null {
    const alongY = BD >= BW, L = alongY ? BD : BW, C = alongY ? BW : BD;
    // the stairs at the corridor's two ends, on opposite rows (Lagos Reg 24(12): two stairs; NBC §7.11.4:
    // no dead end over 6.1 m), the lifts and housekeeping in the middle of row A
    const stairs = rooms.filter(r => r.kind === 'stair');
    const s1 = stairs[0], s2 = stairs[1];
    const mid = [...stairs.slice(2), ...rooms.filter(r => r.kind === 'lift'), ...rooms.filter(r => r.kind === 'service')];
    const core = [...stairs, ...mid.filter(r => r.kind !== 'stair')];
    const guests = rooms.filter(r => r.kind === 'room').sort((a, b) => b.area - a.area || a.room_id.localeCompare(b.room_id));
    let best: { d: number; A: FloorRoom[]; B: FloorRoom[]; w: Map<string, number>; len: number; score: number } | null = null;
    for (let d = BAY_MIN; d <= BAY_MAX + 1e-9 && 2 * d + CORRIDOR_W <= C + 1e-9; d += CELL) {
        const w = new Map<string, number>();
        for (const r of core) w.set(r.room_id, Math.max(r.kind === 'stair' ? STAIR_W : r.kind === 'lift' ? LIFT_MIN_W : CELL * 3, ceil(r.area / d)));
        // as wide as its area over the bay asks, and no narrower than the bay over the bedroom proportion
        for (const r of guests) w.set(r.room_id, Math.max(MIN_ROOM_W, ceil(r.area / d), ceil(d / ROOM_ASPECT)));
        const A: FloorRoom[] = [], B: FloorRoom[] = [];
        let la = (s1 ? w.get(s1.room_id)! : 0) + mid.reduce((s, r) => s + w.get(r.room_id)!, 0), lb = s2 ? w.get(s2.room_id)! : 0;
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
    const lenA = (s1 ? w.get(s1.room_id)! : 0) + mid.reduce((s, r) => s + w.get(r.room_id)!, 0) + A.reduce((s, r) => s + w.get(r.room_id)!, 0);
    const lenB = (s2 ? w.get(s2.room_id)! : 0) + B.reduce((s, r) => s + w.get(r.room_id)!, 0);
    pad(A.length ? A : mid.filter(r => r.kind === 'service'), lenA);
    pad(B, lenB);
    // row A: the first stair at its start, half its guest rooms, the lifts and housekeeping in the middle, the rest;
    // row B: its guest rooms, the second stair at the far end
    const half = Math.ceil(A.length / 2);
    const rowA = [...(s1 ? [s1] : []), ...A.slice(0, half), ...mid, ...A.slice(half)];
    const rowB = [...B, ...(s2 ? [s2] : [])];
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
    put(rowB, d + CORRIDOR_W);
    rects.set('corridor', alongY ? { x: d, y: 0, w: CORRIDOR_W, h: len } : { x: 0, y: d, w: len, h: CORRIDOR_W });
    const across = 2 * d + CORRIDOR_W;
    for (const [k, q] of rects) rects.set(k, { x: cm(q.x), y: cm(q.y), w: cm(q.w), h: cm(q.h) });
    const runs = alongY ? 'y' as const : 'x' as const;
    const s1w = s1 ? w.get(s1.room_id)! : 0, s2w = s2 ? w.get(s2.room_id)! : 0;
    const coreFrom = s1w + A.slice(0, half).reduce((t, r) => t + w.get(r.room_id)!, 0);
    const coreTo = coreFrom + mid.reduce((t, r) => t + w.get(r.room_id)!, 0);
    const strips: Strip[] = [
        ...(half ? [{ runs, at: 0, depth: d, from: cm(s1w), to: cm(coreFrom) }] : []),
        ...(A.length > half ? [{ runs, at: 0, depth: d, from: cm(coreTo), to: cm(len) }] : []),
        ...(B.length ? [{ runs, at: cm(d + CORRIDOR_W), depth: d, from: 0, to: cm(len - s2w) }] : []),
    ];
    return { rects, width: cm(alongY ? across : len), depth: cm(alongY ? len : across), bay: d, strips };
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
    let best: { score: number; rects: Map<string, Rect>; L1: number; L2: number; d: number; strips: Strip[] } | null = null;
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
                let slack = Math.floor(left[k] / CELL + 1e-9);
                for (let i = 0; slack > 0; i = (i + 1) % rows[k].length, slack--) ww.set(rows[k][i].room_id, ww.get(rows[k][i].room_id)! + CELL);
                // the row's length isn't whole half-metres (the 1.8 m corridor): the last room takes the rest exactly
                const last = rows[k][rows[k].length - 1];
                if (last) ww.set(last.room_id, cm(ww.get(last.room_id)! + left[k] - Math.floor(left[k] / CELL + 1e-9) * CELL));
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
            const strips: Strip[] = [
                { runs: 'y', at: 0, depth: d, from: 0, to: L1 },
                ...(caps.B > 1e-9 ? [{ runs: 'y' as const, at: d + C, depth: d, from: T, to: L1 }] : []),
                ...(caps.R > 1e-9 ? [{ runs: 'x' as const, at: 0, depth: d, from: d + C, to: L2 }] : []),
                ...(caps.F > 1e-9 ? [{ runs: 'x' as const, at: d + C, depth: d, from: T, to: L2 }] : []),
            ];
            best = { score, rects, L1, L2, d, strips };
        }
    }
    if (!best) return null;
    const r2 = (q: Rect) => ({ x: cm(q.x), y: cm(q.y), w: cm(q.w), h: cm(q.h) });
    const rects = new Map([...best.rects].map(([k, q]) => [k, r2(turn ? { x: q.y, y: q.x, w: q.h, h: q.w } : q)]));
    // turned: a run along y becomes one along x at the same offset
    const strips = best.strips.map(s => ({ runs: turn ? (s.runs === 'y' ? 'x' as const : 'y' as const) : s.runs, at: cm(s.at), depth: s.depth, from: cm(s.from), to: cm(s.to) }));
    return { rects, width: cm(turn ? best.L1 : best.L2), depth: cm(turn ? best.L2 : best.L1), bay: best.d, strips };
}

/** A run of guest rooms side by side along one corridor, as the floor
 * planner placed it: `runs` is the axis it runs along; `at`/`depth` place it across. */
export interface Strip { runs: 'x' | 'y'; at: number; depth: number; from: number; to: number }

const GROUND_FRONT = /^(reception|office|admin|bar)$/, GROUND_DINING = ['restaurant', 'hotel_kitchen', 'staff_facilities', 'commercial_laundry'];

/** The ground floor inside the guest floors' outline: the same corridors and
 * stair and lift; the lobby across the street end of the main corridor; the
 * rooms by the lobby first (reception, admin, bar), then the restaurant with
 * the kitchen and staff rooms behind it, then the rest (accessible guest
 * rooms) — so guests and back of house keep apart. Null when they don't fit. */
export function planGround(rooms0: Array<{ room_id: string; name?: string; type?: string; area_m2?: number }>, g: GuestFloor, first: FloorRoom[]):
    { rects: Map<string, Rect>; short?: number } | null {
    const rects = new Map<string, Rect>();
    const kind = (r: any) => kindOf(r), entry = (r: any) => catalogueEntry(r);
    const stairsUp = first.filter(r => r.kind === 'stair'), servUp = first.find(r => r.kind === 'service');
    // every stair where it is above (the second as stairwell_2)
    stairsUp.forEach((st, k) => rects.set(k ? `stairwell_${k + 1}` : 'stairwell', g.rects.get(st.room_id)!));
    // each lift under the same lift above (the service lift under the service lift)
    const service = (r: { name?: string; type?: string }) => /service/i.test(`${r.name ?? ''} ${r.type ?? ''}`);
    const liftsUp = first.filter(r => r.kind === 'lift'), lifts0 = rooms0.filter(r => kind(r) === 'lift');
    if (liftsUp.length && !lifts0.length) return null;
    const free = new Set(liftsUp);
    for (const l0 of lifts0) {
        const up = [...free].find(u => service(u) === service(l0)) ?? [...free][0];
        if (up) { rects.set(l0.room_id, g.rects.get(up.room_id)!); free.delete(up); }
    }
    // under the housekeeping room: the linen store (housekeeping's stock beside the service lift)
    if (servUp) rects.set('aux_store_0', g.rects.get(servUp.room_id)!);
    const corridors = [...g.rects].filter(([k]) => k.startsWith('corridor')).map(([k, q]) => [k, { ...q }] as const);
    let strips = g.strips.map(s => ({ ...s }));
    const items = rooms0.filter(r => !['stair', 'lift', 'corridor'].includes(kind(r)) && !/^(gen_?house|generator|bq)/.test(String(r.type ?? '').toLowerCase()));
    const lobby = items.find(r => entry(r)?.type === 'lobby');
    // the lobby across the street end of the main corridor (the vertical one reaching the front)
    const main = corridors.find(([, c]) => c.h > c.w && Math.abs(c.y + c.h - g.depth) < TOL);
    if (lobby && main) {
        const atFront = strips.filter(s => s.runs === 'y' && Math.abs(s.to - g.depth) < TOL);
        const x0 = Math.min(main[1].x, ...atFront.map(s => s.at)), x1 = Math.max(main[1].x + main[1].w, ...atFront.map(s => s.at + s.depth));
        const Lb = Math.max(3, ceil((lobby.area_m2 ?? 30) / (x1 - x0)));
        rects.set(lobby.room_id, { x: x0, y: g.depth - Lb, w: x1 - x0, h: Lb });
        main[1].h -= Lb;
        strips = strips.map(s => s.runs === 'y' && Math.abs(s.to - g.depth) < TOL ? { ...s, to: s.to - Lb } : s).filter(s => s.to - s.from > TOL);
    }
    for (const [k, q] of corridors) rects.set(k, q);
    // strips by the lobby first, filled from the lobby back; the rear wing's from the corner out
    const lobbyH = lobby && main ? rects.get(lobby.room_id)!.h : 0;
    const front = (s: Strip) => s.runs === 'y' && Math.abs(s.to - (g.depth - lobbyH)) < TOL;
    strips.sort((a, b) => +front(b) - +front(a) || (b.to - b.from) - (a.to - a.from));
    const typeOf = (r: any) => entry(r)?.type ?? String(r.type ?? '').toLowerCase();
    const rest = items.filter(r => r !== lobby || !main);
    const fill = strips.map(s => ({ s, items: [] as Array<{ id: string; w: number }>, left: s.to - s.from }));
    const width = (r: any, d: number) => Math.max(2.4, ceil((r.area_m2 ?? 9) / d));
    const placedIds = new Set<string>();
    const put = (f: typeof fill[number], r: any) => { f.items.push({ id: r.room_id, w: width(r, f.s.depth) }); f.left -= width(r, f.s.depth); placedIds.add(r.room_id); };
    const fits = (f: typeof fill[number], rs: any[]) => rs.reduce((t, r) => t + width(r, f.s.depth), 0) <= f.left + 1e-9;
    const fronts = fill.filter(f => front(f.s));
    // 1. the restaurant facing the lobby, the kitchen behind it, the staff rooms behind that
    //    (as much of that chain as one row reaching the lobby holds; else any row)
    const chain = GROUND_DINING.map(t => rest.find(r => typeOf(r) === t)).filter(Boolean) as any[];
    for (let n = chain.length; n > 0; n--) {
        const f = [...fronts, ...fill].find(f => fits(f, chain.slice(0, n)));
        if (f) { chain.slice(0, n).forEach(r => put(f, r)); break; }
    }
    // 2. reception at the front of another row reaching the lobby (else the next place by it)
    const reception = rest.find(r => typeOf(r) === 'reception');
    if (reception) { const f = fronts.find(f => !f.items.length && fits(f, [reception])) ?? fill.find(f => fits(f, [reception])); if (f) put(f, reception); }
    // 3. the rest: the bar and offices by the lobby first, then the guest rooms and the remainder
    const order = (r: any) => GROUND_FRONT.test(typeOf(r)) ? 0 : GROUND_DINING.includes(typeOf(r)) ? 1 : 2;
    let short = 0;
    for (const r of rest.filter(r => !placedIds.has(r.room_id)).sort((a, b) => order(a) - order(b) || (b.area_m2 ?? 0) - (a.area_m2 ?? 0))) {
        const f = fill.find(f => fits(f, [r]));
        if (f) put(f, r); else short += r.area_m2 ?? 9;
    }
    // 4. a row left empty takes the smallest room that fits from a row with more than one
    //    (never the restaurant or reception, which have their places)
    const fixed = new Set([chain[0]?.room_id, reception?.room_id]);
    for (const f of fill) {
        if (f.items.length) continue;
        const cands = fill.filter(o => o.items.length > 1).flatMap(o => o.items.filter(it => !fixed.has(it.id)).map(it => ({ o, it, r: rest.find(q => q.room_id === it.id)! })))
            .filter(c => width(c.r, f.s.depth) <= f.left + 1e-9).sort((a, b) => (a.r.area_m2 ?? 0) - (b.r.area_m2 ?? 0));
        const c = cands[0];
        if (!c) continue;
        c.o.items.splice(c.o.items.indexOf(c.it), 1); c.o.left += c.it.w;
        f.items.push({ id: c.r.room_id, w: width(c.r, f.s.depth) }); f.left -= width(c.r, f.s.depth);
    }
    if (short > 0 || fill.some(f => !f.items.length)) return { rects, short: short || fill.filter(f => !f.items.length).reduce((t, f) => t + (f.s.to - f.s.from) * f.s.depth, 0) };
    for (const { s, items: its, left } of fill) {
        let slack = Math.floor(left / CELL + 1e-9);
        for (let i = 0; slack > 0; i = (i + 1) % its.length, slack--) its[i].w += CELL;
        its[its.length - 1].w = cm(its[its.length - 1].w + left - Math.floor(left / CELL + 1e-9) * CELL);
        // by the lobby: placed from the lobby end back; elsewhere from the start
        let p = front(s) ? s.to : s.from;
        for (const it of its) {
            const a = front(s) ? p - it.w : p;
            rects.set(it.id, s.runs === 'y' ? { x: s.at, y: a, w: s.depth, h: it.w } : { x: a, y: s.at, w: it.w, h: s.depth });
            p = front(s) ? a : a + it.w;
        }
    }
    return { rects };
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
            const k = first.filter(r => r.kind === 'stair').findIndex(r => r.room_id === key);
            const room_id = key === 'corridor' ? `corridor_floor${f}_0` : key === 'corridor2' ? `corridor_floor${f}_1` : kind === 'stair' ? (k > 0 ? `stairwell_void_${k + 1}` : 'stairwell_void') : idOf.get(key)!;
            placed.push({ room_id, floor: f, x: q.x, y: q.y, width: q.w, depth: q.h });
        }
    }
    // the ground floor inside the same outline, its stair and lift under those above
    const rooms0 = all.filter(r => r.floor === 0);
    const ground = rooms0.length ? planGround(rooms0, plan, first) : null;
    if (ground && !ground.short) {
        if (ground.rects.has('aux_store_0')) base.program_reference = { ...program, rooms: [...(program.rooms ?? []), { room_id: 'aux_store_0', name: 'Linen Store', type: 'store', floor: 0, area_m2: 0, adjacencies: [] } as any] } as SpatialProgram;
        for (const [key, q] of ground.rects) {
            const room_id = key === 'corridor' ? 'corridor_floor0_0' : key === 'corridor2' ? 'corridor_floor0_1' : key;
            placed.push({ room_id, floor: 0, x: cm(q.x), y: cm(q.y), width: cm(q.w), depth: cm(q.h) });
        }
    } else if (rooms0.length) issues.push({ room_id: rooms0[0].room_id, rule: 'AREA_ADJUSTED',
        detail: `The ground floor's rooms don't fit inside the guest floors' outline${ground?.short ? ` (about ${Math.round(ground.short)} m² over)` : ''}, so it isn't drawn: fewer or smaller ground-floor rooms, or a larger plot.` });
    const gens = rooms0.filter(r => /^(gen_?house|generator)/.test(String(r.type ?? '').toLowerCase()));
    if (gens.length) issues.push({ room_id: gens[0].room_id, rule: 'OUTBUILDING_NO_FIT',
        detail: `${gens.map(r => r.name ?? r.room_id).join(' and ')} stands outside the hotel (a generator is never inside a building people sleep in); its place on the site isn't drawn yet.` });
    // the plan against the codes (regulations/hotel.ts), every rule with its source
    issues.push(...hotelChecks(program, plan, first, floors.length + 1, envelope, s.left + s.right, s.front + s.rear));
    return {
        ...base, placed_rooms: placed, building_width: plan.width, building_depth: plan.depth,
        site_offset: { x: s.left + (BW - plan.width) / 2, y: envelope.depth - s.front - plan.depth },
        solver_status: 'SOLVED', placement_issues: issues,
    };
}

/** The guest floor and the site against the hotel rules (regulations/hotel.ts). */
function hotelChecks(program: SpatialProgram, plan: GuestFloor, first: FloorRoom[], storeys: number, envelope: PlotEnvelope, sideSetbacks: number, frontRear: number): NonNullable<SolvedLayout['placement_issues']> {
    void sideSetbacks; void frontRear;
    const out: NonNullable<SolvedLayout['placement_issues']> = [];
    const say = (ok: boolean, rule: string, detail: string, source: string) => out.push({ room_id: 'corridor_floor1_0', rule: ok ? 'CODE_MET' : 'CODE_MISSED', detail: `${rule}: ${detail} (${source})` });
    const corr = plan.rects.get('corridor'), alongY = !!corr && corr.h > corr.w, len = corr ? (alongY ? corr.h : corr.w) : 0;
    const stairs = first.filter(r => r.kind === 'stair').map(r => plan.rects.get(r.room_id)!).filter(Boolean);
    const at = (q: Rect) => alongY ? [q.y, q.y + q.h] : [q.x, q.x + q.w];
    const ends = stairs.map(at), lo = Math.min(...ends.map(e => e[0]), len), hi = Math.max(...ends.map(e => e[1]), 0);
    const deadEnd = stairs.length ? Math.max(lo, len - hi) : len;
    // the farthest point of the corridor from its nearest stair
    const centres = ends.map(e => (e[0] + e[1]) / 2);
    let travel = 0;
    for (let p = 0; p <= len; p += 0.5) travel = Math.max(travel, Math.min(...centres.map(c => Math.abs(p - c))));
    say(stairs.length >= HR.STAIRS_MIN.value, 'Escape stairs', `${stairs.length} stairs at least ${HR.STAIR_WIDTH_MIN.value} m wide (at least ${HR.STAIRS_MIN.value})`, HR.STAIRS_MIN.source);
    say(deadEnd <= HR.DEAD_END_M.value + 1e-6, 'Dead ends', `the corridor runs ${deadEnd.toFixed(1)} m past its last stair (at most ${HR.DEAD_END_M.value} m)`, HR.DEAD_END_M.source);
    say(travel <= HR.MAX_TRAVEL_M.value + 1e-6, 'Travel to a stair', `at most ${travel.toFixed(1)} m along the corridor to a stair (at most ${HR.MAX_TRAVEL_M.value} m)`, HR.MAX_TRAVEL_M.source);
    say(CORRIDOR_W >= HR.CORRIDOR_MIN.value, 'Corridor', `${CORRIDOR_W} m wide (at least ${HR.CORRIDOR_MIN.value} m, 1-hour enclosure)`, HR.CORRIDOR_MIN.source);
    const all = hiveRooms(program), keys = all.filter(r => kindOf(r) === 'room' && (catalogueEntry(r)?.type === 'guest_room' || /guest room|suite/i.test(String(r.name ?? ''))));
    const stars = (Number((program as any).brief_reference?.stars) || 3) as HR.Stars;
    const lifts = HR.lifts(storeys, keys.length, stars), hasLift = first.some(r => r.kind === 'lift'), hasService = first.filter(r => r.kind === 'lift').length > 1 || first.some(r => r.kind === 'service' && /lift/i.test(r.name));
    say((!lifts.guest || hasLift) && (!lifts.service || hasService), 'Lifts', `${storeys} storeys and ${keys.length} rooms at ${stars} stars need ${lifts.guest} guest and ${lifts.service} service lift; the plan has ${hasLift ? 'a guest lift' : 'no guest lift'} and ${hasService ? 'a service lift' : 'no service lift'}`, lifts.source);
    const grade = HR.ROOM_BY_STARS[stars], small = keys.filter(r => (r.area_m2 ?? 0) < Math.max(HR.ROOM_LEGAL_MIN.value, grade.bedroom + grade.bathroom) - 1e-6);
    say(!small.length, 'Room sizes', `every room at least ${HR.ROOM_LEGAL_MIN.value} m² (law) and ${grade.bedroom} + ${grade.bathroom} m² (the ${stars}-star target)${small.length ? `; under it: ${small.map(r => r.name).join(', ')}` : ''}`, `${HR.ROOM_LEGAL_MIN.source}; ${HR.ROOM_SOURCE}`);
    const acc = keys.filter(r => /accessible/i.test(String(r.name ?? ''))).length, needAcc = HR.accessibleRooms(keys.length);
    say(acc >= needAcc, 'Accessible rooms', `${acc} accessible rooms for ${keys.length} (at least ${needAcc})`, 'NBC 2006 §6.3.8.6; ADA 224.2; UK Approved Document M (1 in 20)');
    const dining = all.filter(r => catalogueEntry(r)?.type === 'restaurant').reduce((t, r) => t + (r.area_m2 ?? 0), 0);
    for (const c of HR.checkHotelSite(keys.length, plan.width * plan.depth, { width: envelope.width, depth: envelope.depth }, dining)) say(c.ok, c.rule, c.detail, c.source);
    return out;
}
