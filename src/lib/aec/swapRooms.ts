/**
 * Swap two rooms on a drawn plan (owner 2026-10-30: "move the terrace between the family lounge and
 * the master suite", typed, redrew the house or silently kept it). The two rooms trade places,
 * each taking the other's rectangle, so the floor keeps every wall and has no gap or overlap; no AI
 * and no new search. A bedroom takes its en-suite with it. The plan's search (search_state)
 * follows, so a typed edit afterwards starts from the swapped plan. What the swap costs is said,
 * never left for the user to find: the sizes the rooms now have against the brief, a room that
 * lost its window or its door.
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

/** The en-suite the brief gives bedroom `id` (a bathroom or toilet linked to it, either way) that shares a wall with it on the floor now. */
function suiteOf(layout: SolvedLayout, id: string, floor: number): string | null {
    const brief: any[] = (layout.program_reference?.rooms as any[]) ?? [];
    const room = brief.find(r => r.room_id === id);
    if (!room || !/bed/i.test(String(room.type ?? ''))) return null;
    const at = (x: string) => layout.placed_rooms.find(r => r.room_id === x && r.floor === floor);
    const me = at(id);
    if (!me) return null;
    for (const r of brief) {
        if (r.room_id === id || !/bath|toilet|wc|shower|en.?suite/i.test(String(r.type ?? ''))) continue;
        const linked = (r.adjacencies ?? []).includes(id) || (room.adjacencies ?? []).includes(r.room_id);
        const q = at(r.room_id);
        if (linked && q && wallOf(me, q) >= 1 - 1e-6) return r.room_id;
    }
    return null;
}

type Box = { x: number; y: number; width: number; depth: number };
const E = 1e-6;
/** The shared wall of two rooms, m (0 when they don't touch). */
function wallOf(p: Box, q: Box): number {
    const ov = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1);
    if (Math.abs(p.x + p.width - q.x) < E || Math.abs(q.x + q.width - p.x) < E) return ov(p.y, p.y + p.depth, q.y, q.y + q.depth);
    if (Math.abs(p.y + p.depth - q.y) < E || Math.abs(q.y + q.depth - p.y) < E) return ov(p.x, p.x + p.width, q.x, q.x + q.width);
    return 0;
}
/** Two rooms' union when it is one rectangle (side by side with the same depth, or stacked with the same width). */
function unionOf(p: Box, q: Box): Box | null {
    const x0 = Math.min(p.x, q.x), y0 = Math.min(p.y, q.y), x1 = Math.max(p.x + p.width, q.x + q.width), y1 = Math.max(p.y + p.depth, q.y + q.depth);
    if (Math.abs((x1 - x0) * (y1 - y0) - p.width * p.depth - q.width * q.depth) > E || wallOf(p, q) < E) return null;
    return { x: x0, y: y0, width: x1 - x0, depth: y1 - y0 };
}

export function swapRooms(layout: SolvedLayout, a: string, b: string, floor: number): SwapResult {
    if (a === b) return { ok: false, reason: 'Pick two different rooms.' };
    const ia = layout.placed_rooms.findIndex(r => r.room_id === a && r.floor === floor);
    const ib = layout.placed_rooms.findIndex(r => r.room_id === b && r.floor === floor);
    if (ia < 0 || ib < 0) return { ok: false, reason: 'Both rooms must be on the same floor.' };
    for (const id of [a, b]) if (!swappable(layout, id)) return { ok: false, reason: `${nameOf(layout, id)} holds the plan together (stairs, halls and landings stay where they are).` };
    // a bedroom takes its en-suite with it (owner 2026-10-30): two bedrooms with en-suites trade both
    // rooms; a bedroom and its en-suite trade with one room (moveSuite)
    const ea = suiteOf(layout, a, floor), eb = suiteOf(layout, b, floor);
    if (ea && eb && ea !== b && eb !== a) {
        const next = trade(layout, [[a, b], [ea, eb]], floor);
        return { ok: true, layout: next, said: `${nameOf(layout, a)} and ${nameOf(layout, b)} swapped places, each with its en-suite`, notes: editNotes(layout, next, [floor]) };
    }
    const [x, e, y] = ea && ea !== b ? [a, ea, b] : eb && eb !== a ? [b, eb, a] : [a, null, b];
    if (e) {
        const moved = moveSuite(layout, x, e, y, floor);
        if (moved) {
            const took = moved.grown.length ? `; ${moved.grown.map(id => nameOf(layout, id)).join(' and ')} took the en-suite's old place` : '';
            return { ok: true, layout: moved.layout, said: `${nameOf(layout, x)} and its en-suite swapped places with ${nameOf(layout, y)}${took}`, notes: editNotes(layout, moved.layout, [floor]) };
        }
    }
    const next = trade(layout, [[a, b]], floor);
    return { ok: true, layout: next, said: `${nameOf(layout, a)} and ${nameOf(layout, b)} swapped places`, notes: editNotes(layout, next, [floor]) };
}

/** Each pair of rooms trades rectangles; the search's leaves follow the rooms (each place in the
 * floor's tree now holds the other room) and every moved room is pinned. */
function trade(layout: SolvedLayout, pairs: Array<[string, string]>, floor: number): SolvedLayout {
    const at = new Map(layout.placed_rooms.map((r, i) => [r.floor === floor ? r.room_id : '', i]));
    const placed = [...layout.placed_rooms];
    for (const [p, q] of pairs) {
        const P = layout.placed_rooms[at.get(p)!], Q = layout.placed_rooms[at.get(q)!];
        placed[at.get(p)!] = { ...P, x: Q.x, y: Q.y, width: Q.width, depth: Q.depth };
        placed[at.get(q)!] = { ...Q, x: P.x, y: P.y, width: P.width, depth: P.depth };
    }
    const ss = layout.search_state;
    const search_state = ss && {
        ...ss, floors: ss.floors.map(f => {
            if (f.floor !== floor || pairs.some(([p, q]) => !f.ids.includes(p) || !f.ids.includes(q))) return f;
            const ids = [...f.ids];
            for (const [p, q] of pairs) { const kp = f.ids.indexOf(p), kq = f.ids.indexOf(q); [ids[kp], ids[kq]] = [ids[kq], ids[kp]]; }
            // held where the user put them when the plan is refined (Fit sizes, a typed edit), their sizes free
            const pinned = [...new Set([...(f.pinned ?? []), ...pairs.flat()])];
            return { ...f, ids, pinned };
        }),
    };
    return { ...layout, placed_rooms: placed, ...(search_state ? { search_state } : {}) };
}

/** Bedroom x and its en-suite e trade places with room y: y takes their rectangle, and y's is cut
 * in two for them, the en-suite keeping its share of the pair, the cut whichever way costs the
 * fewest notes (a lost window, door or link), then the squarer rooms. When the two make an L, y
 * takes the bedroom's place and the en-suite's goes to the rooms along one of its sides, each
 * stretched across it (not the stair), those rooms also refitted by Fit sizes. The floor's tree is
 * redrawn from the rectangles, so Fit sizes and a typed edit carry on from here. With the plan,
 * the rooms that took the en-suite's place; null when no side can take it or y's place can't be cut. */
function moveSuite(layout: SolvedLayout, x: string, e: string, y: string, floor: number): { layout: SolvedLayout; grown: string[] } | null {
    const idx = (id: string) => layout.placed_rooms.findIndex(r => r.room_id === id && r.floor === floor);
    const X = layout.placed_rooms[idx(x)], S = layout.placed_rooms[idx(e)];
    const U = unionOf(X, S);
    // the L: the rooms along each side of the en-suite that span it exactly, each stretched over its place
    const takers: Array<Map<number, Box>> = U ? [new Map()] : (['N', 'S', 'W', 'E'] as const).flatMap(side => {
        const across = side === 'N' || side === 'S';
        const row = layout.placed_rooms.map((r, i) => i).filter(i => {
            const r = layout.placed_rooms[i];
            if (r.floor !== floor || i === idx(e)) return false;
            const touch = side === 'N' ? Math.abs(r.y + r.depth - S.y) < E : side === 'S' ? Math.abs(r.y - S.y - S.depth) < E
                : side === 'W' ? Math.abs(r.x + r.width - S.x) < E : Math.abs(r.x - S.x - S.width) < E;
            const [lo, hi, a, b] = across ? [r.x, r.x + r.width, S.x, S.x + S.width] : [r.y, r.y + r.depth, S.y, S.y + S.depth];
            return touch && Math.min(hi, b) - Math.max(lo, a) > E;
        });
        const span = (i: number) => { const r = layout.placed_rooms[i]; return across ? [r.x, r.x + r.width] : [r.y, r.y + r.depth]; };
        const [a, b] = across ? [S.x, S.x + S.width] : [S.y, S.y + S.depth];
        if (!row.length || row.some(i => span(i)[0] < a - E || span(i)[1] > b + E || /^(stairwell|atrium_|terrace_light)/.test(layout.placed_rooms[i].room_id))) return [];
        if (Math.abs(row.reduce((t, i) => t + span(i)[1] - span(i)[0], 0) - (b - a)) > E) return [];
        return [new Map(row.map(i => {
            const r = layout.placed_rooms[i];
            const g: Box = side === 'N' ? { x: r.x, y: r.y, width: r.width, depth: r.depth + S.depth } : side === 'S' ? { x: r.x, y: S.y, width: r.width, depth: r.depth + S.depth }
                : side === 'W' ? { x: r.x, y: r.y, width: r.width + S.width, depth: r.depth } : { x: S.x, y: r.y, width: r.width + S.width, depth: r.depth };
            return [i, g];
        }))];
    });
    const share = (S.width * S.depth) / (X.width * X.depth + S.width * S.depth), CELL = 0.5;
    let best: { L: SolvedLayout; c: number; grown: number[] } | null = null;
    for (const grow of takers) for (const across of [true, false]) for (const suiteFirst of [true, false]) {
        const box = (i: number): Box => { const r = layout.placed_rooms[i]; return grow.get(i) ?? { x: r.x, y: r.y, width: r.width, depth: r.depth }; };
        const Y = box(idx(y)), home = U ?? box(idx(x));
        const len = across ? Y.width : Y.depth;
        if (len < 2 * CELL - E) continue;
        const cut = Math.min(len - CELL, Math.max(CELL, Math.round((suiteFirst ? share : 1 - share) * len / CELL) * CELL));
        const first = across ? { x: Y.x, y: Y.y, width: cut, depth: Y.depth } : { x: Y.x, y: Y.y, width: Y.width, depth: cut };
        const second = across ? { x: Y.x + cut, y: Y.y, width: Y.width - cut, depth: Y.depth } : { x: Y.x, y: Y.y + cut, width: Y.width, depth: Y.depth - cut };
        const [rs, rx] = suiteFirst ? [first, second] : [second, first];
        const placed = layout.placed_rooms.map((r, i) => i === idx(y) ? { ...r, ...home } : i === idx(x) ? { ...r, ...rx } : i === idx(e) ? { ...r, ...rs }
            : grow.has(i) ? { ...r, ...grow.get(i)! } : r);
        const L = { ...layout, placed_rooms: placed };
        const sq = (r: Box) => Math.max(r.width / r.depth, r.depth / r.width);
        const c = editNotes(layout, L, [floor]).length * 100 + sq(rx) + sq(rs);
        if (!best || c < best.c) best = { L, c, grown: [...grow.keys()] };
    }
    if (!best) return null;
    const grown = best.grown.map(i => layout.placed_rooms[i].room_id).filter(id => id !== x && id !== y);
    const moved = [x, e, y, ...grown];
    const ss = layout.search_state;
    if (!ss) return { layout: best.L, grown };
    const search_state = {
        ...ss, floors: ss.floors.map(f => {
            if (f.floor !== floor || !moved.every(id => f.ids.includes(id))) return f;
            // each leaf's rect in cells, from where its room now stands (the floor's origin read off a room that didn't move)
            const t0 = f.ids.findIndex(id => !moved.includes(id) && idx(id) >= 0);
            if (t0 < 0) return f;
            const R0 = layout.placed_rooms[idx(f.ids[t0])], ox = R0.x - f.rects[t0].x * CELL, oy = R0.y - f.rects[t0].y * CELL;
            const rects = f.ids.map((id, t) => {
                if (!moved.includes(id)) return f.rects[t];
                const r = best!.L.placed_rooms[idx(id)];
                return { x: Math.round((r.x - ox) / CELL), y: Math.round((r.y - oy) / CELL), w: Math.round(r.width / CELL), h: Math.round(r.depth / CELL) };
            });
            const tree = treeOf(rects, f.areas ?? rects.map(q => q.w * q.h));
            if (!tree) return f;
            return { ...f, ...tree, rects, pinned: [...new Set([...(f.pinned ?? []), ...moved])] };
        }),
    };
    return { layout: { ...best.L, search_state }, grown };
}

/** A slicing tree (postfix, H -1 stacked, V -2 side by side, as gapfree/slice.ts) for leaf rects
 * that tile their bounding box, each cut's nudge (offs) set so the tree drawn at `areas` gives
 * these rects exactly; the last cut first, so a run of cuts reads left to right. Null when no
 * straight cut divides some part (the rects aren't a slicing plan). */
function treeOf(rects: Array<{ x: number; y: number; w: number; h: number }>, areas: number[]): { expr: number[]; offs: number[] } | null {
    const expr: number[] = [], offs: number[] = [];
    const go = (ls: number[]): number => {
        if (ls.length === 1) { expr.push(ls[0]); offs.push(0); return areas[ls[0]]; }
        const x0 = Math.min(...ls.map(t => rects[t].x)), y0 = Math.min(...ls.map(t => rects[t].y));
        const x1 = Math.max(...ls.map(t => rects[t].x + rects[t].w)), y1 = Math.max(...ls.map(t => rects[t].y + rects[t].h));
        for (const op of [-2, -1]) {
            const lo = op === -2 ? x0 : y0, hi = op === -2 ? x1 : y1;
            const at = (t: number) => op === -2 ? [rects[t].x, rects[t].x + rects[t].w] : [rects[t].y, rects[t].y + rects[t].h];
            const cuts = [...new Set(ls.map(t => at(t)[1]))].filter(c => c > lo && c < hi && ls.every(t => at(t)[1] <= c || at(t)[0] >= c)).sort((p, q) => q - p);
            if (!cuts.length) continue;
            const c = cuts[0], A = ls.filter(t => at(t)[1] <= c), B = ls.filter(t => at(t)[0] >= c);
            const aa = go(A), ba = go(B);
            if (aa < 0 || ba < 0) return -1;
            expr.push(op); offs.push((c - lo) - Math.round((hi - lo) * aa / (aa + ba)));
            return aa + ba;
        }
        return -1;
    };
    return go(rects.map((_, t) => t)) < 0 ? null : { expr, offs };
}

/** What a hand edit (a swap, Fit sizes) cost on the given floors, plan before against plan after: a room
 * whose size changed and is now more than 15 % off the brief, a link of the brief that had a shared
 * wall and lost it (an en-suite away from its bedroom), a room that lost its window or its door. */
export function editNotes(before: SolvedLayout, after: SolvedLayout, floors: number[]): string[] {
    const notes: string[] = [];
    const brief: any[] = (before.program_reference?.rooms as any[]) ?? [];
    const asked = (id: string) => Number(brief.find(r => r.room_id === id)?.area_m2) || 0;
    const at = (L: SolvedLayout, id: string, f: number) => L.placed_rooms.find(r => r.room_id === id && r.floor === f);
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
            if (!p0 || !q0 || !p1 || !q1 || wallOf(p0, q0) < 1 - E || wallOf(p1, q1) >= 1 - E) continue;
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
