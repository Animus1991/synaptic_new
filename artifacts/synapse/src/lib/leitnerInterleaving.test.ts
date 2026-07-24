import { describe, expect, it } from 'vitest';
import { countInterleaveClusters, interleaveLeitnerDeck } from './leitnerInterleaving';

describe('leitnerInterleaving', () => {
  it('interleaves cards from different term clusters', () => {
    const cards = [
      { front: 'Supply curve' },
      { front: 'Supply elasticity' },
      { front: 'Demand curve' },
      { front: 'Demand shift' },
    ];
    const mixed = interleaveLeitnerDeck(cards);
    expect(mixed).toHaveLength(4);
    expect(mixed[0]!.front.startsWith('Supply') || mixed[0]!.front.startsWith('Demand')).toBe(true);
    if (mixed[1] && mixed[0]) {
      const firstCluster = mixed[0].front.split(/\s+/)[0];
      const secondCluster = mixed[1].front.split(/\s+/)[0];
      expect(firstCluster !== secondCluster || countInterleaveClusters(cards) === 1).toBe(true);
    }
  });

  it('counts clusters', () => {
    expect(countInterleaveClusters([
      { front: 'Alpha one' },
      { front: 'Beta two' },
    ])).toBe(2);
  });
});
