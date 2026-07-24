/**
 * Pipeline P0 — table + math block detection shared by text segmentation and Reader layout.
 */

import type { ExtractedTable } from './tableExtract';
import { extractReaderTables, tableSegmentContent } from './readerTableLayout';
import { extractReaderMathBlocks, type ExtractedMathBlock } from './readerMathBlocks';

export type SegmentationEmbeddedKind = 'paragraph' | 'table' | 'math';

export type SegmentationEmbeddedPiece = {
  boundaryKind: SegmentationEmbeddedKind;
  text: string;
  table?: ExtractedTable;
  mathLatex?: string;
  mathDisplay?: boolean;
};

type PositionedBlock =
  | { kind: 'table'; start: number; end: number; table: ExtractedTable }
  | { kind: 'math'; start: number; end: number; math: ExtractedMathBlock };

/** Collect non-overlapping table + math spans in document order. */
export function collectEmbeddedBlocks(text: string): PositionedBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const positioned: PositionedBlock[] = [
    ...extractReaderTables(trimmed).map((table) => ({
      kind: 'table' as const,
      start: table.charStart ?? 0,
      end: table.charEnd ?? trimmed.length,
      table,
    })),
    ...extractReaderMathBlocks(trimmed).map((math) => ({
      kind: 'math' as const,
      start: math.charStart,
      end: math.charEnd,
      math,
    })),
  ].sort((a, b) => a.start - b.start);

  const deduped: PositionedBlock[] = [];
  for (const block of positioned) {
    const overlaps = deduped.some(
      (prev) => Math.max(prev.start, block.start) < Math.min(prev.end, block.end),
    );
    if (!overlaps) deduped.push(block);
  }
  return deduped;
}

/**
 * Split section body into paragraph / table / math pieces for segmentation or Reader emit.
 */
export function splitTextWithEmbeddedBlocks(text: string): SegmentationEmbeddedPiece[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const blocks = collectEmbeddedBlocks(trimmed);
  if (blocks.length === 0) {
    return [{ boundaryKind: 'paragraph', text: trimmed }];
  }

  const out: SegmentationEmbeddedPiece[] = [];
  let cursor = 0;

  for (const block of blocks) {
    if (block.start > cursor) {
      const para = trimmed.slice(cursor, block.start).trim();
      if (para) out.push({ boundaryKind: 'paragraph', text: para });
    }
    if (block.kind === 'table') {
      out.push({
        boundaryKind: 'table',
        text: tableSegmentContent(block.table),
        table: block.table,
      });
    } else {
      const raw = trimmed.slice(block.start, block.end).trim();
      out.push({
        boundaryKind: 'math',
        text: raw,
        mathLatex: block.math.latex,
        mathDisplay: block.math.display,
      });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < trimmed.length) {
    const tail = trimmed.slice(cursor).trim();
    if (tail) out.push({ boundaryKind: 'paragraph', text: tail });
  }

  return out;
}
