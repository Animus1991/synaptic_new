/**
 * Wave DB — Debate (Συζήτηση) densify: full-bleed map + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave DB — Debate productization', () => {
  const panel = read('components/workspace/DebatePanel.tsx');
  const map = read('components/workspace/ArgumentMap.tsx');
  const strip = read('components/workspace/DebateRebuttalPersistStrip.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const i18n = read('lib/i18n.ts');
  const registry = read('lib/workspaceToolRegistry.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');

  it('is full-bleed (panel + map + nest skip)', () => {
    expect(panel).toContain('data-testid="debate-panel"');
    expect(panel).toContain('data-bleed="full"');
    expect(map).toContain('data-testid="argument-map"');
    expect(map).toContain('data-bleed="full"');
    expect(map).toContain('data-testid="debate-canvas"');
    expect(map).not.toMatch(/className="mx-4 mb-2 rounded-xl border/);
    expect(surface).toMatch(/activeTool !== 'debate'/);
  });

  it('nests Find a claim + How claims connect; Ask Tutor in overflow', () => {
    expect(panel).toContain('data-testid="debate-filter-chrome"');
    expect(panel).toContain('alwaysCollapse');
    expect(map).toContain('data-testid="debate-links-chrome"');
    expect(map).toContain('data-testid="debate-suggested-counters-chrome"');
    expect(map).toContain('debate-more-menu');
    expect(map).toContain('data-testid="debate-ask-agent"');
    expect(map).toContain('PanelOverflowMenu');
  });

  it('primary CTA is Add a counter', () => {
    expect(map).toContain('data-testid="debate-add-counter-primary"');
    expect(map).toContain('PrimaryCTA');
    expect(i18n).toMatch(/debateAddCounter: 'Add a counter'/);
    expect(i18n).toMatch(/debateAddCounter: 'Πρόσθεσε αντίλογο'/);
  });

  it('purpose + warn drop passage-grounded / persisted-rebuttal repo tone', () => {
    expect(spine).toMatch(/Map claims for and against/);
    expect(spine).toMatch(/Χάρτης ισχυρισμών υπέρ και κατά/);
    expect(spine).not.toMatch(/persisted rebuttals/);
    expect(i18n).toMatch(/These claims are still quite general/);
    expect(i18n).not.toMatch(/Argument tree is passage-grounded/);
    expect(i18n).not.toMatch(/Rebuttal graph/);
    expect(i18n).toMatch(/How claims connect/);
    expect(i18n).toMatch(/Πώς συνδέονται/);
    expect(i18n).toMatch(/Your debate/);
    expect(i18n).toMatch(/Η συζήτησή σου/);
    expect(registry).toMatch(/Claims for & against/);
    expect(registry).toMatch(/Ισχυρισμοί υπέρ & κατά/);
  });

  it('persist strip is warn-only', () => {
    expect(strip).toMatch(/report\.ok\) return null/);
    expect(strip).toContain('debate-rebuttal-persist-strip');
  });
});
