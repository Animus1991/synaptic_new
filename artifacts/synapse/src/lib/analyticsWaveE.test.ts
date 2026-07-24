import { describe, expect, it } from 'vitest';
import {
  analyticsRangeDays,
  filterActivitiesByRange,
} from './analyticsDateRange';
import { buildSubjectMasteryTiles } from './subjectMasteryAnalytics';
import { buildStudyBehaviorModel } from './studyBehaviorCharts';
import type { ActivityItem, Course } from '../types';

const now = Date.parse('2026-07-15T12:00:00.000Z');

const act = (daysAgo: number, type: ActivityItem['type'] = 'quiz_passed'): ActivityItem => ({
  id: `a-${daysAgo}-${type}`,
  type,
  description: `Physics quiz day ${daysAgo}`,
  timestamp: new Date(now - daysAgo * 86400000).toISOString(),
});

describe('analyticsDateRange', () => {
  it('maps ranges to day windows', () => {
    expect(analyticsRangeDays('7d')).toBe(7);
    expect(analyticsRangeDays('30d')).toBe(30);
    expect(analyticsRangeDays('semester')).toBe(180);
  });

  it('filters activities by range', () => {
    const list = [act(2), act(10), act(40)];
    expect(filterActivitiesByRange(list, '7d', now)).toHaveLength(1);
    expect(filterActivitiesByRange(list, '30d', now)).toHaveLength(2);
    expect(filterActivitiesByRange(list, 'semester', now)).toHaveLength(3);
  });
});

describe('buildSubjectMasteryTiles', () => {
  it('builds a tile per ready course with pending concepts', () => {
    const courses = [
      {
        id: 'c1',
        title: 'Physics',
        description: '',
        subject: 'sci',
        color: '#123',
        icon: 'atom',
        totalLessons: 2,
        completedLessons: 0,
        mastery: 42,
        difficulty: 'mixed' as const,
        topics: [
          { id: 't1', title: 'Force', description: '', lessons: [], mastery: 40, prerequisites: [], order: 0, isLocked: false, estimatedMinutes: 20, conceptCount: 2, retentionPrediction: 0.5 },
          { id: 't2', title: 'Energy', description: '', lessons: [], mastery: 80, prerequisites: [], order: 1, isLocked: false, estimatedMinutes: 20, conceptCount: 2, retentionPrediction: 0.7 },
        ],
        createdAt: '2026-01-01',
        estimatedHours: 1,
        sourceFiles: [],
        status: 'ready' as const,
        sourceMode: 'strict' as const,
        conceptCount: 2,
        glossaryCount: 0,
        exerciseCount: 0,
      },
    ] satisfies Course[];
    const tiles = buildSubjectMasteryTiles(courses, [act(1)], '30d');
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.mastery).toBe(42);
    expect(tiles[0]!.pendingConcepts).toBe(1);
  });
});

describe('buildStudyBehaviorModel', () => {
  it('builds bar and session-type series for the range', () => {
    const model = buildStudyBehaviorModel(
      [act(0, 'quiz_passed'), act(0, 'review_done'), act(1, 'task_complete')],
      '7d',
      'en',
    );
    expect(model.dayBars.length).toBe(7);
    expect(model.sessionTypes.some((s) => s.key === 'quiz')).toBe(true);
    expect(model.effectiveness.length).toBe(7);
  });
});
