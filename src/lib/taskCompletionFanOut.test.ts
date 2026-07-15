import { describe, expect, it } from 'vitest';
import {
  applyDashboardStatsOnTaskComplete,
  applyLearnerModelOnTaskComplete,
  markTaskCompleted,
  retrievalPerformanceDeltaForTask,
  taskCompletionActivityLabel,
} from './taskCompletionFanOut';
import { mockDashboardStats, mockLearnerModel, mockTasks } from '../demo/mockData';

describe('taskCompletionFanOut', () => {
  const spacedReview = mockTasks.find((t) => t.id === 'task1')!;
  const lessonTask = mockTasks.find((t) => t.id === 'task2')!;

  it('markTaskCompleted sets status and is idempotent', () => {
    const first = markTaskCompleted(mockTasks, 'task2');
    expect(first.task?.id).toBe('task2');
    expect(first.nextTasks.find((t) => t.id === 'task2')?.status).toBe('completed');

    const again = markTaskCompleted(first.nextTasks, 'task2');
    expect(again.task).toBeNull();
    expect(again.nextTasks).toEqual(first.nextTasks);
  });

  it('applyDashboardStatsOnTaskComplete increments XP and decrements reviews for spaced tasks', () => {
    const afterReview = applyDashboardStatsOnTaskComplete(mockDashboardStats, spacedReview);
    expect(afterReview.todayXP).toBe(mockDashboardStats.todayXP + spacedReview.xpReward);
    expect(afterReview.tasksCompleted).toBe(mockDashboardStats.tasksCompleted + 1);
    expect(afterReview.reviewsDue).toBe(mockDashboardStats.reviewsDue - 1);

    const afterLesson = applyDashboardStatsOnTaskComplete(mockDashboardStats, lessonTask);
    expect(afterLesson.reviewsDue).toBe(mockDashboardStats.reviewsDue);
  });

  it('applyLearnerModelOnTaskComplete bumps sessions and retrieval performance', () => {
    const before = mockLearnerModel.totalSessions;
    const next = applyLearnerModelOnTaskComplete(mockLearnerModel, spacedReview);
    expect(next.totalSessions).toBe(before + 1);
    expect(next.retrievalPerformance).toBeGreaterThan(mockLearnerModel.retrievalPerformance);
  });

  it('retrievalPerformanceDeltaForTask distinguishes spaced vs regular tasks', () => {
    expect(retrievalPerformanceDeltaForTask(spacedReview)).toBe(0.03);
    expect(retrievalPerformanceDeltaForTask(lessonTask)).toBe(0.01);
  });

  it('taskCompletionActivityLabel includes task title', () => {
    expect(taskCompletionActivityLabel(lessonTask)).toBe(`Completed: ${lessonTask.title}`);
  });
});
