import type { ConceptLensView } from './conceptGraphModel';
import type { ConceptBusInsight } from './conceptBusSync';
import type { LeitnerSessionContent } from './leitnerSessionModel';
import type { QuizSessionContent } from './quizSessionModel';
import type { ReaderHeatmapStepSyncReport, ReaderStepHeatSyncSummary } from './readerHeatmapStepSyncQA';
import type { WorkspaceCorrelation } from './workspaceCorrelation';
import type { WorkspaceToolId } from './taskFlows';
import { buildWorkspaceCorrelation } from './workspaceCorrelation';
import { targetQuizDifficulty } from './quizIrt';

/** Run heavy intel when hydrated, or immediately when the user opens that tool. */
export function workspaceIntelActive(
  intelReady: boolean,
  activeTool: string,
  forTool?: WorkspaceToolId,
): boolean {
  return intelReady || (forTool != null && activeTool === forTool);
}

export const EMPTY_CONCEPT_BUS_INSIGHTS: ConceptBusInsight[] = [];

export const EMPTY_READER_HEAT_SYNC: ReaderHeatmapStepSyncReport = {
  ok: true,
  mappedStepCount: 0,
  totalSteps: 0,
  struggleSegmentCount: 0,
  issues: [],
  steps: [],
};

export const EMPTY_READER_ACTIVE_STEP_SYNC: ReaderStepHeatSyncSummary = {
  stepIndex: 0,
  stepTitle: '',
  segmentIndex: null,
  segmentLabel: null,
  heatLevel: 'none',
  heatScore: 0,
  heatReasons: [],
  synced: true,
};

export const EMPTY_LEITNER_SESSION: LeitnerSessionContent = {
  cards: [],
  weakExtraction: true,
  passageGrounded: false,
  hasSource: false,
};

export const EMPTY_QUIZ_SESSION: QuizSessionContent = {
  items: [],
  weakExtraction: true,
  passageGrounded: false,
  hasSource: false,
};

export function stubConceptLensView(concept: string): ConceptLensView {
  return {
    activeConcept: concept.trim(),
    mastery: 0,
    engagement: 0,
    struggling: false,
    confident: false,
    sourceSections: [],
    readerStepIndex: null,
    prerequisites: [],
    related: [],
    followUp: [],
    contrasted: [],
    weakConcepts: [],
    toolHits: [],
    suggestedActions: ['open-reader'],
    hasGraph: false,
  };
}

export function stubWorkspaceCorrelation(input: {
  progressKey: string;
  concept: string;
  conceptMastery: number;
  courseId?: string;
  focusTerm?: string;
  stepIndex: number;
  stepCount: number;
  glossaryCount: number;
  compareRowCount: number;
  annotationSyncVersion: number;
  quizAbility: number;
}): WorkspaceCorrelation {
  return buildWorkspaceCorrelation({
    ...input,
    dueStepIndices: [],
    leitnerDueCount: 0,
    quizTargetDifficulty: targetQuizDifficulty(input.quizAbility, input.conceptMastery),
  });
}
