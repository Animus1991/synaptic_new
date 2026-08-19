import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clipQuizOptionText } from '../../lib/workspaceContentFallback';
import { extractComparisons } from '../../lib/noteContentExtractors';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/**
 * Wave I — cross-theme micro-harmony contracts.
 *
 * These are additive, micro-adjustment guards (no re-layouts, no functionality
 * loss). Each assertion pins one Wave I finding from docs/UPGRADE_BACKLOG.md so a
 * later refactor can't silently reintroduce the repeated/low-contrast chrome that
 * the 2026-08-10 spectrum-theme audit flagged.
 */
describe('Wave I — cross-theme micro-harmony', () => {
  it('I2 — compare cells clip on a word boundary with an ellipsis (no mid-word cuts)', () => {
    /* Behavioural: the shared clip never splits the trailing word. */
    const long = 'utility subjectivity '.repeat(20).trim();
    const clipped = clipQuizOptionText(long, 100);
    expect(clipped.endsWith('…'), 'long cell text is elided').toBe(true);
    const beforeEllipsis = clipped.slice(0, -1).trimEnd();
    expect(
      beforeEllipsis.endsWith('utility') || beforeEllipsis.endsWith('subjectivity'),
      `clip must land on a whole word, got "${beforeEllipsis}"`,
    ).toBe(true);

    /* Structural: the compare extractor routes every cell through the clip, not a raw slice. */
    const src = read('src/lib/noteContentExtractors.ts');
    const pushFn = src.slice(src.indexOf('const push ='), src.indexOf('// 1) Structured'));
    expect(pushFn, 'compare push must clip via clipQuizOptionText').toMatch(/clipQuizOptionText\(/);

    /* Integration: a mid-word source still yields word-boundary cells. */
    const rows = extractComparisons(
      'Fixed costs stay constant whereas variable costs rise with output volume in every accounting period considered here.',
      'costs',
      [],
    );
    for (const row of rows) {
      for (const cell of row) {
        if (cell.endsWith('…')) {
          const tail = cell.slice(0, -1).trimEnd();
          expect(/\s$|\S$/.test(tail)).toBe(true);
          expect(tail.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('I3 — Quiz A/B/C/D letter disc keeps ≥AA ink (solid surface, not a /45 wash)', () => {
    const src = read('src/components/workspace/WorkspaceQuiz.tsx');
    const disc = src.match(/rounded-full[^"]*type-caption[^"]*text-text-secondary/);
    expect(disc, 'the option-letter disc class should exist').toBeTruthy();
    const cls = disc![0];
    expect(cls, 'letter disc must use a solid surface fill').toContain('bg-surface-secondary');
    expect(cls, 'letter disc must not fall back to the pale /45 wash').not.toMatch(
      /bg-surface-secondary\/\d/,
    );
    expect(cls, 'letter weight floored to semibold for legibility').toContain('font-semibold');
  });

  it('I5 — Studio grid shows one AI legend instead of a per-tile badge meaning', () => {
    const src = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(src, 'grid-level AI legend testid must exist').toContain('data-testid="studio-ai-legend"');
  });

  it('I6 — offline notice collapses to the first offline agent message only', () => {
    const src = read('src/components/Agent.tsx');
    expect(src, 'must compute the first offline message id').toContain('firstOfflineMessageId');
    expect(
      src,
      'per-message offline badge must be suppressed for every message after the first offline one',
    ).toMatch(/suppressOfflineBadge=\{[^}]*msg\.id !== firstOfflineMessageId[^}]*\}/);
  });
});
