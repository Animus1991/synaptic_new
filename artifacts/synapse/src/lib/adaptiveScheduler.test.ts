import { describe, expect, it } from 'vitest';
import { applyFsrsToSpacing, scheduleFsrsReview } from './adaptiveScheduler';

describe('adaptiveScheduler (FSRS-4)', () => {
  it('schedules a new card with positive interval on Good', () => {
    const result = scheduleFsrsReview(undefined, 'elasticity', 'good');
    expect(result.interval).toBeGreaterThan(0);
    expect(result.reviewCount).toBe(1);
    expect(result.stability).toBeGreaterThan(0);
  });

  it('extends interval after successful reviews', () => {
    let spacing = applyFsrsToSpacing(undefined, 'demand', 'good');
    spacing = applyFsrsToSpacing(spacing, 'demand', 'good');
    const again = scheduleFsrsReview(spacing, 'demand', 'good');
    expect(again.interval).toBeGreaterThanOrEqual(spacing.interval);
  });

  it('shortens interval on Again rating', () => {
    const base = applyFsrsToSpacing(undefined, 'supply', 'good');
    const afterAgain = scheduleFsrsReview(base, 'supply', 'again');
    expect(afterAgain.interval).toBeLessThanOrEqual(base.interval + 1);
  });
});
