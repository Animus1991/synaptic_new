import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/**
 * Wave D3 — a11y widening.
 *
 * Guards the two OS-preference auto-respects so they can't silently regress:
 *  - `prefers-contrast: more` floors ink + thickens control borders (mirrors the
 *    opt-in high-contrast boost, using each theme's already-AA-verified tokens);
 *  - `reducedMotion="user"` keeps framer-motion collapsing to instant when the OS
 *    prefers reduced motion.
 */
describe('Wave D3 — a11y widening (OS preference auto-respect)', () => {
  const css = read('src/index.css');

  it('honours prefers-contrast: more with the verified ink floor + 2px borders', () => {
    const idx = css.indexOf('@media (prefers-contrast: more)');
    expect(idx, 'prefers-contrast rule must exist').toBeGreaterThan(-1);
    const block = css.slice(idx, idx + 500);
    expect(block).toMatch(/--color-text-muted: var\(--color-text-primary\)/);
    expect(block).toMatch(/--color-border-subtle: var\(--color-border-strong\)/);
    expect(block).toMatch(/border-width: 2px/);
  });

  it('respects prefers-reduced-motion globally via MotionConfig reducedMotion="user"', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/reducedMotion=(["']|\{["'])user/);
  });
});
