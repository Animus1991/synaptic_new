import { describe, expect, it } from 'vitest';
import { suggestCounterArguments } from './debateCounterArgs';

describe('suggestCounterArguments', () => {
  it('finds hedged counter sentences from notes', () => {
    const text = `
Price elasticity of demand measures responsiveness to price changes.
However, inelastic goods do not change quantity much when prices rise sharply.
Supply and demand determine market equilibrium.
    `.trim();
    const counters = suggestCounterArguments(text, 'elasticity', 'Price elasticity measures responsiveness.');
    expect(counters.length).toBeGreaterThan(0);
    expect(counters.some((c) => /inelastic|however/i.test(c))).toBe(true);
  });
});
