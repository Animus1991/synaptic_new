import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PACKAGE2_CSS_VARS } from './designTokens';

const indexCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../index.css'),
  'utf8',
);

describe('designTokens (Package 2)', () => {
  it('declares spacing, radius, elevation, type, and font tokens in index.css', () => {
    for (const token of PACKAGE2_CSS_VARS) {
      expect(indexCss, `missing ${token} in index.css`).toContain(`${token}:`);
    }
  });

  it('maps mono to sans (two-font policy)', () => {
    expect(indexCss).toMatch(/--font-mono:\s*var\(--font-sans\)/);
  });

  it('defines elevation utilities wired to tokens', () => {
    expect(indexCss).toContain('.elev-1 { box-shadow: var(--elev-1); }');
    expect(indexCss).toContain('.rounded-panel { border-radius: var(--radius-panel); }');
  });
});
