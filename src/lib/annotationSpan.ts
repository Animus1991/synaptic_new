import type { StoredAnnotation } from './annotationStore';

export type LineSpanSegment = {
  start: number;
  end: number;
  color?: string;
  annotationId?: string;
};

export function hasStoredLineSpan(
  ann: Pick<StoredAnnotation, 'charStart' | 'charEnd'>,
): boolean {
  return typeof ann.charStart === 'number'
    && typeof ann.charEnd === 'number'
    && ann.charEnd > ann.charStart;
}

export function clampLineSpan(
  charStart: number,
  charEnd: number,
  lineLength: number,
): { charStart: number; charEnd: number } {
  const start = Math.max(0, Math.min(charStart, lineLength));
  const end = Math.max(start, Math.min(charEnd, lineLength));
  return { charStart: start, charEnd: end };
}

/** Split a line slice into plain vs highlighted segments (line-local offsets). */
export function segmentStoredLineSpans(
  lineLength: number,
  spans: { charStart: number; charEnd: number; color: string; id: string }[],
): LineSpanSegment[] {
  const relevant = spans
    .map((s) => {
      const { charStart, charEnd } = clampLineSpan(s.charStart, s.charEnd, lineLength);
      return { ...s, charStart, charEnd };
    })
    .filter((s) => s.charEnd > s.charStart)
    .sort((a, b) => a.charStart - b.charStart);

  const segments: LineSpanSegment[] = [];
  let cursor = 0;

  for (const span of relevant) {
    if (span.charStart > cursor) {
      segments.push({ start: cursor, end: span.charStart });
    }
    if (span.charEnd > span.charStart) {
      segments.push({
        start: span.charStart,
        end: span.charEnd,
        color: span.color,
        annotationId: span.id,
      });
    }
    cursor = Math.max(cursor, span.charEnd);
  }
  if (cursor < lineLength) segments.push({ start: cursor, end: lineLength });
  return segments;
}

/** Resolve line-local char offsets from a span excerpt after reprocess/remap. */
export function resolveSpanOffsetsInLine(
  line: string,
  excerpt: string,
): { charStart: number; charEnd: number } | null {
  const needle = excerpt.trim();
  if (!needle || needle.length < 2) return null;
  if (needle === line.trim()) return null;

  const idx = line.indexOf(needle);
  if (idx >= 0) return { charStart: idx, charEnd: idx + needle.length };

  const trimmed = line.trimStart();
  const leading = line.length - trimmed.length;
  const rel = trimmed.indexOf(needle);
  if (rel >= 0) return { charStart: leading + rel, charEnd: leading + rel + needle.length };

  return null;
}

export function spanExcerptFromLine(
  line: string,
  charStart?: number,
  charEnd?: number,
): string {
  if (charStart != null && charEnd != null && charEnd > charStart) {
    return line.slice(charStart, charEnd).trim().slice(0, 240);
  }
  return line.trim().slice(0, 240);
}

/** DOM helper — offsets relative to element text content. */
export function getSelectionOffsetsInElement(el: HTMLElement): { start: number; end: number } | null {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;

  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  pre.setEnd(range.endContainer, range.endOffset);
  const end = pre.toString().length;
  if (end <= start) return null;
  return { start, end };
}
