import { visibleStrokes, type LayeredStroke, type WhiteboardDocument } from './whiteboardLayers';

export type WhiteboardExportOptions = {
  width: number;
  height: number;
  background?: string;
};

export function sanitizeWhiteboardFilename(filename: string): string {
  return filename.replace(/[^\w.-]+/g, '-').slice(0, 48) || 'whiteboard';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function polylinePoints(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function strokeLength(p0: { x: number; y: number }, p1: { x: number; y: number }): number {
  return Math.hypot(p1.x - p0.x, p1.y - p0.y);
}

/** Convert one layered stroke to SVG markup (skips eraser — not representable as additive vectors). */
export function layeredStrokeToSvg(stroke: LayeredStroke): string {
  if (stroke.points.length === 0 || stroke.tool === 'eraser') return '';

  const opacity = stroke.tool === 'highlighter' ? 0.35 : stroke.tool === 'marker' ? 0.75 : 1;
  const common = `stroke="${stroke.color}" stroke-width="${stroke.width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"`;

  if (stroke.tool === 'text' && stroke.text) {
    const p = stroke.points[0]!;
    const fontSize = Math.max(14, stroke.width * 5);
    return `<text x="${p.x}" y="${p.y}" fill="${stroke.color}" font-size="${fontSize}" font-family="system-ui,sans-serif">${escapeXml(stroke.text)}</text>`;
  }

  const p0 = stroke.points[0]!;
  const p1 = stroke.points[stroke.points.length - 1]!;

  if (['line', 'ruler', 'arrow', 'rect', 'ellipse'].includes(stroke.tool) && stroke.points.length >= 2) {
    if (stroke.tool === 'rect') {
      const x = Math.min(p0.x, p1.x);
      const y = Math.min(p0.y, p1.y);
      return `<rect x="${x}" y="${y}" width="${Math.abs(p1.x - p0.x)}" height="${Math.abs(p1.y - p0.y)}" fill="none" ${common}/>`;
    }
    if (stroke.tool === 'ellipse') {
      const rx = Math.abs(p1.x - p0.x) / 2;
      const ry = Math.abs(p1.y - p0.y) / 2;
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${common}/>`;
    }

    let svg = `<line x1="${p0.x}" y1="${p0.y}" x2="${p1.x}" y2="${p1.y}" ${common}/>`;
    if (stroke.tool === 'arrow') {
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const head = 10 + stroke.width;
      const x2 = p1.x - head * Math.cos(angle - 0.4);
      const y2 = p1.y - head * Math.sin(angle - 0.4);
      const x3 = p1.x - head * Math.cos(angle + 0.4);
      const y3 = p1.y - head * Math.sin(angle + 0.4);
      svg += `<polyline points="${p1.x},${p1.y} ${x2},${y2}" fill="none" ${common}/>`;
      svg += `<polyline points="${p1.x},${p1.y} ${x3},${y3}" fill="none" ${common}/>`;
    }
    if (stroke.tool === 'ruler') {
      const midX = (p0.x + p1.x) / 2 + 6;
      const midY = (p0.y + p1.y) / 2 - 6;
      svg += `<text x="${midX}" y="${midY}" fill="${stroke.color}" font-size="11" font-family="system-ui,sans-serif">${Math.round(strokeLength(p0, p1))} px</text>`;
    }
    return svg;
  }

  return `<polyline points="${polylinePoints(stroke.points)}" fill="none" ${common}/>`;
}

/** Build SVG string from a whiteboard document (visible layers only). */
export function buildWhiteboardSvg(
  doc: WhiteboardDocument,
  opts: WhiteboardExportOptions,
): string {
  const bg = opts.background ?? '#0f172a';
  const body = visibleStrokes(doc).map(layeredStrokeToSvg).filter(Boolean).join('\n  ');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">`,
    `  <rect width="100%" height="100%" fill="${bg}"/>`,
    body ? `  ${body}` : '',
    '</svg>',
  ].filter(Boolean).join('\n');
}

export function downloadWhiteboardSvg(svg: string, filename: string): void {
  const safe = sanitizeWhiteboardFilename(filename);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${safe}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/** Export whiteboard canvas to PNG download. */
export function downloadWhiteboardPng(canvas: HTMLCanvasElement, filename: string): void {
  const safe = sanitizeWhiteboardFilename(filename);
  const link = document.createElement('a');
  link.download = `${safe}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
