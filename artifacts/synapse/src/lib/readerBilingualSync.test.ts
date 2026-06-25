import { describe, expect, it } from 'vitest';
import { paragraphIndexForTerm } from './readerBilingualSync';

describe('readerBilingualSync', () => {
  it('finds paragraph index for focus term', () => {
    const paras = ['Supply and demand basics.', 'Price elasticity measures responsiveness.', 'Market equilibrium.'];
    expect(paragraphIndexForTerm(paras, 'elasticity')).toBe(1);
  });

  it('returns -1 when term not found', () => {
    expect(paragraphIndexForTerm(['Alpha', 'Beta'], 'gamma')).toBe(-1);
  });
});
