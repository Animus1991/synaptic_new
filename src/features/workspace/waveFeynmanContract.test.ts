/**
 * Wave FY — Feynman warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave FY — Feynman productization', () => {
  const check = read('components/workspace/FeynmanCheck.tsx');
  const strip = read('components/workspace/FeynmanRubricExportDiscoverabilityStrip.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const i18n = read('lib/i18n.ts');
  const registry = read('lib/workspaceToolRegistry.ts');

  it('purpose is warm teach-it copy (not detect-gaps jargon)', () => {
    expect(spine).toMatch(/Teach it in plain words/);
    expect(spine).toMatch(/Δίδαξέ το με απλά λόγια/);
    expect(spine).not.toMatch(/Explain the concept in plain language and detect gaps/);
  });

  it('how-to is friendly and check-first', () => {
    expect(guide).toMatch(/Check my explanation/);
    expect(guide).toMatch(/Έλεγξε την εξήγησή μου/);
    expect(guide).not.toMatch(/Get a rubric score on accuracy/);
  });

  it('composer is first; nested Feynman Check title removed', () => {
    expect(check).toContain('data-testid="feynman-draft"');
    expect(check).toContain('data-testid="feynman-coach-primary"');
    expect(check).toContain('feynman-outline-chrome');
    expect(check).toContain('feynman-terms-chrome');
    expect(check).toContain('data-testid="feynman-layout"');
    expect(check).not.toMatch(/feynmanCheck\} — \{concept\}/);
    expect(check).not.toMatch(/Feynman Check —/);
  });

  it('voice/export live in overflow; primary CTA is Check my explanation', () => {
    expect(check).toContain('feynman-export-menu');
    expect(check).toContain('feynman-voice-input');
    expect(i18n).toMatch(/Check my explanation/);
    expect(i18n).toMatch(/Έλεγξε την εξήγησή μου/);
    expect(i18n).not.toMatch(/Get AI Coach Feedback/);
  });

  it('score/gaps/coach labels are localized and warm', () => {
    expect(i18n).toMatch(/Your score/);
    expect(i18n).toMatch(/Το σκορ σου/);
    expect(i18n).toMatch(/Worth fixing/);
    expect(i18n).toMatch(/What worked/);
    expect(check).toContain('feynmanScoreTitle');
    expect(check).toContain('feynmanGapsTitle');
    expect(check).not.toMatch(/>Strengths</);
    expect(check).not.toMatch(/>Gaps to fix</);
    expect(check).not.toMatch(/>Rubric</);
  });

  it('warn and empty drop passage-grounded / prompt repo tone', () => {
    expect(i18n).toMatch(/still quite general/);
    expect(i18n).not.toMatch(/outline is passage-grounded/);
    expect(empty).toMatch(/Nothing to explain yet/);
    expect(empty).toMatch(/Δεν υπάρχει ακόμα κάτι να εξηγήσεις/);
  });

  it('strip export chips are quiet (no brand chip spray)', () => {
    expect(strip).not.toMatch(/ws-chip-brand/);
    expect(registry).toMatch(/Teach it simply/);
  });
});
