/**
 * Genuine Stuffs AI Studio - Structural Heuristics Engine
 * 
 * Derives the structural skeleton (columns and beams) from the
 * architectural SolvedLayout on the building's structural grid
 * (structural_grid.ts), sizing beams by span/depth ratio.
 */
import { SolvedLayout } from "../../../../supabase/functions/ai-studio/schema";
import complianceRules from "../compliance_rules.json";
import { structuralGridOf, MAX_BAY_M, type StructuralGrid } from "./structural_grid";
import { catalogueEntry } from "./engine_v2/room_catalogue";

/** The long-span system's range (owner's engine brief, capability D: portal
 * frame or steel truss, about 12–30 m clear). Beyond it a hall needs an
 * engineer's own scheme; the plan says so. */
export const LONG_SPAN_MAX_M = 30;

export interface Column {
    id: string;
    floor: number;
    x: number;
    y: number;
    width_m: number;
    depth_m: number;
}

export interface Beam {
    id: string;
    floor: number;
    /** primary: on a grid line, column to column; secondary: under an upper
     * wall off the grid, from one primary beam to the next. */
    kind: 'primary' | 'secondary' | 'long_span';
    /** What each end rests on: a column (primary) or a primary beam. */
    start_support_id: string;
    end_support_id: string;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    span_m: number;
    width_m: number;
    depth_m: number;
}

export interface StructuralSkeleton {
    columns: Column[];
    beams: Beam[];
    /** The building's grid (shared by every floor); null without a footprint. */
    grid: StructuralGrid | null;
    /** Each outbuilding's own grid, at its place in the house's frame. */
    outbuildings: Array<{ id: string; x: number; y: number; grid: StructuralGrid | null }>;
    /** Halls on the long-span system: columns only around them, a long-span
     * member across them on each grid line that crosses them. */
    halls: Array<{ room_id: string; floor: number; span_m: number; within_range: boolean; columns_above?: number }>;
}

/** Rooms the room catalogue marks long-span (auditorium, restaurant, overflow
 * hall) that the framed grid can't span: wider than its largest bay both ways.
 * A 6 m deep restaurant stays on the framed grid. */
export function longSpanRooms(layout: SolvedLayout) {
    const brief: any[] = (layout.program_reference as any)?.rooms ?? [];
    return layout.placed_rooms.filter(r => {
        if (Math.min(r.width, r.depth) <= MAX_BAY_M + 1e-6) return false;
        const src = brief.find(q => (q.room_id ?? q.id) === r.room_id);
        return !!src && !!catalogueEntry({ type: src.type, name: src.name })?.longSpan;
    });
}

export class StructuralEngine {

    /**
     * Columns at every intersection of the building's structural grid, the
     * same on every floor so they stack; beams along the grid lines at the
     * top of each storey (under the floor above, or the roof); a secondary
     * beam under each upper wall that stands on neither a grid line nor a
     * wall below, across the grid bay. Bays are 3.0–6.0 m, so no beam spans
     * more than the grid bay.
     */
    public generateSkeleton(layout: SolvedLayout): StructuralSkeleton {
        const columns: Column[] = [];
        const beams: Beam[] = [];
        const grid = structuralGridOf(layout);
        // Each outbuilding (BQ, generator house) is its own one-storey
        // building on its own grid, framed alone and moved into place.
        const obColumns: Column[] = [], obBeams: Beam[] = [];
        const outbuildings = (layout.outbuildings ?? []).map(b => {
            const own: SolvedLayout = {
                ...layout, outbuildings: undefined, building_width: b.width, building_depth: b.depth,
                placed_rooms: b.rooms.map(r => ({ ...r, x: r.x - b.x, y: r.y - b.y })),
            };
            const sk = this.generateSkeleton(own);
            const at = (id: string) => `${b.id}_${id}`;
            obColumns.push(...sk.columns.map(c => ({ ...c, id: at(c.id), x: c.x + b.x, y: c.y + b.y })));
            obBeams.push(...sk.beams.map(e => ({
                ...e, id: at(e.id), start_support_id: at(e.start_support_id), end_support_id: at(e.end_support_id),
                start_x: e.start_x + b.x, start_y: e.start_y + b.y, end_x: e.end_x + b.x, end_y: e.end_y + b.y,
            })));
            return { id: b.id, x: b.x, y: b.y, grid: sk.grid };
        });
        if (!grid) return { columns: obColumns, beams: obBeams, grid, outbuildings, halls: [] };

        const structParams = complianceRules.structural_parameters;
        const colWidth = structParams.beam_design.beam_width_mm / 1000;
        const ratio = structParams.beam_design.span_to_depth_ratio.simply_supported;
        const { xs, ys } = grid;

        // the structural-system selector (capability D): a long-span room stands clear of columns
        const longSpan = longSpanRooms(layout);
        const e = 1e-6;
        const inside = (h: { x: number; y: number; width: number; depth: number }, x: number, y: number) =>
            x > h.x + e && x < h.x + h.width - e && y > h.y + e && y < h.y + h.depth - e;
        const halls: StructuralSkeleton['halls'] = [];
        for (let floor = 0; floor < grid.floors; floor++) {
            const here = longSpan.filter(h => h.floor === floor);
            const at = new Map<string, Column>();
            for (const y of ys) for (const x of xs) {
                if (here.some(h => inside(h, x, y))) continue; // inside a hall: no column
                const c: Column = { id: `F${floor}_C${columns.length + 1}`, floor, x, y, width_m: colWidth, depth_m: colWidth };
                columns.push(c); at.set(`${x},${y}`, c);
            }
            const beam = (kind: Beam['kind'], from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }) => {
                const span = Math.hypot(to.x - from.x, to.y - from.y);
                const depthMm = Math.max(Math.ceil((span * 1000) / ratio / 50) * 50, 450);
                const b: Beam = {
                    id: `F${floor}_B${beams.length + 1}`, floor, kind,
                    start_support_id: from.id, end_support_id: to.id,
                    start_x: from.x, start_y: from.y, end_x: to.x, end_y: to.y,
                    span_m: span, width_m: colWidth, depth_m: depthMm / 1000,
                };
                beams.push(b); return b;
            };
            const along = new Map<string, Beam>(); // primary beams by line and bay start
            // a grid beam with an end inside a hall is replaced by the hall's long-span member on that line
            const cut = (a: { x: number; y: number }, b: { x: number; y: number }) => here.some(h => inside(h, a.x, a.y) || inside(h, b.x, b.y) || inside(h, (a.x + b.x) / 2, (a.y + b.y) / 2));
            for (const y of ys) for (let i = 0; i + 1 < xs.length; i++)
                if (!cut({ x: xs[i], y }, { x: xs[i + 1], y })) along.set(`h${y},${xs[i]}`, beam('primary', at.get(`${xs[i]},${y}`)!, at.get(`${xs[i + 1]},${y}`)!));
            for (const x of xs) for (let j = 0; j + 1 < ys.length; j++)
                if (!cut({ x, y: ys[j] }, { x, y: ys[j + 1] })) along.set(`v${x},${ys[j]}`, beam('primary', at.get(`${x},${ys[j]}`)!, at.get(`${x},${ys[j + 1]}`)!));
            // each hall: a column where a crossing grid line meets its walls, and one long-span
            // member (truss / portal frame) across the hall's short side on that line
            for (const h of here) {
                const acrossX = h.width <= h.depth; // members run across the short side
                const lines = (acrossX ? ys : xs).filter(v => acrossX ? v > h.y + e && v < h.y + h.depth - e : v > h.x + e && v < h.x + h.width - e);
                const edge = (x: number, y: number) => {
                    const k = `${x},${y}`;
                    if (!at.has(k)) { const c: Column = { id: `F${floor}_C${columns.length + 1}`, floor, x, y, width_m: colWidth, depth_m: colWidth }; columns.push(c); at.set(k, c); }
                    return at.get(k)!;
                };
                for (const v of lines) {
                    const a = acrossX ? edge(h.x, v) : edge(v, h.y), b = acrossX ? edge(h.x + h.width, v) : edge(v, h.y + h.depth);
                    beam('long_span', a, b);
                }
                const span = acrossX ? h.width : h.depth;
                halls.push({ room_id: h.room_id, floor, span_m: span, within_range: span <= LONG_SPAN_MAX_M + e });
            }
            // a secondary beam's ends land on the primary beams of the grid lines it spans between
            const bay = (lines: number[], v: number) => lines[Math.max(0, lines.findIndex((l, k) => k + 1 < lines.length && v >= l - 1e-9 && v < lines[k + 1] - 1e-9))];
            for (const s of grid.secondary) if (s.floor === floor) {
                const vertical = s.x1 === s.x2;
                const end = (x: number, y: number) => along.get(vertical ? `h${y},${bay(xs, x)}` : `v${x},${bay(ys, y)}`)!;
                beam('secondary', { id: end(s.x1, s.y1).id, x: s.x1, y: s.y1 }, { id: end(s.x2, s.y2).id, x: s.x2, y: s.y2 });
            }
        }

        // columns of the floors above standing over a hall need a transfer structure: counted, not hidden
        for (const h of halls) {
            const r = longSpan.find(q => q.room_id === h.room_id && q.floor === h.floor)!;
            const n = columns.filter(c => c.floor > h.floor && inside(r, c.x, c.y)).length;
            if (n) h.columns_above = n;
        }
        console.log(`[Structural Engine] Grid x ${xs.join('/')} m, y ${ys.join('/')} m: ${columns.length} columns and ${beams.length} beams (${grid.secondary.length} secondary) across ${grid.floors} floor(s).`);
        // the outbuildings' members after the house's, so house ids are unchanged
        return { columns: [...columns, ...obColumns], beams: [...beams, ...obBeams], grid, outbuildings, halls };
    }
}

export const structuralEngine = new StructuralEngine();

/** The plan with a note for each long-span hall that needs an engineer's eye:
 * a span beyond the long-span range, or columns of the floors above standing
 * over it (they need a transfer structure). Unchanged when there's none. */
export function withHallNotes(layout: SolvedLayout): SolvedLayout {
    if (!layout.placed_rooms?.length || !longSpanRooms(layout).length) return layout;
    const halls = structuralEngine.generateSkeleton(layout).halls;
    const brief: any[] = (layout.program_reference as any)?.rooms ?? [];
    const name = (id: string) => brief.find(q => (q.room_id ?? q.id) === id)?.name ?? id;
    const notes: NonNullable<SolvedLayout['placement_issues']> = [];
    for (const h of halls) {
        if (!h.within_range) notes.push({ room_id: h.room_id, rule: 'LONG_SPAN_OUT_OF_RANGE',
            detail: `${name(h.room_id)} needs a ${+h.span_m.toFixed(1)} m clear span, beyond the long-span range (portal frame or steel truss, up to about ${LONG_SPAN_MAX_M} m). It needs a structural engineer's own scheme, or a narrower hall.` });
        if (h.columns_above) notes.push({ room_id: h.room_id, rule: 'LONG_SPAN_TRANSFER',
            detail: `${h.columns_above} column${h.columns_above > 1 ? 's' : ''} of the floor${h.columns_above > 1 ? 's' : ''} above stand${h.columns_above > 1 ? '' : 's'} over ${name(h.room_id)}, which has no columns: they need a transfer structure (a deeper truss or a transfer beam). Confirm with a structural engineer.` });
    }
    return notes.length ? { ...layout, placement_issues: [...(layout.placement_issues ?? []), ...notes] } : layout;
}
