import type { DashboardStats, LearnerModel, Task } from '../types';
import { getTaskConcept } from './taskFlows';
import { findSkillForConcept } from './skillNodes';
import { updateSkillMastery } from './pedagogy';

export function markTaskCompleted(tasks: Task[], taskId: string): { nextTasks: Task[]; task: Task | null } {
  const task = tasks.find((t) => t.id === taskId) ?? null;
  if (!task || task.status === 'completed') {
    return { nextTasks: tasks, task: null };
  }
  const nextTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: 'completed' as const } : t));
  return { nextTasks, task };
}

export function applyDashboardStatsOnTaskComplete(stats: DashboardStats, task: Task): DashboardStats {
  return {
    ...stats,
    tasksCompleted: stats.tasksCompleted + 1,
    todayXP: stats.todayXP + task.xpReward,
    weeklyXP: stats.weeklyXP + task.xpReward,
    reviewsDue: Math.max(0, stats.reviewsDue - (task.isSpacedRepetition ? 1 : 0)),
  };
}

export function retrievalPerformanceDeltaForTask(task: Task): number {
  return task.isSpacedRepetition ? 0.03 : 0.01;
}

export function applyLearnerModelOnTaskComplete(lm: LearnerModel, task: Task): LearnerModel {
  const concept = getTaskConcept(task);
  const match = findSkillForConcept(lm, concept);
  const updatedSkill = match ? updateSkillMastery(match, true, 70) : null;
  const nextWeak = updatedSkill
    ? lm.weakAreas.map((s) => (s.concept === updatedSkill.concept ? updatedSkill : s))
    : lm.weakAreas;

  return {
    ...lm,
    weakAreas: nextWeak,
    totalSessions: lm.totalSessions + 1,
    retrievalPerformance: Math.min(1, lm.retrievalPerformance + retrievalPerformanceDeltaForTask(task)),
  };
}

export function taskCompletionActivityLabel(task: Task): string {
  return `Completed: ${task.title}`;
}
