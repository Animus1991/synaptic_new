/**
 * Lesson rail ↔ Reader scroll sync — map workspace steps to reader heading segments.
 */

import type { ReaderSegment } from './readerDocumentLayout';
import { buildReaderSectionNavFromSegments, type ReaderSectionNavItem } from './readerSectionNav';
import { isLectureHeadingText } from './sectionMerger';
import { normalizeDocumentText } from './textSegmentation';

export type WorkspaceStepRef = { title: string; type: string };

const QUIZ_STEP = /quiz|κουίζ|knowledge check|έλεγχος γνώσεων/i;

export function isWorkspaceQuizStep(step: WorkspaceStepRef): boolean {
  return QUIZ_STEP.test(step.type) || QUIZ_STEP.test(step.title);
}

function normalizeLabel(label: string): string {
  return label
    .replace(/…$/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function lectureNumber(label: string): string | null {
  const m = label.match(/(?:διάλεξη|διαλεξη|lecture|lesson)\s*(\d+)/i);
  return m?.[1] ?? null;
}

function labelsAlign(stepTitle: string, heading: string): boolean {
  const a = normalizeLabel(stepTitle);
  const b = normalizeLabel(heading);
  if (!a || !b) return false;

  const numA = lectureNumber(a);
  const numB = lectureNumber(b);
  if (numA && numB && numA !== numB) return false;
  if (numA && numB && numA === numB) return true;

  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length >= 4 && longer.startsWith(shorter)) return true;
  if (shorter.length >= 6 && longer.includes(shorter)) return true;
  return false;
}

function segmentAnchorLines(seg: ReaderSegment): string[] {
  const lines = seg.content.split('\n').map((line) => line.trim()).filter(Boolean);
  return [seg.content, ...lines];
}

function collectLectureSegmentAnchors(segments: ReaderSegment[]): ReaderSectionNavItem[] {
  const items: ReaderSectionNavItem[] = [];
  const seen = new Set<number>();
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const seg = segments[segmentIndex]!;
    const lines = seg.kind === 'heading'
      ? [seg.content.trim()]
      : segmentAnchorLines(seg);
    for (const line of lines) {
      if (!line || !isLectureHeadingText(line) || seen.has(segmentIndex)) continue;
      seen.add(segmentIndex);
      items.push({ label: line, segmentIndex });
      break;
    }
  }
  return items;
}

function buildLectureAnchorsFromSource(
  sourceText: string,
  segments: ReaderSegment[],
): ReaderSectionNavItem[] {
  const normalized = normalizeDocumentText(sourceText);
  const re = /(?:διάλεξη|διαλεξη|lecture|lesson)\s*\d+[^\n]*/giu;
  const items: ReaderSectionNavItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    const label = match[0].trim();
    const segmentIndex = segmentIndexForCharOffset(segments, match.index);
    if (segmentIndex == null) continue;
    const num = lectureNumber(label);
    if (items.some((item) => lectureNumber(item.label) === num)) continue;
    items.push({ label, segmentIndex });
  }
  return items;
}

function lectureNavForOrdinal(segments: ReaderSegment[], sourceText?: string): ReaderSectionNavItem[] {
  const lectures = collectLectureSegmentAnchors(segments);
  if (lectures.length >= 2) return lectures;
  if (sourceText?.trim()) {
    const fromSource = buildLectureAnchorsFromSource(sourceText, segments);
    if (fromSource.length >= 2) return fromSource;
  }
  return buildReaderSectionNavFromSegments(segments);
}

function segmentIndexForCharOffset(segments: ReaderSegment[], offset: number): number | null {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (offset >= seg.charStart && offset < seg.charEnd) return i;
  }
  const after = segments.findIndex((seg) => seg.charStart >= offset);
  if (after >= 0) return after;
  return segments.length > 0 ? segments.length - 1 : null;
}

function resolveFromSourceText(
  stepTitle: string,
  sourceText: string,
  segments: ReaderSegment[],
): number | null {
  const normalized = normalizeDocumentText(sourceText);
  const num = lectureNumber(stepTitle);
  if (num) {
    const re = new RegExp(`(?:διάλεξη|διαλεξη|lecture|lesson)\\s*${num}(?:\\s|$)`, 'iu');
    const match = re.exec(normalized);
    if (match?.index != null) return segmentIndexForCharOffset(segments, match.index);
  }

  const probe = stepTitle.trim().slice(0, 32);
  if (probe.length >= 4) {
    const idx = normalized.toLowerCase().indexOf(probe.toLowerCase());
    if (idx >= 0) return segmentIndexForCharOffset(segments, idx);
  }

  return null;
}

export function resolveReaderSegmentForStepTitle(
  stepTitle: string,
  segments: ReaderSegment[],
  sourceText?: string,
): number | null {
  const needle = stepTitle.trim();
  if (!needle) return null;

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    for (const line of segmentAnchorLines(segments[segmentIndex]!)) {
      if (labelsAlign(needle, line)) return segmentIndex;
    }
  }

  const num = lectureNumber(needle);
  if (num) {
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      for (const line of segmentAnchorLines(segments[segmentIndex]!)) {
        if (lectureNumber(line) === num && isLectureHeadingText(line)) {
          return segmentIndex;
        }
      }
    }
  }

  if (sourceText?.trim()) {
    return resolveFromSourceText(needle, sourceText, segments);
  }

  return null;
}

function contentStepOrdinal(steps: WorkspaceStepRef[], stepIndex: number): number {
  let count = 0;
  for (let i = 0; i < stepIndex; i++) {
    if (!isWorkspaceQuizStep(steps[i]!)) count += 1;
  }
  return count;
}

export function resolveReaderSegmentForWorkspaceStep(
  stepIndex: number,
  steps: WorkspaceStepRef[],
  segments: ReaderSegment[],
  sourceText?: string,
): number | null {
  const step = steps[stepIndex];
  if (!step || isWorkspaceQuizStep(step)) return null;

  const byTitle = resolveReaderSegmentForStepTitle(step.title, segments, sourceText);
  if (byTitle != null) return byTitle;

  const nav = lectureNavForOrdinal(segments, sourceText);
  const ordinal = contentStepOrdinal(steps, stepIndex);
  return nav[ordinal]?.segmentIndex ?? null;
}

export function resolveWorkspaceStepForReaderLabel(
  label: string,
  steps: WorkspaceStepRef[],
  segments: ReaderSegment[],
  sourceText?: string,
): number | null {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (isWorkspaceQuizStep(step)) continue;
    if (labelsAlign(step.title, label)) return i;
  }

  const segmentIndex = resolveReaderSegmentForStepTitle(label, segments, sourceText);
  if (segmentIndex != null) {
    for (let i = 0; i < steps.length; i++) {
      if (isWorkspaceQuizStep(steps[i]!)) continue;
      if (resolveReaderSegmentForWorkspaceStep(i, steps, segments, sourceText) === segmentIndex) {
        return i;
      }
    }
  }

  const nav = lectureNavForOrdinal(segments, sourceText);
  const navIdx = nav.findIndex((n) => labelsAlign(n.label, label));
  if (navIdx < 0) return null;

  let contentIdx = 0;
  for (let i = 0; i < steps.length; i++) {
    if (isWorkspaceQuizStep(steps[i]!)) continue;
    if (contentIdx === navIdx) return i;
    contentIdx += 1;
  }

  return null;
}
