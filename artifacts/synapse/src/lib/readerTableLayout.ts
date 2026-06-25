/**
 * PDF / plain-text table recognition for the Cognitive Reader.
 * Complements tableExtract.ts with fixed-gap multi-column rows and
 * interleaved two-column repair common in PDF text extraction.
 */

import type { ExtractedTable } from './tableExtract';
import { extractTables, tableToMarkdown } from './tableExtract';

const TERMINAL_PUNCT = /[.!?;:)]$/;
const MIN_GAP = 3;

/** Find the start index of the widest whitespace gap in a line (2+ columns). */
export function findWidestGapSplit(line: string): { start: number; end: number } | null {
  const matches = [...line.matchAll(/\S(\s{3,})\S/g)];
  if (matches.length === 0) return null;
  let best = matches[0]!;
  for (const m of matches) {
    if ((m[1]?.length ?? 0) > (best[1]?.length ?? 0)) best = m;
  }
  const gapStart = best.index! + 1;
  return { start: gapStart, end: gapStart + best[1]!.length };
}

/**
 * Dominant right-column start shared by most lines in a block.
 *
 * Buckets by the gap END (where the right column begins), not the gap start:
 * in real fixed-gutter tables the left labels vary in width ("Growth" vs
 * "Unemployment") so the gap starts at different columns, but the right column
 * is aligned to a fixed position. Bucketing by gap end is the correct signal.
 */
export function findDominantGapColumn(lines: string[]): number | null {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const gap = findWidestGapSplit(line);
    if (!gap) continue;
    const bucket = Math.floor(gap.end / 4) * 4;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let bestCol: number | null = null;
  let bestCount = 0;
  for (const [col, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestCol = col;
    }
  }
  if (bestCol == null || bestCount < Math.max(2, Math.ceil(lines.length * 0.65))) return null;
  return bestCol;
}

export function splitLineAtGapColumn(line: string, targetCol: number): string[] | null {
  const gap = findWidestGapSplit(line);
  if (!gap) return null;
  const bucket = Math.floor(gap.end / 4) * 4;
  if (Math.abs(bucket - targetCol) > 8) return null;
  const left = line.slice(0, gap.start).trim();
  const right = line.slice(gap.end).trim();
  if (!left || !right) return null;
  const rest = right;
  const nested = findWidestGapSplit(rest);
  if (nested && rest.length > 24) {
    const mid = nested.start;
    const col2 = rest.slice(0, mid).trim();
    const col3 = rest.slice(nested.end).trim();
    if (col2 && col3) return [left, col2, col3];
  }
  return [left, right];
}

/**
 * Tables from PDF lines that share a fixed whitespace gutter (multi-column layout).
 */
export function parseFixedGapColumnTables(text: string): ExtractedTable[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tables: ExtractedTable[] = [];
  let i = 0;

  while (i < lines.length) {
    const block: string[] = [];
    const startLine = i;
    while (i < lines.length) {
      const line = lines[i]!;
      if (!line.trim()) break;
      if (!/\s{3,}/.test(line)) break;
      block.push(line);
      i++;
    }

    if (block.length >= 3) {
      const gapCol = findDominantGapColumn(block);
      if (gapCol != null) {
        const rows = block
          .map((line) => splitLineAtGapColumn(line, gapCol))
          .filter((r): r is string[] => Boolean(r));
        const width = rows[0]?.length ?? 0;
        if (
          width >= 2 &&
          width <= 5 &&
          rows.length >= 3 &&
          rows.length / block.length >= 0.65 &&
          rows.every((r) => r.length === width)
        ) {
          const headers = rows[0]!.map((c) => c.trim());
          const bodyRows = rows.slice(1).map((r) => r.map((c) => c.trim()));
          const charStart = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
          const charEnd = lines.slice(0, i).join('\n').length;
          tables.push({ headers, rows: bodyRows, charStart, charEnd });
          continue;
        }
      }
    }

    if (i === startLine) i++;
  }

  return tables;
}

/**
 * PDF two-column text sometimes interleaves L/R lines. Merge pairs into gutter rows.
 */
export function repairInterleavedTwoColumnText(text: string): string {
  if (/\|.+\|/.test(text)) return text;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const repaired = tryRepairInterleavedBlock(lines, i);
    if (repaired) {
      out.push(...repaired.lines);
      i = repaired.nextIndex;
      continue;
    }
    out.push(lines[i]!);
    i++;
  }

  return out.join('\n');
}

function tryRepairInterleavedBlock(
  lines: string[],
  start: number,
): { lines: string[]; nextIndex: number } | null {
  const block: string[] = [];
  let i = start;
  while (i < lines.length && lines[i]!.trim().length > 0) {
    const line = lines[i]!.trim();
    if (line.length > 90 || /\s{3,}/.test(line) || line.includes('|')) break;
    if (/^#{1,6}\s/.test(line) || /^(?:διάλεξη|lecture|chapter)\s/i.test(line)) break;
    block.push(line);
    i++;
  }

  if (block.length < 6 || block.length % 2 !== 0) return null;

  const merged: string[] = [];
  const leftWidths: number[] = [];
  for (let p = 0; p < block.length; p += 2) {
    const left = block[p]!;
    const right = block[p + 1]!;
    if (!left || !right) return null;
    if (left.length > 72 || right.length > 72) return null;
    if (TERMINAL_PUNCT.test(left) && left.length > 36) return null;
    leftWidths.push(left.length);
  }
  const padTo = Math.max(...leftWidths) + MIN_GAP;
  for (let p = 0; p < block.length; p += 2) {
    const left = block[p]!;
    const right = block[p + 1]!;
    merged.push(`${left.padEnd(padTo)}${right}`);
  }

  const table = parseFixedGapColumnTables(merged.join('\n'));
  if (table.length === 0) return null;

  return { lines: merged, nextIndex: i };
}

/** All tables for Reader layout (markdown + plain + fixed-gap + repaired). */
export function extractReaderTables(text: string): ExtractedTable[] {
  const repaired = repairInterleavedTwoColumnText(text);
  const fixed = parseFixedGapColumnTables(repaired);
  const base = extractTables(repaired);

  const all = [...base, ...fixed];
  const deduped: ExtractedTable[] = [];
  for (const candidate of all.sort((a, b) => (a.charStart ?? 0) - (b.charStart ?? 0))) {
    const overlaps = deduped.some(
      (t) =>
        candidate.charStart !== undefined &&
        t.charStart !== undefined &&
        candidate.charEnd !== undefined &&
        t.charEnd !== undefined &&
        Math.max(candidate.charStart, t.charStart) < Math.min(candidate.charEnd, t.charEnd),
    );
    if (!overlaps) deduped.push(candidate);
  }
  return deduped;
}

export function tableSegmentContent(table: ExtractedTable): string {
  return tableToMarkdown(table);
}
