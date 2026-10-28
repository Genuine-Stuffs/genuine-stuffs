import type { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { computeWalls, WALL_THICKNESS } from './walls';
import { wallKind, roomName } from './section';

// Download a drawing in the format the professional chooses (PDF, DXF, SVG, PNG) with "GS AI
// Studio" watermarked on every copy (owner 2026-10-28). The on-screen drawing is never marked:
// the mark goes on a copy of the SVG (PDF, SVG, PNG) or on its own layer of the DXF, which is
// built from the plan itself. DWG and Revit's RVT are closed formats: AutoCAD saves the DXF as
// DWG, and Revit takes IFC (next).

/** Presentation properties copied from the page's stylesheet onto the copy, so classes (Tailwind fills, label fonts) survive outside the page. */
const STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'opacity',
  'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'visibility', 'display'] as const;

const SVG_NS = 'http://www.w3.org/2000/svg';

function inlineStyles(source: SVGSVGElement, copy: SVGSVGElement) {
  const from = [source, ...Array.from(source.querySelectorAll<SVGElement>('*'))];
  const to = [copy, ...Array.from(copy.querySelectorAll<SVGElement>('*'))];
  from.forEach((el, i) => {
    const target = to[i];
    if (!target) return;
    const cs = getComputedStyle(el);
    const style = STYLE_PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';');
    target.setAttribute('style', `${style};${target.getAttribute('style') ?? ''}`);
    target.removeAttribute('class');
  });
}

/** "GS AI Studio" tiled diagonally across the sheet, faint enough to read the drawing through, and a stamp in the corner. */
function addWatermark(copy: SVGSVGElement, width: number, height: number, label: string) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');
  const size = Math.max(14, Math.round(width / 28));
  const stepX = size * 11, stepY = size * 6;
  for (let y = -stepY; y < height + stepY; y += stepY) {
    for (let x = -stepX + ((y / stepY) % 2) * (stepX / 2); x < width + stepX; x += stepX) {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(x));
      t.setAttribute('y', String(y));
      t.setAttribute('transform', `rotate(-30 ${x} ${y})`);
      t.setAttribute('style', `font-family:Inter,Arial,sans-serif;font-size:${size}px;font-weight:800;letter-spacing:${size * 0.15}px;fill:#0f172a;fill-opacity:0.07`);
      t.textContent = label;
      g.appendChild(t);
    }
  }
  const stamp = document.createElementNS(SVG_NS, 'text');
  // top right: the sheet's title block and schedules fill the bottom
  stamp.setAttribute('x', String(width - size * 0.8));
  stamp.setAttribute('y', String(size * 1.4));
  stamp.setAttribute('style', `font-family:Inter,Arial,sans-serif;font-size:${Math.round(size * 0.75)}px;font-weight:800;text-anchor:end;fill:#e11d48;fill-opacity:0.85`);
  stamp.textContent = `${label} · test output, not for construction`;
  g.appendChild(stamp);
  copy.appendChild(g);
}

/** The marked copy of `svg`: its markup, its size, and a canvas of it at `scale` times. */
async function markedCopy(svg: SVGSVGElement, label: string, scale: number) {
  const vb = svg.viewBox.baseVal;
  const width = vb && vb.width ? vb.width : svg.clientWidth, height = vb && vb.height ? vb.height : svg.clientHeight;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, copy);
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.setAttribute('xmlns', SVG_NS);
  // a white sheet under the drawing (the page's background doesn't come with it)
  const paper = document.createElementNS(SVG_NS, 'rect');
  paper.setAttribute('x', String(vb?.x ?? 0)); paper.setAttribute('y', String(vb?.y ?? 0));
  paper.setAttribute('width', String(width)); paper.setAttribute('height', String(height));
  paper.setAttribute('fill', '#ffffff');
  copy.insertBefore(paper, copy.firstChild);
  addWatermark(copy, width, height, label);
  const markup = new XMLSerializer().serializeToString(copy);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('The drawing could not be prepared for download.')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the download.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { markup, width, height, canvas };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export type PlanFormat = 'png' | 'pdf' | 'svg' | 'dxf';

/** The formats offered, with what each opens in (shown in the download menu). */
export const PLAN_FORMATS: Array<{ format: PlanFormat; label: string; opensIn: string }> = [
  { format: 'pdf', label: 'PDF', opensIn: 'print, share, mark up' },
  { format: 'dxf', label: 'DXF (CAD)', opensIn: 'AutoCAD (save as DWG), BricsCAD, ArchiCAD, Revit' },
  { format: 'svg', label: 'SVG (vector)', opensIn: 'Illustrator, Inkscape, any browser' },
  { format: 'png', label: 'PNG (picture)', opensIn: 'any image viewer' },
];

/**
 * Save the drawing on screen as `<fileName>.<format>`, every format marked with `label`.
 * PNG, PDF and SVG copy the drawing as shown; DXF is built from the plan itself (`layout`,
 * the floors shown) so its lines are real CAD lines in millimetres.
 */
export async function downloadPlan(format: PlanFormat, svg: SVGSVGElement, fileName: string, layout: SolvedLayout, floors: number[], label = 'GS AI Studio'): Promise<void> {
  if (format === 'dxf') { save(new Blob([planToDxf(layout, floors, label)], { type: 'application/dxf' }), `${fileName}.dxf`); return; }
  const { markup, width, height, canvas } = await markedCopy(svg, label, format === 'pdf' ? 3 : 2);
  if (format === 'svg') { save(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}.svg`); return; }
  if (format === 'png') {
    const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('The download could not be made.')), 'image/png'));
    save(blob, `${fileName}.png`);
    return;
  }
  // PDF: the sheet on one A3 page, portrait or landscape as the drawing is, with a margin
  const { default: jsPDF } = await import('jspdf');
  const landscape = width > height;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a3' });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), m = 10;
  const k = Math.min((pw - 2 * m) / width, (ph - 2 * m) / height);
  doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pw - width * k) / 2, (ph - height * k) / 2, width * k, height * k);
  doc.setProperties({ title: fileName, creator: label, subject: `${label} floor plan: test output, not for construction` });
  doc.save(`${fileName}.pdf`);
}

/** @deprecated kept for callers of the first version: a PNG. */
export async function downloadWatermarkedPlan(svg: SVGSVGElement, fileName: string, label = 'GS AI Studio', scale = 2): Promise<void> {
  const { canvas } = await markedCopy(svg, label, scale);
  const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('The download could not be made.')), 'image/png'));
  save(blob, `${fileName}.png`);
}

// ── DXF (AutoCAD R12 text: opened by AutoCAD, BricsCAD, LibreCAD, ArchiCAD, Revit) ─────────────
// Millimetres, y up (the plan's y runs down the sheet). Layers: A-WALL (both faces of every wall),
// A-ROOM (room outlines), A-TEXT (names and areas), GS-AI-STUDIO (the watermark). Floors side by
// side, 5 m apart, each titled.

const MM = 1000;
const dxfLine = (layer: string, x1: number, y1: number, x2: number, y2: number) =>
  `0\nLINE\n8\n${layer}\n10\n${(x1 * MM).toFixed(1)}\n20\n${(-y1 * MM).toFixed(1)}\n30\n0.0\n11\n${(x2 * MM).toFixed(1)}\n21\n${(-y2 * MM).toFixed(1)}\n31\n0.0\n`;
const dxfText = (layer: string, x: number, y: number, h: number, text: string, rotate = 0, centre = true) =>
  `0\nTEXT\n8\n${layer}\n10\n${(x * MM).toFixed(1)}\n20\n${(-y * MM).toFixed(1)}\n30\n0.0\n40\n${(h * MM).toFixed(1)}\n1\n${text.replace(/[\r\n]+/g, ' ')}\n50\n${rotate}\n` +
  (centre ? `72\n1\n11\n${(x * MM).toFixed(1)}\n21\n${(-y * MM).toFixed(1)}\n31\n0.0\n` : '');
const rectLines = (layer: string, x: number, y: number, w: number, h: number) =>
  dxfLine(layer, x, y, x + w, y) + dxfLine(layer, x + w, y, x + w, y + h) + dxfLine(layer, x + w, y + h, x, y + h) + dxfLine(layer, x, y + h, x, y);

export function planToDxf(layout: SolvedLayout, floors: number[], label = 'GS AI Studio'): string {
  let out = '';
  let offset = 0, maxD = 0;
  for (const f of floors) {
    const rooms = layout.placed_rooms.filter(r => r.floor === f && r.width > 0 && r.depth > 0 && !isNaN(r.x) && !isNaN(r.y));
    if (!rooms.length) continue;
    const W = Math.max(...rooms.map(r => r.x + r.width)), D = Math.max(...rooms.map(r => r.y + r.depth));
    maxD = Math.max(maxD, D);
    // walls: each wall line's two faces, from its centreline and thickness
    for (const w of computeWalls(rooms.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, kind: wallKind(layout, r) })))) {
      if (w.kind === 'edge') { out += dxfLine('A-EDGE', offset + w.x0, w.y0, offset + w.x1, w.y1); continue; }
      const t = WALL_THICKNESS[w.kind] / 2, layer = w.kind === 'rail' ? 'A-RAIL' : 'A-WALL';
      if (w.y0 === w.y1) { out += dxfLine(layer, offset + w.x0, w.y0 - t, offset + w.x1, w.y1 - t) + dxfLine(layer, offset + w.x0, w.y0 + t, offset + w.x1, w.y1 + t); }
      else { out += dxfLine(layer, offset + w.x0 - t, w.y0, offset + w.x1 - t, w.y1) + dxfLine(layer, offset + w.x0 + t, w.y0, offset + w.x1 + t, w.y1); }
    }
    for (const r of rooms) {
      out += rectLines('A-ROOM', offset + r.x, r.y, r.width, r.depth);
      const cx = offset + r.x + r.width / 2, cy = r.y + r.depth / 2, h = Math.min(0.3, Math.max(0.12, Math.min(r.width, r.depth) / 8));
      out += dxfText('A-TEXT', cx, cy - h * 0.7, h, roomName(layout, r).toUpperCase());
      out += dxfText('A-TEXT', cx, cy + h * 0.9, h * 0.7, `${(r.width * r.depth).toFixed(1)} m2  (${r.width.toFixed(2)} x ${r.depth.toFixed(2)} m)`);
    }
    out += dxfText('A-TEXT', offset + W / 2, D + 1.5, 0.45, f === 0 ? 'GROUND FLOOR PLAN' : f === 1 ? 'FIRST FLOOR PLAN' : `FLOOR ${f} PLAN`);
    offset += W + 5;
  }
  // the watermark: across the sheet, and a line under the titles
  const span = Math.max(offset - 5, 1), size = Math.max(0.6, span / 18);
  for (let x = size; x < span; x += size * 9) for (let y = size * 2; y < maxD; y += size * 5)
    out += dxfText('GS-AI-STUDIO', x, y, size, label, 30, false);
  out += dxfText('GS-AI-STUDIO', span / 2, maxD + 3, 0.35, `${label} - test output, not for construction`);
  const header = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n`;
  return `${header}0\nSECTION\n2\nENTITIES\n${out}0\nENDSEC\n0\nEOF\n`;
}
