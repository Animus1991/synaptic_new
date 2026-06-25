/**
 * Bidirectional Reader ↔ lesson-rail sync — pure bridge used by StudyWorkspace
 * and CognitiveReader section nav. Keeps component wiring testable without DOM.
 */

import { buildReaderSegments } from './readerDocumentLayout';
import {
  isWorkspaceQuizStep,
  resolveReaderSegmentForWorkspaceStep,
  resolveWorkspaceStepForReaderLabel,
  type WorkspaceStepRef,
} from './readerStepSync';

export type ReaderStepSyncAction =
  | { type: 'select-step'; stepIndex: number; focusReader: true }
  | { type: 'noop' };

export type StepReaderSyncView = {
  stepIndex: number;
  readerSegmentIndex: number | null;
  focusReader: boolean;
};

/** Reader section chip → workspace step (StudyWorkspace.handleReaderSectionNavSelect). */
export function resolveReaderNavToStep(
  label: string,
  steps: WorkspaceStepRef[],
  sourceText: string,
): ReaderStepSyncAction {
  const source = sourceText.trim();
  if (!source || !label.trim()) return { type: 'noop' };
  const segments = buildReaderSegments(source);
  const stepIdx = resolveWorkspaceStepForReaderLabel(label, steps, segments, source);
  if (stepIdx == null || stepIdx < 0) return { type: 'noop' };
  return { type: 'select-step', stepIndex: stepIdx, focusReader: true };
}

/** Workspace step → reader segment highlight (readerStepSegmentIndex memo). */
export function resolveStepToReaderSegment(
  stepIndex: number,
  steps: WorkspaceStepRef[],
  sourceText: string,
): number | null {
  const source = sourceText.trim();
  if (!source) return null;
  const segments = buildReaderSegments(source);
  return resolveReaderSegmentForWorkspaceStep(stepIndex, steps, segments, source);
}

/** All step → segment indices for heatmap + lesson rail (Wave 6.8a). */
export function buildStepToSegmentMap(
  steps: WorkspaceStepRef[],
  sourceText: string,
): Record<number, number> {
  const source = sourceText.trim();
  if (!source) return {};
  const segments = buildReaderSegments(source);
  const map: Record<number, number> = {};
  steps.forEach((_, i) => {
    const seg = resolveReaderSegmentForWorkspaceStep(i, steps, segments, source);
    if (seg != null) map[i] = seg;
  });
  return map;
}

/** Whether selecting a step should switch to Reader (quiz steps stay on current tool). */
export function shouldFocusReaderOnStepSelect(step: WorkspaceStepRef, hasSource: boolean): boolean {
  return hasSource && !isWorkspaceQuizStep(step);
}

/** Combined view for a step selection — segment index + whether Reader opens. */
export function buildStepReaderSyncView(
  stepIndex: number,
  steps: WorkspaceStepRef[],
  sourceText: string,
  hasSource: boolean,
): StepReaderSyncView {
  const step = steps[stepIndex];
  return {
    stepIndex,
    readerSegmentIndex: step ? resolveStepToReaderSegment(stepIndex, steps, sourceText) : null,
    focusReader: step ? shouldFocusReaderOnStepSelect(step, hasSource) : false,
  };
}

export type WorkspaceStepSelectResult = {
  stepIndex: number;
  focusReader: boolean;
  readerSegmentIndex: number | null;
};

/** Mirrors StudyWorkspace `selectWorkspaceStep` + `readerStepSegmentIndex` for tests. */
export function applyWorkspaceStepSelect(
  stepIndex: number,
  steps: WorkspaceStepRef[],
  sourceText: string,
  hasSource: boolean,
  opts?: { focusReader?: boolean },
): WorkspaceStepSelectResult {
  const view = buildStepReaderSyncView(stepIndex, steps, sourceText, hasSource);
  return {
    stepIndex,
    focusReader: Boolean(opts?.focusReader && view.focusReader),
    readerSegmentIndex: view.readerSegmentIndex,
  };
}

/** Apply reader section nav the way StudyWorkspace.handleReaderSectionNavSelect does. */
export function applyReaderSectionNav(
  currentStepIndex: number,
  label: string,
  steps: WorkspaceStepRef[],
  sourceText: string,
): ReaderStepSyncAction {
  if (isReaderNavNoop(currentStepIndex, label, steps, sourceText)) {
    return { type: 'noop' };
  }
  return resolveReaderNavToStep(label, steps, sourceText);
}

/**
 * After reprocess shrinks or reshapes steps, clamp saved index and rebuild reader sync view.
 * Returns null segment when the new outline no longer maps to source sections.
 */
export function resolveSyncAfterReprocess(
  savedStepIndex: number,
  oldStepCount: number,
  newSteps: WorkspaceStepRef[],
  sourceText: string,
  hasSource = true,
): StepReaderSyncView {
  const stepIndex = resolveStepAfterReprocess(savedStepIndex, newSteps.length, oldStepCount);
  return buildStepReaderSyncView(stepIndex, newSteps, sourceText, hasSource);
}

/** Round-trip: step → segment label → same step index (when labels align). */
export function readerStepRoundTrip(
  stepIndex: number,
  steps: WorkspaceStepRef[],
  sourceText: string,
): number | null {
  const source = sourceText.trim();
  if (!source) return null;
  const segments = buildReaderSegments(source);
  const segIdx = resolveReaderSegmentForWorkspaceStep(stepIndex, steps, segments, source);
  if (segIdx == null) return null;
  const label = segments[segIdx]?.content.split('\n').find((l) => l.trim())?.trim()
    ?? segments[segIdx]?.content.slice(0, 80);
  if (!label) return null;
  return resolveWorkspaceStepForReaderLabel(label, steps, segments, source);
}

/** Clamp saved step index after step count changes (reprocess / outline refresh). */
export function clampWorkspaceStepIndex(stepIndex: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  if (stepIndex < 0) return 0;
  if (stepIndex >= stepCount) return stepCount - 1;
  return stepIndex;
}

/**
 * When reprocess changes step count, preserve relative position instead of invalid index.
 */
export function resolveStepAfterReprocess(
  savedStepIndex: number,
  newStepCount: number,
  oldStepCount: number,
): number {
  if (newStepCount <= 0) return 0;
  if (savedStepIndex < 0) return 0;
  if (savedStepIndex < newStepCount) return savedStepIndex;
  if (oldStepCount <= 1) return clampWorkspaceStepIndex(savedStepIndex, newStepCount);
  const ratio = savedStepIndex / (oldStepCount - 1);
  return clampWorkspaceStepIndex(Math.round(ratio * (newStepCount - 1)), newStepCount);
}

/** True when nav would re-select the already active step (avoid redundant updates). */
export function isReaderNavNoop(
  currentStepIndex: number,
  label: string,
  steps: WorkspaceStepRef[],
  sourceText: string,
): boolean {
  const action = resolveReaderNavToStep(label, steps, sourceText);
  if (action.type === 'noop') return true;
  return action.stepIndex === currentStepIndex;
}
