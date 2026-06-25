/**
 * Visible document-structure analysis for Study Workspace UI.
 * Surfaces what textSegmentation detected — sections, conversations, slides, etc.
 */

import {
  countConversationTurnMarkers,
  inferSectionTitleFromBody,
  isGenericSectionHeading,
  PAGE_BREAK_MARKER,
  type DocumentSection,
  type SectionBoundaryKind,
} from './textSegmentation';
import { displaySectionLabel } from './readerDocumentLayout';
import { selectStructureNavSections } from './readerSectionNav';
import { detectReadingSections } from './sectionMerger';

export type DocumentStructureKind =
  | 'conversation'
  | 'faq'
  | 'slides'
  | 'headings'
  | 'dialogue'
  | 'journal'
  | 'flat';

export interface StructureSectionPreview {
  heading?: string;
  preview: string;
  boundaryKind?: SectionBoundaryKind;
}

export interface DocumentStructureReport {
  kind: DocumentStructureKind;
  sectionCount: number;
  totalChars: number;
  sections: StructureSectionPreview[];
  labels: string[];
}

function inferKind(sections: DocumentSection[], text: string): DocumentStructureKind {
  const kinds = sections.map((s) => s.boundaryKind).filter(Boolean);
  const titledCount = sections.filter((s) => displaySectionHeading(s)).length;
  const inferredLectureCount = sections.filter(
    (s) => inferSectionTitleFromBody(s.text) || (s.heading && !isGenericSectionHeading(s.heading)),
  ).length;
  if (inferredLectureCount >= 3 && inferredLectureCount >= Math.max(3, Math.floor(sections.length * 0.08))) {
    return 'headings';
  }
  if (titledCount >= 2 && titledCount >= Math.max(2, Math.floor(sections.length * 0.35))) {
    return 'headings';
  }
  if (kinds.filter((k) => k === 'qa-turn').length >= 2 && sections.some((s) => s.heading && !/^(user|assistant|q|a)$/i.test(s.heading))) {
    return 'faq';
  }
  if (kinds.filter((k) => k === 'qa-turn' || k === 'dialogue').length >= 2) return 'conversation';
  if (kinds.filter((k) => k === 'dialogue').length >= 2) return 'dialogue';
  if (kinds.filter((k) => k === 'slide' || k === 'page').length >= 2) return 'slides';
  if (kinds.filter((k) => k === 'date-block').length >= 2) return 'journal';
  if (sections.filter((s) => s.boundaryKind === 'heading' || s.heading).length >= 2) return 'headings';
  if (countConversationTurnMarkers(text) >= 2) return 'conversation';
  if (sections.length >= 2) return 'headings';
  return 'flat';
}

function kindLabels(kind: DocumentStructureKind, lang: 'en' | 'el' = 'en'): string[] {
  const en: Record<DocumentStructureKind, string[]> = {
    conversation: ['ChatGPT / Q&A turns', 'Speaker-labelled sections'],
    faq: ['FAQ Q/A pairs', 'Question-driven sections'],
    slides: ['Slide / page structure', 'Presentation-aware'],
    headings: ['Heading-delimited', 'Markdown / numbered sections'],
    dialogue: ['Dialogue turns', 'Dash or speaker lines'],
    journal: ['Date-block journal', 'Temporal sections'],
    flat: ['Paragraph flow', 'Limited structure detected'],
  };
  const el: Record<DocumentStructureKind, string[]> = {
    conversation: ['ChatGPT / Q&A turns', 'Ενότητες με ετικέτες ομιλητή'],
    faq: ['FAQ Q/A', 'Ενότητες ανά ερώτηση'],
    slides: ['Διαφάνειες / σελίδες', 'Δομή παρουσίασης'],
    headings: ['Επικεφαλίδες', 'Markdown / αριθμημένες ενότητες'],
    dialogue: ['Διάλογος', 'Γραμμές ομιλητή'],
    journal: ['Ημερολόγιο', 'Τμήματα ανά ημερομηνία'],
    flat: ['Συνεχές κείμενο', 'Λίγη δομή'],
  };
  return (lang === 'el' ? el : en)[kind];
}

function displaySectionHeading(section: DocumentSection): string | undefined {
  return displaySectionLabel(section.heading, section.text);
}

export function analyzeDocumentStructure(text: string, lang: 'en' | 'el' = 'en'): DocumentStructureReport {
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: 'flat', sectionCount: 0, totalChars: 0, sections: [], labels: kindLabels('flat', lang) };
  }

  const sections = detectReadingSections(trimmed);
  const kind = inferKind(sections, trimmed);
  const previews: StructureSectionPreview[] = selectStructureNavSections(
    sections.map((s) => ({
      heading: displaySectionHeading(s),
      preview: (s.text || '').replace(/\s+/g, ' ').replace(PAGE_BREAK_MARKER, '').slice(0, 120),
      boundaryKind: s.boundaryKind,
    })),
  );

  return {
    kind,
    sectionCount: sections.length,
    totalChars: trimmed.length,
    sections: previews,
    labels: kindLabels(kind, lang),
  };
}
