import { describe, expect, it } from 'vitest';
import { buildDashboardSmartCTAs } from './dashboardSmartCTAs';
import type { DashboardNextAction } from '../dashboardNextAction';
import type { SyllabusCoverageSnapshot } from './syllabusCoverageTracker';
import { mockDashboardStats } from '../../demo/mockData';

const stats = mockDashboardStats;

const snapshot: SyllabusCoverageSnapshot = {
  courseId: 'c1',
  courseTitle: 'Micro',
  daysToExam: 10,
  totalTopics: 1,
  completedTopics: 0,
  remainingTopics: 1,
  totalLessons: 2,
  completedLessons: 0,
  coveragePct: 0,
  topics: [
    {
      topicId: 't1',
      title: 'Supply',
      totalLessons: 2,
      completedLessons: 0,
      mastery: 40,
      isComplete: false,
    },
  ],
};

describe('buildDashboardSmartCTAs', () => {
  it('merges scheduler, coverage, and review CTAs without duplicates', () => {
    const action: DashboardNextAction = {
      kind: 'exam-prep',
      label: 'Exam prep',
      reason: '5 days until exam',
      workspaceTool: 'simulator',
      simulatorTab: 'exam-prep',
    };
    const ctas = buildDashboardSmartCTAs({
      lang: 'en',
      dashboardAction: action,
      snapshot,
      stats,
      daysToExam: 5,
    });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    expect(ctas.some((c) => c.id.startsWith('scheduler-'))).toBe(true);
    expect(ctas.some((c) => c.id.startsWith('coverage-'))).toBe(true);
    expect(ctas.some((c) => c.id === 'reviews-leitner')).toBe(true);
  });

  it('caps at three CTAs', () => {
    const action: DashboardNextAction = {
      kind: 'review-due',
      label: 'Reviews due',
      reason: '3 due',
      workspaceTool: 'leitner',
    };
    const ctas = buildDashboardSmartCTAs({
      lang: 'en',
      dashboardAction: action,
      snapshot,
      stats,
      daysToExam: null,
    });
    expect(ctas.length).toBeLessThanOrEqual(3);
  });
});
