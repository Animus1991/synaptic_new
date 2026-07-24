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
});
