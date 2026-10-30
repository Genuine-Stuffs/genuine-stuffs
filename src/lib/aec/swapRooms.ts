/**
 * Swap two rooms on a drawn plan (owner 2026-10-30: "move the terrace between the family lounge and
 * the master suite", typed, redrew the house or silently kept it). The two rooms trade places,
 * each taking the other's rectangle, so the floor keeps every wall and has no gap or overlap; no AI
 * and no new search. The plan's search (search_state) follows, so a typed edit afterwards starts
 * from the swapped plan. What the swap costs is said, never left for the user to find: the sizes
 * the rooms now have against the brief, a room that lost its window or its door.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { planOpenings } from '@/components/aec/openings';

/** Rooms that hold the plan together: the stair and its void, halls and landings, the open-to-below. */
const FIXED = /^(stairwell|corridor|atrium_|terrace_light|landing|passage)/;

export function swappable(layout: SolvedLayout, room_id: string): boolean {
    if (FIXED.test(room_id)) return false;
    const t = String(layout.program_reference?.rooms?.find((r: any) => r.room_id === room_id)?.type ?? '').toLowerCase();
    return !/stair|corridor|landing|hall|circulation|void|lift/.test(t);
}

export type SwapResult =
    | { ok: true; layout: SolvedLayout; said: string; notes: string[] }
    | { ok: false; reason: string };

const nameOf = (layout: SolvedLayout, id: string) => String(layout.program_reference?.rooms?.find((r: any) => r.room_id === id)?.name ?? id);
const m2 = (r: { width: number; depth: number }) => Math.round(r.width * r.depth * 10) / 10;

export function swapRooms(layout: SolvedLayout, a: string, b: string, floor: number): SwapResult {
    if (a === b) return { ok: false, reason: 'Pick two different rooms.' };
    const ia = layout.placed_rooms.findIndex(r => r.room_id === a && r.floor === floor);
    const ib = layout.placed_rooms.findIndex(r => r.room_id === b && r.floor === floor);
    if (ia < 0 || ib < 0) return { ok: false, reason: 'Both rooms must be on the same floor.' };
    for (const id of [a, b]) if (!swappable(layout, id)) return { ok: false, reason: `${nameOf(layout, id)} holds the plan together (stairs, halls and landings stay where they are).` };
    const A = layout.placed_rooms[ia], B = layout.placed_rooms[ib];
    const placed = layout.placed_rooms.map((r, i) => i === ia ? { ...r, x: B.x, y: B.y, width: B.width, depth: B.depth }
        : i === ib ? { ...r, x: A.x, y: A.y, width: A.width, depth: A.depth } : r);
    // the search's leaves follow the rooms: each place in the floor's tree now holds the other room
    const ss = layout.search_state;
    const search_state = ss && {
        ...ss, floors: ss.floors.map(f => {
            if (f.floor !== floor) return f;
            const ka = f.ids.indexOf(a), kb = f.ids.indexOf(b);
            if (ka < 0 || kb < 0) return f;
            const ids = [...f.ids], areas = f.areas ? [...f.areas] : undefined;
            [ids[ka], ids[kb]] = [ids[kb], ids[ka]];
            if (areas) [areas[ka], areas[kb]] = [areas[kb], areas[ka]];
            return { ...f, ids, ...(areas ? { areas } : {}) };
        }),
    };
    const next: SolvedLayout = { ...layout, placed_rooms: placed, ...(search_state ? { search_state } : {}) };

    const notes: string[] = [];
    // sizes: each room now has the other's
    const asked = (id: string) => Number((layout.program_reference?.rooms?.find((r: any) => r.room_id === id) as any)?.area_m2) || 0;
    for (const [id, now] of [[a, B], [b, A]] as const) {
        const want = asked(id), got = m2(now);
        if (want && Math.abs(got - want) > 0.15 * want) notes.push(`${nameOf(layout, id)} is now ${got} m² (the brief asks ${want} m²)`);
    }
    // the brief's links the swap broke (an en-suite now away from its bedroom, the kitchen from the dining)
    const wall = (p: { x: number; y: number; width: number; depth: number }, q: typeof p) => {
        const ov = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1), e = 1e-6;
        if (Math.abs(p.x + p.width - q.x) < e || Math.abs(q.x + q.width - p.x) < e) return ov(p.y, p.y + p.depth, q.y, q.y + q.depth);
        if (Math.abs(p.y + p.depth - q.y) < e || Math.abs(q.y + q.depth - p.y) < e) return ov(p.x, p.x + p.width, q.x, q.x + q.width);
        return 0;
    };
    const at = (rs: typeof placed, id: string) => rs.find(r => r.room_id === id && r.floor === floor);
    const said = new Set<string>();
    for (const r of layout.program_reference?.rooms ?? []) for (const o of (r as any).adjacencies ?? []) {
        const x = String((r as any).room_id), y = String(o), key = [x, y].sort().join('|');
        if (said.has(key) || ![a, b].some(id => id === x || id === y)) continue;
        const p0 = at(layout.placed_rooms, x), q0 = at(layout.placed_rooms, y), p1 = at(placed, x), q1 = at(placed, y);
        if (!p0 || !q0 || !p1 || !q1 || wall(p0, q0) < 1 - 1e-6 || wall(p1, q1) >= 1 - 1e-6) continue;
        said.add(key); notes.push(`${nameOf(layout, x)} is no longer next to ${nameOf(layout, y)}`);
    }
    // windows and doors the swap took away
    const before = planOpenings(layout, floor), after = planOpenings(next, floor);
    const lit = (o: typeof before, id: string) => o.windows.some(w => w.room_id === id);
    for (const r of placed.filter(r => r.floor === floor)) {
        if (lit(before, r.room_id) && !lit(after, r.room_id)) notes.push(`${nameOf(layout, r.room_id)} no longer has an outside wall for a window`);
        if (before.doors.has(r.room_id) && !after.doors.has(r.room_id)) notes.push(`${nameOf(layout, r.room_id)} no longer has a door`);
    }
    return { ok: true, layout: next, said: `${nameOf(layout, a)} and ${nameOf(layout, b)} swapped places`, notes };
}
