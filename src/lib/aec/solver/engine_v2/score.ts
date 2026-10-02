/**
 * Genuine Stuffs AI Studio · Solver V3 · Layout Scoring
 * ═══════════════════════════════════════════════════════════════════════
 * Master plan v1.0, Phase 5 rubric (FINAL weights). Ranks complete
 * layouts so the UI can offer the best few options first. Every
 * sub-score is 0–100; the composite is their weighted sum.
 *
 *   0.30  Area fidelity   100 − mean(|placed − target| ÷ target × 100)
 *   0.25  Adjacency       satisfied declared adjacencies ÷ declared × 100
 *   0.20  Compactness     mean aspect score: 100 at 1:1, 0 at 3:1
 *   0.15  Window quality  mean perimeter contact ÷ shorter side × 100,
 *                         capped, over rooms that need a window
 *   0.10  Circulation     hub's shared wall ÷ hub perimeter × 100, capped
 *
 * Perimeter is measured against the building's bounding box
 * (building_width/depth), the same convention as harness I1/I5.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PlacedRoom, SolvedLayout } from '../../../../../supabase/functions/ai-studio/schema';
import { RoomGraph, NO_WINDOW_TYPES, identifyHubs } from './graph';

export interface LayoutScore {
    total: number;
    area: number;
    adjacency: number;
    compactness: number;
    window: number;
    circulation: number;
}

/** Shared walls shorter than this don't count as adjacent (D5: 2 cells). */
const MIN_SHARED_WALL_M = 1.0;
const EPS = 0.01;

const clamp100 = (v: number) => Math.max(0, Math.min(100, v));
const mean = (xs: number[], empty: number) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : empty;
const overlap1d = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** Length of wall two rooms on the same floor share (0 if they don't touch). */
export function sharedWall_m(a: PlacedRoom, b: PlacedRoom): number {
    if (a.floor !== b.floor) return 0;
    const touchX = Math.abs(a.x + a.width - b.x) < EPS || Math.abs(b.x + b.width - a.x) < EPS;
    const touchY = Math.abs(a.y + a.depth - b.y) < EPS || Math.abs(b.y + b.depth - a.y) < EPS;
    if (touchX) return overlap1d(a.y, a.y + a.depth, b.y, b.y + b.depth);
    if (touchY) return overlap1d(a.x, a.x + a.width, b.x, b.x + b.width);
    return 0;
}

/** Length of the room's walls lying on the building's bounding box. */
function perimeterContact_m(r: PlacedRoom, w: number, h: number): number {
    let len = 0;
    if (r.x < EPS) len += r.depth;
    if (Math.abs(r.x + r.width - w) < EPS) len += r.depth;
    if (r.y < EPS) len += r.width;
    if (Math.abs(r.y + r.depth - h) < EPS) len += r.width;
    return len;
}

function areaScore(rooms: PlacedRoom[], graph: RoomGraph): number {
    const errs = rooms.flatMap(r => {
        const target = graph.nodes.get(r.room_id)?.area ?? 0;
        return target > 0 ? [Math.abs(r.width * r.depth - target) / target * 100] : [];
    });
    return clamp100(100 - mean(errs, 0));
}

function adjacencyScore(byId: Map<string, PlacedRoom>, graph: RoomGraph): number {
    let declared = 0, satisfied = 0;
    for (const node of graph.nodes.values()) {
        for (const other of node.neighbors) {
            if (other <= node.id) continue; // each undirected edge once
            const a = byId.get(node.id), b = byId.get(other);
            if (!a || !b || a.floor !== b.floor) continue; // cross-floor or unplaced: not a wall question
            declared++;
            if (sharedWall_m(a, b) >= MIN_SHARED_WALL_M) satisfied++;
        }
    }
    return declared === 0 ? 100 : satisfied / declared * 100;
}

function compactnessScore(rooms: PlacedRoom[]): number {
    return mean(rooms.map(r => {
        const ratio = Math.max(r.width, r.depth) / Math.max(EPS, Math.min(r.width, r.depth));
        return clamp100(100 * (1 - (ratio - 1) / 2));
    }), 100);
}

function windowScore(rooms: PlacedRoom[], graph: RoomGraph, w: number, h: number): number {
    const needing = rooms.filter(r => {
        const n = graph.nodes.get(r.room_id);
        return n && n.zone !== 'circ' && !NO_WINDOW_TYPES.has(n.type);
    });
    return mean(needing.map(r =>
        clamp100(perimeterContact_m(r, w, h) / Math.max(EPS, Math.min(r.width, r.depth)) * 100)), 100);
}

function circulationScore(layout: SolvedLayout, graph: RoomGraph): number {
    const floors = [...new Set(layout.placed_rooms.map(r => r.floor))];
    const perHub = floors.flatMap(f => identifyHubs(graph, f).flatMap(hub => {
        const h = layout.placed_rooms.find(r => r.room_id === hub.id);
        if (!h) return [];
        const shared = layout.placed_rooms.reduce((s, r) => r === h ? s : s + sharedWall_m(h, r), 0);
        return [clamp100(shared / (2 * (h.width + h.depth)) * 100)];
    }));
    return mean(perHub, 100);
}

/**
 * Score a complete layout against the Phase 5 rubric.
 * Inputs: a SOLVED/SOLVED_RELAXED layout and the room graph it was solved from.
 * Output: composite and sub-scores, each 0–100, rounded to one decimal.
 * Failure behaviour: never throws; a layout with no placed graph rooms
 * scores on neutral defaults (100 for empty sub-scores, 0 area error).
 */
export function scoreLayout(layout: SolvedLayout, graph: RoomGraph): LayoutScore {
    const rooms = layout.placed_rooms.filter(r => graph.nodes.has(r.room_id));
    const byId = new Map(rooms.map(r => [r.room_id, r]));
    const w = layout.building_width ?? layout.plot_width;
    const h = layout.building_depth ?? layout.plot_depth;
    const parts = {
        area: areaScore(rooms, graph),
        adjacency: adjacencyScore(byId, graph),
        compactness: compactnessScore(rooms),
        window: windowScore(rooms, graph, w, h),
        circulation: circulationScore(layout, graph),
    };
    const total = 0.30 * parts.area + 0.25 * parts.adjacency + 0.20 * parts.compactness
        + 0.15 * parts.window + 0.10 * parts.circulation;
    const r1 = (v: number) => Math.round(v * 10) / 10;
    return {
        total: r1(total), area: r1(parts.area), adjacency: r1(parts.adjacency),
        compactness: r1(parts.compactness), window: r1(parts.window), circulation: r1(parts.circulation),
    };
}
