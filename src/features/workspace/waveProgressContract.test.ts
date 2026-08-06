/**
 * Wave PR — Progress (dashboard) densify: full-bleed Status + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave PR — Progress productization', () => {
  const panel = read('components/workspace/DashboardPanel.tsx');
  const mini = read('components/workspace/MiniDashboard.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const i18n = read('lib/i18n.ts');
  const registry = read('lib/workspaceToolRegistry.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const next = read('lib/nextActionEngine.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');

  it('is full-bleed (panel + Status surface + nest skip; no max-w-lg column)', () => {
    expect(panel).toContain('data-testid="dashboard-panel"');
    expect(panel).toContain('data-bleed="full"');
    expect(panel).toContain('data-testid="dashboard-work-surface"');
    expect(panel).not.toMatch(/flex justify-center/);
    expect(mini).toMatch(/data-testid=\{embedded \? 'mini-dashboard-embedded' : 'mini-dashboard'\}/);
    expect(mini).toContain("data-bleed={embedded ? 'full'");
    expect(mini).toContain('max-w-none');
    expect(mini).not.toMatch(/embedded \? 'w-full max-w-lg'/);
    expect(mini).toContain('data-testid="progress-status-surface"');
    expect(surface).toMatch(/activeTool !== 'dashboard'/);
  });

  it('nests Find weak spots; mirror strip warn-only', () => {
    expect(panel).toContain('data-testid="dashboard-filter-chrome"');
    expect(panel).toContain('alwaysCollapse');
    expect(panel).toContain('dashFilterChrome');
    expect(panel).toMatch(/!mirrorReport\.ok/);
    expect(i18n).toMatch(/dashFilterChrome: 'Find weak spots'/);
    expect(i18n).toMatch(/dashFilterChrome: 'Βρες αδύναμα σημεία'/);
  });

  it('primary CTA is next-step via PrimaryCTA (Refresh notes when reprocess)', () => {
    expect(panel).toContain('data-testid="workspace-dashboard-next-action-btn"');
    expect(panel).toContain('PrimaryCTA');
    expect(next).toMatch(/return lang === 'el' \? 'Ανανέωσε τις σημειώσεις' : 'Refresh notes'/);
    expect(next).not.toMatch(/Preview reprocess/);
    expect(next).not.toMatch(/older pipeline/);
  });

  it('purpose + warn drop mastery/session-export / pipeline / Reprocess jargon', () => {
    expect(spine).toMatch(/See how today went/);
    expect(spine).toMatch(/Δες πώς πήγε σήμερα/);
    expect(spine).not.toMatch(/session export/);
    expect(spine).not.toMatch(/In-workspace mastery/);
    expect(registry).toMatch(/Readiness, weak spots & next step/);
    expect(registry).toMatch(/Ετοιμότητα, αδύναμα & επόμενο βήμα/);
    expect(empty).toMatch(/see your readiness/);
    expect(guide).toMatch(/Check your exam readiness ring/);
    expect(i18n).toMatch(/These weak spots are still quite general/);
    expect(i18n).not.toMatch(/progress tracking is less precise until Reprocess/);
    expect(i18n).toMatch(/Αυτά τα αδύναμα σημεία είναι ακόμα γενικά/);
  });
});
