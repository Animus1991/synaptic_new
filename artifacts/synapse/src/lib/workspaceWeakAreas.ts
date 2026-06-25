/**
 * Weak-area chips → workspace focus (term + optional reader highlight).
 */

import type { Course, LearnerModel, UploadedFile } from '../types';
import type { ConceptBusInsight } from './conceptBusSync';
import { findConceptSpan } from './conceptProvenance';
import { findTextSpanInFiles } from './findTextSpanInSource';
import type { WorkspaceFocus } from './workspaceFocus';
import { normalizeFocusTerm } from './workspaceFocus';
import type { WorkspaceStepRef } from './readerStepSync';
import { isWorkspaceQuizStep, resolveWorkspaceStepForReaderLabel } from './readerStepSync';
import type { ReaderSegment } from './readerDocumentLayout';
import { buildReaderSegments } from './readerDocumentLayout';

export type WeakSpotRef = {
  concept: string;
  mastery: number;
  course: string;
  source: 'model' | 'bus';
};

export function collectWorkspaceWeakSpots(
  learnerModel: LearnerModel | undefined,
  conceptInsights: ConceptBusInsight[] = [],
  courseName?: string,
): WeakSpotRef[] {
  const busWeak = conceptInsights
    .filter((i) => i.struggling)
    .slice(0, 3)
    .map((i) => ({
      concept: i.concept,
      mastery: i.mastery,
      course: courseName ?? 'Workspace',
      source: 'bus' as const,
    }));

  const modelWeak = (learnerModel?.weakAreas ?? []).slice(0, 5).map((s) => ({
    concept: s.concept,
    mastery: s.mastery,
    course: courseName ?? 'Your course',
    source: 'model' as const,
  }));

  const seen = new Set<string>();
  return [...busWeak, ...modelWeak].filter((spot) => {
    const key = normalizeFocusTerm(spot.concept);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

export function buildWeakAreaWorkspaceFocus(
  concept: string,
  opts: {
    uploadedFiles: UploadedFile[];
    course?: Course | null;
    courseId?: string;
  },
): WorkspaceFocus {
  const trimmed = concept.trim();
  const courseSpan = opts.course ? findConceptSpan(opts.course, trimmed) : undefined;
  const fileSpan = findTextSpanInFiles(opts.uploadedFiles, trimmed);
  const span = courseSpan ?? fileSpan;

  return {
    term: trimmed,
    highlight: span
      ? { fileId: span.fileId, charStart: span.charStart, charEnd: span.charEnd }
      : null,
    originTool: 'dashboard',
  };
}

export function resolveWorkspaceStepForConcept(
  concept: string,
  steps: WorkspaceStepRef[],
  sourceText?: string,
): number | null {
  const norm = normalizeFocusTerm(concept);
  if (!norm) return null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (isWorkspaceQuizStep(step)) continue;
    const title = normalizeFocusTerm(step.title);
    if (title.includes(norm) || norm.includes(title)) return i;
  }

  if (sourceText?.trim()) {
    const segments: ReaderSegment[] = buildReaderSegments(sourceText);
    const byLabel = resolveWorkspaceStepForReaderLabel(concept, steps, segments, sourceText);
    if (byLabel != null) return byLabel;
  }

  return null;
}

export function isWeakSpotFocused(spot: WeakSpotRef, focusTerm?: string): boolean {
  if (!focusTerm?.trim()) return false;
  const a = normalizeFocusTerm(spot.concept);
  const b = normalizeFocusTerm(focusTerm);
  return a === b || a.includes(b) || b.includes(a);
}

/** Weak-areas rail is hidden when the learner has no weak spots to show. */
export function shouldShowWeakAreasRail(spots: WeakSpotRef[]): boolean {
  return spots.length > 0;
}
