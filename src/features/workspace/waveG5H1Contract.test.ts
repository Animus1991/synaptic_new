/**
 * Wave G5 — Simulator exam-strip densify
 * Wave H1 — Landing hero budget (CTA before intent chips)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave G5 — Simulator exam chrome densify', () => {
  const simulator = read('components/workspace/SimulatorPanel.tsx');
  const interactive = read('components/workspace/InteractiveSimulator.tsx');
  const css = read('index.css');

  it('wraps exam chrome + hides timer sync when report.ok', () => {
    expect(simulator).toContain('data-testid="simulator-exam-chrome"');
    expect(simulator).toContain('data-testid="simulator-meta-strip"');
    expect(simulator).toMatch(/!syncReport\.ok[\s\S]{0,80}SimulatorTimerPresetSyncStrip/);
  });

  it('folds exam practice label into meta strip when sync is ok', () => {
    expect(simulator).toContain('syncReport.ok && session.suggestedExamPractice');
    expect(simulator).toContain('examPracticeLabel');
  });

  it('live-equilibrium badge uses secondary ink (not teal type)', () => {
    const idx = interactive.indexOf("t('liveEquilibrium')");
    const badge = interactive.slice(Math.max(0, idx - 220), idx + 40);
    expect(badge).toMatch(/text-text-secondary/);
    expect(badge).not.toMatch(/text-accent-teal/);
  });

  it('tablet floors cover simulator tabs + meta strip', () => {
    expect(css).toContain('simulator-main-tabs');
    expect(css).toContain('simulator-meta-strip');
  });
});

describe('Wave H1 — Landing hero budget', () => {
  const landing = read('components/Landing.tsx');
  const chips = read('components/LandingIntentChips.tsx');

  it('primary CTA appears before intent chips in source order', () => {
    const cta = landing.indexOf('data-testid="landing-get-started-primary"');
    const intent = landing.indexOf('<LandingIntentChips');
    expect(cta).toBeGreaterThan(0);
    expect(intent).toBeGreaterThan(cta);
  });

  it('intent chips use inline secondary variant', () => {
    expect(chips).toContain('landing-intent-chip--inline');
    expect(chips).toContain('aria-hidden');
  });
});
