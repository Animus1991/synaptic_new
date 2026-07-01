/**
 * §2.3 Derived selectors — pure projections for Progress, Concept Bus, Weak Areas, Next Action.
 */

import type { WorkspaceToolId } from './taskFlows';
import type { Lang } from './i18n';
import type { ConceptBusInsight } from './conceptBusSync';
import type { LearnerModel } from '../types';
import { buildConceptBusRows, buildToolActivityBreakdown } from './conceptBusPanelModel';
import type { ConceptBusState } from './workspaceConceptBus';
import {
  defaultEventConfidence,
  weakConceptKeysFromBus,
} from './workspaceCorrelationEvents';
import { recommendNextAction, type NextActionRecommendation } from './nextActionEngine';
import { recommendDailyPlan } from './unifiedAdaptiveScheduler';
import type { BetaMastery } from './pedagogy';
import type { DashboardStats, LearnerModel, Task } from '../types';
import { collectWorkspaceWeakSpots, type WeakSpotRef } from './workspaceWeakAreas';
import {
  buildWorkspaceContext,
  type WorkspaceContext,
} from './workspaceContextModel';

export type WorkspaceContextSnapshot = WorkspaceContext;

export function selectWorkspaceContext(opts: {
  courseId?: string;
  courseName?: string;
  concept: string;
  stepIndex: number;
  stepCount: number;
  stepTitle?: string;
  stepType?: string;
  activeTool: WorkspaceToolId;
  lang: Lang;
  sourceQuality?: number | null;
  oldPipeline?: boolean;
  pipelineVersion?: string;
}): WorkspaceContext {
  return buildWorkspaceContext({
    courseId: opts.courseId,
    courseName: opts.courseName,
    documentId: opts.courseId,
    concept: opts.concept,
    stepIndex: opts.stepIndex,
    stepCount: opts.stepCount,
    stepTitle: opts.stepTitle,
    stepType: opts.stepType,
    activeTool: opts.activeTool,
    lang: opts.lang,
    sourceQuality: opts.sourceQuality,
    oldPipeline: opts.oldPipeline,
    pipelineVersion: opts.pipelineVersion,
  });
}

export function selectWeakConcepts(
  learnerModel: LearnerModel | undefined,
  conceptInsights: ConceptBusInsight[],
  conceptBus: ConceptBusState,
  courseName?: string,
): WeakSpotRef[] {
  const fromBus = weakConceptKeysFromBus(conceptBus);
  const mergedInsights = [...conceptInsights];
  for (const concept of fromBus) {
    if (!mergedInsights.some((i) => i.concept === concept)) {
      mergedInsights.push({
        concept,
        key: concept.toLowerCase(),
        mastery: 25,
        engagement: 0,
        struggling: true,
        confident: false,
        tools: [],
        struggleScore: 1,
        lastAt: Date.now(),
      });
    }
  }
  return collectWorkspaceWeakSpots(learnerModel, mergedInsights, courseName);
}

export function selectNextBestAction(
  opts: Parameters<typeof recommendNextAction>[0],
): NextActionRecommendation | null {
  return recommendNextAction(opts);
}

export { recommendNextAction as recommendWorkspaceAction } from './nextActionEngine';

export function selectDailyPlanForTasks(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  betaMastery: BetaMastery[];
  tasks: Task[];
  stats: DashboardStats;
  daysToExam?: number | null;
}) {
  return recommendDailyPlan({
    lang: opts.lang,
    learnerModel: opts.learnerModel,
    betaMastery: opts.betaMastery,
    tasks: opts.tasks,
    stats: opts.stats,
    daysToExam: opts.daysToExam ?? null,
  });
}

export function selectToolActivity(conceptBus: ConceptBusState) {
  return buildToolActivityBreakdown(conceptBus);
}

export function selectConceptBusRows(
  conceptBus: ConceptBusState,
  focusTerm?: string,
  limit = 12,
) {
  return buildConceptBusRows(conceptBus, focusTerm, limit);
}

export function selectSourceConfidence(sourceQuality: number | null): number {
  return defaultEventConfidence(sourceQuality);
}
