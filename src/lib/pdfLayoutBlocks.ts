/**
 * Wave 8B-gamma — layout-aware PDF blocks for DocumentModel.
 *
 * Clusters PDF.js text lines (geometry from groupPdfItemsIntoLines) into typed
 * heading / paragraph / list / equation blocks with char offsets in page text.
 */

import type { DocumentBlockType } from './documentModel';
import {
  groupPdfItemsIntoLines,
  isMathFontFamily,
  isMathSymbolHeavy,
  type PdfTextLine,
} from './pdfMathZones';
import { isMathLikeLine } from './readerMathBlocks';

export interface PdfLayoutBlockInput {
  type: DocumentBlockType;
  text: string;
  charStart: number;
  charEnd: number;
  pageIndex: number;
}

const LIST_LINE_RE = /^(\s*[-*•]\s+|\s*\d+[.)]\s+)/;
const CAPTION_LINE_RE = /^(figure|fig\.|table)\s+\d/i;

function lineFontSize(line: PdfTextLine): number {
  if (line.items.length === 0) return 12;
  return Math.max(...line.items.map((i) => i.height), 10);
}

function medianLineFont(lines: PdfTextLine[]): number {
  if (lines.length === 0) return 12;
  const sizes = lines.map(lineFontSize).sort((a, b) => a - b);
  const mid = Math.floor(sizes.length / 2);
  return sizes.length % 2 === 0 ? (sizes[mid - 1]! + sizes[mid]!) / 2 : sizes[mid]!;
}

function inferLineType(line: PdfTextLine, medianFont: number): DocumentBlockType {
  const text = line.text.trim();
  if (!text) return 'paragraph';
  if (
    isMathLikeLine(text) ||
    isMathSymbolHeavy(text) ||
    line.items.some((i) => isMathFontFamily(i.fontFamily))
  ) {
    return 'equation';
  }
  if (LIST_LINE_RE.test(text)) return 'list';
  if (CAPTION_LINE_RE.test(text)) return 'caption';
  const font = lineFontSize(line);
  if (font >= medianFont * 1.15 && text.length < 140 && !/[.!?]$/.test(text)) {
    return 'heading';
  }
  return 'paragraph';
}

function verticalGap(prev: PdfTextLine, next: PdfTextLine): number {
  return Math.abs(next.minY - prev.maxY);
}

function avgLineHeight(lines: PdfTextLine[]): number {
  if (lines.length === 0) return 12;
  const heights = lines.map((l) => Math.max(1, l.maxY - l.minY));
  return heights.reduce((a, b) => a + b, 0) / heights.length;
}

type LineCluster = { lines: PdfTextLine[]; type: DocumentBlockType };

function clusterLines(lines: PdfTextLine[]): LineCluster[] {
  if (lines.length === 0) return [];
  const medianFont = medianLineFont(lines);
  const gapThreshold = avgLineHeight(lines) * 1.35;
  const clusters: LineCluster[] = [];

  let current: LineCluster = {
    lines: [lines[0]!],
    type: inferLineType(lines[0]!, medianFont),
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const lineType = inferLineType(line, medianFont);
    const prev = current.lines[current.lines.length - 1]!;
    const gap = verticalGap(prev, line);
    const mergeable =
      current.type === 'paragraph' &&
      lineType === 'paragraph' &&
      gap <= gapThreshold;

    if (mergeable) {
      current.lines.push(line);
    } else {
      clusters.push(current);
      current = { lines: [line], type: lineType };
    }
  }
  clusters.push(current);
  return clusters;
}

function clusterText(cluster: LineCluster): string {
  return cluster.lines.map((l) => l.text.trim()).filter(Boolean).join('\n').trim();
}

function locateInPage(pageText: string, blockText: string, searchFrom: number): number {
  const direct = pageText.indexOf(blockText, searchFrom);
  if (direct >= 0) return direct;
  const firstLine = blockText.split('\n')[0]?.trim();
  if (firstLine) {
    const idx = pageText.indexOf(firstLine, searchFrom);
    if (idx >= 0) return idx;
  }
  return searchFrom;
}

/** Build layout blocks for one PDF page. */
export function extractLayoutBlocksFromPage(
  rawItems: unknown[],
  styles: Record<string, { fontFamily?: string }> | undefined,
  pageHeight: number,
  pageText: string,
  pageIndex: number,
  charOffsetBase: number,
): PdfLayoutBlockInput[] {
  const lines = groupPdfItemsIntoLines(rawItems, styles, pageHeight);
  if (lines.length === 0 || !pageText.trim()) return [];

  const blocks: PdfLayoutBlockInput[] = [];
  let searchFrom = 0;

  for (const cluster of clusterLines(lines)) {
    const text = clusterText(cluster);
    if (!text) continue;
    const startInPage = locateInPage(pageText, text, searchFrom);
    const endInPage = startInPage + text.length;
    blocks.push({
      type: cluster.type,
      text,
      charStart: charOffsetBase + startInPage,
      charEnd: charOffsetBase + endInPage,
      pageIndex,
    });
    searchFrom = endInPage;
  }

  return blocks;
}

/** Extract layout blocks across pages with correct document-wide char offsets. */
export function extractLayoutBlocksFromPages(
  pages: {
    items: unknown[];
    styles: Record<string, { fontFamily?: string }> | undefined;
    pageHeight: number;
    pageText: string;
    pageIndex: number;
  }[],
  pageSeparator = '\n\f\n',
): PdfLayoutBlockInput[] {
  const all: PdfLayoutBlockInput[] = [];
  let charOffset = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const pageBlocks = extractLayoutBlocksFromPage(
      page.items,
      page.styles,
      page.pageHeight,
      page.pageText,
      page.pageIndex,
      charOffset,
    );
    all.push(...pageBlocks);
    charOffset += page.pageText.length;
    if (i < pages.length - 1) charOffset += pageSeparator.length;
  }

  return all;
}
