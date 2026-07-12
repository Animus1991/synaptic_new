/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  isCourseTabId,
  readPersistedCourseTab,
  selectCanonicalMastery,
  selectCoursePageStats,
  selectCourseProgressPercent,
  selectCourseTaskMetrics,
  writePersistedCourseTab,
} from './coursePageSelectors';
import { mockCourses, mockTasks } from '../demo/mockData';

describe('coursePageSelectors', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('selectCourseProgressPercent uses completed/total lessons', () => {
    const course = { ...mockCourses[0], completedLessons: 2, totalLessons: 8 };
    expect(selectCourseProgressPercent(course)).toBe(25);
  });

  it('selectCanonicalMastery clamps course.mastery', () => {
    expect(selectCanonicalMastery({ ...mockCourses[0], mastery: 140 })).toBe(100);
    expect(selectCanonicalMastery({ ...mockCourses[0], mastery: -5 })).toBe(0);
  });

  it('selectCourseTaskMetrics counts pending and due reviews for course', () => {
    const course = mockCourses[0];
    const metrics = selectCourseTaskMetrics(course, mockTasks);
    expect(metrics.pendingTasks).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.isStalePipeline).toBe('boolean');
  });

  it('selectCoursePageStats bundles canonical fields', () => {
    const stats = selectCoursePageStats(mockCourses[0], mockTasks);
    expect(stats.masteryPercent).toBe(selectCanonicalMastery(mockCourses[0]));
    expect(stats.progressPercent).toBe(selectCourseProgressPercent(mockCourses[0]));
  });

  it('isCourseTabId validates tab ids', () => {
    expect(isCourseTabId('sources')).toBe(true);
    expect(isCourseTabId('invalid')).toBe(false);
  });

  it('readPersistedCourseTab / writePersistedCourseTab round-trip in sessionStorage', () => {
    writePersistedCourseTab('course-test-1', 'map');
    expect(readPersistedCourseTab('course-test-1')).toBe('map');
    writePersistedCourseTab('course-test-1', 'sources');
    expect(readPersistedCourseTab('course-test-1')).toBe('sources');
  });
});
