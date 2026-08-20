import { describe, expect, it } from 'vitest';
import {
  buildRetentionForecast,
  fsrsRetrievability,
  quizOutcomeToFsrsRating,
  summarizeRetentionForecast,
  applyFsrsToSpacing,
} from './adaptiveScheduler';
import type { SpacingData } from '../types';

describe('FSRS retention forecast (Sprint G)', () => {
  it('maps quiz outcomes to FSRS ratings', () => {
    expect(quizOutcomeToFsrsRating(false, 90)).toBe('again');
    expect(quizOutcomeToFsrsRating(true, 90)).toBe('easy');
    expect(quizOutcomeToFsrsRating(true, 70)).toBe('good');
    expect(quizOutcomeToFsrsRating(true, 50)).toBe('hard');
  });

  it('computes retrievability for scheduled concepts', () => {
    const spacing = applyFsrsToSpacing(undefined, 'elasticity', 'good');
    const r = fsrsRetrievability(spacing);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('summarizes forecast for active spacing rows', () => {
    const rows: SpacingData[] = [
      applyFsrsToSpacing(undefined, 'a', 'good'),
      applyFsrsToSpacing(undefined, 'b', 'hard'),
    ];
    const summary = summarizeRetentionForecast(rows);
    expect(summary.trackedConcepts).toBe(2);
    expect(summary.avgRetrievabilityToday).toBeGreaterThan(0);
    expect(buildRetentionForecast(rows, 7)).toHaveLength(8);
  });

  it('does not fabricate a perfect forecast without tracked concepts', () => {
    expect(buildRetentionForecast([], 7)).toEqual([]);
    expect(summarizeRetentionForecast([])).toEqual({
      avgRetrievabilityToday: 0,
      dueNext7Days: 0,
      overdueNow: 0,
      trackedConcepts: 0,
    });
  });

  it('separates overdue reviews from future seven-day load', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    const row = (concept: string, nextReview: string): SpacingData => ({
      concept,
      interval: 3,
      nextReview,
      stability: 4,
      difficulty: 0.5,
      reviewCount: 3,
    });
    const rows = [
      row('overdue', '2026-08-19T12:00:00.000Z'),
      row('soon', '2026-08-22T12:00:00.000Z'),
      row('later', '2026-09-10T12:00:00.000Z'),
    ];

    const summary = summarizeRetentionForecast(rows, now);
    expect(summary.overdueNow).toBe(1);
    expect(summary.dueNext7Days).toBe(1);
  });
});
