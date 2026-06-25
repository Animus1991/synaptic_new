/**
 * Document structure segmentation (adapted from AI Organizer segmentation layer).
 *
 * Handles pre-segmented notes: markdown headings, numbered sections, ALL CAPS,
 * slide/page markers, form-feed page breaks, horizontal rules, underline-style
 * headings, ChatGPT Q/A turns, and date-block journals — without requiring an LLM.
 */

import { isMathLikeLine } from './readerMathBlocks';
import { repairGreekDocumentText } from './greekTextRepair';

export interface DocumentSection {
  heading?: string;
  text: string;
  boundaryKind?: SectionBoundaryKind;
  headingLevel?: number;
}

export type SectionBoundaryKind =
  | 'heading'
  | 'slide'
  | 'page'
  | 'rule'
  | 'paragraph'
  | 'qa-turn'
  | 'dialogue'
  | 'date-block'
  | 'list'
  | 'code';

const SLIDE_PAGE_PATTERNS: RegExp[] = [
  /^slide\s*[#:]?\s*\d+/i,
  /^διαφάνεια\s*[#:]?\s*\d+/i,
  /^page\s*[#:]?\s*\d+/i,
  /^σελίδα\s*[#:]?\s*\d+/i,
  /^sheet\s*[#:]?\s*\d+/i,
  /^p\.\s*\d+/i,
  /^σ\.\s*\d+/i,
];

const RULE_LINE = /^[-–—=_*·━]{3,}\s*$/;
export const PAGE_BREAK_MARKER = '--- page break ---';

const GENERIC_SECTION_HEADINGS = new Set([
  PAGE_BREAK_MARKER.toLowerCase(),
]);

/** Lecture / week lines common in university syllabi (EL + EN). */
const LECTURE_HEADING_LINE =
  /^(?:#\s*)?(?:διάλεξη|διαλεξη|ενότητα|ενοτητα|μάθημα|μαθημα|lecture|lesson|week|εβδομάδα|εβδομαδα)\s*[#:.]?\s*\d*/i;

/** ChatGPT / dialogue speaker lines (from chatgpt-organizer-java + AI Organizer dialogue strategy). */
const CHAT_SPEAKER_LINE =
  /^(?:(?:###\s+)?(?:user|assistant|system)\s*$|(?:user|assistant|human|ai|chatgpt|you|system)\s*:\s*|(?:Q|A|Question|Answer|Interviewer|Interviewee|Host|Guest|Ερώτηση|Απάντηση)\s*:\s*|\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[^:]+:\s*)/i;

const DATE_BLOCK_LINE = /^(\d{1,4}[/-]\d{1,4}[/-]\d{2,4})\b(.*)$/;

const NON_SPEAKER_PREFIX =
  /^(note|definition|formula|example|chapter|section|slide|page|table|figure|source|ref|step|tip|warning|important|summary|abstract|introduction|conclusion|references|appendix|ενότητα|κεφάλαιο|παράδειγμα|ορισμός|τύπος|σημείωση|πηγή)\b/i;

/** List item starters (AI Organizer LIST_PATTERNS). */
const LIST_START_PATTERNS: RegExp[] = [
  /^[-•*◦▪▸►]\s+/,
  /^\d+[.)]\s+/,
  /^\d{1,3}\s+\S/, // syllabus rows: "1 ΕΘΝΙΚΟ …" (PDFs often omit the dot)
  /^[a-zα-ω][.)]\s+/i,
  /^[\u2022\u2023\u25E6\u2043\u2219]\s*/,
];

const QA_QUESTION_PREFIX = /^(?:Q|Question|Ερώτηση)[.:]\s+/i;

function titleCaseSpeaker(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Parse a conversation turn header line; returns speaker label + inline body if present. */
export function parseConversationTurnLine(line: string): { speaker: string; text: string } | null {
  const trimmed = line.trim();
  if (!trimmed || !CHAT_SPEAKER_LINE.test(trimmed)) return null;

  const markdownRole = trimmed.match(/^(?:###\s+)?(User|Assistant|System)\s*$/i);
  if (markdownRole) return { speaker: titleCaseSpeaker(markdownRole[1]!), text: '' };

  const timestamp = trimmed.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/);
  if (timestamp) return { speaker: timestamp[2]!.trim(), text: timestamp[3]!.trim() };

  const bracket = trimmed.match(/^\[([^\]]+)\]\s*:?\s*(.*)$/);
  if (bracket && !NON_SPEAKER_PREFIX.test(bracket[1]!.trim())) {
    return { speaker: bracket[1]!.trim(), text: bracket[2]!.trim() };
  }

  const paren = trimmed.match(/^\(([^)]+)\)\s*:?\s*(.*)$/);
  if (paren && paren[1]!.length <= 40 && !NON_SPEAKER_PREFIX.test(paren[1]!.trim())) {
    return { speaker: paren[1]!.trim(), text: paren[2]!.trim() };
  }

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx > 0) {
    const speakerRaw = trimmed.slice(0, colonIdx).replace(/^###\s+/, '').trim();
    const body = trimmed.slice(colonIdx + 1).trim();
    if (speakerRaw && !NON_SPEAKER_PREFIX.test(speakerRaw)) {
      return { speaker: titleCaseSpeaker(speakerRaw), text: body };
    }
  }

  return null;
}

/** Count explicit chat-speaker markers (User:/Assistant:/Q:/etc.). */
export function countConversationTurnMarkers(text: string): number {
  return text.split('\n').filter((line) => parseConversationTurnLine(line)).length;
}

/**
 * Segment ChatGPT exports and labelled Q/A transcripts by speaker turns.
 * Ported from chatgpt-organizer-java RuleBasedSegmentationStrategy (qa-turns rule).
 */
export function detectConversationSections(text: string): DocumentSection[] | null {
  const normalized = normalizeDocumentText(text);
  if (countConversationTurnMarkers(normalized) < 2) return null;

  const lines = normalized.split('\n');
  const sections: DocumentSection[] = [];
  let speaker = '';
  let buffer: string[] = [];
  let boundaryKind: SectionBoundaryKind = 'qa-turn';

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (speaker || body) sections.push({ heading: speaker || undefined, text: body, boundaryKind });
    buffer = [];
  };

  for (const line of lines) {
    const turn = parseConversationTurnLine(line);
    if (turn) {
      flush();
      speaker = turn.speaker;
      boundaryKind = /^(Q|Question|Ερώτηση|User|Human|You)$/i.test(turn.speaker) ? 'qa-turn' : 'dialogue';
      if (turn.text) buffer.push(turn.text);
      continue;
    }
    if (line.trim() || buffer.length > 0) buffer.push(line);
  }
  flush();

  const meaningful = sections.filter((s) => s.text.length >= 8 || s.heading);
  return meaningful.length >= 2 ? meaningful : null;
}

/**
 * FAQ-style Q/A pairs grouped as single sections (AI Organizer QAStrategy).
 * Merges each question with its answer under the question as heading.
 */
export function detectExplicitQAPairSections(text: string): DocumentSection[] | null {
  const normalized = normalizeDocumentText(text);
  const qMatches = normalized.match(/(?:^|\n)(?:Q|Question|Ερώτηση)[.:]\s+/gi);
  if (!qMatches || qMatches.length < 2) return null;

  const sections: DocumentSection[] = [];
  const blocks = normalized.split(/(?=(?:^|\n)(?:Q|Question|Ερώτηση)[.:]\s+)/i);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || !QA_QUESTION_PREFIX.test(trimmed)) continue;

    const qBody = trimmed.replace(QA_QUESTION_PREFIX, '').trim();
    const aSplit = qBody.split(/\n(?:A|Answer|Απάντηση)[.:]\s+/i);
    const question = (aSplit[0] ?? '').trim();
    const answer = (aSplit[1] ?? '').trim();

    if (question.length < 3) continue;
    sections.push({
      heading: question.split('\n')[0]!.slice(0, 100),
      text: answer || question,
      boundaryKind: 'qa-turn',
    });
  }

  return sections.length >= 2 ? sections : null;
}

/**
 * Dash-prefixed dialogue turns (AI Organizer DialogueStrategy — dash format).
 */
export function detectDashDialogueSections(text: string): DocumentSection[] | null {
  const normalized = normalizeDocumentText(text);
  const lines = normalized.split('\n');
  const nonEmpty = lines.filter((l) => l.trim());
  const dashLines = nonEmpty.filter((l) => /^[-–—]\s+/.test(l.trim()));
  if (dashLines.length < 2 || dashLines.length / Math.max(nonEmpty.length, 1) < 0.25) return null;

  const sections: DocumentSection[] = [];
  let turn = 0;
  let buffer: string[] = [];

  const flush = (speaker: string) => {
    const body = buffer.join('\n').trim().replace(/^[-–—]\s+/, '');
    if (body) sections.push({ heading: speaker, text: body, boundaryKind: 'dialogue' });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-–—]\s+/.test(trimmed)) {
      if (buffer.length > 0) flush(`Speaker ${((turn - 1) % 2) + 1}`);
      turn += 1;
      buffer = [line];
      continue;
    }
    if (trimmed && buffer.length > 0) buffer.push(line);
  }
  if (buffer.length > 0) flush(`Speaker ${((turn - 1) % 2) + 1}`);

  return sections.length >= 2 ? sections : null;
}

export function isListStartLine(line: string): boolean {
  const trimmed = line.trim();
  return LIST_START_PATTERNS.some((p) => p.test(trimmed));
}

function trackCodeFence(line: string, inFence: boolean, fenceMarker: string): { inFence: boolean; fenceMarker: string } {
  const trimmed = line.trim();
  const open = trimmed.match(/^(`{3,}|~{3,})/);
  if (!open) return { inFence, fenceMarker };
  const marker = open[1]!;
  if (!inFence) return { inFence: true, fenceMarker: marker };
  if (trimmed.startsWith(fenceMarker)) return { inFence: false, fenceMarker: '' };
  return { inFence, fenceMarker };
}

/** Infer markdown/numbered heading depth (AI Organizer sections strategy). */
export function inferHeadingLevel(line: string, previousLevel = 1): number {
  const trimmed = line.trim();
  const md = trimmed.match(/^(#{1,6})\s+\S/);
  if (md) return Math.min(6, md[1]!.length);

  if (/^[A-ZΑ-Ω][A-ZΑ-Ω\s]{2,}$/.test(trimmed) && /[A-ZΑ-Ω]/.test(trimmed)) return 1;

  const numbered = trimmed.match(/^(\d+(?:\.\d+)*)\.\s+/);
  if (numbered) {
    const dots = numbered[1]!.split('.').length - 1;
    if (dots >= 2) return 3;
    if (dots === 1) return 2;
    return 1;
  }

  if (/^[IVXLC]+\.\s+/i.test(trimmed)) return 1;
  if (/^[a-zα-ω][.)]\s+/i.test(trimmed)) return 3;

  return Math.max(2, previousLevel);
}

/**
 * Split journal/chat logs on date lines (from chatgpt-organizer-java date-block rule).
 */
export function detectDateBlockSections(text: string): DocumentSection[] | null {
  const normalized = normalizeDocumentText(text);
  const lines = normalized.split('\n');
  const dateLines = lines.filter((l) => DATE_BLOCK_LINE.test(l.trim()));
  if (dateLines.length < 2) return null;

  const sections: DocumentSection[] = [];
  let heading: string | undefined;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (heading || body.length > 0) sections.push({ heading, text: body, boundaryKind: 'date-block' });
    buffer = [];
  };

  for (const line of lines) {
    const m = line.trim().match(DATE_BLOCK_LINE);
    if (m) {
      flush();
      heading = m[1]!.trim();
      const rest = (m[2] ?? '').trim();
      if (rest) buffer.push(rest);
      continue;
    }
    buffer.push(line);
  }
  flush();

  const meaningful = sections.filter((s) => s.text.length >= 20 || s.heading);
  return meaningful.length >= 2 ? meaningful : null;
}

/** Normalize OCR/PDF text while preserving structural markers. */
export function normalizeDocumentText(text: string): string {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, `\n${PAGE_BREAK_MARKER}\n`)
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  return repairGreekDocumentText(normalized);
}

export function isStructuralBoundaryLine(line: string): SectionBoundaryKind | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed === PAGE_BREAK_MARKER) return 'page';
  if (SLIDE_PAGE_PATTERNS.some((p) => p.test(trimmed))) return 'slide';
  if (RULE_LINE.test(trimmed)) return 'rule';
  return null;
}

function cleanHeading(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*(?:\d+(?:\.\d+)*|chapter|κεφάλαιο|section|ενότητα|unit|module|part|μέρος)[).:\s-]*/i, '')
    .replace(/^[IVXLC]+\.\s*/i, '')
    .replace(/^[•\-–—*·\d.)]+\s*/, '')
    .replace(/[:.]\s*$/, '')
    .trim();
}

/**
 * Enhanced heading detector — markdown, numbered, ALL CAPS, chapter markers,
 * underline-style (next line ===/---), short title lines.
 */
export function isGenericSectionHeading(heading?: string): boolean {
  if (!heading?.trim()) return true;
  const h = heading.trim().toLowerCase();
  if (GENERIC_SECTION_HEADINGS.has(h)) return true;
  if (/^---\s*page\s*break\s*---$/i.test(h)) return true;
  return false;
}

/**
 * Infer a human-readable section title from the first lines of page/slide body text.
 * Used when PDF form-feeds produce bare page-break boundaries without headings.
 */
export function inferSectionTitleFromBody(body: string): string | undefined {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    if (isStructuralBoundaryLine(line)) continue;
    const lowerLine = line.toLocaleLowerCase('el');
    if (LECTURE_HEADING_LINE.test(lowerLine)) {
      return (cleanHeading(line) || line).slice(0, 120);
    }
    if (looksLikeHeadingLine(line)) {
      const cleaned = cleanHeading(line) || line;
      if (!isGenericSectionHeading(cleaned)) return cleaned.slice(0, 120);
    }
    // ALL CAPS syllabus titles (e.g. ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ)
    if (/^[A-ZΑ-Ω][A-ZΑ-Ω0-9\s\-–—:]{10,}$/.test(line) && /[Α-ΩA-Z]{4,}/.test(line)) {
      if (!/^(?:ΕΘΝΙΚΟ|NATIONAL|UNIVERSITY|ΠΑΝΕΠΙΣΤΗΜΙΟ|DEPARTMENT|ΤΜΗΜΑ|FACULTY|ΣΧΟΛΗ)\b/.test(line)) {
        return line.slice(0, 120);
      }
    }
  }
  return undefined;
}

function resolveSectionHeading(
  heading: string | undefined,
  body: string,
  boundaryKind?: SectionBoundaryKind,
): string | undefined {
  const cleaned = heading ? (cleanHeading(heading) || heading) : undefined;
  if (cleaned && !isGenericSectionHeading(cleaned)) return cleaned;
  const inferred = inferSectionTitleFromBody(body);
  if (inferred) return inferred;
  if (boundaryKind === 'page' || boundaryKind === 'slide') return undefined;
  return cleaned && !isGenericSectionHeading(cleaned) ? cleaned : undefined;
}

function enrichDocumentSections(sections: DocumentSection[]): DocumentSection[] {
  return sections.map((s) => {
    const heading = resolveSectionHeading(s.heading, s.text, s.boundaryKind);
    const inferredFromBody = inferSectionTitleFromBody(s.text);
    const boundaryKind =
      heading && inferredFromBody && (s.boundaryKind === 'page' || s.boundaryKind === 'slide')
        ? 'heading'
        : s.boundaryKind;
    return { ...s, heading, boundaryKind };
  });
}

export function looksLikeHeadingLine(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (isMathLikeLine(trimmed)) return false;

  if (LECTURE_HEADING_LINE.test(trimmed.toLocaleLowerCase('el'))) return true;

  if (/^#{1,6}\s+\S/.test(trimmed)) return true;

  if (nextLine && RULE_LINE.test(nextLine.trim()) && trimmed.length <= 100 && !/[.!?;]$/.test(trimmed)) {
    return true;
  }

  if (SLIDE_PAGE_PATTERNS.some((p) => p.test(trimmed))) return true;

  if (/^(chapter|section|part|unit|module|κεφάλαιο|ενότητα|μέρος)\b/i.test(trimmed)) return true;

  if (/^(\d+(\.\d+)*|[IVXLC]+)\.\s+\S/.test(trimmed)) return true;

  if (/^[A-ZΑ-Ω][A-ZΑ-Ω0-9\s\-–—:]{2,}$/.test(trimmed) && /[A-ZΑ-Ω]/.test(trimmed)) return true;

  if (/[.:;,]$/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > 14) return false;
  if (words.length === 1 && trimmed.length < 6 && !/^#{1,6}\s/.test(trimmed)) return false;

  const isTitleish =
    /^[A-ZΑ-Ω0-9«"(\[]/.test(trimmed) &&
    words.length <= 10 &&
    (words.length >= 2 || trimmed.length >= 8);
  const isNumbered = /^(\d+(\.\d+)*|chapter|κεφάλαιο|section|ενότητα)\b/i.test(trimmed);

  return isTitleish || isNumbered;
}

function boundaryHeading(line: string): string | undefined {
  const trimmed = line.trim();
  const slide = SLIDE_PAGE_PATTERNS.find((p) => p.test(trimmed));
  if (slide) return cleanHeading(trimmed) || trimmed;
  if (trimmed === PAGE_BREAK_MARKER) return undefined;
  return undefined;
}

/**
 * Split flat text into paragraph blocks when no headings exist.
 * Respects slide/page markers and horizontal rules as hard boundaries.
 */
function segmentByParagraphBlocks(text: string): DocumentSection[] {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const sections: DocumentSection[] = [];

  for (const block of blocks) {
    const firstLine = block.split('\n')[0]?.trim() ?? '';
    const boundary = isStructuralBoundaryLine(firstLine);
    if (boundary && block.split('\n').length === 1) {
      sections.push({
        heading:
          boundary === 'page'
            ? undefined
            : boundaryHeading(firstLine) ?? (boundary === 'rule' ? undefined : firstLine),
        text: '',
        boundaryKind: boundary,
      });
      continue;
    }
    sections.push({
      heading: looksLikeHeadingLine(firstLine) ? cleanHeading(firstLine) || firstLine : undefined,
      text: looksLikeHeadingLine(firstLine) ? block.split('\n').slice(1).join('\n').trim() || block : block,
      boundaryKind: 'paragraph',
    });
  }
  return sections.filter((s) => s.text.length > 0 || s.heading);
}

/**
 * Primary section detector — preserves author-provided structure from notes/slides/PDF.
 */
export function detectDocumentSections(text: string): DocumentSection[] {
  const normalized = normalizeDocumentText(text);
  if (!normalized) return [];

  const explicitQA = detectExplicitQAPairSections(normalized);
  if (explicitQA) return explicitQA;

  const conversation = detectConversationSections(normalized);
  if (conversation) return conversation;

  const dashDialogue = detectDashDialogueSections(normalized);
  if (dashDialogue) return dashDialogue;

  const dateBlocks = detectDateBlockSections(normalized);
  if (dateBlocks) return dateBlocks;

  const lines = normalized.split('\n');
  const sections: DocumentSection[] = [];
  let heading: string | undefined;
  let headingLevel: number | undefined;
  let boundaryKind: SectionBoundaryKind | undefined;
  let buffer: string[] = [];
  let inCodeFence = false;
  let fenceMarker = '';
  let prevHeadingLevel = 1;

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (!(heading || body.length > 0)) {
      buffer = [];
      headingLevel = undefined;
      return;
    }
    const resolvedHeading = resolveSectionHeading(heading, body, boundaryKind);
    let resolvedKind = boundaryKind;
    if (
      resolvedHeading &&
      inferSectionTitleFromBody(body) &&
      (boundaryKind === 'page' || boundaryKind === 'slide')
    ) {
      resolvedKind = 'heading';
    }
    sections.push({
      heading: resolvedHeading,
      text: body,
      boundaryKind: resolvedKind,
      headingLevel,
    });
    buffer = [];
    headingLevel = undefined;
    boundaryKind = undefined;
    heading = undefined;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const next = lines[i + 1];
    const trimmed = line.trim();

    const fenceState = trackCodeFence(line, inCodeFence, fenceMarker);
    inCodeFence = fenceState.inFence;
    fenceMarker = fenceState.fenceMarker;

    if (!trimmed) {
      buffer.push('');
      continue;
    }

    if (inCodeFence) {
      buffer.push(line);
      continue;
    }

    const structural = isStructuralBoundaryLine(trimmed);
    if (structural) {
      flush();
      heading =
        structural === 'page'
          ? undefined
          : boundaryHeading(trimmed) ?? (structural === 'rule' ? undefined : trimmed);
      boundaryKind = structural;
      continue;
    }

    if (isListStartLine(trimmed) && buffer.join('\n').trim().length > 0 && !isListStartLine(buffer.join('\n').split('\n').pop()?.trim() ?? '')) {
      flush();
      heading = undefined;
      boundaryKind = 'list';
      buffer.push(line);
      continue;
    }

    if (looksLikeHeadingLine(trimmed, next)) {
      flush();
      heading = cleanHeading(trimmed) || trimmed;
      prevHeadingLevel = inferHeadingLevel(trimmed, prevHeadingLevel);
      headingLevel = prevHeadingLevel;
      boundaryKind = 'heading';
      if (next && RULE_LINE.test(next.trim())) i += 1;
      continue;
    }

    buffer.push(line);
  }
  flush();

  if (sections.length > 0 && sections[0]!.text.length > 50) {
    const inferred = inferSectionTitleFromBody(sections[0]!.text);
    if (inferred) {
      sections[0]!.heading = inferred;
      sections[0]!.boundaryKind = 'heading';
    } else if (!sections[0]!.heading) {
      const bodyLines = sections[0]!.text.split('\n').map((l) => l.trim()).filter(Boolean);
      const syllabusTitle = bodyLines.find(
        (l) => /^[A-ZΑ-Ω][A-ZΑ-Ω0-9\s\-–—:]{10,}$/.test(l) && /[Α-ΩA-Z]{4,}/.test(l),
      );
      const enumeratedFront = bodyLines.filter((l) => /^\d{1,3}\s+\S/.test(l)).length >= 3;
      if (syllabusTitle) {
        sections[0]!.heading = syllabusTitle.slice(0, 120);
        sections[0]!.boundaryKind = 'heading';
      } else if (enumeratedFront) {
        sections[0]!.heading = 'Course information';
        sections[0]!.boundaryKind = 'heading';
      } else {
        sections[0]!.heading = 'Introduction';
        sections[0]!.boundaryKind = sections[0]!.boundaryKind ?? 'paragraph';
      }
    }
  }

  const enriched = enrichDocumentSections(sections);

  const meaningful = enriched.filter(
    (s) =>
      s.text.length >= 20 ||
      (s.heading && !isGenericSectionHeading(s.heading) && s.text.length > 0) ||
      (s.heading && s.boundaryKind === 'slide'),
  );

  if (meaningful.length >= 2) return meaningful;
  if (meaningful.length === 1 && meaningful[0]!.text.length > 80) return meaningful;

  const paraSections = enrichDocumentSections(segmentByParagraphBlocks(normalized));
  if (paraSections.length >= 2) return paraSections;

  return meaningful.length > 0 ? meaningful : paraSections;
}

/** Split reader/bilingual paragraphs respecting page/slide boundaries. */
export function splitStructuredParagraphs(text: string): string[] {
  const normalized = normalizeDocumentText(text);
  if (!normalized) return [];

  const sections = detectDocumentSections(normalized);
  if (sections.length >= 2) {
    return sections
      .map((s) => {
        const head = s.heading ? `${s.heading}\n\n` : '';
        return (head + s.text).trim();
      })
      .filter((p) => p.length > 0);
  }

  return normalized.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
}
