/**
 * The edit loop (feasibility study §4 step 7, §5 problem 3: "a new prompt mutates the existing
 * spec and re-renders only what changed — not a fresh house each time"). A follow-up prompt sends
 * the current brief to the AI step to change (ai-studio `currentBrief`); the edited brief keeps
 * the previous room ids; the planner starts from the previous plan (SolverOptions.warm_start); and
 * the page says what changed and how much of the plan stayed.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';

type BriefRoom = { room_id: string; name?: string; type?: string; floor?: number; area_m2?: number; adjacencies?: string[]; [k: string]: unknown };

/** The brief the AI step edits: the rooms and the brief's figures, without the plans drawn from them. */
export function briefForEdit(designPackage: any): { brief_reference: unknown; rooms: BriefRoom[] } | null {
    if (!Array.isArray(designPackage?.rooms) || !designPackage.rooms.length) return null;
    return { brief_reference: designPackage.brief_reference ?? null, rooms: designPackage.rooms };
}

const key = (r: BriefRoom) => `${String(r.name ?? '').trim().toLowerCase()}@${r.floor ?? 0}`;

/** The edited brief with the previous room ids kept: a room the AI gave a new id but the same name
 * on the same floor takes its old id (and every link to it follows), so the plan can keep it in place. */
export function alignToPrevious(prev: BriefRoom[], next: BriefRoom[]): BriefRoom[] {
    const prevIds = new Set(prev.map(r => r.room_id));
    const byKey = new Map(prev.map(r => [key(r), r.room_id]));
    const taken = new Set(next.filter(r => prevIds.has(r.room_id)).map(r => r.room_id));
    const rename = new Map<string, string>();
    for (const r of next) {
        if (prevIds.has(r.room_id)) continue;
        const old = byKey.get(key(r));
        if (old && !taken.has(old)) { rename.set(r.room_id, old); taken.add(old); }
    }
    if (!rename.size) return next;
    return next.map(r => ({ ...r, room_id: rename.get(r.room_id) ?? r.room_id, adjacencies: (r.adjacencies ?? []).map(a => rename.get(a) ?? a) }));
}

export interface BriefChange { kind: 'added' | 'removed' | 'resized' | 'moved'; name: string; detail?: string }

/** What an edit changed in the brief, in the user's terms. */
export function briefChanges(prev: BriefRoom[], next: BriefRoom[]): BriefChange[] {
    const was = new Map(prev.map(r => [r.room_id, r])), now = new Map(next.map(r => [r.room_id, r]));
    const out: BriefChange[] = [];
    const floorName = (f?: number) => !f ? 'ground floor' : f === 1 ? 'first floor' : `floor ${f}`;
    for (const r of next) {
        const p = was.get(r.room_id);
        const name = String(r.name ?? r.room_id);
        if (!p) { out.push({ kind: 'added', name, detail: r.area_m2 ? `${r.area_m2} m², ${floorName(r.floor)}` : floorName(r.floor) }); continue; }
        if ((p.floor ?? 0) !== (r.floor ?? 0)) out.push({ kind: 'moved', name, detail: `${floorName(p.floor)} to ${floorName(r.floor)}` });
        const a = Number(p.area_m2 ?? 0), b = Number(r.area_m2 ?? 0);
        if (a > 0 && Math.abs(b - a) > 0.05 * a) out.push({ kind: 'resized', name, detail: `${a} m² to ${b} m²` });
    }
    for (const p of prev) if (!now.has(p.room_id)) out.push({ kind: 'removed', name: String(p.name ?? p.room_id) });
    return out;
}

/** The share of the previous plan's rooms (kept in the brief) that stand where they stood: the same
 * floor and at least 80 % overlap with their old place. The hall, stairs and terraces aren't counted. */
export function roomsKept(prev: SolvedLayout | undefined, next: SolvedLayout | undefined, changed: Set<string>): { kept: number; of: number } | null {
    if (!prev?.placed_rooms?.length || !next?.placed_rooms?.length) return null;
    const iou = (a: any, b: any) => {
        const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x), h = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
        if (w <= 0 || h <= 0) return 0;
        const i = w * h; return i / (a.width * a.depth + b.width * b.depth - i);
    };
    const rooms = prev.placed_rooms.filter(r => !/^(corridor|stair|terrace|atrium|passage)/.test(r.room_id) && !changed.has(r.room_id)
        && next.placed_rooms.some(q => q.room_id === r.room_id));
    if (!rooms.length) return null;
    const kept = rooms.filter(r => { const q = next.placed_rooms.find(x => x.room_id === r.room_id && x.floor === r.floor); return !!q && iou(r, q) >= 0.8; }).length;
    return { kept, of: rooms.length };
}
