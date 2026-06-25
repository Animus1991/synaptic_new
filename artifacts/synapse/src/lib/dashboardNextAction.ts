/**
 * Dashboard next-action projection when no active workspace session (§2.3).
 */

import type { DashboardStats, LearnerModel, Task } from '../types';
import type { Lang } from './i18n';
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

export function selectDashboardNextAction(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  tasks: Task[];
  stats: DashboardStats;
  workspaceLive?: WorkspaceLiveSync | null;
  daysToExam?: number | null;
}): DashboardNextAction | null {
  const { lang, learnerModel, tasks, stats, workspaceLive, daysToExam = null } = opts;
  const isEl = lang === 'el';

  if (workspaceLive && !workspaceLiveIsStale(workspaceLive) && workspaceLive.nextAction) {
    return null;
  }

  if (daysToExam !== null && daysToExam <= 14) {
    const examTask = findPendingTask(tasks, (t) => t.type === 'exam-prep');
    return {
      kind: 'exam-prep',
      label: isEl ? 'Προετοιμασία εξέτασης' : 'Exam prep',
      reason: daysToExam === 0
        ? (isEl ? 'Η εξέταση είναι σήμερα — τελευταία προετοιμασία' : 'Exam is today — final prep')
        : (isEl
          ? `${daysToExam} ημέρ${daysToExam === 1 ? 'α' : 'ες'} μέχρι την εξέταση`
          : `${daysToExam} day${daysToExam === 1 ? '' : 's'} until exam`),
      taskId: examTask?.id,
    };
  }

  const critical = tasks.find(
    (t) => t.status === 'pending' && (t.priority === 'critical' || t.priority === 'high'),
  );
  if (critical) {
    return {
      kind: 'critical-task',
      label: isEl ? 'Έναρξη προτεραιότητας' : 'Start priority task',
      reason: isEl ? `Εκκρεμεί: ${critical.title}` : `Pending: ${critical.title}`,
      taskId: critical.id,
    };
  }

  if (stats.reviewsDue > 0) {
    return {
      kind: 'review-due',
      label: isEl ? 'Επανάληψη' : 'Reviews due',
      reason: isEl
        ? `${stats.reviewsDue} επαναλήψεις για σήμερα`
        : `${stats.reviewsDue} reviews due today`,
    };
  }

  const weakest = [...learnerModel.weakAreas].sort((a, b) => a.mastery - b.mastery)[0];
  if (weakest && weakest.mastery < 60) {
    return {
      kind: 'weak-area',
      label: isEl ? 'Εστίαση αδύναμης έννοιας' : 'Focus weak concept',
      reason: isEl
        ? `«${weakest.concept}» — ${weakest.mastery}% κατάκτηση`
        : `"${weakest.concept}" — ${weakest.mastery}% mastery`,
      concept: weakest.concept,
    };
  }

  const openMisconception = learnerModel.misconceptions.find((m) => !m.corrected);
  if (openMisconception) {
    return {
      kind: 'weak-area',
      label: isEl ? 'Διόρθωση παρανόησης' : 'Fix misconception',
      reason: openMisconception.description,
      concept: openMisconception.concept,
    };
  }

  if (learnerModel.totalSessions === 0) {
    return {
      kind: 'start-session',
      label: isEl ? 'Ξεκίνα συνεδρία' : 'Start a session',
      reason: isEl
        ? 'Ξεκίνα με μια σύντομη συγκεντρωμένη συνεδρία μελέτης'
        : 'Begin with a short focused study session',
    };
  }

  return null;
}
