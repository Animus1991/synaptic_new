import type { WorkspaceToolId } from './taskFlows';
import type { WorkspaceStep } from './workspaceStepTools';
import { recommendToolsForStep } from './workspaceStepTools';
import { conceptRelevanceScore } from './noteContentExtractors';

/**
 * Unified correlation record — every workspace tool reads/writes through this
 * bus so features stay harmonized (mastery ↔ steps ↔ tools ↔ focus).
 */
export type WorkspaceCorrelation = {
  progressKey: string;
  concept: string;
  conceptMastery: number;
  courseId?: string;
  focusTerm?: string;
  stepIndex: number;
  stepCount: number;
  recommendedTools: WorkspaceToolId[];
  glossaryCount: number;
  compareRowCount: number;
  dueStepIndices: number[];
  annotationSyncVersion: number;
  leitnerDueCount: number;
  timerExamTarget?: string;
  quizAbility: number;
  quizTargetDifficulty: number;
  sandboxTopSensitivityCue?: string;
};

export function resolveConceptMastery(
  concept: string,
  conceptBars: { concept: string; mastery: number }[],
  topicMastery?: number,
): number {
  const direct = conceptBars.find(
    (b) => conceptRelevanceScore(b.concept, concept) > 0.45,
  );
  if (direct) return direct.mastery;
  if (topicMastery !== undefined && topicMastery > 0) return topicMastery;
  if (conceptBars.length === 0) return 0;
  return Math.round(
    conceptBars.reduce((s, b) => s + b.mastery, 0) / conceptBars.length,
  );
}

function isQuizStep(step: WorkspaceStep): boolean {
  return /quiz|κουίζ|έλεγχος|knowledge check/i.test(`${step.type} ${step.title}`);
}

function stepRelatedMastery(
  step: WorkspaceStep,
  focusConcept: string,
  conceptMastery: number,
  conceptBars: { concept: string; mastery: number }[],
): number {
  for (const bar of conceptBars) {
    const rel = conceptRelevanceScore(bar.concept, step.title);
    if (rel > 0.35) return bar.mastery;
  }
  if (conceptRelevanceScore(focusConcept, step.title) > 0.25) return conceptMastery;
  if (/practice|εξάσκηση|example|παράδειγμα/i.test(step.type)) {
    return Math.min(conceptMastery, 55);
  }
  return conceptMastery;
}

/**
 * Adaptive step order (W2): weak areas first when mastery < 75%; quiz always last.
 */
export function orderStepsByMastery(
  steps: WorkspaceStep[],
  focusConcept: string,
  conceptMastery: number,
  conceptBars: { concept: string; mastery: number }[],
): WorkspaceStep[] {
  if (steps.length <= 2) return steps;
  const quiz = steps.filter(isQuizStep);
  const learn = steps.filter((s) => !isQuizStep(s));
  const reinforceMode = conceptMastery >= 75;

  const ranked = learn
    .map((step, index) => {
      const related = stepRelatedMastery(step, focusConcept, conceptMastery, conceptBars);
      const priority = reinforceMode ? related : 100 - related;
      return { step, priority, index };
    })
    .sort((a, b) => b.priority - a.priority || a.index - b.index)
    .map((r) => r.step);

  return [...ranked, ...quiz];
}

export function buildWorkspaceCorrelation(opts: {
  progressKey: string;
  concept: string;
  conceptMastery: number;
  courseId?: string;
  focusTerm?: string;
  stepIndex: number;
  stepCount: number;
  currentStep?: WorkspaceStep;
  glossaryCount?: number;
  compareRowCount?: number;
  dueStepIndices?: number[];
  annotationSyncVersion?: number;
  leitnerDueCount?: number;
  timerExamTarget?: string;
  quizAbility?: number;
  quizTargetDifficulty?: number;
  sandboxTopSensitivityCue?: string;
}): WorkspaceCorrelation {
  const step = opts.currentStep ?? { title: opts.concept, type: 'Core' };
  return {
    progressKey: opts.progressKey,
    concept: opts.concept,
    conceptMastery: opts.conceptMastery,
    courseId: opts.courseId,
    focusTerm: opts.focusTerm,
    stepIndex: opts.stepIndex,
    stepCount: opts.stepCount,
    recommendedTools: recommendToolsForStep(step, opts.stepIndex, opts.stepCount),
    glossaryCount: opts.glossaryCount ?? 0,
    compareRowCount: opts.compareRowCount ?? 0,
    dueStepIndices: opts.dueStepIndices ?? [],
    annotationSyncVersion: opts.annotationSyncVersion ?? 0,
    leitnerDueCount: opts.leitnerDueCount ?? 0,
    timerExamTarget: opts.timerExamTarget,
    quizAbility: opts.quizAbility ?? 0,
    quizTargetDifficulty: opts.quizTargetDifficulty ?? 0,
    sandboxTopSensitivityCue: opts.sandboxTopSensitivityCue,
  };
}
