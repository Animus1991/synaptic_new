type ExportNode = {
  id: string;
  label: string;
  mastery: number;
  x: number;
  y: number;
  type: string;
};

type ExportEdge = {
  from: string;
  to: string;
  relation: string;
};

const MASTERY_COLOR = (m: number) =>
  m >= 80 ? '#34d399' : m >= 60 ? '#fbbf24' : m >= 40 ? '#38bdf8' : m > 0 ? '#fb7185' : '#4d4870';

/**
 * Rasterize concept-map SVG to PNG for export/sharing.
 */
export async function exportConceptMapPng(
  _svg: SVGSVGElement,
  nodes: ExportNode[],
  edges: ExportEdge[],
  filename: string,
): Promise<void> {
  const pad = 40;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs, 0) - pad;
  const minY = Math.min(...ys, 0) - pad;
  const maxX = Math.max(...xs, 400) + pad;
  const maxY = Math.max(...ys, 300) + pad;
  const w = maxX - minX;
  const h = maxY - minY;

  const svgNs = 'http://www.w3.org/2000/svg';
  const doc = document.createElementNS(svgNs, 'svg');
  doc.setAttribute('xmlns', svgNs);
  doc.setAttribute('width', String(w));
  doc.setAttribute('height', String(h));
  doc.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);

  const bg = document.createElementNS(svgNs, 'rect');
  bg.setAttribute('x', String(minX));
  bg.setAttribute('y', String(minY));
  bg.setAttribute('width', String(w));
  bg.setAttribute('height', String(h));
  bg.setAttribute('fill', '#0f0a1e');
  doc.appendChild(bg);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  for (const edge of edges) {
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) continue;
    const line = document.createElementNS(svgNs, 'line');
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    line.setAttribute('stroke', '#6b6494');
    line.setAttribute('stroke-width', '2');
    doc.appendChild(line);
  }

  for (const node of nodes) {
    const color = MASTERY_COLOR(node.mastery);
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', String(node.x));
    circle.setAttribute('cy', String(node.y));
    circle.setAttribute('r', '30');
    circle.setAttribute('fill', '#0f0a1e');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '3');
    doc.appendChild(circle);

    const text = document.createElementNS(svgNs, 'text');
    text.setAttribute('x', String(node.x));
    text.setAttribute('y', String(node.y + 45));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#e0e7ff');
    text.setAttribute('font-size', '11');
    text.textContent = node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label;
    doc.appendChild(text);
  }

  const svgData = new XMLSerializer().serializeToString(doc);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) {
          reject(new Error('PNG export failed'));
          return;
        }
        const dl = URL.createObjectURL(png);
        const a = document.createElement('a');
        a.href = dl;
        a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        a.click();
        URL.revokeObjectURL(dl);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('SVG rasterize failed'));
    img.src = url;
  });
}
