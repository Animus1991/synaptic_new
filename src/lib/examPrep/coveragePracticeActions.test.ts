import { describe, expect, it } from 'vitest';
import {
  buildCoveragePracticeTarget,
  pickNextIncompleteTopic,
  recommendToolForTopic,
} from './coveragePracticeActions';
import type { SyllabusCoverageSnapshot } from './syllabusCoverageTracker';
import { mockDashboardStats } from '../../demo/mockData';

const snapshot: SyllabusCoverageSnapshot = {
  courseId: 'c1',
  courseTitle: 'Micro',
  daysToExam: 5,
  totalTopics: 2,
  completedTopics: 0,
  remainingTopics: 2,
  totalLessons: 3,
  completedLessons: 0,
  coveragePct: 0,
  topics: [
    {
      topicId: 't1',
      title: 'Elasticity',
      totalLessons: 2,
      completedLessons: 0,
      mastery: 35,
      isComplete: false,
    },
    {
      topicId: 't2',
      title: 'Welfare',
      totalLessons: 1,
      completedLessons: 1,
      mastery: 90,
      isComplete: true,
    },
  ],
};

const stats = { ...mockDashboardStats, reviewsDue: 2 };

describe('coveragePracticeActions', () => {
  it('picks least-complete incomplete topic', () => {
    expect(pickNextIncompleteTopic(snapshot)?.topicId).toBe('t1');
  });

  it('recommends simulator near exam', () => {
    expect(recommendToolForTopic(snapshot.topics[0]!, stats, 5)).toBe('simulator');
  });

  it('recommends leitner when reviews due and mastery low', () => {
    expect(recommendToolForTopic(snapshot.topics[0]!, stats, null)).toBe('leitner');
  });

  it('builds practice target with exam-prep tab for simulator', () => {
    const target = buildCoveragePracticeTarget(snapshot, stats, 5);
    expect(target?.tool).toBe('simulator');
    expect(target?.simulatorTab).toBe('exam-prep');
    expect(target?.topicTitle).toBe('Elasticity');
  });
});
