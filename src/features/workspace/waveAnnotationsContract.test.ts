/**
 * Wave AN — Annotations densify: full-bleed source + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave AN — Annotations productization', () => {
  const overlay = read('components/workspace/AnnotationOverlay.tsx');
  const toolbar = read('components/workspace/AnnotationToolbar.tsx');
  const rail = read('components/workspace/AnnotationMarginRail.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const i18n = read('lib/i18n.ts');
  const registry = read('lib/workspaceToolRegistry.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');

  it('is full-bleed (overlay + work surface + nest skip; empty rail hidden)', () => {
    expect(overlay).toContain('data-testid="annotation-overlay"');
    expect(overlay).toContain('data-bleed="full"');
    expect(overlay).toContain('data-testid="annotation-work-surface"');
    expect(overlay).toContain("data-rail={annotations.length > 0 ? 'on' : 'off'}");
    expect(overlay).toMatch(/annotations\.length > 0 && \(\s*<AnnotationMarginRail/);
    expect(overlay).toContain('useState(false)');
    expect(surface).toMatch(/activeTool !== 'annotations'/);
    expect(rail).toContain('data-testid="annotation-margin-rail"');
  });

  it('nests Source file + Find marks chrome closed by default', () => {
    expect(toolbar).toContain('data-testid="annotation-source-chrome"');
    expect(toolbar).toContain('alwaysCollapse');
    expect(toolbar).toContain('CollapsibleChromeSection');
    expect(overlay).toContain('data-testid="annotation-filter-chrome"');
    expect(overlay).toContain('annoFindChrome');
    expect(i18n).toMatch(/annoSourceChrome: 'Source file'/);
    expect(i18n).toMatch(/annoSourceChrome: 'Αρχείο πηγής'/);
    expect(i18n).toMatch(/annoFindChrome: 'Find marks'/);
    expect(i18n).toMatch(/annoFindChrome: 'Βρες επισημάνσεις'/);
  });

  it('primary CTA is Highlight via PrimaryCTA', () => {
    expect(toolbar).toContain('data-testid="annotation-tool-highlight"');
    expect(toolbar).toContain('PrimaryCTA');
    expect(toolbar).toContain('highlightLabel');
  });

  it('purpose + empty + guide drop reprocess/anchor-remap repo tone', () => {
    expect(spine).toMatch(/Mark what matters in your notes/);
    expect(spine).toMatch(/Σημείωσε τι μετράει στις σημειώσεις/);
    expect(spine).not.toMatch(/reprocess anchor remap/);
    expect(registry).toMatch(/Mark highlights & notes on your source/);
    expect(registry).toMatch(/Επισημάνσεις και σημειώσεις στην πηγή/);
    expect(empty).toMatch(/Open a file to highlight lines/);
    expect(empty).toMatch(/Άνοιξε ένα αρχείο για να επισημάνεις/);
    expect(guide).toMatch(/Tap Highlight, then select words/);
    expect(guide).not.toMatch(/survive reprocessing/);
    expect(i18n).toMatch(/Select words on a line to highlight them/);
    expect(i18n).not.toMatch(/highlight a span/);
  });
});
