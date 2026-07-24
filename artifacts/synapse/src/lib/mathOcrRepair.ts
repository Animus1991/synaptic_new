/**
 * Inject math OCR / embedded-font LaTeX back into extracted PDF page text.
 */

import type { PdfMathZone } from './pdfMathZones';
import { isPlausibleMathLatex, normalizeMathOcrToLatex } from './mathOcrNormalize';

export type MathZoneRepair = {
  zoneId: string;
  pageIndex: number;
  lineIndex: number;
  latex: string;
};

function wrapLatex(latex: string, display: boolean): string {
  const body = latex.trim();
  if (!body) return '';
  return display ? `$$\n${body}\n$$` : `$${body}$`;
}

/**
 * Replace lost text-layer comma gaps with recovered inline math.
 * Targets Greek calculus PDF patterns from `hasLostMathTextLayerGap`.
 */
export function injectLostMathLatex(line: string, latex: string): string {
  const wrapped = wrapLatex(latex, false);
  if (!wrapped) return line;

  if (/συνάρτηση\s*,/i.test(line)) {
    return line.replace(/συνάρτηση\s*,\s*/i, `συνάρτηση ${wrapped} `);
  }
  if (/Έστω\s*,/i.test(line)) {
    return line.replace(/Έστω\s*,\s*/i, `Έστω ${wrapped} `);
  }
  if (/μηδενίζεται\s+(?:για\s*,|η\s)/i.test(line)) {
    return line.replace(/για\s*,/i, `για ${wrapped} `);
  }
  if (/παραγωγίσιμη\s+στο\s*,/i.test(line)) {
    return line.replace(/στο\s*,/i, `στο ${wrapped} `);
  }
  if (/,\s*η\b/i.test(line)) {
    return line.replace(/,\s*η/, ` ${wrapped} η`);
  }
  if (/(?:^|[\s(])[,;]\s*η(?:\s|$)/i.test(line)) {
    return line.replace(/([(\s]),\s*η/i, `$1 ${wrapped} η`);
  }

  // Generic isolated comma between tokens
  return line.replace(/(\S)\s*,\s*(\S)/, `$1 ${wrapped} $2`);
}

/** Apply a single zone repair to one page's line array. */
export function applyZoneRepairToPageLines(
  lines: string[],
  zone: PdfMathZone,
  latex: string,
): string[] {
  if (zone.lineIndex < 0 || zone.lineIndex >= lines.length) return lines;
  const next = [...lines];
  const current = next[zone.lineIndex] ?? '';
  if (zone.kind === 'lost-text-layer') {
    next[zone.lineIndex] = injectLostMathLatex(current, latex);
  } else if (zone.display) {
    next[zone.lineIndex] = wrapLatex(latex, true);
  } else if (zone.kind === 'embedded-font' && current.includes(latex)) {
    next[zone.lineIndex] = current.replace(latex, wrapLatex(latex, false));
  } else {
    next[zone.lineIndex] = `${current} ${wrapLatex(latex, false)}`.trim();
  }
  return next;
}

/** Merge OCR results into per-page text (pages joined with \\f elsewhere). */
export function applyMathZoneRepairs(
  pageTexts: string[],
  zones: PdfMathZone[],
  ocrLatexByZoneId: Record<string, string>,
): { pageTexts: string[]; zones: PdfMathZone[] } {
  const pages = pageTexts.map((p) => p.split('\n'));
  const updatedZones = zones.map((z) => ({ ...z }));

  for (const zone of updatedZones) {
    let latex = zone.latex?.trim();
    if (zone.needsOcr) {
      const raw = ocrLatexByZoneId[zone.id];
      if (!raw) continue;
      latex = normalizeMathOcrToLatex(raw);
      if (!isPlausibleMathLatex(latex)) continue;
      zone.latex = latex;
    }
    if (!latex) continue;

    const pageLines = pages[zone.pageIndex];
    if (!pageLines) continue;
    pages[zone.pageIndex] = applyZoneRepairToPageLines(pageLines, zone, latex);
  }

  return {
    pageTexts: pages.map((lines) => lines.join('\n')),
    zones: updatedZones,
  };
}

/** Crop a normalized bbox from a rendered page canvas → JPEG base64 (no data: prefix). */
export function cropCanvasRegionToBase64(
  canvas: HTMLCanvasElement,
  bbox: { left: number; top: number; width: number; height: number },
): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const sx = Math.floor((bbox.left / 100) * canvas.width);
  const sy = Math.floor((bbox.top / 100) * canvas.height);
  const sw = Math.max(8, Math.floor((bbox.width / 100) * canvas.width));
  const sh = Math.max(8, Math.floor((bbox.height / 100) * canvas.height));
  if (sx + sw > canvas.width || sy + sh > canvas.height) return null;

  const crop = document.createElement('canvas');
  crop.width = sw;
  crop.height = sh;
  const cctx = crop.getContext('2d');
  if (!cctx) return null;
  cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  const dataUrl = crop.toDataURL('image/jpeg', 0.92);
  return dataUrl.split(',')[1] ?? null;
}
