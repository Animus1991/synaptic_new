import type { LearnerModel, DashboardStats, Task } from '../types';
import { findPendingTask } from './taskFlows';
import type { ConceptBusInsight } from './conceptBusSync';
import { collectWorkspaceWeakSpots } from './workspaceWeakAreas';
import { buildToolActivityBreakdown, type ToolActivityCount } from './conceptBusPanelModel';
import type { ConceptBusState } from './workspaceConceptBus';

export function buildMiniDashboardProps(
  learnerModel: LearnerModel,
  dashboardStats: Pick<DashboardStats, 'streak' | 'reviewsDue' | 'studyTimeToday' | 'studyTimeWeek'>,
  tasks: Task[],
  onStartTask?: (taskId: string) => void,
  courseName?: string,
  opts?: {
    conceptInsights?: ConceptBusInsight[];
    extraReviewsDue?: number;
    conceptBus?: ConceptBusState;
  },
): {
  readiness: number;
  streak: number;
  reviewsDue: number;
  studyTimeToday: number;
  studyTimeWeek: number;
  recentStudyDays: number[];
  weakSpots: { concept: string; mastery: number; course: string }[];
  nextActions: { label: string; type: string; minutes: number; xp?: number; taskId?: string }[];
  conceptsMastered: number;
  totalConcepts: number;
  onStartTask?: (taskId: string) => void;
  toolActivity: ToolActivityCount[];
} {
  const weakSpots = collectWorkspaceWeakSpots(learnerModel, opts?.conceptInsights, courseName).map((s) => ({
    concept: s.concept,
    mastery: s.mastery,
    course: s.course,
  }));

  const pendingReviews = tasks.filter((t) => t.isSpacedRepetition && t.status === 'pending');
  const nextPending = findPendingTask(tasks, () => true);

  const busActions = (opts?.conceptInsights ?? [])
    .filter((i) => i.struggling)
    .slice(0, 2)
    .map((i, idx) => ({
      label: `Cross-study: ${i.concept}`,
      type: 'practice' as const,
      minutes: 14 + idx * 2,
      taskId: nextPending?.id,
    }));

  const nextActions = [
    ...pendingReviews.slice(0, 2).map((t) => ({
      label: `Review: ${t.title.split('—')[0]?.trim() ?? t.title}`,
      type: 'review' as const,
      minutes: t.estimatedMinutes,
      xp: t.xpReward,
      taskId: t.id,
    })),
    ...busActions,
    ...learnerModel.weakAreas.slice(0, 2).map((s, i) => ({
      label: `Practice: ${s.concept}`,
      type: 'practice' as const,
      minutes: 12 + i * 3,
      taskId: nextPending?.id,
    })),
  ].slice(0, 4);

  const conceptsMastered = [
    ...learnerModel.strongAreas,
    ...learnerModel.almostKnown.filter((s) => s.mastery >= 60),
    ...(opts?.conceptInsights ?? []).filter((i) => i.confident),
  ].length;

  const reviewsDue = dashboardStats.reviewsDue + (opts?.extraReviewsDue ?? 0);
  const recentStudyDays = learnerModel.heatmapData.slice(-7).map((d) => d.minutes);
  const toolActivity = opts?.conceptBus ? buildToolActivityBreakdown(opts.conceptBus) : [];

  return {
    readiness: Math.round(learnerModel.overallMastery),
    streak: dashboardStats.streak,
    reviewsDue,
    studyTimeToday: dashboardStats.studyTimeToday,
    studyTimeWeek: dashboardStats.studyTimeWeek,
    recentStudyDays,
    weakSpots,
    nextActions,
    conceptsMastered,
    totalConcepts: Math.max(conceptsMastered + learnerModel.weakAreas.length + 20, 100),
    onStartTask,
    toolActivity,
  };
}

export function buildConceptMapNodes(
  conceptBars: { concept: string; mastery: number }[],
  _focusConcept?: string,
) {
  // Deprecated: concept map is built from uploaded notes via workspaceNoteContent.
  void conceptBars;
  void _focusConcept;
  return [];
}

export function buildCompareRows(_concept: string): [string, string, string][] {
  return [];
}

export function leitnerCardsFromSpacing(
  _spacingIntervals: LearnerModel['spacingIntervals'],
  _concept?: string,
): { front: string; back: string }[] {
  return [];
}

export function readerTextFromUploads(
  _uploadedFiles: { name: string; extractedText?: string; extractedTopics?: string[] }[],
  _concept: string,
): string {
  return '';
}
