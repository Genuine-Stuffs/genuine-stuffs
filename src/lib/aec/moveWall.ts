/**
 * Move a wall on a drawn plan (the editing roadmap after swapping rooms, 2026-10-30): drag a wall
 * between rooms and the rooms on one side grow by what the other side gives, every room staying a
 * rectangle; no AI and no new search. A wall here runs between two crossings where walls meet on
 * both sides (a + in the plan); a T, where a room's wall runs on, can't be left behind, so the wall
 * runs on through it. The stair's walls stay where they are. What the move costs is said, as for a
 * swap (editNotes).
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { editNotes, restate, E } from './swapRooms';

/** A wall that can be moved: along x (`horizontal`, at y = `at`) or along y (at x = `at`), from
 * `from` to `to` m; the rooms on its low side (left or rear) and high side, and how far it can go
 * either way (m, every room on it kept at least MIN wide). */
export interface MovableWall {
    key: string; floor: number; horizontal: boolean; at: number; from: number; to: number;
    low: string[]; high: string[]; min: number; max: number;
}

/** The narrowest a room is left by a wall move, m. */
const MIN = 1.0;
const STEP = 0.5;
const FIXED = /^(stairwell|atrium_|terrace_light)/;

export function movableWalls(layout: SolvedLayout, floor: number): MovableWall[] {
    const rooms = layout.placed_rooms.filter(r => r.floor === floor);
    const out: MovableWall[] = [];
    for (const horizontal of [false, true]) {
        // along the wall (s) and across it (t)
        const s0 = (r: typeof rooms[0]) => horizontal ? r.x : r.y, s1 = (r: typeof rooms[0]) => horizontal ? r.x + r.width : r.y + r.depth;
        const t0 = (r: typeof rooms[0]) => horizontal ? r.y : r.x, t1 = (r: typeof rooms[0]) => horizontal ? r.y + r.depth : r.x + r.width;
        const lines = [...new Set(rooms.map(t1).map(v => Math.round(v * 1000) / 1000))];
        for (const at of lines) {
            const low = rooms.filter(r => Math.abs(t1(r) - at) < E), high = rooms.filter(r => Math.abs(t0(r) - at) < E);
            if (!low.length || !high.length) continue;
            // the stretches where rooms meet across the line, cut at each + (a room's end on both sides)
            const ends = (rs: typeof rooms) => rs.flatMap(r => [s0(r), s1(r)]);
            const covered = (v: number, rs: typeof rooms) => rs.some(r => s0(r) < v + E && s1(r) > v + E);
            const pts = [...new Set([...ends(low), ...ends(high)].map(v => Math.round(v * 1000) / 1000))].sort((p, q) => p - q);
            const cross = (v: number) => ends(low).some(u => Math.abs(u - v) < E) && ends(high).some(u => Math.abs(u - v) < E);
            let a: number | null = null;
            for (let k = 0; k < pts.length; k++) {
                const v = pts[k], on = k < pts.length - 1 && covered(v, low) && covered(v, high);
                if (a !== null && (cross(v) || !on)) {
                    const lo = low.filter(r => s0(r) > a! - E && s1(r) < v + E), hi = high.filter(r => s0(r) > a! - E && s1(r) < v + E);
                    // every room on the stretch lies within it (a room running past its end can't be moved with it)
                    const past = [...low, ...high].some(r => s0(r) < v - E && s1(r) > a! + E && (s0(r) < a! - E || s1(r) > v + E));
                    if (lo.length && hi.length && !past && ![...lo, ...hi].some(r => FIXED.test(r.room_id))) {
                        const min = Math.ceil((MIN - Math.min(...lo.map(r => t1(r) - t0(r)))) / STEP - E) * STEP;
                        const max = Math.floor((Math.min(...hi.map(r => t1(r) - t0(r))) - MIN) / STEP + E) * STEP;
                        if (min <= Math.min(0, max) && (max >= STEP - E || min <= -STEP + E)) out.push({
                            key: `${floor}:${horizontal ? 'h' : 'v'}:${at}:${a}`, floor, horizontal, at, from: a, to: v,
                            low: lo.map(r => r.room_id), high: hi.map(r => r.room_id), min, max,
                        });
                    }
                    a = null;
                }
                if (a === null && on) a = v;
            }
        }
    }
    return out;
}

export type WallMoveResult =
    | { ok: true; layout: SolvedLayout; sized: Map<string, number>; said: string; notes: string[] }
    | { ok: false; reason: string };

const nameOf = (layout: SolvedLayout, id: string) => String(layout.program_reference?.rooms?.find((r: any) => r.room_id === id)?.name ?? id);
const m2 = (r: { width: number; depth: number }) => Math.round(r.width * r.depth * 10) / 10;

/** The wall moved by `by` m (snapped to 0.5 m, within its reach): the low side's rooms grow by it, the high side's shrink. */
export function moveWall(layout: SolvedLayout, wall: MovableWall, by: number): WallMoveResult {
    const d = Math.max(wall.min, Math.min(wall.max, Math.round(by / STEP) * STEP));
    if (Math.abs(d) < E) return { ok: false, reason: 'The wall is where it was.' };
    const low = new Set(wall.low), high = new Set(wall.high);
    const placed = layout.placed_rooms.map(r => {
        if (r.floor !== wall.floor || (!low.has(r.room_id) && !high.has(r.room_id))) return r;
        if (wall.horizontal) return low.has(r.room_id) ? { ...r, depth: r.depth + d } : { ...r, y: r.y + d, depth: r.depth - d };
        return low.has(r.room_id) ? { ...r, width: r.width + d } : { ...r, x: r.x + d, width: r.width - d };
    });
    // the rooms on the wall are asked at their new sizes from here on (the brief and the search), so a
    // typed edit afterwards keeps the wall where the user put it: held at the brief's sizes, a
    // re-solve pulled 26 of 41 moved rooms back (duplex, 2026-10-30)
    const at = (L: SolvedLayout, id: string) => L.placed_rooms.find(r => r.room_id === id && r.floor === wall.floor)!;
    const sized = new Map([...wall.low, ...wall.high].map(id => [id, m2(placed.find(r => r.room_id === id && r.floor === wall.floor)!)]));
    const program_reference = layout.program_reference && { ...layout.program_reference, rooms: resized(layout.program_reference.rooms as any[], sized) };
    // a room the brief doesn't list (the hall, a terrace) keeps the search's own size, so its new rect is held as drawn
    const inBrief = new Map([...sized].filter(([id]) => (layout.program_reference?.rooms as any[] | undefined)?.some(r => r.room_id === id)));
    const next = restate(layout, { ...layout, placed_rooms: placed, ...(program_reference ? { program_reference } : {}) }, wall.floor, [...wall.low, ...wall.high], false, inBrief);
    const sizes = [...wall.low, ...wall.high].map(id => `${nameOf(layout, id)} ${m2(at(layout, id))} to ${m2(at(next, id))} m²`).join(', ');
    return { ok: true, layout: next, sized, said: `Wall moved ${Math.abs(d)} m: ${sizes}`, notes: editNotes(layout, next, [wall.floor], new Set(sized.keys())) };
}

/** The brief's rooms with those in `sized` at their new areas (m²). */
export function resized<T extends { room_id?: string; area_m2?: number }>(rooms: T[] | undefined, sized: Map<string, number>): T[] | undefined {
    return rooms?.map(r => r.room_id && sized.has(r.room_id) ? { ...r, area_m2: sized.get(r.room_id)! } : r);
}
