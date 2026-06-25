/**
 * Preserve source document layout for the Cognitive Reader:
 * sections, headings, paragraphs, and lists — especially for PDFs that only
 * use single newlines between lines (no blank-line paragraph gaps).
 */

import {
  inferSectionTitleFromBody,
  isGenericSectionHeading,
  isListStartLine,
  looksLikeHeadingLine,
  normalizeDocumentText,
  PAGE_BREAK_MARKER,
} from './textSegmentation';
import { detectReadingSections } from './sectionMerger';
import type { ExtractedTable } from './tableExtract';
import { extractReaderTables, tableSegmentContent } from './readerTableLayout';
import {
  detectBibliographyItems,
  isBibliographyBlock,
  isBibliographyHeading,
  looksLikeCitationLine,
} from './readerBibliography';
import {
  extractReaderMathBlocks,
  isMathBoundaryLine,
  isMathLikeLine,
  type ExtractedMathBlock,
} from './readerMathBlocks';

export type ReaderSegmentKind =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'front-matter'
  | 'table'
  | 'bibliography'
  | 'math';

export interface ReaderSegment {
  kind: ReaderSegmentKind;
  content: string;
  listItems?: string[];
  /** When true, render as <ol> (enumerated syllabus rows). */
  listOrdered?: boolean;
  table?: ExtractedTable;
  mathLatex?: string;
  mathDisplay?: boolean;
  charStart: number;
  charEnd: number;
}

export function displaySectionLabel(heading?: string, body?: string): string | undefined {
  if (heading && !isGenericSectionHeading(heading) && !heading.includes(PAGE_BREAK_MARKER)) {
    return heading;
  }
  const inferred = body ? inferSectionTitleFromBody(body) : undefined;
  if (inferred && !isGenericSectionHeading(inferred)) return inferred;
  return undefined;
}

function isListParagraph(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return isListStartLine(lines[0] ?? '');
  const listLines = lines.filter((l) => isListStartLine(l));
  return listLines.length >= 2 && listLines.length / lines.length >= 0.5;
}

function parseListItems(text: string, preserveNumbers = false): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (preserveNumbers) return l;
      return l.replace(/^[-•*◦▪▸►]\s+/, '').replace(/^\d+[.)]\s+/, '').replace(/^[a-zα-ω][.)]\s+/i, '');
    });
}

const FRONT_MATTER_SIGNAL = /eclass|e-mail|email|ώρες|ωρες|διδασκαλ|panepistimio|πανεπιστήμιο|syllabus|ακαδημαϊκό έτος|academic year|ευδοξος|eudoxus|προαπαιτούμενα|prerequisite/i;

export function isStudyToolExcludedText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (isFrontMatterBlock(undefined, trimmed)) return true;
  if (FRONT_MATTER_SIGNAL.test(trimmed)) return true;
  if (/^ώρες\s+διδασκαλίας/i.test(trimmed)) return true;
  return false;
}

export function isFrontMatterBlock(heading: string | undefined, body: string): boolean {
  if (heading === 'Course information') return true;
  const items = detectEnumeratedItems(body);
  if (!items || items.length < 3) return false;
  return items.some((item) => FRONT_MATTER_SIGNAL.test(item));
}

/** Sentence/clause terminators that mark the natural end of a flowed line. */
const TERMINAL_PUNCT = /[.!?;:·。！？)\]]$/;

/** Leading integer enumerator ("1", "1.", "12)") → its numeric value, else null. */
function leadingEnumerator(line: string): number | null {
  const m = line.trim().match(/^(\d{1,3})[.)]?\s+\S/);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

/**
 * Recognize a run of enumerated items (1, 2, 3, …) — common in syllabi,
 * reference/bibliography lists, and numbered steps that PDFs flatten into bare
 * single lines. Returns one cleaned string per item (wrapped continuations
 * folded in) ONLY when the leading numbers form a confident increasing 1..k
 * sequence, so prose mentioning years ("2008 was…") is never mistaken for a
 * list. The original enumerator is preserved in the item text for fidelity.
 */
export function detectEnumeratedItems(body: string): string[] | null {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  const starts = lines
    .map((l, idx) => ({ idx, n: leadingEnumerator(l) }))
    .filter((s): s is { idx: number; n: number } => s.n !== null);
  if (starts.length < 3) return null;

  const nums = starts.map((s) => s.n);
  if (nums[0] !== 1) return null;
  let consecutive = 0;
  for (let i = 1; i < nums.length; i++) if (nums[i] === nums[i - 1]! + 1) consecutive++;
  // Require a near-perfect 1..k run (tolerate at most one gap) and majority coverage.
  if (consecutive < nums.length - 2) return null;
  if (starts.length / lines.length < 0.5) return null;

  const startSet = new Set(starts.map((s) => s.idx));
  const items: string[] = [];
  let group: string[] = [];
  lines.forEach((line, idx) => {
    if (startSet.has(idx) && group.length > 0) {
      items.push(group.join('\n').trim());
      group = [];
    }
    group.push(line);
  });
  if (group.length > 0) items.push(group.join('\n').trim());
  return items.length >= 3 ? items : null;
}

/**
 * Reconstruct flowed (single-newline) lines into clean paragraphs and lists.
 *
 * Uses an adaptive wrap-width: a line is treated as a continuation of the
 * previous one only when the previous line is close to the widest line in the
 * block AND does not end on terminal punctuation — i.e. it visibly wrapped.
 * Short standalone lines (titles, syllabus/contact entries, bibliography rows)
 * therefore stay separate instead of being merged into a wall of text.
 */
function reconstructFlowedLines(block: string): string[] {
  const trimmed = block.trim();
  if (!trimmed) return [];

  const enumerated = detectEnumeratedItems(trimmed);
  if (enumerated) return [enumerated.map((it) => `- ${it}`).join('\n')];

  const lines = trimmed.split('\n');
  const contentLengths = lines.map((l) => l.trim().length).filter((n) => n > 0);
  const maxLen = contentLengths.length > 0 ? Math.max(...contentLengths) : 0;
  const wrapThreshold = Math.max(48, Math.floor(maxLen * 0.66));

  const paras: string[] = [];
  let buf: string[] = [];
  let prev = '';

  const flush = () => {
    if (buf.length === 0) return;
    paras.push(buf.join(' ').replace(/\s+/g, ' ').trim());
    buf = [];
    prev = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();

    if (!line || line === PAGE_BREAK_MARKER) {
      flush();
      continue;
    }

    if (looksLikeHeadingLine(line) && !isMathLikeLine(line)) {
      flush();
      paras.push(line);
      continue;
    }

    if (isMathBoundaryLine(line)) {
      flush();
      paras.push(line);
      continue;
    }

    if (isListStartLine(line)) {
      flush();
      const listLines: string[] = [raw];
      while (i + 1 < lines.length) {
        const next = lines[i + 1]!.trim();
        if (!next) break;
        if (!isListStartLine(next) && !/^\s{2,}\S/.test(lines[i + 1]!)) break;
        i += 1;
        listLines.push(lines[i]!);
      }
      paras.push(listLines.join('\n'));
      continue;
    }

    const isContinuation =
      buf.length > 0 && prev.length >= wrapThreshold && !TERMINAL_PUNCT.test(prev);
    if (buf.length > 0 && !isContinuation) flush();
    buf.push(line);
    prev = line;
  }
  flush();

  return paras.length > 0 ? paras : [trimmed];
}

/**
 * Split a section body into clean paragraphs/lists. Honors author blank-line
 * paragraph breaks first, then reconstructs flowed single-newline PDF text.
 */
export function splitSectionBodyIntoParagraphs(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];

  const byBlank = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (byBlank.length >= 2) return byBlank.flatMap(reconstructFlowedLines);

  return reconstructFlowedLines(trimmed);
}

function stripLeadingLine(text: string, line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return text;
  const idx = text.indexOf(trimmed);
  if (idx < 0) return text;
  return text.slice(idx + trimmed.length).replace(/^\n+/, '').trim();
}

function locateInText(haystack: string, needle: string, from: number): number {
  const idx = haystack.indexOf(needle, from);
  return idx >= 0 ? idx : from;
}

type SegmentPusher = (
  kind: ReaderSegmentKind,
  content: string,
  opts?: {
    listItems?: string[];
    listOrdered?: boolean;
    table?: ExtractedTable;
    mathLatex?: string;
    mathDisplay?: boolean;
  },
) => void;

function classifyEnumeratedBlock(
  heading: string | undefined,
  items: string[],
  rawBody: string,
): ReaderSegmentKind {
  if (isFrontMatterBlock(heading, rawBody)) return 'front-matter';
  if (isBibliographyHeading(heading)) return 'bibliography';
  const citationHits = items.filter(looksLikeCitationLine).length;
  if (citationHits >= Math.max(2, Math.ceil(items.length * 0.5))) return 'bibliography';
  return 'list';
}

function emitParagraphBlocks(body: string, push: SegmentPusher, heading?: string) {
  if (isBibliographyHeading(heading)) {
    const bib = detectBibliographyItems(body);
    if (bib && bib.length >= 2) {
      push('bibliography', body, { listItems: bib, listOrdered: true });
      return;
    }
  }

  for (const para of splitSectionBodyIntoParagraphs(body)) {
    const enumerated = detectEnumeratedItems(para);
    if (enumerated) {
      const kind = classifyEnumeratedBlock(heading, enumerated, para);
      push(kind, para, { listItems: enumerated, listOrdered: true });
      continue;
    }

    const bibliography = detectBibliographyItems(para);
    if (bibliography && (isBibliographyHeading(heading) || isBibliographyBlock(heading, para))) {
      push('bibliography', para, { listItems: bibliography, listOrdered: true });
      continue;
    }

    if (isListParagraph(para)) {
      push('list', para, { listItems: parseListItems(para) });
    } else {
      push('paragraph', para);
    }
  }
}

function emitBodyWithTables(body: string, push: SegmentPusher, heading?: string) {
  const trimmed = body.trim();
  if (!trimmed) return;

  const tables = extractReaderTables(trimmed);
  const mathBlocks = extractReaderMathBlocks(trimmed);
  type PositionedBlock =
    | { kind: 'table'; start: number; end: number; table: ExtractedTable }
    | { kind: 'math'; start: number; end: number; math: ExtractedMathBlock };

  const positioned: PositionedBlock[] = [
    ...tables.map((table) => ({
      kind: 'table' as const,
      start: table.charStart ?? 0,
      end: table.charEnd ?? 0,
      table,
    })),
    ...mathBlocks.map((math) => ({
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

  if (deduped.length === 0) {
    emitParagraphBlocks(trimmed, push, heading);
    return;
  }

  let cursor = 0;
  for (const block of deduped) {
    if (block.start > cursor) {
      emitParagraphBlocks(trimmed.slice(cursor, block.start), push, heading);
    }
    if (block.kind === 'table') {
      push('table', tableSegmentContent(block.table), { table: block.table });
    } else {
      const raw = trimmed.slice(block.start, block.end);
      push('math', raw, { mathLatex: block.math.latex, mathDisplay: block.math.display });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < trimmed.length) {
    emitParagraphBlocks(trimmed.slice(cursor), push, heading);
  }
}

/**
 * Build ordered reader segments with stable char offsets into the original text.
 */
export function buildReaderSegments(text: string): ReaderSegment[] {
  const normalized = normalizeDocumentText(text);
  if (!normalized.trim()) return [];

  const sections = detectReadingSections(normalized);
  const segments: ReaderSegment[] = [];
  let cursor = 0;

  const push: SegmentPusher = (kind, content, opts) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const start = locateInText(normalized, trimmed, cursor);
    const end = start + trimmed.length;
    segments.push({
      kind,
      content: trimmed,
      listItems: opts?.listItems,
      listOrdered: opts?.listOrdered,
      table: opts?.table,
      mathLatex: opts?.mathLatex,
      mathDisplay: opts?.mathDisplay,
      charStart: start,
      charEnd: end,
    });
    cursor = end;
  };

  if (sections.length >= 2) {
    for (const sec of sections) {
      let label = displaySectionLabel(sec.heading, sec.text);
      let body = sec.text;
      const paras = splitSectionBodyIntoParagraphs(sec.text);
      if (!label && paras[0] && looksLikeHeadingLine(paras[0])) {
        label = paras[0].trim();
        body = stripLeadingLine(sec.text, label);
      } else if (label && paras[0]?.trim() === label.trim()) {
        body = stripLeadingLine(sec.text, label);
      }
      if (label) push('heading', label);
      emitBodyWithTables(body, push, label);
    }
    if (segments.length > 0) return segments;
  }

  const flatParas = splitSectionBodyIntoParagraphs(normalized);
  if (
    flatParas[0] &&
    looksLikeHeadingLine(flatParas[0].split('\n')[0] ?? flatParas[0]) &&
    flatParas[0].length <= 160
  ) {
    const head = (flatParas[0].split('\n')[0] ?? flatParas[0]).trim();
    push('heading', head);
    emitBodyWithTables(stripLeadingLine(normalized, head), push, head);
  } else {
    emitBodyWithTables(normalized, push);
  }

  return segments.length > 0
    ? segments
    : [{ kind: 'paragraph', content: normalized, charStart: 0, charEnd: normalized.length }];
}

function segmentPlainText(seg: ReaderSegment): string {
  switch (seg.kind) {
    case 'list':
    case 'bibliography':
    case 'front-matter':
      return (seg.listItems ?? []).join('\n') || seg.content;
    case 'table':
      return [
        (seg.table?.headers ?? []).join(' | '),
        ...(seg.table?.rows ?? []).map((row) => row.join(' | ')),
      ].filter(Boolean).join('\n');
    case 'math':
      return seg.mathLatex ?? seg.content;
    default:
      return seg.content;
  }
}

/**
 * Map Reader segments to workspace lesson-rail steps (same model as Cognitive Reader).
 */
export function readerSegmentsToStepSections(
  segments: ReaderSegment[],
  lang: 'en' | 'el' = 'en',
): { heading?: string; text: string }[] {
  const courseInfoLabel = lang === 'el' ? 'Στοιχεία Μαθήματος' : 'Course information';
  const steps: { heading?: string; text: string }[] = [];
  let current: { heading?: string; parts: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const text = current.parts.join('\n\n').trim();
    if (text.length >= 15 || current.heading) {
      steps.push({ heading: current.heading, text });
    }
    current = null;
  };

  for (const seg of segments) {
    if (seg.kind === 'bibliography') continue;

    if (seg.kind === 'front-matter') {
      flush();
      const body = segmentPlainText(seg).trim();
      if (body.length > 0) {
        steps.push({ heading: courseInfoLabel, text: body });
      }
      continue;
    }

    if (seg.kind === 'heading') {
      flush();
      current = { heading: seg.content.trim(), parts: [] };
      continue;
    }

    const body = segmentPlainText(seg).trim();
    if (!body || isStudyToolExcludedText(body)) continue;
    if (seg.kind === 'list' && isFrontMatterBlock(undefined, body)) continue;

    if (!current) {
      const title = inferSectionTitleFromBody(body);
      current = { heading: title ?? undefined, parts: [body] };
    } else {
      current.parts.push(body);
    }
  }
  flush();
  return steps;
}

/** Flat paragraph list (for TTS / scroll sync) derived from structured segments. */
export function readerSegmentsToParagraphs(segments: ReaderSegment[]): { paragraph: string; start: number; end: number }[] {
  return segments
    .filter((s) => s.kind !== 'heading')
    .map((s) => ({
      paragraph: s.kind === 'list' || s.kind === 'bibliography'
        ? (s.listItems ?? []).join(' · ')
        : s.kind === 'math'
          ? s.mathLatex ?? s.content
        : s.kind === 'table'
          ? (s.table?.headers ?? []).join(' | ')
          : s.content,
      start: s.charStart,
      end: s.charEnd,
    }));
}
