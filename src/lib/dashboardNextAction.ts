/**
 * Dashboard next-action projection when no active workspace session (§2.3).
 * Delegates scoring to unifiedAdaptiveScheduler.recommendDailyPlan().
 */

import type { DashboardStats, LearnerModel, Task } from '../types';
import type { Lang } from './i18n';
import type { BetaMastery } from './pedagogy';
import { recommendDailyPlan } from './unifiedAdaptiveScheduler';
import type { WorkspaceToolId } from './taskFlows';
import type { WorkspaceLiveSync } from './workspaceStoreSpine';

export type DashboardNextActionKind =
  | 'weak-area'
  | 'review-due'
  | 'critical-task'
  | 'exam-prep'
  | 'start-session';

export type SimulatorDeepTab = 'exam-prep';

export type DashboardNextAction = {
  kind: DashboardNextActionKind;
  label: string;
  reason: string;
  concept?: string;
  taskId?: string;
  courseId?: string;
  topicId?: string;
  workspaceTool?: WorkspaceToolId;
  simulatorTab?: SimulatorDeepTab;
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

export type WorkspacePracticeLaunch = {
  tool: WorkspaceToolId;
  concept?: string;
  courseId?: string;
  simulatorTab?: SimulatorDeepTab;
};

export type DashboardNextActionHandlers = {
  onStartTask?: (taskId: string) => void;
  onNavigateTasks?: () => void;
  onOpenExamTimer?: () => void;
  onOpenWorkspace?: () => void;
  onFocusWeakArea?: (concept: string) => void;
  onStartSession?: () => void;
  onOpenWorkspacePractice?: (launch: WorkspacePracticeLaunch) => void;
};

export function executeDashboardNextAction(
  action: DashboardNextAction,
  handlers: DashboardNextActionHandlers,
): void {
  const launchFromAction = (): WorkspacePracticeLaunch | null => {
    if (!action.workspaceTool) return null;
    return {
      tool: action.workspaceTool,
      concept: action.concept,
      courseId: action.courseId,
      simulatorTab: action.simulatorTab,
    };
  };

  switch (action.kind) {
    case 'critical-task':
      if (action.taskId) handlers.onStartTask?.(action.taskId);
      else handlers.onNavigateTasks?.();
      break;
    case 'review-due': {
      const launch = launchFromAction();
      if (launch && handlers.onOpenWorkspacePractice) handlers.onOpenWorkspacePractice(launch);
      else handlers.onNavigateTasks?.();
      break;
    }
    case 'exam-prep':
      if (action.taskId) handlers.onStartTask?.(action.taskId);
      else {
        const launch = launchFromAction();
        if (launch && handlers.onOpenWorkspacePractice) handlers.onOpenWorkspacePractice(launch);
        else handlers.onOpenExamTimer?.() ?? handlers.onOpenWorkspace?.();
      }
      break;
    case 'weak-area': {
      const launch = launchFromAction();
      if (launch && handlers.onOpenWorkspacePractice) handlers.onOpenWorkspacePractice(launch);
      else if (action.concept) handlers.onFocusWeakArea?.(action.concept);
      else handlers.onOpenWorkspace?.();
      break;
    }
    case 'start-session':
      handlers.onStartSession?.() ?? handlers.onNavigateTasks?.();
      break;
  }
}
