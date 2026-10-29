// The plan as an IFC4 building model, for Revit, ArchiCAD and every BIM viewer (owner 2026-10-28:
// "Revit or any other architectural format"). Written from buildingModel.ts, the same model the
// 3D view draws, so the file is the plan: one storey per floor; every wall at its thickness
// (IfcWall, partitions as PARTITIONING) with an IfcOpeningElement cut for each opening, filled by
// an IfcDoor or IfcWindow of the schedule's size; balcony and terrace rails (IfcRailing); a slab
// (IfcSlab) and a named space (IfcSpace) for every room. The file says "GS AI Studio, test output,
// not for construction" in the project's description and in a property set on the building.
// Plain IFC-SPF text, written directly: no library, works offline.

import { withSiteOffset } from './sitePlan';
import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { buildingModel } from './buildingModel';
import { roomName } from './section';

/** An IFC GlobalId: 22 characters of the IFC base-64 alphabet, the first of 0-3 (128 bits). */
const IFC64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
function guid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let s = '';
  for (let i = 0; i < 22; i++) { s = IFC64[Number(n & 63n)] + s; n >>= 6n; }
  return IFC64[Number(BigInt(IFC64.indexOf(s[0])) & 3n)] + s.slice(1);
}

/** A STEP string: quotes doubled, non-ASCII written as \X2\ hex escapes. */
const str = (t: string) => `'${Array.from(t.replace(/'/g, "''")).map(c => c.charCodeAt(0) < 128 ? c : `\\X2\\${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}\\X0\\`).join('')}'`;
/** A STEP real: always with a decimal point. */
const num = (v: number) => { const r = Math.round(v * 1e6) / 1e6; return Number.isInteger(r) ? `${r}.` : String(r); };

export function planToIfc(layout: SolvedLayout, label = 'GS AI Studio', projectName = 'AI Studio design'): string {
  const lines: string[] = [];
  let id = 0;
  const add = (entity: string) => { lines.push(`#${++id}=${entity};`); return `#${id}`; };
  const pt3 = (x: number, y: number, z: number) => add(`IFCCARTESIANPOINT((${num(x)},${num(y)},${num(z)}))`);
  const pt2 = (x: number, y: number) => add(`IFCCARTESIANPOINT((${num(x)},${num(y)}))`);
  const dir = (x: number, y: number, z: number) => add(`IFCDIRECTION((${num(x)},${num(y)},${num(z)}))`);
  const zUp = dir(0, 0, 1);
  const axis3 = (x: number, y: number, z: number, rx = 1, ry = 0) => add(`IFCAXIS2PLACEMENT3D(${pt3(x, y, z)},${zUp},${rx === 1 && ry === 0 ? dir(1, 0, 0) : dir(rx, ry, 0)})`);
  const place = (rel: string | null, x: number, y: number, z: number, rx = 1, ry = 0) => add(`IFCLOCALPLACEMENT(${rel ?? '$'},${axis3(x, y, z, rx, ry)})`);

  // context and units
  const origin = add(`IFCAXIS2PLACEMENT3D(${pt3(0, 0, 0)},$,$)`);
  const context = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${origin},$)`);
  const body = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${context},$,.MODEL_VIEW.,$)`);
  const units = add(`IFCUNITASSIGNMENT((${add('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)')},${add('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)')},${add('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)')},${add('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)')}))`);
  const project = add(`IFCPROJECT('${guid()}',$,${str(`${label}: ${projectName}`)},${str(`${label} - test output, not for construction`)},$,$,$,(${context}),${units})`);

  /** A box `l` long (local x) by `t` deep (local y, centred) by `h` high, its corner at the local origin. */
  const boxShape = (l: number, t: number, h: number) => {
    const profile = add(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${add(`IFCAXIS2PLACEMENT2D(${pt2(l / 2, 0)},$)`)},${num(l)},${num(t)})`);
    const solid = add(`IFCEXTRUDEDAREASOLID(${profile},${add(`IFCAXIS2PLACEMENT3D(${pt3(0, 0, 0)},$,$)`)},${zUp},${num(h)})`);
    return add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${add(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${solid}))`)}))`);
  };

  // the plot and the building on it, where the site plan puts it (plan y runs down the sheet: IFC y = -plan y)
  const off = withSiteOffset(layout).site_offset ?? { x: 0, y: 0 };
  const sitePlace = place(null, 0, 0, 0);
  const site = add(`IFCSITE('${guid()}',$,'Site',$,$,${sitePlace},$,$,.ELEMENT.,$,$,$,$,$)`);
  const buildingPlace = place(sitePlace, off.x, -off.y, 0);
  const building = add(`IFCBUILDING('${guid()}',$,${str(projectName)},${str(`${label} - test output, not for construction`)},$,${buildingPlace},$,$,.ELEMENT.,$,$,$)`);
  add(`IFCRELAGGREGATES('${guid()}',$,$,$,${project},(${site}))`);
  add(`IFCRELAGGREGATES('${guid()}',$,$,$,${site},(${building}))`);
  const status = add(`IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT(${str('test output, not for construction')}),$)`);
  const madeBy = add(`IFCPROPERTYSINGLEVALUE('MadeBy',$,IFCTEXT(${str(label)}),$)`);
  const pset = add(`IFCPROPERTYSET('${guid()}',$,'GS_AI_Studio',$,(${status},${madeBy}))`);
  add(`IFCRELDEFINESBYPROPERTIES('${guid()}',$,$,$,(${building}),${pset})`);

  const model = buildingModel(layout);
  const floors = [...new Set([...model.walls.map(w => w.floor), ...model.slabs.map(s => s.floor)])].sort((a, b) => a - b);
  const storeys: string[] = [];
  const floorName = (f: number) => f === 0 ? 'Ground floor' : f === 1 ? 'First floor' : f === 2 ? 'Second floor' : f === 3 ? 'Third floor' : `Floor ${f}`;
  const roomOf = new Map(layout.placed_rooms.map(r => [`${r.floor}:${r.room_id}`, r]));

  for (const f of floors) {
    const elev = f * model.storeyH;
    const sp = place(buildingPlace, 0, 0, elev);
    const storey = add(`IFCBUILDINGSTOREY('${guid()}',$,${str(floorName(f))},$,$,${sp},$,$,.ELEMENT.,${num(elev)})`);
    storeys.push(storey);
    const contained: string[] = [], spaces: string[] = [];

    for (const w of model.walls.filter(q => q.floor === f)) {
      const horizontal = w.y0 === w.y1;
      const L = Math.hypot(w.x1 - w.x0, w.y1 - w.y0);
      // the wall's axis runs from its start along local x: +x for a wall across the sheet, -y (down the sheet) for one along it
      const wp = place(sp, w.x0, -w.y0, w.z0 - elev, horizontal ? 1 : 0, horizontal ? 0 : -1);
      const shape = boxShape(L, w.thickness, w.z1 - w.z0);
      const wall = w.kind === 'rail'
        ? add(`IFCRAILING('${guid()}',$,'Rail',$,$,${wp},${shape},$,.GUARDRAIL.)`)
        : add(`IFCWALL('${guid()}',$,${str(w.parapet ? 'Parapet' : w.kind === 'ext' ? 'Outside wall' : 'Partition')},$,$,${wp},${shape},$,${w.parapet ? '.PARAPET.' : w.kind === 'ext' ? '.STANDARD.' : '.PARTITIONING.'})`);
      contained.push(wall);
      for (const o of w.openings) {
        const op = place(wp, o.at, 0, o.z0 - w.z0);
        const opening = add(`IFCOPENINGELEMENT('${guid()}',$,'Opening',$,$,${op},${boxShape(o.width, w.thickness + 0.1, o.z1 - o.z0)},$,.OPENING.)`);
        add(`IFCRELVOIDSELEMENT('${guid()}',$,$,$,${wall},${opening})`);
        if (o.kind === 'open') continue; // an open side (a carport) has no door
        const fp = place(op, 0, 0, 0);
        const h = o.z1 - o.z0;
        const fill = o.kind === 'window'
          ? add(`IFCWINDOW('${guid()}',$,${str(`Window ${o.width} x ${o.type.h} m`)},$,$,${fp},${boxShape(o.width, 0.05, h)},$,${num(h)},${num(o.width)},.WINDOW.,.SINGLE_PANEL.,$)`)
          : add(`IFCDOOR('${guid()}',$,${str(`${o.kind === 'vehicle' ? 'Vehicle door' : 'Door'} ${o.width} x ${o.type.h} m`)},$,$,${fp},${boxShape(o.width, 0.05, h)},$,${num(h)},${num(o.width)},${o.kind === 'vehicle' ? '.GATE.' : '.DOOR.'},${o.kind === 'vehicle' ? '.USERDEFINED.' : '.SINGLE_SWING_LEFT.'},${o.kind === 'vehicle' ? "'Overhead'" : '$'})`);
        add(`IFCRELFILLSELEMENT('${guid()}',$,$,$,${opening},${fill})`);
        contained.push(fill);
      }
    }

    for (const s of model.slabs.filter(q => q.floor === f)) {
      // the slab's top at the storey's floor level (the ground slab sits on the ground)
      const top = f === 0 ? s.t : 0;
      // a box is centred across its depth: placed on the middle of the room's depth
      const slab = add(`IFCSLAB('${guid()}',$,'Floor slab',$,$,${place(sp, s.x, -(s.y + s.d / 2), top - s.t)},${boxShape(s.w, s.d, s.t)},$,${f === 0 ? '.BASESLAB.' : '.FLOOR.'})`);
      contained.push(slab);
      const r = roomOf.get(`${f}:${s.room_id}`);
      const name = r ? roomName(layout, r) : s.room_id;
      // the room's volume: its floor to the storey's ceiling
      const space = add(`IFCSPACE('${guid()}',$,${str(name)},${str(`${(s.w * s.d).toFixed(1)} m2`)},$,${place(sp, s.x, -(s.y + s.d / 2), top)},${boxShape(s.w, s.d, model.storeyH - top - 0.15)},${str(name)},.ELEMENT.,.INTERNAL.,$)`);
      spaces.push(space);
    }
    // the roof over this floor's rooms (its parapets are walls above)
    for (const r of model.roofs.filter(q => q.floor === f))
      contained.push(add(`IFCSLAB('${guid()}',$,'Roof',$,$,${place(sp, r.x, -(r.y + r.d / 2), r.z - elev)},${boxShape(r.w, r.d, r.t)},$,.ROOF.)`));
    if (contained.length) add(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',$,$,$,(${contained.join(',')}),${storey})`);
    if (spaces.length) add(`IFCRELAGGREGATES('${guid()}',$,$,$,${storey},(${spaces.join(',')}))`);
  }
  if (storeys.length) add(`IFCRELAGGREGATES('${guid()}',$,$,$,${building},(${storeys.join(',')}))`);

  const now = new Date().toISOString().slice(0, 19);
  return [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('ViewDefinition [DesignTransferView]'),'2;1');`,
    `FILE_NAME(${str(`${projectName}.ifc`)},'${now}',(${str(label)}),(${str(label)}),${str(`${label} plan export`)},${str(label)},'');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
    ...lines,
    'ENDSEC;',
    'END-ISO-10303-21;',
    '',
  ].join('\n');
}
