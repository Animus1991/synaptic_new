import { describe, it, expect } from 'vitest';

import { buildFsrsDueQueue, buildGlobalFsrsDueQueue, findDeckIndexForConcept } from './leitnerDueQueue';
import type { SpacingData } from '../types';

const now = new Date('2026-07-06T12:00:00Z');

function spacing(partial: Partial<SpacingData> & Pick<SpacingData, 'concept' | 'nextReview'>): SpacingData {
  return {
    interval: 3,
    stability: 2,
    difficulty: 0.5,
    reviewCount: 2,
    ...partial,
  };
}

describe('buildFsrsDueQueue', () => {
  it('orders overdue items before upcoming reviews', () => {
    const queue = buildFsrsDueQueue(
      [
        spacing({ concept: 'Future topic', nextReview: '2026-07-10T00:00:00Z' }),
        spacing({ concept: 'Overdue topic', nextReview: '2026-07-01T00:00:00Z' }),
      ],
      [{ front: 'Overdue topic', back: 'answer' }],
      'topic',
      now,
    );
    expect(queue[0]!.concept).toBe('Overdue topic');
    expect(queue[0]!.overdue).toBe(true);
  });

  it('finds deck index by concept overlap', () => {
    const idx = findDeckIndexForConcept(
      [{ front: 'What is entropy?', back: 'disorder' }],
      'entropy',
    );
    expect(idx).toBe(0);
  });
});

describe('buildGlobalFsrsDueQueue', () => {
  it('includes all concepts when no scope filter is applied', () => {
    const queue = buildGlobalFsrsDueQueue(
      [
        spacing({ concept: 'Alpha', nextReview: '2026-07-01T00:00:00Z' }),
        spacing({ concept: 'Beta', nextReview: '2026-07-08T00:00:00Z' }),
      ],
      now,
    );
    expect(queue.map((item) => item.concept)).toEqual(['Alpha', 'Beta']);
  });
});
