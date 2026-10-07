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

/** The Hive's "type" is free text: the same room arrives as
 * "master_bedroom" in one payload and "master bedroom" in the next
 * (hive-004/005). Every lookup table here is keyed snake_case, so an
 * unnormalized "master bedroom" silently missed BEDROOM_TYPES — the
 * master suite was never derived and its bath/wardrobe became
 * free-standing rooms the placer had to fit separately. Short forms the
 * Hive also emits ("living", "dining") alias to the canonical key, so the
 * validator's living_room/dining_room checks see them too. */
const TYPE_ALIASES: Record<string, string> = {
    living: 'living_room', lounge: 'living_room', sitting_room: 'living_room',
    dining: 'dining_room', family: 'family_room', family_lounge: 'family_room',
    master: 'master_bedroom', corridor: 'circulation',
};

export function normalizeRoomType(type: string | undefined): string | undefined {
    const t = type?.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return t ? (TYPE_ALIASES[t] ?? t) : undefined;
}

export function classifyRoom(room: { type?: string; name?: string; room_id: string }): ZoneType {
    const t = normalizeRoomType(room.type);
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
            type:      normalizeRoomType(r.type) ?? 'unknown',
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

/** The floor's one hub (rebuild plan Phase 2; accepted as SPEC_HUB by the
 * owner 2026-10-07): the living/family room, hall or foyer with the most
 * links (at least 2), ties to the larger room; failing that, the room with
 * the most links. identifyHubs above makes every room with 3+ links a hub. */
export function specHub(graph: RoomGraph, floorIndex: number): string[] {
    const nodes = (graph.floors.get(floorIndex) ?? []).map(id => graph.nodes.get(id)!)
        .filter(n => !/stair/i.test(n.label) && n.type !== 'stairwell');
    const eligible = nodes.filter(n => ['living_room', 'family_room', 'circulation', 'foyer'].includes(n.type) && n.degree >= 2);
    const pool = eligible.length ? eligible : nodes;
    pool.sort((a, b) => b.degree - a.degree || b.area - a.area);
    return pool.length ? [pool[0].id] : [];
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

/** Storage the Hive types as "store" even when it is a walk-in wardrobe
 * (hive-004/005's "Master Walk-in Wardrobe", type "store"). One whose only
 * neighbour is a bedroom opens only into that bedroom — a wardrobe in
 * everything but name — so it joins the suite like one. */
const STORAGE_TYPES = new Set(['store', 'wardrobe', 'dressing']);

/** Room types that never need an external wall (I5): sub-rooms and
 * storage. NBC 2006 permits mechanically-vented bathrooms; wardrobes and
 * stores need no window at all. */
export const NO_WINDOW_TYPES = new Set(['bathroom', 'wardrobe', 'dressing', 'store']);

/** Rooms you enter the house through. On the ground floor they must sit on
 * the FRONT edge — the bottom edge of the plan (y = building depth), the
 * convention of the target drawings, where the entrance and garage face
 * the street. Before this, the Grand Foyer could land mid-plan with no
 * outside wall, i.e. a house with no front door. */
export const ENTRANCE_TYPES = new Set(['foyer', 'entrance', 'entry', 'entrance_hall', 'lobby', 'reception']);

/** Rooms that face the street on the ground floor: the entrance, and the
 * garage, which cars must drive straight into (both target drawings put
 * the parking on the front). Before this the garage landed at the back
 * on every seed of hive-001/002 and mid-plan on the villas. */
export const GARAGE_TYPES = new Set(['garage', 'carport', 'parking']);
export const STREET_FRONT_TYPES = new Set([...ENTRANCE_TYPES, ...GARAGE_TYPES]);
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
        .filter(n => BEDROOM_TYPES.has(n.type) || (n.type === 'unknown' && n.zone === 'private' && classifyByBedroomLabel(n.label)));

    const isSub = (n: GraphNode) => SUB_ROOM_TYPES.has(n.type) ||
        (STORAGE_TYPES.has(n.type) && n.degree === 1) ||
        (n.type === 'unknown' && classifyBySubLabel(n.label));

    // Each sub-room belongs to exactly ONE suite. A bath two bedrooms both
    // list (hive-003's Bathroom 2: Master Suite and Bedroom 2) used to land
    // in both suites — placed twice, the second rect silently overwriting
    // the first, and I4 demanding it nest in both. It goes to the bedroom
    // with the fewest sub-rooms so far, then the fewest connections, then
    // the lower id; its edge to the other bedroom stays an ordinary
    // must-touch pair (findMustTouchPairs skips suite edges only).
    const subsOf = new Map<string, string[]>(bedrooms.map(b => [b.id, []]));
    const subIds = [...new Set(bedrooms.flatMap(b => [...b.neighbors]))]
        .filter(id => { const n = graph.nodes.get(id); return !!n && isSub(n); })
        .sort();
    for (const subId of subIds) {
        const owners = bedrooms.filter(b => b.neighbors.has(subId)).sort((a, b) =>
            subsOf.get(a.id)!.length - subsOf.get(b.id)!.length || a.degree - b.degree || a.id.localeCompare(b.id));
        subsOf.get(owners[0].id)!.push(subId);
    }

    return bedrooms.map(bed => {
        const subs = subsOf.get(bed.id)!;
        const totalArea = bed.area + subs.reduce((s, id) => s + (graph.nodes.get(id)?.area ?? 0), 0);
        return { bedroomId: bed.id, subIds: subs, totalArea };
    });
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
    /** True if either side of this pair is a floor hub (e.g. the foyer).
     * Lets the relaxation ladder drop ordinary adjacencies under pressure
     * while never dropping hub connectivity — losing that produces a
     * materially broken plan, not a tolerable compromise. */
    isHubEdge: boolean;
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
        // Circulation rooms are placed as fixed rects by index.ts, never
        // as search units — a pair naming one would never be checkable.
        // Hub exclusion REMOVED: a bedroom failing to reach the foyer is
        // exactly the I3 failure the harness caught (r01<->r02 in
        // hive-001) — hubs must be enforced, not skipped.
        if (node.zone === 'circ') continue;

        for (const neighborId of node.neighbors) {
            const neighborNode = graph.nodes.get(neighborId);
            if (!neighborNode || neighborNode.zone === 'circ') continue;
            const key = [id, neighborId].sort().join('|');
            if (seen.has(key) || suiteEdges.has(key)) continue;
            seen.add(key);
            pairs.push({ a: id, b: neighborId, isHubEdge: hubIds.has(id) || hubIds.has(neighborId) });
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
