import { describe, expect, it } from 'vitest';
import {
  applyFsrsToSpacing,
  FSRS_ALGORITHM_VERSION,
  scheduleFsrsReview,
} from './adaptiveScheduler';

describe('adaptiveScheduler (FSRS-6)', () => {
  it('reports the algorithm version used by the installed scheduler', () => {
    expect(FSRS_ALGORITHM_VERSION).toBe('FSRS-6');
  });

  it('schedules a new card with positive interval on Good', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    const result = scheduleFsrsReview(undefined, 'elasticity', 'good', now);
    expect(result.interval).toBeGreaterThan(0);
    expect(result.interval).toBeLessThan(1);
    expect(result.reviewCount).toBe(1);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.fsrsCard.algorithmVersion).toBe('FSRS-6');
    expect(result.fsrsCard.due).toBe(result.nextReview);
    expect(result.fsrsCard.lastReview).toBe(now.toISOString());
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

  it('reconstructs elapsed time from the persisted due date and interval', () => {
    const reviewedAt = new Date('2026-08-01T12:00:00.000Z');
    const first = applyFsrsToSpacing(undefined, 'supply', 'good', reviewedAt);
    const dueAt = new Date(first.nextReview);
    const next = scheduleFsrsReview(first, 'supply', 'good', dueAt);

    expect(next.reviewCount).toBe(2);
    expect(next.interval).toBeGreaterThan(0);
    expect(next.stability).toBeGreaterThan(0);
    expect(next.fsrsCard.lastReview).toBe(dueAt.toISOString());
  });

  it('persists exact FSRS card state across reviews', () => {
    const firstAt = new Date('2026-08-01T12:00:00.000Z');
    const first = applyFsrsToSpacing(undefined, 'elasticity', 'good', firstAt);
    const secondAt = new Date(first.nextReview);
    const second = applyFsrsToSpacing(first, 'elasticity', 'good', secondAt);

    expect(first.fsrsCard).toBeDefined();
    expect(second.fsrsCard?.reps).toBe(2);
    expect(second.fsrsCard?.lastReview).toBe(secondAt.toISOString());
    expect(second.nextReview).toBe(second.fsrsCard?.due);
  });

  it('uses elapsed time from exact persisted state when a review is late', () => {
    const firstAt = new Date('2026-08-01T12:00:00.000Z');
    const first = applyFsrsToSpacing(undefined, 'supply', 'good', firstAt);
    const dueAt = new Date(first.nextReview);
    const onTime = scheduleFsrsReview(first, 'supply', 'good', dueAt);
    const lateAt = new Date(dueAt.getTime() + 10 * 86_400_000);
    const late = scheduleFsrsReview(first, 'supply', 'good', lateAt);

    expect(late.stability).not.toBe(onTime.stability);
    expect(late.nextReview).not.toBe(onTime.nextReview);
  });
});
