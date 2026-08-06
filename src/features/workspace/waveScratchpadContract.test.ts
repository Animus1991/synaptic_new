/**
 * Wave SP / SP2 — Scratchpad (Πρόχειρο) densify + work-first empty composer
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave SP — Scratchpad productization', () => {
  const scratch = read('components/workspace/FormulaScratchpad.tsx');
  const header = read('components/workspace/WorkspaceToolHeader.tsx');
  const empty = read('components/workspace/WorkspaceEmptyState.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const css = read('index.css');

  it('exposes denser tabs + action bar + sympy panel', () => {
    expect(scratch).toContain('data-testid="scratchpad-main-tabs"');
    expect(scratch).toContain('data-testid="scratchpad-action-bar"');
    expect(scratch).toContain('data-testid="scratchpad-sympy-panel"');
    expect(scratch).toContain('data-testid="scratchpad-compute"');
    expect(scratch).toContain('PanelOverflowMenu');
  });

  it('SP2/SP3 empty uses warm work-first composer', () => {
    expect(scratch).toContain('data-testid="scratchpad-empty-composer"');
    expect(scratch).toContain('data-testid="scratchpad-composer-input"');
    expect(scratch).toContain('data-testid="scratchpad-composer-start"');
    expect(scratch).toContain('PrimaryCTA');
    expect(scratch).toContain('scratchEmptyHint');
    const empty = scratch.slice(
      scratch.indexOf('scratchpad-empty-composer'),
      scratch.indexOf('scratchpad-empty-composer') + 1200,
    );
    expect(empty).not.toMatch(/flex-1[\s\S]{0,40}justify-center/);
  });

  it('SP4 empty composer is full-bleed (no max-w-lg gutters)', () => {
    expect(scratch).toContain('data-testid="scratchpad-root"');
    expect(scratch).toContain('data-bleed="full"');
    expect(scratch).toContain('data-testid="scratchpad-composer-surface"');
    const empty = scratch.slice(
      scratch.indexOf('scratchpad-empty-composer'),
      scratch.indexOf('scratchpad-empty-composer') + 900,
    );
    expect(empty).toContain('max-w-none');
    expect(empty).not.toMatch(/className="[^"]*max-w-lg/);
    expect(empty).not.toMatch(/className="[^"]*mx-auto/);
    const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');
    expect(surface).toMatch(/activeTool !== 'scratchpad'/);
  });

  it('empty WorkspaceEmptyState still promotes add-custom when used', () => {
    expect(empty).toContain("tool === 'scratchpad'");
    expect(empty).toContain("id: 'add-custom'");
  });

  it('guide nests how-to + context; drops duplicate Source', () => {
    expect(header).toContain("link.tool !== 'reader'");
    expect(header).toContain('data-testid="workspace-tool-header-howto"');
    expect(header).toContain('data-testid="workspace-tool-header-context"');
    expect(header).toContain('data-testid="workspace-tool-header-links"');
  });

  it('Ask Agent in guide is quiet secondary (not brand chip)', () => {
    const agent = header.slice(header.indexOf('crosslink-ask-agent'));
    const btn = agent.slice(0, 400);
    expect(btn).not.toMatch(/ws-chip-brand/);
    expect(btn).toMatch(/border-border-subtle/);
  });

  it('purpose copy is warm and native (no SymPy-first jargon)', () => {
    expect(spine).toMatch(/Δοκίμασε έναν τύπο/);
    expect(spine).toMatch(/Try a formula/);
    expect(spine).not.toMatch(/SymPy validation/);
  });

  it('SP5 tool strip + populated chrome drop SymPy-first labels', () => {
    const registry = read('lib/workspaceToolRegistry.ts');
    const i18n = read('lib/i18n.ts');
    expect(registry).toMatch(/Try a formula step by step/);
    expect(registry).toMatch(/Δοκίμασε τύπο βήμα-βήμα/);
    expect(registry).not.toMatch(/Formulas & SymPy/);
    expect(registry).not.toMatch(/έλεγχος SymPy/);
    expect(i18n).toMatch(/Write your steps/);
    expect(i18n).toMatch(/Γράψε τα βήματά σου/);
    expect(i18n).not.toMatch(/Derivation steps \(SymPy\)/);
    expect(i18n).not.toMatch(/Βήματα παραγωγής \(SymPy\)/);
    expect(scratch).toContain('data-layout="work-first"');
    expect(scratch).toContain('data-testid="scratchpad-formula-hero"');
    expect(scratch).toContain('data-testid="scratchpad-formula-list-label"');
    expect(scratch).toContain('data-testid="scratchpad-steps-chrome"');
    expect(scratch).toContain('alwaysCollapse');
    expect(scratch).toContain('PrimaryCTA');
  });

  it('tablet floors cover scratchpad tabs + actions', () => {
    expect(css).toContain('scratchpad-main-tabs');
    expect(css).toContain('scratchpad-action-bar');
  });
});
