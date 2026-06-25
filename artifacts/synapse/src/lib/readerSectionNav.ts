/**
 * Reader horizontal section nav — lecture-level chips after page→lecture merge.
 * Surfaces ΔΙΑΛΕΞΗ 1, 2, 3… instead of per-page §2–§8 fallbacks.
 */

import type { ReaderSegment } from './readerDocumentLayout';
import { isLectureHeadingText } from './sectionMerger';
import { isGenericSectionHeading, PAGE_BREAK_MARKER } from './textSegmentation';

const SKIP_NAV_HEADING =
  /^(introduction|course information|στοιχεία|στοιχεια|περιεχόμενα|περιεχομενα|contents|abstract|summary)$/i;
const GENERIC_SECTION_LABEL = /^§\s*\d+$/i;

export interface ReaderSectionNavItem {
  label: string;
  segmentIndex: number;
}

export function shouldSkipNavHeading(label: string): boolean {
  const t = label.trim();
  if (!t || t.length < 2) return true;
  if (/page break/i.test(t) || t === PAGE_BREAK_MARKER) return true;
  if (isGenericSectionHeading(t)) return true;
  if (SKIP_NAV_HEADING.test(t)) return true;
  if (GENERIC_SECTION_LABEL.test(t)) return true;
  return false;
}

export function buildReaderSectionNavFromSegments(segments: ReaderSegment[]): ReaderSectionNavItem[] {
  const headings = segments
    .map((seg, segmentIndex) => ({ seg, segmentIndex }))
    .filter(({ seg }) => seg.kind === 'heading');

  const lectures = headings.filter(({ seg }) => isLectureHeadingText(seg.content));
  const pool = lectures.length >= 2
    ? lectures
    : headings.filter(({ seg }) => !shouldSkipNavHeading(seg.content));

  return pool.map(({ seg, segmentIndex }) => ({
    label: seg.content.trim(),
    segmentIndex,
  }));
}

export function sectionNavRailLabel(items: ReaderSectionNavItem[], lang: 'en' | 'el'): string {
  if (items.length >= 2 && items.every((n) => isLectureHeadingText(n.label))) {
    return lang === 'el' ? 'Διαλέξεις' : 'Lectures';
  }
  return lang === 'el' ? 'Ενότητες' : 'Sections';
}

export function selectStructureNavSections<T extends { heading?: string; preview: string }>(
  sections: T[],
): T[] {
  const candidates = sections.filter(
    (s) => (s.heading && s.heading.trim().length > 1) || s.preview.length >= 20,
  );

  const lectures = candidates.filter((s) => s.heading && isLectureHeadingText(s.heading));
  if (lectures.length >= 2) return lectures.slice(0, 20);

  return candidates
    .filter((s) => s.heading && !shouldSkipNavHeading(s.heading))
    .slice(0, 12);
}
