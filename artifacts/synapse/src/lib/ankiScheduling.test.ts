import { describe, it, expect } from 'vitest';
import { buildAnkiSchedulingTags, matchSpacingForCard } from './ankiScheduling';

describe('ankiScheduling', () => {
  it('encodes interval and due date in tags', () => {
    const tags = buildAnkiSchedulingTags({
      concept: 'ATP',
      interval: 14,
      nextReview: '2026-07-10T12:00:00Z',
      stability: 1,
      difficulty: 0.3,
      reviewCount: 3,
    });
    expect(tags).toContain('synapse:fsrs');
    expect(tags).toContain('interval:14');
    expect(tags).toContain('due:2026-07-10');
    expect(tags).toContain('reviews:3');
  });

  it('matches spacing by concept name', () => {
    const hit = matchSpacingForCard('Mitochondria', [
      { concept: 'mitochondria', interval: 7, nextReview: '2026-07-01', stability: 1, difficulty: 0.2, reviewCount: 1 },
    ]);
    expect(hit?.interval).toBe(7);
  });
});
