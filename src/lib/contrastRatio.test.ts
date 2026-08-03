import { describe, expect, it } from 'vitest';
import { AA_NORMAL, contrastRatio } from './contrastRatio';

/**
 * Live token pairs from src/index.css @theme / [data-theme] (Wave D0).
 * Keep in sync when surfaces or ink shift.
 */
const TOKEN_PAIRS = [
  // Dark (default @theme) — Wave D3 muted/tertiary lift
  { name: 'dark muted on card', fg: '#96969e', bg: '#1a1a1d' },
  { name: 'dark muted on primary', fg: '#96969e', bg: '#131315' },
  { name: 'dark tertiary on primary', fg: '#a4a4ac', bg: '#131315' },
  { name: 'dark secondary on primary', fg: '#c0c0c6', bg: '#131315' },
  { name: 'dark on-brand on brand-600', fg: '#fbfbfc', bg: '#4f6683' },
  // Light Warm Sand
  { name: 'light muted on primary', fg: '#4f3d24', bg: '#fdfbf7' },
  { name: 'light primary on brand-500 CTA', fg: '#fbfbfc', bg: '#84561e' },
  // Spectrum
  { name: 'spectrum muted on card', fg: '#655f72', bg: '#ffffff' },
  // Blueprint muted on deep surface
  { name: 'blueprint muted on deep', fg: '#9faec1', bg: '#0b1020' },
] as const;

describe('contrastRatio (live theme tokens)', () => {
  for (const pair of TOKEN_PAIRS) {
    it(`${pair.name} meets AA normal text (${AA_NORMAL}:1)`, () => {
      expect(contrastRatio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  }
});
