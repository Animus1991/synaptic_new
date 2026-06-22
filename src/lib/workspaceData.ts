import type { LearnerModel, DashboardStats, Task } from '../types';
import { findPendingTask } from './taskFlows';
import type { ConceptBusInsight } from './conceptBusSync';
import { normalizeFocusTerm } from './workspaceFocus';

export function buildMiniDashboardProps(
  learnerModel: LearnerModel,
  dashboardStats: Pick<DashboardStats, 'streak' | 'reviewsDue'>,
  tasks: Task[],
  onStartTask?: (taskId: string) => void,
  courseName?: string,
  opts?: {
    conceptInsights?: ConceptBusInsight[];
    extraReviewsDue?: number;
  },
) {
  const busWeak = (opts?.conceptInsights ?? [])
    .filter((i) => i.struggling)
    .slice(0, 3)
    .map((i) => ({
      concept: i.concept,
      mastery: i.mastery,
      course: courseName ?? 'Workspace',
    }));

  const modelWeak = learnerModel.weakAreas.slice(0, 5).map((s) => ({
    concept: s.concept,
    mastery: s.mastery,
    course: courseName ?? 'Your course',
  }));

  const seen = new Set<string>();
  const weakSpots = [...busWeak, ...modelWeak].filter((s) => {
    const key = normalizeFocusTerm(s.concept);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);

  const pendingReviews = tasks.filter((t) => t.isSpacedRepetition && t.status === 'pending');
  const nextPending = findPendingTask(tasks, () => true);

  const busActions = (opts?.conceptInsights ?? [])
    .filter((i) => i.struggling)
    .slice(0, 2)
    .map((i, idx) => ({
      label: `Cross-study: ${i.concept}`,
      type: 'practice' as const,
      minutes: 14 + idx * 2,
      xp: 40,
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
      xp: 35,
      taskId: nextPending?.id,
    })),
  ].slice(0, 4);

  const conceptsMastered = [
    ...learnerModel.strongAreas,
    ...learnerModel.almostKnown.filter((s) => s.mastery >= 60),
    ...(opts?.conceptInsights ?? []).filter((i) => i.confident),
  ].length;

  const reviewsDue = dashboardStats.reviewsDue + (opts?.extraReviewsDue ?? 0);

  return {
    readiness: Math.round(learnerModel.overallMastery),
    streak: dashboardStats.streak,
    reviewsDue,
    weakSpots,
    nextActions,
    conceptsMastered,
    totalConcepts: Math.max(conceptsMastered + learnerModel.weakAreas.length + 20, 100),
    onStartTask,
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
