/**
 * Section-aligned text model for manual reprocess editing.
 * Sections mirror Reader / step-rail slides so users can edit one slide at a time.
 */

import { buildReaderSegments, readerSegmentsToStepSections } from './readerDocumentLayout';
import { normalizeDocumentText } from './textSegmentation';

export type ReprocessEditorSection = {
  id: string;
  index: number;
  heading: string;
  beforeText: string;
  /** Pipeline-normalized text for this section (read-only reference). */
  pipelineText: string;
  /** User-editable working copy. */
  editedText: string;
};

export function buildReprocessEditorSections(
  beforeText: string,
  afterText: string,
  lang: 'en' | 'el',
): ReprocessEditorSection[] {
  const beforeSections = readerSegmentsToStepSections(buildReaderSegments(beforeText), lang);
  const afterSections = readerSegmentsToStepSections(buildReaderSegments(afterText), lang);
  const count = Math.max(beforeSections.length, afterSections.length, 1);
  const fallbackHeading = lang === 'el' ? 'Ενότητα' : 'Section';

  const sections: ReprocessEditorSection[] = [];
  for (let i = 0; i < count; i += 1) {
    const before = beforeSections[i];
    const after = afterSections[i];
    const heading = (after?.heading ?? before?.heading ?? `${fallbackHeading} ${i + 1}`).trim();
    const pipelineText = (after?.text ?? before?.text ?? '').trim();
    sections.push({
      id: `reprocess-section-${i}`,
      index: i,
      heading,
      beforeText: (before?.text ?? '').trim(),
      pipelineText,
      editedText: pipelineText,
    });
  }

  if (sections.length === 1 && !sections[0].beforeText && !sections[0].pipelineText) {
    sections[0] = {
      ...sections[0],
      beforeText: beforeText.trim(),
      pipelineText: afterText.trim(),
      editedText: afterText.trim(),
    };
  }

  return sections;
}

/** Reconstruct full document text from edited sections. */
export function mergeReprocessSections(sections: ReprocessEditorSection[]): string {
  return sections
    .map((section) => {
      const heading = section.heading.trim();
      const body = section.editedText.trim();
      if (!body && heading) return heading;
      if (heading && body && !body.startsWith(heading)) {
        return `${heading}\n\n${body}`;
      }
      return body || heading;
    })
    .filter((block) => block.length > 0)
    .join('\n\n');
}

export function sectionHasManualEdits(section: ReprocessEditorSection): boolean {
  return section.editedText.trim() !== section.pipelineText.trim();
}

export function countManualEdits(sections: ReprocessEditorSection[]): number {
  return sections.filter(sectionHasManualEdits).length;
}

export function normalizeSectionText(text: string): string {
  return normalizeDocumentText(text.trim());
}

export function cloneReprocessSections(sections: ReprocessEditorSection[]): ReprocessEditorSection[] {
  return sections.map((s) => ({ ...s }));
}
