import { describe, expect, it } from 'vitest';
import {
  loadAllDeckStates,
  orderDeckByDueQueue,
} from './leitnerDeckSync';
import { buildDueHeatmap } from './leitnerDueHeatmap';

describe('leitnerDeckSync', () => {
  it('prioritizes due cards from spacing intervals', () => {
    const cards = [
      { front: 'Elasticity', back: 'a' },
      { front: 'Supply', back: 'b' },
    ];
    const spacing = [{
      concept: 'Elasticity',
      interval: 2,
      nextReview: new Date(Date.now() - 86400000).toISOString(),
      stability: 2,
      difficulty: 0.3,
      reviewCount: 1,
    }];
    const { ordered, dueCount } = orderDeckByDueQueue(cards, spacing, 'elasticity');
    expect(dueCount).toBeGreaterThan(0);
    expect(ordered[0]?.front).toBe('Elasticity');
  });

  it('returns an empty scoped deck-state map by default', () => {
    expect(loadAllDeckStates()).toEqual({});
  });
});

describe('leitnerDueHeatmap', () => {
  it('builds 7-day buckets', () => {
    const heat = buildDueHeatmap([], 'concept');
    expect(heat).toHaveLength(7);
  });
});
