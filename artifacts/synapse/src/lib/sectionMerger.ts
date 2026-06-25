/**
 * Collapse PDF page-per-section splits into lecture-level reading units.
 * A 60-page syllabus should surface as ~N ΔΙΑΛΕΞΕΙΣ, not 60 "slides".
 */

import type { DocumentSection } from './textSegmentation';
import {
  detectDocumentSections,
  inferSectionTitleFromBody,
  isGenericSectionHeading,
} from './textSegmentation';
import { displaySectionLabel } from './readerDocumentLayout';

const LECTURE_HEADING_LINE =
  /^(?:#\s*)?(?:διάλεξη|διαλεξη|ενότητα|ενοτητα|μάθημα|μαθημα|lecture|lesson|week|εβδομάδα|εβδομαδα)\s*[#:.]?\s*\d*/i;

export function isLectureHeadingText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return LECTURE_HEADING_LINE.test(t.toLocaleLowerCase('el'))
    || LECTURE_HEADING_LINE.test(t);
}

export function isLectureSection(section: DocumentSection): boolean {
  const label = displaySectionLabel(section.heading, section.text) ?? section.heading ?? '';
  if (isLectureHeadingText(label)) return true;
  const inferred = inferSectionTitleFromBody(section.text);
  return Boolean(inferred && isLectureHeadingText(inferred));
}

function isPageBoundary(section: DocumentSection): boolean {
  return section.boundaryKind === 'page' || section.boundaryKind === 'slide';
}

/**
 * Merge consecutive page-only sections into the active lecture (or front-matter)
 * bucket. Only runs when the document is dominated by page boundaries.
 */
export function collapsePageSections(sections: DocumentSection[]): DocumentSection[] {
  if (sections.length < 4) return sections;

  const pageCount = sections.filter(isPageBoundary).length;
  const lectureCount = sections.filter(isLectureSection).length;
  const pageDominated =
    pageCount / sections.length >= 0.25
    || (lectureCount >= 2 && pageCount >= 3);
  if (!pageDominated) return sections;

  const out: DocumentSection[] = [];
  let bucket: DocumentSection | null = null;

  const flushBucket = () => {
    if (!bucket) return;
    const label = displaySectionLabel(bucket.heading, bucket.text);
    out.push({
      ...bucket,
      heading: label && !isGenericSectionHeading(label) ? label : bucket.heading,
      boundaryKind: bucket.boundaryKind === 'page' || bucket.boundaryKind === 'slide'
        ? 'heading'
        : bucket.boundaryKind,
    });
    bucket = null;
  };

  for (const sec of sections) {
    if (isLectureSection(sec)) {
      flushBucket();
      const label = displaySectionLabel(sec.heading, sec.text)
        ?? inferSectionTitleFromBody(sec.text)
        ?? sec.heading;
      bucket = {
        heading: label,
        text: sec.text,
        boundaryKind: 'heading',
        headingLevel: sec.headingLevel,
      };
      continue;
    }

    if (bucket && isPageBoundary(sec)) {
      bucket = {
        ...bucket,
        text: [bucket.text, sec.text].filter(Boolean).join('\n\n').trim(),
      };
      continue;
    }

    if (isPageBoundary(sec) && !bucket) {
      bucket = { ...sec };
      continue;
    }

    flushBucket();
    out.push(sec);
  }
  flushBucket();

  return out.length >= 2 && out.length < sections.length ? out : sections;
}

/** Sections intended for Reader + structure UI (merged when appropriate). */
export function detectReadingSections(text: string): DocumentSection[] {
  return collapsePageSections(detectDocumentSections(text));
}
