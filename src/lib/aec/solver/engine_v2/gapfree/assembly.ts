/**
 * A place of worship or assembly hall, planned to the building codes (owner,
 * 2026-10-21: plans follow the regulations, not the example prompts). The
 * figures come from src/lib/aec/regulations/ (Lagos PPR 2019, NBC 2006, then
 * IBC and published church practice where Nigeria is silent).
 *
 * Three bands from the street (plan bottom, y = depth) to the rear:
 *   1. the front band: the foyer in the middle with the main entrance on the
 *      street, and the rooms that open off it either side (restrooms, ushers,
 *      bookshop, children's church, nursing room, media booth);
 *   2. the hall (nave), the building's full width, its side walls outside
 *      walls for the side exits and cross-ventilation, seated in straight
 *      rows between aisles (regulations/assembly.ts seatingLayout);
 *   3. the rear band: the stage in the middle, and the rooms reached from it
 *      either side (choir, instrument store, vestry and the offices behind).
 * Small rooms stack in columns so none is a sliver. Exits are counted and
 * sized from the occupant load; every rule the plan is held to is listed on
 * it, with its source.
 */
import type { PlacedRoom, SolvedLayout, SpatialProgram } from '../../../../../../supabase/functions/ai-studio/schema';
import type { PlotEnvelope, SolverOptions } from '../../types';
import { catalogueEntry } from '../room_catalogue';
import { hiveRooms } from './need';
import * as A from '../../../regulations/assembly';

const cm = (m: number) => Math.round(m * 100) / 100;
/** The narrowest a band's side may be beside the stage (a store or office). */
const COL_MIN_W = 2.6;

type Role = 'nave' | 'stage' | 'front' | 'rear';
interface Room { room_id: string; name: string; area: number; role: Role; adj: string[]; type: string }
type Rect = { x: number; y: number; w: number; h: number };

export interface AssemblyPlan {
    rects: Map<string, Rect>;
    width: number; depth: number;
    seating: ReturnType<typeof A.seatingLayout>;
    /** Exits: the main entrance on the street, the others on the hall's side walls (metres along the outline). */
    exits: Array<{ wall: 'bottom' | 'left' | 'right' | 'top'; at: number; width: number; main?: boolean }>;
    load: number;
}

/** The rooms of the brief by role: the hall, the stage, and the bands either end. */
function roles(program: SpatialProgram): Room[] | null {
    const all = hiveRooms(program).filter(r => (r.floor ?? 0) === 0);
    const typeOf = (r: any) => catalogueEntry(r)?.type ?? String(r.type ?? '');
    const nave = all.find(r => typeOf(r) === 'auditorium');
    const stage = all.find(r => typeOf(r) === 'stage');
    if (!nave || !stage) return null;
    // the rear band: everything reached from the stage without passing through the hall
    const byId = new Map(all.map(r => [r.room_id, r]));
    const rear = new Set<string>([stage.room_id]);
    const queue = [stage.room_id];
    while (queue.length) {
        const id = queue.shift()!;
        for (const m of byId.get(id)?.adjacencies ?? []) {
            const q = byId.get(m);
            if (!q || q === nave || rear.has(m) || typeOf(q) === 'foyer' || typeOf(q) === 'overflow') continue;
            rear.add(m); queue.push(m);
        }
    }
    return all.map(r => ({
        room_id: r.room_id, name: String(r.name ?? r.room_id), area: r.area_m2 ?? 9, adj: r.adjacencies ?? [], type: typeOf(r),
        role: r === nave ? 'nave' : r === stage ? 'stage' : rear.has(r.room_id) ? 'rear' : 'front',
    }));
}

/** Squarified layout (Bruls, Huizing & van Wijk 2000): rooms of the given
 * areas into the rectangle r, each as near square as the areas allow. The
 * areas are scaled to fill r. */
function squarify(rooms: Room[], r: Rect, rects: Map<string, Rect>, first?: (q: Room) => boolean, keepOrder = false) {
    const total = rooms.reduce((t, q) => t + q.area, 0);
    if (!rooms.length || total <= 0) return;
    const k = (r.w * r.h) / total;
    // rooms that must touch `edgeFirst` (the hall) are laid first, against that edge (the box's top)
    const items = (keepOrder ? [...rooms] : [...rooms].sort((a, b) => Number(!!first?.(b)) - Number(!!first?.(a)) || b.area - a.area)).map(q => ({ q, a: q.area * k }));
    let box = { ...r };
    const worst = (row: typeof items, side: number) => {
        const sum = row.reduce((t, x) => t + x.a, 0), mx = Math.max(...row.map(x => x.a)), mn = Math.min(...row.map(x => x.a));
        return Math.max((side * side * mx) / (sum * sum), (sum * sum) / (side * side * mn));
    };
    const lay = (row: typeof items) => {
        const sum = row.reduce((t, x) => t + x.a, 0);
        if (box.w >= box.h) { // a column on the left of the box
            const w = sum / box.h; let y = box.y;
            for (const x of row) { const h = x.a / w; rects.set(x.q.room_id, { x: cm(box.x), y: cm(y), w: cm(w), h: cm(h) }); y += h; }
            box = { x: box.x + w, y: box.y, w: box.w - w, h: box.h };
        } else { // a row along the top of the box
            const h = sum / box.w; let x0 = box.x;
            for (const x of row) { const w = x.a / h; rects.set(x.q.room_id, { x: cm(x0), y: cm(box.y), w: cm(w), h: cm(h) }); x0 += w; }
            box = { x: box.x, y: box.y + h, w: box.w, h: box.h - h };
        }
    };
    let row: typeof items = [];
    for (const it of items) {
        const side = Math.min(box.w, box.h);
        if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it);
        else { lay(row); row = [it]; }
    }
    if (row.length) lay(row);
}

const shared = (a: Rect, b: Rect) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const E = 0.02;
    return Math.abs(a.x + a.w - b.x) < E || Math.abs(b.x + b.w - a.x) < E ? Math.max(0, oy) : Math.abs(a.y + a.h - b.y) < E || Math.abs(b.y + b.h - a.y) < E ? Math.max(0, ox) : 0;
};
const DOOR_M = 1.0;

/** How well a side's arrangement works: rooms that can't be reached (from the
 * centre room through lobbies, or through a room they are linked to), then
 * thin rooms, then the worst proportion. Lower is better. */
function score(rs: Room[], placed: Map<string, Rect>, centre: Room, centreRect: Rect, edgeRoom?: { id: string; rect: Rect }) {
    const at = (id: string) => (id === centre.room_id ? centreRect : id === edgeRoom?.id ? edgeRoom.rect : placed.get(id));
    const reach = new Set<string>([centre.room_id]);
    const lobbies = [...placed.keys()].filter(k => k.includes('__lobby'));
    for (let changed = true; changed;) {
        changed = false;
        for (const id of [...lobbies, ...rs.map(r => r.room_id)]) {
            if (reach.has(id)) continue;
            const r = at(id)!, room = rs.find(q => q.room_id === id);
            const via = [...reach].some(o => {
                const or = at(o); if (!or || shared(r, or) < DOOR_M) return false;
                if (o === centre.room_id || o.includes('__lobby')) return true;
                return !!room && (room.adj.includes(o) || (rs.find(q => q.room_id === o)?.adj.includes(id) ?? false));
            }) || (!!room && !!edgeRoom && room.adj.includes(edgeRoom.id) && shared(r, edgeRoom.rect) >= DOOR_M);
            if (via) { reach.add(id); changed = true; }
        }
    }
    let lost = 0, thin = 0, worst = 1;
    for (const r of rs) {
        const q = placed.get(r.room_id)!;
        if (!reach.has(r.room_id)) lost++;
        const mn = Math.min(q.w, q.h), ratio = Math.max(q.w, q.h) / Math.max(mn, 0.01);
        if (mn < 1.5 || ratio > 3) thin++;
        worst = Math.max(worst, ratio);
    }
    return lost * 1000 + thin * 50 + worst;
}

/** A band of rooms across `width`: `centre` in the middle, the others either
 * side, a room on the side of a room it is linked to (nursing beside the
 * children's church), the sides otherwise balanced. Each side is as wide as
 * its rooms need plus room for the lobby they open onto; the arrangement of
 * each side (room order, lobby share) is the one where every room can be
 * reached and none is thin. The band deepens until the centre room fits
 * between the sides. Its depth. */
const LOBBY = [1.25, 1.4, 1.6], LOBBY_FRONT = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6];
/** A band arrangement's cost per m² left over: below an unreachable room (1000) or a thin one (50), about a twentieth of a proportion step. */
const SPARE_COST = 0.05;
function band(centre: Room, others: Room[], width: number, minDepth: number, y: number, rects: Map<string, Rect>, edgeRoom?: { id: string; rect: Rect }, centreMaxW?: number): number {
    const left: Room[] = [], right: Room[] = [];
    let la = 0, ra = 0;
    const linked = (r: Room, side: Room[]) => side.some(q => q.adj.includes(r.room_id) || r.adj.includes(q.room_id));
    for (const r of [...others].sort((a, b) => b.area - a.area)) {
        const toLeft = linked(r, left) && !linked(r, right) ? true : linked(r, right) && !linked(r, left) ? false : la <= ra;
        if (toLeft) { left.push(r); la += r.area; } else { right.push(r); ra += r.area; }
    }
    let best: { depth: number; map: Map<string, Rect>; cost: number } | null = null;
    // the lobby allowance on each side: the same both sides behind the stage (its rooms reach the
    // hall only through their lobby); on the street band, each side its own, as little as lets its
    // rooms reach the foyer (a big room needs almost none, a row of small ones more; church
    // templates C1-C14 name every space, 2026-10-22)
    const pairs: Array<[number, number]> = edgeRoom ? LOBBY_FRONT.flatMap(a => LOBBY_FRONT.map(b => [a, b] as [number, number])) : LOBBY.map(f => [f, f] as [number, number]);
    for (const [fl, fr] of pairs) {
        let depth = Math.max(minDepth, (centre.area + la * fl + ra * fr) / width);
        let lw = 0, rw = 0, cw = 0;
        for (let k = 0; k < 200; k++, depth += 0.25) {
            lw = la * fl / depth; rw = ra * fr / depth; cw = width - lw - rw;
            if (centreMaxW !== undefined && cw > centreMaxW) { const extra = (cw - centreMaxW) / 2; lw += extra; rw += extra; cw = centreMaxW; }
            if (cw * depth >= centre.area - 1e-6 && cw >= Math.min(8, width / 3)) break;
        }
        const centreRect = { x: lw, y, w: cw, h: depth };
        const map = new Map<string, Rect>([[centre.room_id, { x: cm(lw), y: cm(y), w: cm(cw), h: cm(depth) }]]);
        let cost = 0;
        for (const [rs, x0, w, tag] of [[left, 0, lw, 'L'], [right, lw + cw, rw, 'R']] as Array<[Room[], number, number, string]>) {
            if (!rs.length) continue;
            const spare = w * depth - rs.reduce((t, q) => t + q.area, 0);
            const lobbyRoom: Room = { room_id: `${centre.room_id}__lobby${tag}`, name: 'Lobby', area: Math.max(spare, 0.01), role: 'front', adj: [], type: 'circulation' };
            // arrangements: the lobby first (against the centre side) or last, rooms by size or by link
            const orders: Room[][] = [];
            const bySize = [...rs].sort((a, b) => b.area - a.area);
            const byLink = [...rs].sort((a, b) => Number(!!edgeRoom && b.adj.includes(edgeRoom.id)) - Number(!!edgeRoom && a.adj.includes(edgeRoom.id)) || b.area - a.area);
            for (const o of [bySize, byLink, [...bySize].reverse()]) { orders.push([lobbyRoom, ...o]); orders.push([...o, lobbyRoom]); orders.push([o[0], lobbyRoom, ...o.slice(1)]); }
            let sideBest: { m: Map<string, Rect>; c: number } | null = null;
            for (const o of orders) for (const flip of [false, true]) {
                const m = new Map<string, Rect>();
                // squarify lays its first columns at the box's left: mirror the left side so they sit against the centre
                squarifyOrdered(spare > 0.5 ? o : o.filter(q => q !== lobbyRoom), { x: x0, y, w, h: depth }, m, flip !== (tag === 'L'));
                const c = score(rs, m, centre, centreRect, edgeRoom);
                if (!sideBest || c < sideBest.c) sideBest = { m, c };
            }
            for (const [k, v] of sideBest!.m) map.set(k, v);
            // then the least space left over (on the street band, where it becomes a store nobody asked for)
            cost += sideBest!.c + (edgeRoom ? SPARE_COST * Math.max(0, spare) : 0);
        }
        if (!best || cost < best.cost) best = { depth, map, cost };
    }
    for (const [k, v] of best!.map) rects.set(k, v);
    return best!.depth;
}

/** Squarify in the given order (no sorting), mirrored left-right when `mirror`. */
function squarifyOrdered(rooms: Room[], r: Rect, rects: Map<string, Rect>, mirror: boolean) {
    const m = new Map<string, Rect>();
    squarify(rooms, { x: 0, y: 0, w: r.w, h: r.h }, m, undefined, true);
    for (const [k, q] of m) rects.set(k, { x: cm(mirror ? r.x + r.w - q.x - q.w : r.x + q.x), y: cm(r.y + q.y), w: q.w, h: q.h });
}

/** The plan in the building's own frame, or why it can't be drawn. */
export function planAssembly(program: SpatialProgram, BW: number, BD: number): AssemblyPlan | { fail: string } {
    const rooms = roles(program);
    if (!rooms) return { fail: 'the brief has no main hall and stage' };
    const nave = rooms.find(r => r.role === 'nave')!, stage = rooms.find(r => r.role === 'stage')!;
    const seats = Number(nave.name.match(/([\d,]+)\s*seats?/i)?.[1]?.replace(/,/g, '')) || Math.round(nave.area / 0.75);
    const hall = A.hallFor(seats);
    const W = hall.width;
    if (W > BW + 1e-6) return { fail: `a hall for ${seats} seats is ${W} m wide; the buildable width is ${BW.toFixed(1)} m` };
    const front = rooms.filter(r => r.role === 'front'), rear = rooms.filter(r => r.role === 'rear');
    const foyer = front.find(r => r.type === 'foyer') ?? front.sort((a, b) => b.area - a.area)[0];
    const frontOthers = front.filter(r => r !== foyer);
    // the rear band (stage and its rooms) from the top, the hall, then the front band to the street
    const rects = new Map<string, Rect>();
    const rearD = band(stage, rear.filter(r => r !== stage), W, A.STAGE_DEPTH.value, 0, rects, undefined, Math.min(hall.stageW, W - 2 * COL_MIN_W));
    const naveD = Math.max(hall.naveDepth, nave.area / W);
    rects.set(nave.room_id, { x: 0, y: cm(rearD), w: cm(W), h: cm(naveD) });
    // the front band's top edge is the hall's back wall: rooms linked to the hall (the media booth) go there first
    const frontD = band(foyer, frontOthers, W, 6, rearD + naveD, rects, { id: nave.room_id, rect: { x: 0, y: rearD, w: W, h: naveD } });
    const D = frontD + naveD + rearD;
    if (D > BD + 1e-6) return { fail: `the hall and its rooms need ${D.toFixed(1)} m of depth; the buildable depth is ${BD.toFixed(1)} m` };
    // exits from the occupant load: the main entrance on the foyer's street wall, the others in the hall's side walls
    const load = A.occupantLoad(seats, stage.area + (rooms.find(r => r.type === 'choir')?.area ?? 0));
    const ex = A.exitPlan(load);
    const exits: AssemblyPlan['exits'] = [{ wall: 'bottom', at: cm(W / 2 - ex.mainWidth / 2), width: ex.mainWidth, main: true }];
    const sides = ex.count - 1, hallTop = rearD, hallBot = rearD + naveD;
    for (let k = 0; k < sides; k++) {
        const wall = k % 2 === 0 ? 'left' : 'right';
        // the first pair at the stage end, as far from the main entrance as the hall allows (NBC 2006
        // §7.8.12; fire exits by the stage in template C3), any more in the front quarter, alternating sides
        const at = k < 2 ? hallTop + naveD / 4 - ex.otherWidth / 2 : hallBot - naveD / 4 - ex.otherWidth / 2;
        exits.push({ wall, at: cm(at), width: ex.otherWidth });
    }
    return { rects, width: cm(W), depth: cm(D), seating: hall, exits, load };
}

/** The rules the plan meets or misses, with the numbers (said on the plan). */
function checks(p: AssemblyPlan, seats: number) {
    const ex = A.exitPlan(p.load);
    const lines: Array<{ rule: string; ok: boolean; detail: string }> = [];
    const diag = Math.hypot(p.width, p.depth);
    const main = p.exits.find(e => e.main)!;
    const far = p.exits.filter(e => !e.main).some(e => Math.hypot((e.wall === 'left' ? 0 : p.width) - (main.at + main.width / 2), e.at - p.depth) >= diag * A.EXIT_SEPARATION.value);
    lines.push({ rule: 'Exits', ok: p.exits.length >= ex.count && far,
        detail: `${p.exits.length} exits for an occupant load of ${p.load} (${seats} seats plus the stage and choir; at least ${ex.count}, ${A.EXITS_BY_LOAD.source}); main entrance ${ex.mainWidth} m wide for half the load, the others ${ex.otherWidth} m (${A.MAIN_EXIT_SHARE.source}); at least two exits half the diagonal apart (${A.EXIT_SEPARATION.source}).` });
    lines.push({ rule: 'Seating', ok: p.seating.lastRowFromStage <= A.LAST_ROW_MAX_M.value,
        detail: `${p.seating.rows} rows of ${p.seating.seatsPerRow} in ${p.seating.blocks} blocks (at most ${A.SEATS_BETWEEN_AISLES.value} between aisles), ${A.ROW_PITCH.value} m row pitch, ${A.CENTRE_AISLE.value} m centre aisle, ${A.SIDE_AISLE.value} m side aisles; last row ${p.seating.lastRowFromStage} m from the stage (at most ${A.LAST_ROW_MAX_M.value} m).` });
    lines.push({ rule: 'Clear span', ok: p.width <= A.PORTAL_SPAN_MAX.value,
        detail: `The hall is ${p.width} m across, one clear span with no column inside: a steel portal frame up to ${A.PORTAL_SPAN_MAX.value} m (${A.PORTAL_SPAN_MAX.source}). Hall no higher than ${A.HALL_HEIGHT_MAX.value} m (${A.HALL_HEIGHT_MAX.source}).` });
    const st = p.seating, need = A.wheelchairSpaces(seats);
    lines.push({ rule: 'Wheelchair spaces', ok: st.wheelchairSpaces >= need && st.seatCount + st.wheelchairSpaces >= seats,
        detail: `${st.wheelchairSpaces} wheelchair spaces (${A.WHEELCHAIR_SPACE.value.w} x ${A.WHEELCHAIR_SPACE.value.d} m) at the aisle ends of the back row, each beside a companion seat, with ${st.seatCount} fixed seats (at least ${need} for ${seats} seats: ADA 221.2; UK 1%; ${A.WHEELCHAIR_SPACE.source}).` });
    return lines;
}

/** The whole plan for an assembly brief. */
export function assemblyLayout(program: SpatialProgram, envelope: PlotEnvelope, options?: SolverOptions): SolvedLayout {
    void options;
    const s = envelope.setbacks;
    const BW = Math.max(0, envelope.width - s.left - s.right), BD = Math.max(0, envelope.depth - s.front - s.rear);
    const base: SolvedLayout = {
        program_reference: program, plot_width: envelope.width, plot_depth: envelope.depth,
        placed_rooms: [], solver_iterations_used: 0, is_fully_connected: true, placement_issues: [],
    };
    const p = planAssembly(program, BW, BD);
    if ('fail' in p) return { ...base, solver_status: 'UNSAT', solver_unsat_proven: false, solver_failure: { floor: 0, reasons: [{ code: 'A-001', detail: p.fail }] } };
    // spare space: a lobby where it links the foyer or hall to rooms, else a store (backstage) off the room it opens from
    const all = roles(program)!, nameOf = new Map(all.map(r => [r.room_id, r.name]));
    const circulation = new Set<string>([...p.rects.keys()].filter(k => all.find(r => r.room_id === k)?.type === 'foyer' || k === all.find(r => r.role === 'nave')!.room_id));
    for (let changed = true; changed;) { changed = false; for (const [k, q] of p.rects) if (k.includes('__lobby') && !circulation.has(k) && [...circulation].some(o => shared(q, p.rects.get(o)!) >= DOOR_M)) { circulation.add(k); changed = true; } }
    let lobbies = 0, stores = 0;
    const extra: any[] = [];
    const placed: PlacedRoom[] = [...p.rects].map(([room_id, q]) => {
        if (!room_id.includes('__lobby')) return { room_id, floor: 0, x: q.x, y: q.y, width: q.w, depth: q.h };
        if (circulation.has(room_id)) return { room_id: `corridor_floor0_${lobbies++}`, floor: 0, x: q.x, y: q.y, width: q.w, depth: q.h };
        // the room it shares the most wall with
        const host = [...p.rects].filter(([k]) => !k.includes('__lobby')).map(([k, r]) => [k, shared(q, r)] as const).sort((x, y) => y[1] - x[1])[0];
        const id = `aux_store_${stores++}`, hostName = nameOf.get(host?.[0] ?? '') ?? 'the hall';
        extra.push({ room_id: id, name: /stage|altar/i.test(hostName) ? 'Backstage' : `Store (off ${hostName})`, type: 'store', floor: 0, area_m2: Math.round(q.w * q.h), adjacencies: host ? [host[0]] : [] });
        return { room_id: id, floor: 0, x: q.x, y: q.y, width: q.w, depth: q.h };
    });
    if (extra.length) base.program_reference = { ...program, rooms: [...(program.rooms ?? []), ...extra] } as SpatialProgram;
    const nave = roles(program)!.find(r => r.role === 'nave')!;
    const seats = Number(nave.name.match(/([\d,]+)\s*seats?/i)?.[1]?.replace(/,/g, '')) || Math.round(nave.area / 0.75);
    const worshipM2 = roles(program)!.filter(r => r.role === 'nave' || r.role === 'stage' || r.type === 'choir').reduce((t, r) => t + (p.rects.get(r.room_id)!.w * p.rects.get(r.room_id)!.h), 0);
    const site = A.checkWorshipSite(seats, p.width * p.depth, worshipM2, { width: envelope.width, depth: envelope.depth });
    const issues: NonNullable<SolvedLayout['placement_issues']> = [
        ...checks(p, seats).map(c => ({ room_id: nave.room_id, rule: c.ok ? 'CODE_MET' : 'CODE_MISSED', detail: `${c.rule}: ${c.detail}` })),
        ...site.map(c => ({ room_id: nave.room_id, rule: c.ok ? 'CODE_MET' : 'CODE_MISSED', detail: `${c.rule}: ${c.detail} (${c.source})` })),
    ];
    return {
        ...base, placed_rooms: placed, building_width: p.width, building_depth: p.depth,
        site_offset: { x: s.left + (BW - p.width) / 2, y: envelope.depth - s.front - p.depth },
        solver_status: issues.some(i => i.rule === 'CODE_MISSED') ? 'SOLVED_RELAXED' : 'SOLVED', placement_issues: issues,
        assembly: { seating: p.seating, exits: p.exits, load: p.load },
    } as SolvedLayout;
}
