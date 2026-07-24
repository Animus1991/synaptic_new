/**
 * Re-anchor reader (document-level char) annotations after OCR/reprocess text changes.
 * TOOL-RD-04 / TOOL-AN-03 — complements margin annotation remapping.
 */
import type { ReaderAnnotation } from './readerAnnotationStore';
import { loadReaderAnnotations, saveReaderAnnotations } from './readerAnnotationStore';

export type ReaderAnchorStatus = 'ok' | 'needs-review' | 'legacy';

export type ReaderAnnotationAnchored = ReaderAnnotation & {
  /** Quote used to re-find the span after text changes. */
  excerpt?: string;
  anchorStatus?: ReaderAnchorStatus;
};

const MAX_EXCERPT = 120;

export function excerptFromReaderSpan(text: string, charStart: number, charEnd: number): string {
  const start = Math.max(0, Math.min(charStart, text.length));
  const end = Math.max(start, Math.min(charEnd, text.length));
  return text.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, MAX_EXCERPT);
}

/** Locate best [start,end) for an excerpt in new text (exact → prefix → fuzzy window). */
export function resolveReaderSpanOffsets(
  text: string,
  excerpt: string,
  preferredStart?: number,
): { charStart: number; charEnd: number } | null {
  const needle = excerpt.trim();
  if (!needle || needle.length < 4 || !text) return null;

  const exact = text.indexOf(needle);
  if (exact >= 0) return { charStart: exact, charEnd: exact + needle.length };

  const prefix = needle.slice(0, Math.min(48, needle.length));
  if (prefix.length >= 8) {
    const partial = text.indexOf(prefix);
    if (partial >= 0) {
      const end = Math.min(text.length, partial + needle.length);
      return { charStart: partial, charEnd: end };
    }
  }

  // Prefer near previous offset when available.
  if (typeof preferredStart === 'number' && preferredStart >= 0) {
    const windowStart = Math.max(0, preferredStart - 200);
    const windowEnd = Math.min(text.length, preferredStart + needle.length + 200);
    const window = text.slice(windowStart, windowEnd);
    const local = window.indexOf(prefix.length >= 8 ? prefix : needle.slice(0, 16));
    if (local >= 0) {
      const charStart = windowStart + local;
      return { charStart, charEnd: Math.min(text.length, charStart + needle.length) };
    }
  }

  return null;
}

export function refreshReaderAnnotationsAfterReprocess(
  items: ReaderAnnotationAnchored[],
  newText: string,
): ReaderAnnotationAnchored[] {
  return items.map((ann) => {
    const excerpt = ann.excerpt?.trim() || '';
    if (!excerpt) {
      return {
        ...ann,
        anchorStatus: 'legacy' as ReaderAnchorStatus,
      };
    }

    const resolved = resolveReaderSpanOffsets(newText, excerpt, ann.charStart);

    if (!resolved) {
      return {
        ...ann,
        excerpt,
        anchorStatus: 'needs-review' as ReaderAnchorStatus,
      };
    }

    const stillMatches = newText.slice(resolved.charStart, resolved.charEnd)
      .replace(/\s+/g, ' ')
      .includes(excerpt.slice(0, Math.min(24, excerpt.length)));

    return {
      ...ann,
      charStart: resolved.charStart,
      charEnd: resolved.charEnd,
      excerpt: excerpt || excerptFromReaderSpan(newText, resolved.charStart, resolved.charEnd),
      anchorStatus: stillMatches ? 'ok' : 'needs-review',
    };
  });
}

/** Persist remapped reader annotations for a scope key. Returns needs-review count. */
export function reprocessReaderAnnotationsForScope(scopeKey: string, newText: string): number {
  if (!scopeKey || !newText.trim()) return 0;
  const current = loadReaderAnnotations(scopeKey) as ReaderAnnotationAnchored[];
  if (current.length === 0) return 0;
  const refreshed = refreshReaderAnnotationsAfterReprocess(current, newText);
  saveReaderAnnotations(scopeKey, refreshed);
  return refreshed.filter((a) => a.anchorStatus === 'needs-review' || a.anchorStatus === 'legacy').length;
}

/**
 * After an OCR line correction, rematch reader annotations against corrected display text.
 */
export function reanchorReaderAnnotationsAfterOcrCorrection(
  scopeKey: string,
  correctedDisplayText: string,
): number {
  return reprocessReaderAnnotationsForScope(scopeKey, correctedDisplayText);
}
