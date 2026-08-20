import { describe, expect, it } from 'vitest';
import {
  computeRetentionRate,
  retentionCurveFromActivities,
  retentionEvidenceFromActivities,
  weeklyLearningSignalFromActivities,
  weeklyMasteryFromActivities,
} from './retentionAnalytics';
import { categorizeSkillNodes, skillNodeFromTopic } from '../../lib/skillNodes';
import type { ActivityItem } from '../../types';

describe('retentionAnalytics', () => {
  it('computes retention rate from quiz events', () => {
    const acts: ActivityItem[] = [
      { id: '1', type: 'quiz_passed', description: 'ok', timestamp: '2026-06-01T10:00:00Z', xp: 10 },
      { id: '2', type: 'quiz_failed', description: 'miss', timestamp: '2026-06-01T11:00:00Z' },
      { id: '3', type: 'review_done', description: 'Reviewed: supply (good)', timestamp: '2026-06-02T10:00:00Z', xp: 5 },
    ];
    expect(computeRetentionRate(acts)).toBeCloseTo(2 / 3, 2);
  });

  it('builds retention curve points when enough events exist', () => {
    const acts: ActivityItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      type: i % 2 === 0 ? 'quiz_passed' as const : 'quiz_failed' as const,
      description: 'q',
      timestamp: `2026-06-0${(i % 5) + 1}T10:00:00Z`,
    }));
    const curve = retentionCurveFromActivities(acts);
    expect(curve[0]?.retention).toBe(100);
    expect(curve.length).toBeGreaterThan(3);
    expect(curve.every((point, index) => index === 0 || point.retention <= curve[index - 1]!.retention)).toBe(true);
  });

  it('does not fabricate a curve with fewer than two eligible outcomes', () => {
    const one: ActivityItem[] = [{
      id: '1',
      type: 'quiz_passed',
      description: 'Passed quiz on A',
      timestamp: '2026-06-01T10:00:00Z',
    }];

    expect(retentionCurveFromActivities([])).toEqual([]);
    expect(retentionCurveFromActivities(one)).toEqual([]);
  });

  it('gives stronger evidence a no-faster activity-projection decay', () => {
    const timestamp = '2026-06-01T10:00:00Z';
    const high: ActivityItem[] = [
      { id: 'h1', type: 'quiz_passed', description: 'ok', timestamp },
      { id: 'h2', type: 'quiz_passed', description: 'ok', timestamp },
    ];
    const low: ActivityItem[] = [
      { id: 'l1', type: 'quiz_failed', description: 'miss', timestamp },
      { id: 'l2', type: 'quiz_failed', description: 'miss', timestamp },
    ];

    const highDay14 = retentionCurveFromActivities(high).find((point) => point.day === 14)!.retention;
    const lowDay14 = retentionCurveFromActivities(low).find((point) => point.day === 14)!.retention;
    expect(highDay14).toBeGreaterThan(lowDay14);
  });

  it('uses explicit review ratings and excludes legacy outcome-less reviews', () => {
    const activities: ActivityItem[] = [
      { id: '1', type: 'review_done', description: 'Reviewed: A (again)', timestamp: '2026-06-01T10:00:00Z' },
      { id: '2', type: 'review_done', description: 'Reviewed: A (hard)', timestamp: '2026-06-01T11:00:00Z' },
      { id: '3', type: 'review_done', description: 'Legacy review', timestamp: '2026-06-01T12:00:00Z' },
    ];

    expect(retentionEvidenceFromActivities(activities)).toEqual({
      eligibleEvents: 2,
      successes: 1,
      failures: 1,
    });
    expect(computeRetentionRate(activities)).toBe(0.5);
  });

  it('returns a dated seven-day activity signal with gaps instead of fake zero mastery', () => {
    const now = new Date('2026-08-20T12:00:00');
    const activities: ActivityItem[] = [
      { id: '1', type: 'quiz_passed', description: 'ok', timestamp: '2026-08-20T09:00:00' },
      { id: '2', type: 'lesson_complete', description: 'lesson', timestamp: '2026-08-20T10:00:00' },
    ];

    const signal = weeklyLearningSignalFromActivities(activities, now);

    expect(signal).toHaveLength(7);
    expect(signal[0]?.score).toBeNull();
    expect(signal[6]).toEqual({ date: '2026-08-20', score: 23, activityCount: 2 });
  });

  it('retains the legacy seven-number state adapter', () => {
    const weekly = weeklyMasteryFromActivities([]);
    expect(weekly).toHaveLength(7);
    expect(weekly).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('skillNodes', () => {
  it('categorizes mastery bands', () => {
    const nodes = [
      skillNodeFromTopic({ id: 't1', title: 'A', description: '', lessons: [], mastery: 85, prerequisites: [], order: 1, isLocked: false, estimatedMinutes: 10, conceptCount: 1, retentionPrediction: 80 }, 'c1'),
      skillNodeFromTopic({ id: 't2', title: 'B', description: '', lessons: [], mastery: 30, prerequisites: [], order: 2, isLocked: false, estimatedMinutes: 10, conceptCount: 1, retentionPrediction: 40 }, 'c1'),
    ];
    const bands = categorizeSkillNodes(nodes);
    expect(bands.strongAreas).toHaveLength(1);
    expect(bands.weakAreas).toHaveLength(1);
  });
});
