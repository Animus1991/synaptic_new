/**
 * Wave CMP — Compare full-bleed + warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave CMP — Compare productization', () => {
  const panel = read('components/workspace/ComparePanel.tsx');
  const table = read('components/visuals/DiagramGenerator.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const i18n = read('lib/i18n.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');
  const frame = read('components/workspace/ToolFrame.tsx');

  it('purpose drops diff-export jargon', () => {
    expect(spine).toMatch(/See two ideas side by side/);
    expect(spine).toMatch(/Δες δύο ιδέες δίπλα-δίπλα/);
    expect(spine).not.toMatch(/diff export/);
  });

  it('how-to uses highlight-differences language', () => {
    expect(guide).toMatch(/Highlight differences/);
    expect(guide).toMatch(/Δείξε διαφορές/);
  });

  it('panel + table are full-bleed; nest gutter skipped', () => {
    expect(panel).toContain('data-testid="compare-panel"');
    expect(panel).toContain('data-bleed="full"');
    expect(table).toContain('data-testid="comparison-table"');
    expect(table).toContain('data-bleed="full"');
    expect(panel).not.toMatch(/className="flex h-full flex-col overflow-hidden p-4"/);
    const tableIdx = table.indexOf('data-testid="comparison-table"');
    expect(tableIdx).toBeGreaterThan(0);
    const tableBlock = table.slice(tableIdx, tableIdx + 280);
    expect(tableBlock).toContain('data-bleed="full"');
    expect(tableBlock).not.toMatch(/rounded-xl/);
    expect(surface).toMatch(/activeTool !== 'compare'/);
  });

  it('primary is Highlight differences; CSV/Tutor demoted to overflow', () => {
    expect(i18n).toMatch(/Highlight differences/);
    expect(i18n).toMatch(/Δείξε διαφορές/);
    expect(i18n).toMatch(/Ask Tutor/);
    expect(i18n).not.toMatch(/Amber marks values that differ from the baseline row/);
    expect(table).toContain('compare-diff-toggle');
    expect(table).toContain('compare-more-menu');
    expect(table).toContain('PanelOverflowMenu');
    expect(table).not.toMatch(/>\s*Agent\s*</);
    expect(table).not.toMatch(/>\s*CSV\s*</);
  });

  it('filter + tutor shortcuts start nested closed', () => {
    expect(panel).toContain('compare-filter-chrome');
    expect(panel).toContain('alwaysCollapse');
    expect(frame).toMatch(/alwaysCollapse/);
    expect(empty).toMatch(/Nothing to compare/);
  });
});
