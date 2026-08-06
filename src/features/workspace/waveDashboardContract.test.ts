/**
 * Wave H2 — App Dashboard densify: hero budget + full-bleed + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave H2 — Dashboard productization', () => {
  const page = read('components/Dashboard.tsx');
  const hub = read('components/DashboardActionHub.tsx');
  const preview = read('components/DashboardLivePreview.tsx');
  const cal = read('components/visuals/CalibrationChip.tsx');
  const post = read('components/examPrep/PostExamNextStepsPanel.tsx');
  const i18n = read('lib/i18n.ts');

  it('is full-bleed (page + hub + study center; no nested BlueprintSurface study card)', () => {
    expect(page).toContain('data-testid="dashboard-page"');
    expect(page).toContain('data-bleed="full"');
    expect(hub).toContain('data-testid="dashboard-action-hub"');
    expect(hub).toContain('data-bleed="full"');
    expect(hub).toContain('data-testid="dashboard-hero-study-center"');
    expect(hub).not.toMatch(/BlueprintSurface[\s\S]{0,120}dashboard-hero-study-center|dashboard-hero-study-center[\s\S]{0,80}BlueprintSurface/);
    expect(preview).toContain("data-bleed=\"full\"");
  });

  it('nests Today at a glance + Quick tools + Alerts + Study prompts + readiness signals', () => {
    expect(hub).toContain('data-testid="dashboard-today-chrome"');
    expect(hub).toContain('data-testid="dashboard-quick-tools-chrome"');
    expect(hub).toMatch(/dashboard-today-chrome[\s\S]{0,120}alwaysCollapse|alwaysCollapse[\s\S]{0,80}dashboard-today-chrome/);
    expect(page).toContain('data-testid="dashboard-alerts-chrome"');
    expect(page).toContain('data-testid="dashboard-study-prompts-chrome"');
    expect(page).toContain('data-testid="dashboard-readiness-signals-chrome"');
    expect(page).toMatch(/dashboard-alerts-chrome[\s\S]{0,80}alwaysCollapse|alwaysCollapse[\s\S]{0,80}dashboard-alerts-chrome/);
    expect(i18n).toMatch(/dashTodayChrome: 'Today at a glance'/);
    expect(i18n).toMatch(/dashTodayChrome: 'Σήμερα με μια ματιά'/);
    expect(i18n).toMatch(/dashQuickToolsChrome: 'Quick tools'/);
    expect(i18n).toMatch(/dashQuickToolsChrome: 'Γρήγορα εργαλεία'/);
  });

  it('primary CTA is Continue via PrimaryCTA', () => {
    expect(hub).toContain('data-testid="dashboard-resume-workspace"');
    expect(hub).toContain('PrimaryCTA');
    expect(hub).toContain("t('dashboardResumeContinue')");
    expect(preview).toContain('PrimaryCTA');
    expect(preview).toContain('data-testid="dashboard-resume-workspace"');
    expect(i18n).toMatch(/dashboardResumeContinue: 'Continue'/);
    expect(i18n).toMatch(/dashboardResumeContinue: 'Συνέχεια'/);
    expect(i18n).toMatch(/dashExecute: 'Continue'/);
    expect(i18n).not.toMatch(/dashExecute: 'Execute'/);
  });

  it('hero no longer mounts 5-card StatCard KPI grid', () => {
    expect(page).toContain('data-testid="dashboard-page-stats"');
    expect(page).toContain('UtilityRow');
    expect(page).not.toMatch(/function StatCard/);
    expect(page).not.toMatch(/lg:grid-cols-5/);
  });

  it('learner copy drops forgetting-curve / first-attempts / Synapse Agent jargon', () => {
    expect(i18n).toMatch(/We space your reviews so hard cards come back sooner/);
    expect(i18n).toMatch(/Αραιώνουμε τις επαναλήψεις ώστε τα δύσκολα να επιστρέφουν νωρίτερα/);
    expect(i18n).not.toMatch(/forgetting curve/);
    expect(i18n).toMatch(/Based on real quiz answers/);
    expect(i18n).not.toMatch(/Derived from graded first-attempts only/);
    expect(i18n).toMatch(/Ask Tutor if you want help choosing/);
    expect(i18n).not.toMatch(/Synapse Agent can answer follow-up/);
    expect(cal).toContain("textKey: 'dashCalibrated'");
    expect(cal).toContain('useI18n');
    expect(cal).not.toMatch(/Well calibrated/);
    expect(i18n).toMatch(/dashCalibrated: 'Well matched'/);
    expect(i18n).toMatch(/dashCalibrated: 'Καλά ταιριασμένο'/);
    expect(post).toContain('alwaysCollapse');
    expect(post).toContain('data-testid="post-exam-next-steps"');
  });
});
