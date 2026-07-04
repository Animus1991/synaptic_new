import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../types';
import {
  countRecentConsecutiveQuizFailures,
  conceptsWithQuizFailStreak,
  recommendPracticeToolForConcept,
  QUIZ_FAIL_STREAK_THRESHOLD,
} from './adaptiveGapRouting';

function fail(concept: string, ts: string): ActivityItem {
  return { id: `f-${ts}`, type: 'quiz_failed', description: `Missed quiz on ${concept}`, timestamp: ts };
}

function pass(concept: string, ts: string): ActivityItem {
  return { id: `p-${ts}`, type: 'quiz_passed', description: `Passed quiz on ${concept}`, timestamp: ts };
}

describe('adaptiveGapRouting', () => {
  it('routes to feynman after three consecutive failures', () => {
    const activities = [
      fail('Elasticity', '2026-07-04T12:00:00Z'),
      fail('Elasticity', '2026-07-04T11:00:00Z'),
      fail('Elasticity', '2026-07-04T10:00:00Z'),
    ];
    expect(countRecentConsecutiveQuizFailures(activities, 'Elasticity')).toBe(3);
    expect(recommendPracticeToolForConcept('Elasticity', activities)).toBe('feynman');
  });

  it('resets streak on pass', () => {
    const activities = [
      fail('Elasticity', '2026-07-04T12:00:00Z'),
      pass('Elasticity', '2026-07-04T11:00:00Z'),
      fail('Elasticity', '2026-07-04T10:00:00Z'),
    ];
    expect(countRecentConsecutiveQuizFailures(activities, 'Elasticity')).toBe(1);
    expect(recommendPracticeToolForConcept('Elasticity', activities)).toBe('quiz');
  });

  it('lists concepts meeting fail streak threshold', () => {
    const activities = [
      fail('Tariffs', '2026-07-04T09:00:00Z'),
      fail('Tariffs', '2026-07-04T08:00:00Z'),
      fail('Tariffs', '2026-07-04T07:00:00Z'),
      fail('GDP', '2026-07-04T06:00:00Z'),
    ];
    const streaks = conceptsWithQuizFailStreak(activities, QUIZ_FAIL_STREAK_THRESHOLD);
    expect(streaks).toHaveLength(1);
    expect(streaks[0]?.concept).toBe('Tariffs');
    expect(streaks[0]?.failStreak).toBe(3);
  });
});
