import { describe, expect, it } from 'vitest';
import { counterArgKindLabel, suggestCounterArguments } from './debateCounterArgs';

describe('suggestCounterArguments', () => {
  it('finds hedged counter sentences from notes', () => {
    const text = `
Price elasticity of demand measures responsiveness to price changes.
However, inelastic goods do not change quantity much when prices rise sharply.
Supply and demand determine market equilibrium.
    `.trim();
    const counters = suggestCounterArguments(text, 'elasticity', 'Price elasticity measures responsiveness.');
    expect(counters.length).toBeGreaterThan(0);
    expect(counters.some((c) => /inelastic|however/i.test(c.text))).toBe(true);
    expect(counters[0]!.kind).toBeTruthy();
  });

  it('matches Greek negation without ASCII word boundaries', () => {
    const text = `
Η ελαστικότητα μετρά την ανταπόκριση στην τιμή.
Ωστόσο δεν αλλάζει πολύ η ποσότητα σε ανελαστικά αγαθά.
    `.trim();
    const counters = suggestCounterArguments(text, 'ελαστικότητα', 'Η ελαστικότητα μετρά την ανταπόκριση.');
    expect(counters.length).toBeGreaterThan(0);
    expect(counters.some((c) => /δεν|Ωστόσο|ανελαστικ/i.test(c.text))).toBe(true);
    expect(counterArgKindLabel('limitation', 'el')).toMatch(/Περιορισμός/);
  });
});
