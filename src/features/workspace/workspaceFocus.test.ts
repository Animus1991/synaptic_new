import { describe, expect, it } from 'vitest';
import { normalizeFocusTerm, termMatchesFocus } from './workspaceFocus';

describe('workspaceFocus', () => {
  it('matches terms case-insensitively with partial overlap', () => {
    expect(termMatchesFocus('Price Elasticity', 'elasticity')).toBe(true);
    expect(normalizeFocusTerm('  Foo  Bar ')).toBe('foo bar');
  });
});
