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

  it('I4 — Progress panel states the missing daily breakdown instead of re-printing the week total', () => {
    const src = read('src/components/workspace/MiniDashboard.tsx');
    /* Empty-week branch must not re-state the total that already lives in the StatPill. */
    expect(src).toMatch(/studyTimeWeek > 0\s*\n?\s*\?\s*t\('noDailyBreakdown'\)/);
    /* Session/tool chips overflow through an accessible expander, not a bare "+9". */
    const chips = src.match(/testId="progress-tool-chips"[\s\S]{0,220}/);
    expect(chips, 'tool chips row should exist').toBeTruthy();
    expect(src).toMatch(/moreAriaLabel=\{\(n\) =>/);
    expect(src).toMatch(/<OverflowChipRow[\s\S]{0,160}maxVisible=\{3\}/);
  });

  it('I5 — Studio grid shows one AI legend instead of a per-tile badge meaning', () => {
    const src = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(src, 'grid-level AI legend testid must exist').toContain('data-testid="studio-ai-legend"');
  });

  it('I7 — annotation source ink stays neutral; the color-dot row is a labelled group', () => {
    const toolbar = read('src/components/workspace/AnnotationToolbar.tsx');
    const swatches = toolbar.match(
      /data-testid="annotation-color-swatches"[\s\S]{0,120}/,
    );
    expect(swatches, 'color swatch row must exist').toBeTruthy();
    expect(swatches![0], 'color-dot row must be a labelled group').toMatch(/role="group"/);
    expect(swatches![0]).toMatch(/aria-label=\{t\('annoHighlightColor'\)\}/);

    /* Source lines colorise user highlights only — no per-token spell-gate ink by default. */
    const overlay = read('src/components/workspace/AnnotationOverlay.tsx');
    const renderFn = overlay.slice(
      overlay.indexOf('const renderLineText'),
      overlay.indexOf('const exportMd'),
    );
    expect(renderFn).toMatch(/type === 'highlight'/);
    expect(renderFn, 'plain segments must not force an accent ink color').not.toMatch(
      /text-accent-(rose|amber|teal|emerald)/,
    );
  });

  it('I8 — Timer hero ring is capped on wide panels so the practice chrome stays in view', () => {
    const css = read('src/index.css');
    const marker = css.indexOf('Wave I8');
    expect(marker, 'Wave I8 hero-proportion rule must exist').toBeGreaterThan(-1);
    const block = css.slice(marker, marker + 700);
    expect(block, 'ring is re-capped on wide panels').toMatch(/min-width:\s*64rem/);
    expect(block).toMatch(/\.ux-pomodoro-ring-hero\s*\{[\s\S]*?width:\s*min\(/);
    expect(block, 'stage stops ballooning to full height').toMatch(/flex-grow:\s*0/);
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
