/**
 * How much room area the gap-free engine must fit on its fullest floor.
 * Shared by the engine and by the page's setback check, so the warning the
 * user sees counts the brief exactly as the engine does.
 */
import { buildGraph, HiveRoom, RoomGraph } from "../graph";

/** The Hive's rooms as the engine reads them (field fallbacks included). */
export function hiveRooms(program: any): HiveRoom[] {
    return (program?.rooms ?? []).map((r: any, i: number) => ({
        room_id: r.room_id ?? r.id ?? `room_${i}`, name: r.name ?? r.room_name ?? r.room_type ?? r.category, type: r.type,
        floor: r.floor ?? r.target_floor ?? 0, area_m2: r.area_m2 ?? r.min_area_sqm ?? 9, width_m: r.width_m, span_m: r.span_m,
        adjacencies: r.adjacencies ?? r.adjacent_to ?? [], uses_intermediate_columns: r.uses_intermediate_columns,
    }));
}

/** Largest floor's room area in m²; a multi-storey brief without a stair
 * gets a 10 m² one on every floor. */
export function graphNeed(graph: RoomGraph, duplex: boolean): number {
    const areaOf = (fl: number) => (graph.floors.get(fl) ?? []).reduce((s, id) => s + graph.nodes.get(id)!.area, 0)
        + (duplex && !(graph.floors.get(fl) ?? []).some(id => /stair/i.test(graph.nodes.get(id)!.label)) ? 10 : 0);
    return Math.max(...[...graph.floors.keys()].map(areaOf));
}

export function programNeed(program: any, storeys: number): number {
    const graph = buildGraph(hiveRooms(program));
    return graphNeed(graph, storeys > 1 || graph.floors.size > 1);
}
