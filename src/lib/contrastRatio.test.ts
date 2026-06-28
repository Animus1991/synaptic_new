import { describe, expect, it } from 'vitest';
import { AA_NORMAL, contrastRatio } from './contrastRatio';

/** Design-token pairs audited in Package 5 — must meet WCAG AA for body text. */
const TOKEN_PAIRS = [
  { name: 'dark tertiary on secondary', fg: '#9494a8', bg: '#111114' },
  { name: 'dark muted on primary', fg: '#858599', bg: '#0a0a0c' },
  { name: 'dark secondary on primary', fg: '#b4b4c0', bg: '#0a0a0c' },
  { name: 'warm tertiary on secondary', fg: '#5c4528', bg: '#f4f0e9' },
  { name: 'warm muted on primary', fg: '#4f3d24', bg: '#faf8f5' },
  { name: 'spectrum tertiary on secondary', fg: '#4f4578', bg: '#efebff' },
  { name: 'spectrum muted on primary', fg: '#5a5088', bg: '#f7f5ff' },
] as const;

describe('contrastRatio', () => {
  for (const pair of TOKEN_PAIRS) {
    it(`${pair.name} meets AA normal text (${AA_NORMAL}:1)`, () => {
      expect(contrastRatio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  }
});
