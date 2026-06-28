import { describe, expect, it } from 'vitest';
import { cycleTheme, themeToggleTarget } from './theme';

describe('cycleTheme', () => {
  it('cycles dark → light → spectrum → dark', () => {
    expect(cycleTheme('dark')).toBe('light');
    expect(cycleTheme('light')).toBe('spectrum');
    expect(cycleTheme('spectrum')).toBe('dark');
  });
});

describe('themeToggleTarget', () => {
  it('returns the next theme in the cycle', () => {
    expect(themeToggleTarget('dark')).toBe('light');
    expect(themeToggleTarget('light')).toBe('spectrum');
    expect(themeToggleTarget('spectrum')).toBe('dark');
  });
});
