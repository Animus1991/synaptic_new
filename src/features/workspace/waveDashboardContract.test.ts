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
    expect(page).toMatch(/size=\{127\}/);
    const ring = read('components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/size = 173/);
    expect(ring).toMatch(/dominantBaseline="central"/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K112/);
  });

  it('OPT-K115 — readiness ring −0.5% with SVG geometric percent center', () => {
    const ring = read('components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K115|OPT-K116/);
    expect(ring).toMatch(/size = 173/);
    expect(ring).toMatch(/dominantBaseline="central"/);
    expect(page).toMatch(/size=\{127\}/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K115/);
  });

  it('OPT-K116 — quiet accents + denser boxes + wash SecondaryCTA', () => {
    const ring = read('components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K116/);
    expect(ring).toMatch(/strokeWidth = 9\.2/);
    expect(page).toMatch(/OPT-K116|OPT-K117/);
    expect(page).toMatch(/ux-chip-soft-/);
    expect(page).toMatch(/dashboard-horizon-cell/);
    const prim = read('components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K116/);
    expect(prim).toMatch(/wash CTA/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K116/);
    expect(clarity).toMatch(/Quiet secondary accents/);
  });

  it('OPT-K117 — final divider purge on dashboard + shell chrome', () => {
    expect(page).toMatch(/OPT-K117/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K117/);
    expect(clarity).toMatch(/Final divider purge|frameless hub stack/);
    const shell = read('components/Shell.tsx');
    expect(shell).toMatch(/OPT-K117/);
    expect(shell).toMatch(/border-b border-transparent/);
    const demo = read('components/DemoSandboxBanner.tsx');
    expect(demo).toMatch(/border-b border-transparent/);
  });

  it('OPT-K118 — course page shares border diet + width rhythm with dashboard', () => {
    const course = read('components/CourseView.tsx');
    expect(course).toMatch(/OPT-K118/);
    expect(course).toContain('data-testid="course-page"');
    expect(course).toContain('data-border-diet="cta-only"');
    expect(course).toMatch(/shell-edge-balance/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K118/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K118/);
  });

  it('OPT-K137 — Sources/Studio self-explanatory + icon diet', () => {
    const nb = read('components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K137/);
    expect(nb).toContain('notebook-sources-purpose');
    expect(nb).not.toMatch(/Sparkles/);
    const pdf = read('components/workspace/PdfPageThumbnailStrip.tsx');
    expect(pdf).toMatch(/OPT-K137/);
  });

  it('OPT-K136 — Agent chat icon diet keeps functional chrome', () => {
    const agent = read('components/Agent.tsx');
    expect(agent).toMatch(/OPT-K136/);
    expect(agent).not.toMatch(/agent-message-avatar/);
    const banner = read('components/AgentContextBanner.tsx');
    expect(banner).toMatch(/OPT-K136/);
    expect(banner).not.toMatch(/MapPin[, ]/);
  });

  it('OPT-K133 — Agent notebook whisper dividers keep resize', () => {
    const nb = read('components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K133/);
    expect(nb).toContain('notebook-panel-resizer');
    expect(nb).toMatch(/notebook-panel-resizer w-px/);
    expect(nb).toContain('<Separator');
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K133/);
    expect(clarity).toMatch(/OPT-K134/);
    expect(clarity).toMatch(/whisper 1px panel rules/);
  });

  it('OPT-K135 — App-wide hidden scrollbars keep scroll', () => {
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K135/);
    expect(clarity).toMatch(/App-wide HIDDEN scrollbars/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K135/);
    expect(indexCss).toMatch(/FINAL kill-switch/);
    expect(indexCss).toMatch(/scrollbar-width:\s*none\s*!important/);
  });

  it('OPT-K132 — Note Analysis border diet + equal summary columns', () => {
    const page = read('components/NoteAnalysisView.tsx');
    expect(page).toMatch(/OPT-K132/);
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toContain('data-testid="note-analysis-page"');
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K132/);
  });

  it('OPT-K131 — Settings Learning Preferences border diet + scroll fix', () => {
    const page = read('components/Settings.tsx');
    expect(page).toMatch(/OPT-K131/);
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).not.toMatch(/active\?\.scrollIntoView/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K131/);
  });

  it('OPT-K130 — Analytics depth pass beats hairlines + equal columns', () => {
    const page = read('components/Analytics.tsx');
    expect(page).toMatch(/OPT-K130/);
    expect(page).toContain('data-border-diet="cta-only"');
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K130/);
    const flow = read('components/analytics/SourceFlowDiagram.tsx');
    expect(flow).toMatch(/source-flow-node-dot/);
  });

  it('OPT-K128 — Learning Analytics border diet + wash clarity', () => {
    const page = read('components/Analytics.tsx');
    expect(page).toMatch(/OPT-K128/);
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toContain('data-testid="analytics-page"');
    const range = read('components/analytics/AnalyticsDateRangeContext.tsx');
    expect(range).toMatch(/OPT-K128/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K128/);
  });

  it('OPT-K127 — Study Room lobby border diet + wash clarity', () => {
    const page = read('components/StudyRoom.tsx');
    expect(page).toMatch(/OPT-K127/);
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toContain('data-testid="study-room-page"');
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K127/);
  });

  it('OPT-K126 — Workspace Agent notebook border diet + wash clarity', () => {
    const nb = read('components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K126/);
    expect(nb).toContain('data-border-diet="cta-only"');
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K126/);
    const pdf = read('components/workspace/PdfPageThumbnailStrip.tsx');
    expect(pdf).toMatch(/OPT-K126/);
  });

  it('OPT-K124 — Agent shares border diet + wash clarity', () => {
    const agent = read('components/Agent.tsx');
    expect(agent).toMatch(/OPT-K124/);
    expect(agent).toContain('data-border-diet="cta-only"');
    const sidebar = read('components/agent/AgentModeSidebar.tsx');
    expect(sidebar).toMatch(/OPT-K124/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K124/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K124/);
  });

  it('OPT-K123 — discreet selected-tab underlines on all pages', () => {
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K123/);
    expect(indexCss).toMatch(/inset 0 -1px/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K123/);
    expect(clarity).toMatch(/descriptive-sticky-tab-active/);
  });

  it('OPT-K122 — Library shares border diet + wash clarity with Dashboard', () => {
    const lib = read('components/Library.tsx');
    expect(lib).toMatch(/OPT-K122/);
    expect(lib).toContain('data-border-diet="cta-only"');
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K122/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K122/);
  });

  it('OPT-K121 — Dashboard type rhythm on all platform pages', () => {
    const prim = read('components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K121/);
    expect(prim).toMatch(/data-type-rhythm="dashboard"/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K121/);
    expect(clarity).toMatch(/Platform-wide type rhythm/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K121/);
    expect(page).toMatch(/data-type-rhythm="dashboard"/);
  });

  it('OPT-K120 — course outline type proportions', () => {
    const chrome = read('components/ui/platformChrome.tsx');
    expect(chrome).toMatch(/OPT-K120/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K120/);
    expect(indexCss).toMatch(/Descriptive tab type rhythm/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K120/);
    const course = read('components/CourseView.tsx');
    expect(course).toMatch(/OPT-K120/);
  });

  it('OPT-K119 — source quality + due queue frameless clarity', () => {
    const status = read('components/workspace/WorkspaceSourceStatusBar.tsx');
    expect(status).toMatch(/OPT-K119/);
    expect(status).toMatch(/data-layout="k119"/);
    const due = read('components/workspace/LeitnerDueQueuePanel.tsx');
    expect(due).toMatch(/OPT-K119/);
    expect(due).not.toMatch(/border-l-2/);
    const course = read('components/CourseView.tsx');
    expect(course).toMatch(/OPT-K119/);
    const clarity = read('styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K119/);
    const indexCss = read('index.css');
    expect(indexCss).toMatch(/OPT-K119/);
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
