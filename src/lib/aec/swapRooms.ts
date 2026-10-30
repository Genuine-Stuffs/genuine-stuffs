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
            // each room's size is the place it took (m²), so a warm start sees both as resized and pulls
            // them back to the brief's sizes ("Fit sizes", and a typed edit after the swap)
            if (areas) for (const k of [ka, kb]) areas[k] = f.rects[k].w * f.rects[k].h * 0.25;
            // both held where the user put them when the plan is refined (Fit sizes, a typed edit)
            const pinned = [...new Set([...(f.pinned ?? []), a, b])];
            return { ...f, ids, ...(areas ? { areas } : {}), pinned };
        }),
    };
    const next: SolvedLayout = { ...layout, placed_rooms: placed, ...(search_state ? { search_state } : {}) };

    return { ok: true, layout: next, said: `${nameOf(layout, a)} and ${nameOf(layout, b)} swapped places`, notes: editNotes(layout, next, [floor]) };
}

/** What a hand edit (a swap, Fit sizes) cost on the given floors, plan before against plan after: a room
 * whose size changed and is now more than 15 % off the brief, a link of the brief that had a shared
 * wall and lost it (an en-suite away from its bedroom), a room that lost its window or its door. */
export function editNotes(before: SolvedLayout, after: SolvedLayout, floors: number[]): string[] {
    const notes: string[] = [];
    const brief: any[] = (before.program_reference?.rooms as any[]) ?? [];
    const asked = (id: string) => Number(brief.find(r => r.room_id === id)?.area_m2) || 0;
    const at = (L: SolvedLayout, id: string, f: number) => L.placed_rooms.find(r => r.room_id === id && r.floor === f);
    const wall = (p: { x: number; y: number; width: number; depth: number }, q: typeof p) => {
        const ov = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1), e = 1e-6;
        if (Math.abs(p.x + p.width - q.x) < e || Math.abs(q.x + q.width - p.x) < e) return ov(p.y, p.y + p.depth, q.y, q.y + q.depth);
        if (Math.abs(p.y + p.depth - q.y) < e || Math.abs(q.y + q.depth - p.y) < e) return ov(p.x, p.x + p.width, q.x, q.x + q.width);
        return 0;
    };
    for (const f of floors) {
        for (const r of after.placed_rooms.filter(r => r.floor === f)) {
            const was = at(before, r.room_id, f), want = asked(r.room_id), got = m2(r);
            if (was && Math.abs(m2(was) - got) > 0.05 && want && Math.abs(got - want) > 0.15 * want) notes.push(`${nameOf(before, r.room_id)} is now ${got} m² (the brief asks ${want} m²)`);
        }
        const said = new Set<string>();
        for (const r of brief) for (const o of r.adjacencies ?? []) {
            const x = String(r.room_id), y = String(o), key = [x, y].sort().join('|');
            if (said.has(key)) continue;
            const p0 = at(before, x, f), q0 = at(before, y, f), p1 = at(after, x, f), q1 = at(after, y, f);
            if (!p0 || !q0 || !p1 || !q1 || wall(p0, q0) < 1 - 1e-6 || wall(p1, q1) >= 1 - 1e-6) continue;
            said.add(key); notes.push(`${nameOf(before, x)} is no longer next to ${nameOf(before, y)}`);
        }
        const o0 = planOpenings(before, f), o1 = planOpenings(after, f);
        const lit = (o: typeof o0, id: string) => o.windows.some(w => w.room_id === id);
        for (const r of after.placed_rooms.filter(r => r.floor === f)) {
            if (lit(o0, r.room_id) && !lit(o1, r.room_id)) notes.push(`${nameOf(before, r.room_id)} no longer has an outside wall for a window`);
            if (o0.doors.has(r.room_id) && !o1.doors.has(r.room_id)) notes.push(`${nameOf(before, r.room_id)} no longer has a door`);
        }
    }
    return notes;
}
