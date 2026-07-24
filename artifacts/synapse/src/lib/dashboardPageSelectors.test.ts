import { describe, expect, it } from 'vitest';
import {
  selectActiveCourses,
  selectDashboardPageStats,
  selectDashboardPageViewModel,
  selectDashboardTaskBuckets,
} from './dashboardPageSelectors';
import { mockCourses, mockDashboardStats, mockLearnerModel, mockTasks } from '../demo/mockData';

describe('dashboardPageSelectors', () => {
  it('selectDashboardTaskBuckets groups pending, critical, fix, review, and exam tasks', () => {
    const buckets = selectDashboardTaskBuckets(mockTasks);
    expect(buckets.pendingTasks.length).toBeGreaterThan(0);
    expect(buckets.criticalTasks.every((t) => t.priority === 'critical' || t.priority === 'high')).toBe(true);
    expect(buckets.fixTasks.every((t) => t.category === 'fix')).toBe(true);
    expect(buckets.firstReviewTask?.isSpacedRepetition).toBe(true);
  });

  it('selectActiveCourses excludes generating courses', () => {
    const active = selectActiveCourses(mockCourses);
    expect(active.every((c) => c.status !== 'generating')).toBe(true);
    expect(active.length).toBeLessThan(mockCourses.length);
  });

  it('selectDashboardPageStats mirrors canonical stat strip fields', () => {
    const pageStats = selectDashboardPageStats(mockDashboardStats, mockTasks, mockLearnerModel);
    expect(pageStats.todayXp).toBe(mockDashboardStats.todayXP);
    expect(pageStats.reviewsDue).toBe(mockDashboardStats.reviewsDue);
    expect(pageStats.pendingTaskCount).toBeGreaterThan(0);
  });

  it('selectDashboardPageViewModel bundles dashboard page state', () => {
    const vm = selectDashboardPageViewModel({
      stats: mockDashboardStats,
      courses: mockCourses,
      tasks: mockTasks,
      learnerModel: mockLearnerModel,
    });
    expect(vm.isEmpty).toBe(false);
    expect(vm.activeCourses.length).toBe(selectActiveCourses(mockCourses).length);
    expect(vm.stats.criticalTaskCount).toBe(vm.taskBuckets.criticalTasks.length);
    expect(vm.masteryTrendLast7).toHaveLength(7);
  });
});
