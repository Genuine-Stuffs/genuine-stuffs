/**
 * The numbered room key (template findings #6, as T15/T16 draw it): each
 * room numbered by floor (0.1, 0.2… on the ground floor, 1.1… above), its
 * name and floor area, and each floor's total, enclosed rooms apart from
 * terraces and balconies. The hall's or landing's pieces count as one room;
 * an open-to-below void and the stair void above are no floor area.
 */
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { roomName, wallKind } from './section';

export interface KeyRow { no: string; name: string; area: number; open: boolean; ids: string[] }
export interface FloorKey { floor: number; rows: KeyRow[]; enclosed: number; open: number }

export function roomKey(layout: SolvedLayout): FloorKey[] {
  const floors = [...new Set(layout.placed_rooms.map(r => r.floor))].sort((a, b) => a - b);
  return floors.map(f => {
    const rooms = layout.placed_rooms
      .filter(r => r.floor === f && r.width > 0 && r.depth > 0 && !r.room_id.startsWith('stairwell_void') && !r.room_id.startsWith('atrium_'))
      .sort((a, b) => a.y - b.y || a.x - b.x); // rear to front, left to right: the order the plan reads in
    const rows: KeyRow[] = [];
    for (const r of rooms) {
      const name = roomName(layout, r), open = wallKind(layout, r) === 'outside';
      const hall = r.room_id.startsWith('corridor_floor') ? rows.find(q => q.ids[0].startsWith('corridor_floor')) : undefined;
      if (hall) { hall.area += r.width * r.depth; hall.ids.push(r.room_id); continue; }
      rows.push({ no: `${f}.${rows.length + 1}`, name, area: r.width * r.depth, open, ids: [r.room_id] });
    }
    const sum = (o: boolean) => rows.filter(q => q.open === o).reduce((s, q) => s + q.area, 0);
    return { floor: f, rows, enclosed: sum(false), open: sum(true) };
  });
}

/** The key number of a placed room ('' for a void). */
export const keyNumber = (key: FloorKey[], floor: number, room_id: string) =>
  key.find(k => k.floor === floor)?.rows.find(q => q.ids.includes(room_id))?.no ?? '';
