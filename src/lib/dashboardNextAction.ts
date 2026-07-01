/**
 * Dashboard next-action projection when no active workspace session (§2.3).
 */

import type { DashboardStats, LearnerModel, Task } from '../types';
import type { Lang } from './i18n';
import { t } from './i18n';
import { findPendingTask } from './taskFlows';
import type { WorkspaceLiveSync } from './workspaceStoreSpine';
import { workspaceLiveIsStale } from './workspaceStoreSpine';

export type DashboardNextActionKind =
  | 'weak-area'
  | 'review-due'
  | 'critical-task'
  | 'exam-prep'
  | 'start-session';

export type DashboardNextAction = {
  kind: DashboardNextActionKind;
  label: string;
  reason: string;
  concept?: string;
  taskId?: string;
};

function examCountdownReason(lang: Lang, daysToExam: number): string {
  if (daysToExam === 0) return t('dashboardActionExamToday', lang);
  if (daysToExam === 1) return t('dashboardActionDaysUntilExamOne', lang);
  return t('dashboardActionDaysUntilExam', lang).replace('{days}', String(daysToExam));
}

export function selectDashboardNextAction(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  tasks: Task[];
  stats: DashboardStats;
  workspaceLive?: WorkspaceLiveSync | null;
  daysToExam?: number | null;
}): DashboardNextAction | null {
  const { lang, learnerModel, tasks, stats, workspaceLive, daysToExam = null } = opts;

  if (workspaceLive && !workspaceLiveIsStale(workspaceLive) && workspaceLive.nextAction) {
    return null;
  }

  if (daysToExam !== null && daysToExam <= 14) {
    const examTask = findPendingTask(tasks, (t) => t.type === 'exam-prep');
    return {
      kind: 'exam-prep',
      label: t('dashboardActionExamPrep', lang),
      reason: examCountdownReason(lang, daysToExam),
      taskId: examTask?.id,
    };
  }

  const critical = tasks.find(
    (task) => task.status === 'pending' && (task.priority === 'critical' || task.priority === 'high'),
  );
  if (critical) {
    return {
      kind: 'critical-task',
      label: t('dashboardActionStartPriority', lang),
      reason: t('dashboardActionPending', lang).replace('{title}', critical.title),
      taskId: critical.id,
    };
  }

  if (stats.reviewsDue > 0) {
    return {
      kind: 'review-due',
      label: t('dashboardActionReviewsDue', lang),
      reason: t('dashboardActionReviewsDueToday', lang).replace('{count}', String(stats.reviewsDue)),
    };
  }

  const weakest = [...learnerModel.weakAreas].sort((a, b) => a.mastery - b.mastery)[0];
  if (weakest && weakest.mastery < 60) {
    return {
      kind: 'weak-area',
      label: t('dashboardActionFocusWeak', lang),
      reason: t('dashboardActionWeakMastery', lang)
        .replace('{concept}', weakest.concept)
        .replace('{mastery}', String(weakest.mastery)),
      concept: weakest.concept,
    };
  }

  const openMisconception = learnerModel.misconceptions.find((m) => !m.corrected);
  if (openMisconception) {
    return {
      kind: 'weak-area',
      label: t('dashboardActionFixMisconception', lang),
      reason: openMisconception.description,
      concept: openMisconception.concept,
    };
  }

  if (learnerModel.totalSessions === 0) {
    return {
      kind: 'start-session',
      label: t('dashboardActionStartSession', lang),
      reason: t('dashboardActionStartSessionReason', lang),
    };
  }

  return null;
}

export type DashboardNextActionHandlers = {
  onStartTask?: (taskId: string) => void;
  onNavigateTasks?: () => void;
  onOpenExamTimer?: () => void;
  onOpenWorkspace?: () => void;
  onFocusWeakArea?: (concept: string) => void;
  onStartSession?: () => void;
};

export function executeDashboardNextAction(
  action: DashboardNextAction,
  handlers: DashboardNextActionHandlers,
): void {
  switch (action.kind) {
    case 'critical-task':
      if (action.taskId) handlers.onStartTask?.(action.taskId);
      else handlers.onNavigateTasks?.();
      break;
    case 'review-due':
      handlers.onNavigateTasks?.();
      break;
    case 'exam-prep':
      if (action.taskId) handlers.onStartTask?.(action.taskId);
      else handlers.onOpenExamTimer?.() ?? handlers.onOpenWorkspace?.();
      break;
    case 'weak-area':
      if (action.concept) handlers.onFocusWeakArea?.(action.concept);
      else handlers.onOpenWorkspace?.();
      break;
    case 'start-session':
      handlers.onStartSession?.() ?? handlers.onNavigateTasks?.();
      break;
  }
}
