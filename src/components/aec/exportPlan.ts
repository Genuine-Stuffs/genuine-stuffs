// Download a drawing as a PNG with "GS AI Studio" watermarked across it (owner 2026-10-28:
// professionals and reviewers take copies; every copy carries the mark). The on-screen drawing
// is never marked: the mark is added to a copy of the SVG, which is then drawn at print
// resolution on a canvas.

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

/** Save `svg` as `<fileName>.png` with the watermark, at `scale` times its drawn size (2 = print quality). */
export async function downloadWatermarkedPlan(svg: SVGSVGElement, fileName: string, label = 'GS AI Studio', scale = 2): Promise<void> {
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
    const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('The download could not be made.')), 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
