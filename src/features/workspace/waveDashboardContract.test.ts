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

  it('nests Today at a glance + Quick tools + Study prompts + Alerts + readiness signals', () => {
    expect(hub).toContain('data-testid="dashboard-today-chrome"');
    expect(hub).toContain('data-testid="dashboard-quick-tools-chrome"');
    /* OPT-K112 — hub tabs: Today | Quick tools | Study prompts | Alerts */
    expect(hub).toContain('data-testid="dashboard-hub-chrome-tabs"');
    expect(hub).toContain('dashboard-hub-chrome-tablist');
    expect(hub).toContain("role=\"tablist\"");
    expect(hub).toMatch(/hubChromeTab === 'today'|setHubChromeTab/);
    expect(hub).toContain("hubChromeTab === 'prompts'");
    expect(hub).toContain("hubChromeTab === 'alerts'");
    expect(hub).toContain('data-testid="dashboard-alerts-chrome"');
    expect(hub).toContain('data-testid="dashboard-study-prompts-chrome"');
    expect(hub).toContain('alertsSlot');
    expect(hub).toContain('promptsSlot');
    expect(page).toContain('alertsSlot=');
    expect(page).toContain('promptsSlot=');
    expect(page).toContain('DashboardAlertGrid');
    expect(page).toContain('dashboard-today-glance');
    expect(page).not.toMatch(/CollapsibleChromeSection[\s\S]{0,120}dashboard-alerts-chrome/);
    expect(page).not.toMatch(/CollapsibleChromeSection[\s\S]{0,120}dashboard-study-prompts-chrome/);
    expect(page).toContain('data-testid="dashboard-readiness-signals-chrome"');
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

  it('OPT-K107 — Dashboard Canon clarity: one primary band + nested secondary chrome', () => {
    expect(page).toContain('dashboard-weekly-mastery-chrome');
    expect(page).toContain('dashboard-recent-activity-chrome');
    expect(page).toContain('dashboard-practice-weak-cta');
    expect(page).toContain('dashboard-start-exam-sim');
    expect(page).toContain('SecondaryCTA');
    expect(page).toMatch(/SecondaryCTA[\s\S]{0,240}dashboard-practice-weak-cta/);
    expect(page).toMatch(/SecondaryCTA[\s\S]{0,240}dashboard-start-exam-sim/);
    /* Hub Continue remains the PrimaryCTA resume path */
    expect(hub).toContain('PrimaryCTA');
    expect(hub).toContain('dashboard-resume-workspace');
  });

  it('OPT-K109 — strict border diet on dashboard surfaces and hub chips', () => {
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K109/);
    expect(clarity).toMatch(/Strict border diet/);
    expect(hub).toMatch(/OPT-K109|OPT-K110/);
    expect(hub).toMatch(/border-transparent/);
    expect(page).toMatch(/wash strip|bg-surface-secondary\/55|dashboard-needs-fixing/);
    expect(page).not.toMatch(/className="p-3 sm:p-3\.5 rounded-xl border border-border-subtle/);
  });

  it('OPT-K110 — ultra-strict: frameless hub tabs + unboxed masonry widgets', () => {
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K110/);
    expect(clarity).toMatch(/frameless hub tabs|Ultra-strict border diet/);
    expect(hub).toMatch(/OPT-K110/);
    expect(hub).not.toMatch(/rounded-2xl border border-border-subtle/);
    expect(page).toContain('dashboard-needs-fixing');
    expect(page).toMatch(/border-border-subtle\/45|bg-transparent hover:bg-surface-secondary/);
  });

  it('OPT-K111 — CTA-only borders + alert list architecture', () => {
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K111/);
    expect(clarity).toMatch(/CTA-only outline rule/);
    expect(page).toContain('data-border-diet="cta-only"');
    const alerts = read('components/DashboardAlertGrid.tsx');
    expect(alerts).toContain('data-layout="list"');
    expect(alerts).not.toMatch(/rounded-xl border p-3/);
  });

  it('OPT-K112 — Study prompts hub tab + Today glance tiles + readiness +5%', () => {
    expect(hub).toContain('promptsSlot');
    expect(hub).toContain("hubChromeTab === 'prompts'");
    expect(page).toContain('promptsSlot=');
    expect(page).toContain('dashboard-today-glance-grid');
    expect(page).toMatch(/size=\{128\}/);
    const ring = read('components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/size = 174/);
    expect(ring).toMatch(/-translate-x-1\/2 -translate-y-1\/2/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K112/);
  });

  it('OPT-K114 — readiness ring −1% with geometric percent center', () => {
    const ring = read('components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K114/);
    expect(ring).toMatch(/size = 174/);
    expect(page).toMatch(/size=\{128\}/);
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
