/**
 * Genuine Stuffs AI Studio · Solver V2 · Room Adjacency Graph
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 1 · STEP 1 · July 2026
 *
 * The Hive already returns a complete adjacency graph per room
 * ("adjacencies": ["r02", "r03", ...]) plus a structured "type" field
 * ("foyer", "living_room", "kitchen", "bedroom", "bathroom", "wardrobe",
 * "garage", "void", "circulation", etc). Every classification bug this
 * sprint traced back to ignoring both of these and re-deriving weaker
 * signals from fuzzy name-matching instead.
 *
 * This module is the single source of truth for:
 *   1. Classification — by Hive "type" first, label keywords as fallback
 *   2. Hub detection — structural (by degree), not regex
 *   3. Suite derivation — from actual bedroom↔bath/wardrobe edges
 *   4. Must-touch pairs — from actual edges, for the placement rewrite
 *
 * Zero dependencies on treemap.ts, zones.ts, or any placement code.
 * Building on top of this is Phase 1 Step 2 (placement rewrite) — NOT
 * part of this commit. This file only builds and exposes the graph.
 * ═══════════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────────────
// Input shape (matches Hive payload)
// ──────────────────────────────────────────────────────────────────────────

export interface HiveRoom {
    room_id: string;
    name?: string;
    type?: string;
    floor: number;
    area_m2?: number;
    width_m?: number;
    span_m?: number;
    adjacencies?: string[];
    uses_intermediate_columns?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// Zone classification — Hive "type" is authoritative
// ──────────────────────────────────────────────────────────────────────────

export type ZoneType = 'social' | 'service' | 'private' | 'circ';

// Direct type → zone mapping. Covers every "type" value observed in real
// Hive payloads across this sprint's test briefs.
const TYPE_TO_ZONE: Record<string, ZoneType> = {
    foyer:          'social',
    living_room:    'social',
    dining_room:    'social',
    family_room:    'social',
    entertainment:  'social',
    kitchen:        'service',
    utility:        'service',
    garage:         'service',
    laundry:        'service',
    store:          'service',
    boiler_room:    'service',
    bedroom:        'private',
    master_bedroom: 'private',
    bathroom:       'private',
    wardrobe:       'private',
    dressing:       'private',
    office:         'private',
    study:          'private',
    void:           'circ',
    circulation:    'circ',
    hall:           'circ',
    landing:        'circ',
    stairwell:      'circ',
};

// Fallback keyword lists — only consulted when "type" is missing or
// unrecognised. Kept intentionally small; the Hive's "type" field should
// cover the overwhelming majority of cases going forward.
const LABEL_FALLBACK: Array<[ZoneType, string[]]> = [
    ['circ',    ['corridor', 'hall', 'landing', 'stairwell', 'stair', 'void']],
    ['social',  ['living', 'lounge', 'dining', 'foyer', 'family', 'entry',
                 'reception', 'great', 'sunken', 'terrace', 'veranda',
                 'verandah', 'balcony', 'patio', 'loggia']],
    ['service', ['kitchen', 'pantry', 'wet', 'laundry', 'garage', 'utility',
                 'store', 'boiler']],
    ['private', ['bedroom', 'master', 'bath', 'wc', 'toilet', 'shower',
                 'wardrobe', 'dressing', 'ensuite', 'en-suite', 'study',
                 'office', 'guest']],
];

export function classifyRoom(room: { type?: string; name?: string; room_id: string }): ZoneType {
    const t = room.type?.toLowerCase().trim();
    if (t && TYPE_TO_ZONE[t]) return TYPE_TO_ZONE[t];

    // Fallback: label keywords (name, then room_id)
    const label = (room.name ?? room.room_id).toLowerCase();
    for (const [zone, keywords] of LABEL_FALLBACK) {
        if (keywords.some(k => label.includes(k))) return zone;
    }

    console.warn(
        `[SOLVER_V2] classifyRoom: no "type" match and no label match for ` +
        `"${room.name ?? room.room_id}" (type="${room.type ?? 'none'}") — defaulting to private`
    );
    return 'private';
}

// ──────────────────────────────────────────────────────────────────────────
// Graph structure
// ──────────────────────────────────────────────────────────────────────────

export interface GraphNode {
    id: string;
    label: string;
    type: string;
    zone: ZoneType;
    floor: number;
    area: number;
    width: number;
    span: number;
    neighbors: Set<string>;
    degree: number;
    usesIntermediateColumns: boolean;
}

export interface RoomGraph {
    nodes: Map<string, GraphNode>;
    floors: Map<number, string[]>;
}

/**
 * Build a bidirectional graph from Hive rooms. The Hive's adjacency lists
 * are not guaranteed symmetric (e.g. r06 → r07 might be listed but r07 → r06
 * omitted) — this normalises both directions so degree and neighbour
 * lookups are always reliable regardless of which side declared the edge.
 */
export function buildGraph(rooms: HiveRoom[]): RoomGraph {
    const nodes = new Map<string, GraphNode>();
    const floors = new Map<number, string[]>();

    for (const r of rooms) {
        const zone = classifyRoom(r);
        nodes.set(r.room_id, {
            id:        r.room_id,
            label:     r.name ?? r.room_id,
            type:      r.type ?? 'unknown',
            zone,
            floor:     r.floor ?? 0,
            area:      r.area_m2 ?? 9.0,
            width:     r.width_m ?? Math.sqrt(r.area_m2 ?? 9.0),
            span:      r.span_m  ?? r.width_m ?? Math.sqrt(r.area_m2 ?? 9.0),
            neighbors: new Set(r.adjacencies ?? []),
            degree:    0, // computed after symmetrisation, below
            usesIntermediateColumns: r.uses_intermediate_columns ?? false,
        });
        const floorList = floors.get(r.floor ?? 0) ?? [];
        floorList.push(r.room_id);
        floors.set(r.floor ?? 0, floorList);
    }

    // Symmetrise: if A → B exists, ensure B → A exists too.
    for (const node of nodes.values()) {
        for (const neighborId of node.neighbors) {
            const neighbor = nodes.get(neighborId);
            if (neighbor && !neighbor.neighbors.has(node.id)) {
                neighbor.neighbors.add(node.id);
            }
        }
    }

    // Degree computed after symmetrisation so it reflects the true graph.
    for (const node of nodes.values()) {
        node.degree = node.neighbors.size;
    }

    return { nodes, floors };
}

// ──────────────────────────────────────────────────────────────────────────
// Hub detection — structural, not regex
// ──────────────────────────────────────────────────────────────────────────

/**
 * A hub is a room that many other rooms connect to directly — the foyer
 * on a ground floor, the family lounge on an upper floor. Detected purely
 * by degree within its own floor, so it works regardless of what the room
 * happens to be named.
 */
export function identifyHubs(
    graph: RoomGraph,
    floorIndex: number,
    minDegree: number = 3
): GraphNode[] {
    const ids = graph.floors.get(floorIndex) ?? [];
    return ids
        .map(id => graph.nodes.get(id)!)
        .filter(n => n.zone !== 'circ' && n.degree >= minDegree)
        .sort((a, b) => b.degree - a.degree);
}

// ──────────────────────────────────────────────────────────────────────────
// Suite derivation — from real edges, not name matching
// ──────────────────────────────────────────────────────────────────────────

export interface Suite {
    bedroomId: string;
    subIds: string[];
    totalArea: number;
}

const SUB_ROOM_TYPES = new Set(['bathroom', 'wardrobe', 'dressing']);
const BEDROOM_TYPES  = new Set(['bedroom', 'master_bedroom']);

/**
 * A sub-room (bath/wardrobe) belongs to whichever bedroom it is connected
 * to. In practice these sub-rooms have degree 1 — the Hive only ever lists
 * their parent bedroom as a neighbour — which makes the pairing
 * unambiguous. This replaces buildSuites()'s numeric-suffix and
 * "master"-keyword guessing entirely.
 */
export function deriveSuites(graph: RoomGraph, floorIndex: number): Suite[] {
    const ids = graph.floors.get(floorIndex) ?? [];
    const bedrooms = ids
        .map(id => graph.nodes.get(id)!)
        .filter(n => BEDROOM_TYPES.has(n.type) || (n.zone === 'private' && classifyByBedroomLabel(n.label)));

    const suites: Suite[] = bedrooms.map(bed => {
        const subs: string[] = [];
        for (const neighborId of bed.neighbors) {
            const neighbor = graph.nodes.get(neighborId);
            if (!neighbor) continue;
            const isSubType = SUB_ROOM_TYPES.has(neighbor.type) ||
                (neighbor.type === 'unknown' && classifyBySubLabel(neighbor.label));
            if (isSubType) subs.push(neighbor.id);
        }
        const totalArea = bed.area + subs.reduce((s, id) => s + (graph.nodes.get(id)?.area ?? 0), 0);
        return { bedroomId: bed.id, subIds: subs, totalArea };
    });

    return suites;
}

// Fallback label checks — only used when "type" is "unknown" (missing
// from payload). Kept minimal; the Hive normally supplies "type" for
// every room, so this path should rarely fire in production.
function classifyByBedroomLabel(label: string): boolean {
    const lo = label.toLowerCase();
    return lo.includes('bedroom') || lo.includes('master');
}
function classifyBySubLabel(label: string): boolean {
    const lo = label.toLowerCase();
    return ['bath', 'wc', 'toilet', 'shower', 'wardrobe', 'dressing', 'ensuite', 'en-suite']
        .some(k => lo.includes(k));
}

// ──────────────────────────────────────────────────────────────────────────
// Must-touch pairs — for the upcoming placement rewrite
// ──────────────────────────────────────────────────────────────────────────

export interface AdjacencyPair {
    a: string;
    b: string;
}

/**
 * Every edge in the graph that isn't already captured by a suite pairing
 * and doesn't involve a hub (hubs connect to nearly everything by design,
 * so they don't need a dedicated "must touch" placement rule — they're
 * handled separately as anchors). What's left is the meaningful residual:
 * kitchen↔dining, foyer↔corridor, etc. This is the exact list the
 * placement rewrite (Phase 1 Step 2) will use to keep must-adjacent rooms
 * next to each other, instead of leaving it to chance the way squarify()
 * currently does.
 */
export function findMustTouchPairs(
    graph: RoomGraph,
    floorIndex: number,
    hubIds: Set<string>,
    suiteEdges: Set<string>
): AdjacencyPair[] {
    const ids = graph.floors.get(floorIndex) ?? [];
    const seen = new Set<string>();
    const pairs: AdjacencyPair[] = [];

    for (const id of ids) {
        const node = graph.nodes.get(id)!;
        if (hubIds.has(id) || node.zone === 'circ') continue;

        for (const neighborId of node.neighbors) {
            if (hubIds.has(neighborId)) continue;
            const key = [id, neighborId].sort().join('|');
            if (seen.has(key) || suiteEdges.has(key)) continue;
            seen.add(key);
            pairs.push({ a: id, b: neighborId });
        }
    }
    return pairs;
}

/** Helper: build the set of "a|b" keys already consumed by suite pairings,
 * so findMustTouchPairs() doesn't duplicate work the suite logic already did. */
export function suiteEdgeKeys(suites: Suite[]): Set<string> {
    const keys = new Set<string>();
    for (const s of suites) {
        for (const sub of s.subIds) {
            keys.add([s.bedroomId, sub].sort().join('|'));
        }
    }
    return keys;
}
