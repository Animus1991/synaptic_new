/**
 * Wave 8B-alpha — layout-aware PDF math zone detection.
 *
 * Uses PDF.js text-item geometry + font heuristics to find embedded math,
 * symbol-heavy lines, and lost text-layer gaps (commas where formulas were).
 */

import { hasLostMathTextLayerGap, isMathLikeLine } from './readerMathBlocks';

export type PdfMathZoneKind = 'embedded-font' | 'symbol-line' | 'lost-text-layer';

export interface PdfMathZoneBbox {
  /** Normalized 0–100 viewport %. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfMathZone {
  id: string;
  pageIndex: number;
  bbox: PdfMathZoneBbox;
  kind: PdfMathZoneKind;
  display: boolean;
  needsOcr: boolean;
  lineIndex: number;
  lineText: string;
  textLayerSnippet?: string;
  latex?: string;
}

export interface PdfTextLine {
  y: number;
  text: string;
  items: PdfLayoutItem[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PdfLayoutItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
}

const LINE_TOLERANCE = 4;

const MATH_FONT_RE =
  /cmmi|cmr|cmsy|cmex|msam|msbm|symbol|stix|math|euler|tex|mathematica|cambria.?math|asana|latinmodernmath|newcm|libertinus/i;

/** True when PDF font metadata suggests a math face. */
export function isMathFontFamily(fontFamily: string): boolean {
  const name = fontFamily.trim();
  if (!name) return false;
  return MATH_FONT_RE.test(name);
}

/** Symbol density heuristic for a single line of extracted text. */
export function isMathSymbolHeavy(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  const mathChars = t.match(/[=+\-*/^_{}\\()[\]∫∑√∞≤≥≠≈αβγδεζηθλμπσφψωΔΣΩ%0-9]/g);
  return (mathChars?.length ?? 0) / t.length >= 0.22;
}

function pdfVerticalSortDirection(items: { y: number; height: number }[]): 'asc' | 'desc' {
  if (items.length === 0) return 'desc';
  const ys = items.map((it) => it.y);
  const spread = Math.max(...ys) - Math.min(...ys);
  return spread > 1 ? 'desc' : 'asc';
}

function lineBboxToNormalized(
  line: Pick<PdfTextLine, 'minX' | 'maxX' | 'minY' | 'maxY'>,
  pageWidth: number,
  pageHeight: number,
): PdfMathZoneBbox {
  const w = Math.max(pageWidth, 1);
  const h = Math.max(pageHeight, 1);
  const padX = w * 0.01;
  const padY = h * 0.008;
  const left = Math.max(0, line.minX - padX);
  const top = Math.max(0, h - line.maxY - padY);
  const right = Math.min(w, line.maxX + padX);
  const bottom = Math.min(h, h - line.minY + padY);
  return {
    left: (left / w) * 100,
    top: (top / h) * 100,
    width: Math.max(1, ((right - left) / w) * 100),
    height: Math.max(1, ((bottom - top) / h) * 100),
  };
}

/** Group PDF.js text items into reading-order lines with font metadata. */
export function groupPdfItemsIntoLines(
  rawItems: unknown[],
  styles: Record<string, { fontFamily?: string }> | undefined,
  pageHeight: number,
): PdfTextLine[] {
  type Item = PdfLayoutItem;
  const items: Item[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object' || !('str' in raw)) continue;
    const it = raw as {
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName?: string;
    };
    const text = it.str?.trim();
    if (!text) continue;
    const fontKey = it.fontName ?? '';
    const fontFamily = styles?.[fontKey]?.fontFamily ?? fontKey;
    items.push({
      str: it.str,
      x: it.transform[4] ?? 0,
      y: it.transform[5] ?? 0,
      width: it.width ?? 0,
      height: it.height ?? 10,
      fontFamily,
    });
  }
  if (items.length === 0) return [];

  const ySort = pdfVerticalSortDirection(items);
  const sorted = [...items].sort((a, b) => (ySort === 'desc' ? b.y - a.y : a.y - b.y));
  const lines: PdfTextLine[] = [];

  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= LINE_TOLERANCE);
    if (line) {
      line.items.push(it);
      line.y = (line.y + it.y) / 2;
    } else {
      lines.push({
        y: it.y,
        text: '',
        items: [it],
        minX: it.x,
        maxX: it.x + it.width,
        minY: it.y,
        maxY: it.y + it.height,
      });
    }
  }

  lines.sort((a, b) => (ySort === 'desc' ? b.y - a.y : a.y - b.y));
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
    line.minX = Math.min(...line.items.map((i) => i.x));
    line.maxX = Math.max(...line.items.map((i) => i.x + i.width));
    line.minY = Math.min(...line.items.map((i) => i.y));
    line.maxY = Math.max(...line.items.map((i) => i.y + i.height));
    void pageHeight;
  }
  return lines;
}

function embeddedFontLatex(line: PdfTextLine): string | undefined {
  const mathItems = line.items.filter((i) => isMathFontFamily(i.fontFamily));
  if (mathItems.length === 0) return undefined;
  const snippet = mathItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  return snippet || undefined;
}

function classifyLineZone(
  line: PdfTextLine,
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  lineIndex: number,
): PdfMathZone | null {
  const lostGap = hasLostMathTextLayerGap(line.text);
  const mathFontRatio =
    line.items.filter((i) => isMathFontFamily(i.fontFamily)).length / Math.max(line.items.length, 1);
  const symbolLine = isMathLikeLine(line.text) || isMathSymbolHeavy(line.text);
  const embeddedLatex = embeddedFontLatex(line);

  if (!lostGap && mathFontRatio < 0.35 && !symbolLine) return null;

  let kind: PdfMathZoneKind = 'symbol-line';
  let needsOcr = false;
  let display = symbolLine && (line.text.length > 40 || /^\\begin|^\$\$|^\\\[/.test(line.text.trim()));
  let latex: string | undefined;

  if (lostGap) {
    kind = 'lost-text-layer';
    needsOcr = true;
    display = false;
  } else if (mathFontRatio >= 0.35 && embeddedLatex) {
    kind = 'embedded-font';
    latex = embeddedLatex;
    needsOcr = false;
    display = line.text.length > 48 || mathFontRatio > 0.7;
  } else if (symbolLine) {
    kind = 'symbol-line';
    needsOcr = !isMathLikeLine(line.text);
    latex = isMathLikeLine(line.text) ? line.text.trim() : undefined;
  }

  return {
    id: `math-p${pageIndex}-l${lineIndex}`,
    pageIndex,
    bbox: lineBboxToNormalized(line, pageWidth, pageHeight),
    kind,
    display,
    needsOcr,
    lineIndex,
    lineText: line.text,
    textLayerSnippet: line.text,
    latex,
  };
}

/** Detect math zones on one PDF page from PDF.js text content. */
export function detectMathZonesFromPage(
  rawItems: unknown[],
  styles: Record<string, { fontFamily?: string }> | undefined,
  pageWidth: number,
  pageHeight: number,
  pageIndex: number,
): PdfMathZone[] {
  const lines = groupPdfItemsIntoLines(rawItems, styles, pageHeight);
  const zones: PdfMathZone[] = [];
  for (let li = 0; li < lines.length; li++) {
    const zone = classifyLineZone(lines[li]!, pageIndex, pageWidth, pageHeight, li);
    if (zone) zones.push(zone);
  }
  return zones;
}
