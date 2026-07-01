/**
 * Dashboard next-action projection when no active workspace session (§2.3).
 * Delegates scoring to unifiedAdaptiveScheduler.recommendDailyPlan().
 */

import type { DashboardStats, LearnerModel, Task } from '../types';
import type { Lang } from './i18n';
import type { BetaMastery } from './pedagogy';
import { recommendDailyPlan } from './unifiedAdaptiveScheduler';
import type { WorkspaceLiveSync } from './workspaceStoreSpine';

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

export function selectDashboardNextAction(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  betaMastery?: BetaMastery[];
  tasks: Task[];
  stats: DashboardStats;
  workspaceLive?: WorkspaceLiveSync | null;
  daysToExam?: number | null;
}): DashboardNextAction | null {
  return recommendDailyPlan({
    lang: opts.lang,
    learnerModel: opts.learnerModel,
    betaMastery: opts.betaMastery ?? [],
    tasks: opts.tasks,
    stats: opts.stats,
    workspaceLive: opts.workspaceLive,
    daysToExam: opts.daysToExam ?? null,
  }).dashboardAction;
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
