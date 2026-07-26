/**
 * OPT-K69 — engineering gates for Minimal clarity (not a visual Human Pass).
 * Visual M20/C8/K69 matrix remains manual / not self-signed.
 */
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isShellMobileNavWidth, isWorkspacePhoneWidth } from './workspaceViewport';
import { isPostExamPhase } from './examPrep/postExamNextSteps';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('OPT-K69 engineering clarity contracts', () => {
  it('K67 — phone chrome below 768 only', () => {
    expect(isWorkspacePhoneWidth(767)).toBe(true);
    expect(isWorkspacePhoneWidth(768)).toBe(false);
  });

  it('K67b — shell nav clearance below lg (1024)', () => {
    expect(isShellMobileNavWidth(1023)).toBe(true);
    expect(isShellMobileNavWidth(1024)).toBe(false);
  });

  it('K65 — post-exam panel meaning gate', () => {
    expect(isPostExamPhase(undefined)).toBe(false);
    expect(isPostExamPhase('2099-01-01', Date.parse('2026-01-01'))).toBe(false);
    expect(isPostExamPhase('2020-01-01', Date.parse('2026-01-01'))).toBe(true);
  });

  it('K52 — Minimal focus ring is brand solid 2px (not Replit mix)', () => {
    const replit = read('src/styles/replit-clarity.css');
    expect(replit).toMatch(/OPT-K52/);
    expect(replit).toMatch(/--focus-ring-offset:\s*2px/);
    expect(replit).toMatch(/outline:\s*var\(--focus-ring-width,\s*2px\)\s+solid/);
    expect(replit).not.toMatch(/color-mix\(in srgb, var\(--color-brand-600\) 70%/);
  });

  it('K56 — composer has no backdrop blur under Minimal', () => {
    const calm = read('src/styles/chatgpt-calm.css');
    expect(calm).toMatch(/OPT-K56/);
    const start = calm.indexOf('OPT-K56');
    const composerBlock = calm.slice(start, start + 450);
    expect(composerBlock).toMatch(/\.agent-composer\s*\{/);
    expect(composerBlock).toMatch(/backdrop-filter:\s*none/);
    expect(composerBlock).not.toMatch(/backdrop-filter:\s*blur\(/);
  });

  it('K62 — hub action grid is 2×2 mobile / 4-col sm+', () => {
    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toMatch(/grid-cols-2\s+sm:grid-cols-4/);
  });

  it('K68 — product tour close/skip hit floors', () => {
    const tour = read('src/components/ProductTour.tsx');
    expect(tour).toMatch(/min-h-10/);
    expect(tour).toMatch(/min-w-10/);
  });

  it('K71 — Vista clarity present without Aero blur language', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K71/);
    expect(clarity).toMatch(/--vista-lift/);
    const k71 = clarity.slice(clarity.indexOf('OPT-K71'), clarity.indexOf('OPT-K71') + 900);
    expect(k71).not.toMatch(/backdrop-filter:\s*blur/);
  });

  it('K72 — Windows 8 clarity flatter than Vista (no Metro clone markers)', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K72/);
    expect(clarity).toMatch(/--w8-select/);
    expect(clarity).toMatch(/Windows 8-inspired|Win8/);
    const k72 = clarity.slice(clarity.indexOf('OPT-K72'));
    const k72Code = k72.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(k72Code).not.toMatch(/font-family:\s*['"]?Segoe/i);
    expect(k72Code).not.toMatch(/live-tile|charms-bar|metro-start/i);
    expect(k72Code).not.toMatch(/backdrop-filter:\s*blur/);
    // Flat titleband (solid / color-mix), not Vista soft gradient under K72
    expect(k72).toMatch(/ux-page-header[\s\S]{0,280}background:\s*color-mix/);
  });

  it('K73 — Minimal text tokens meet AA contrast (≥4.5:1) on primary surfaces', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K73/);
    expect(primer).toMatch(/--color-text-tertiary:\s*#59636e/);
    expect(primer).toMatch(/--color-text-muted:\s*#59636e/);
    expect(primer).toMatch(/--color-text-muted:\s*#848d97/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K73/);
    expect(clarity).toMatch(/\.text-brand-300/);

    const hex = (h: string) => {
      const v = h.replace('#', '');
      return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
    };
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = (h: string) => {
      const [r, g, b] = hex(h);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const contrast = (a: string, b: string) => {
      const L1 = lum(a);
      const L2 = lum(b);
      const hi = Math.max(L1, L2);
      const lo = Math.min(L1, L2);
      return (hi + 0.05) / (lo + 0.05);
    };

    expect(contrast('#59636e', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#59636e', '#eaeef2')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#59636e', '#f6f8fa')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#848d97', '#141a22')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#848d97', '#161b22')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#848d97', '#21262d')).toBeGreaterThanOrEqual(4.5);
  });

  it('K74/K75 — mobile notebook clarity: step rail, dark pill ink, thread scroll pad', () => {
    const chrome = read('src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx');
    expect(chrome).toMatch(/OPT-K74/);
    expect(chrome).toMatch(/workspace-mobile-step-progress/);
    expect(chrome).toMatch(/workspace-mobile-chrome-menu/);
    expect(chrome).toMatch(/wsStepOf/);
    expect(chrome).toMatch(/bg-surface-tertiary text-text-primary/);
    expect(chrome).toMatch(/notebook Studio owns tools/);

    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K74/);
    expect(primer).toMatch(/minimal-dark[\s\S]{0,120}\.ws-pill/);
    expect(primer).toMatch(/--color-text-primary/);
    expect(primer).toMatch(/OPT-K75/);
    expect(primer).toMatch(/agent-system-status/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K75/);
    expect(indexCss).toMatch(/button\.ws-pill/);

    const calm = read('src/styles/chatgpt-calm.css');
    expect(calm).toMatch(/OPT-K74/);
    expect(calm).toMatch(/scroll-padding-bottom/);

    const ctx = read('src/lib/agentWorkspaceContext.ts');
    expect(ctx).toMatch(/compactLine/);

    const agent = read('src/components/Agent.tsx');
    expect(agent).toMatch(/agent-system-status/);
    expect(agent).toMatch(/agent-composer-tools/);
    expect(agent).not.toMatch(/absolute right-2 bottom-2 flex items-center gap-1/);
    expect(agent).toMatch(/text-text-primary/);

    // Hydrating pills must not use animate-pulse (washes ink on dark)
    expect(chrome).not.toMatch(/ws-pill['"].*animate-pulse|animate-pulse['"].*ws-pill/);
    expect(indexCss).toMatch(/study-workspace.*ws-pill|ws-pill[\s\S]{0,80}study-workspace/);
  });

  it('K78 — start-session height match + dashboard density −2%/−3%', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K78/);
    expect(primer).toMatch(/shell-start-session[\s\S]{0,200}min-height:\s*2rem/);
    expect(primer).toMatch(/calc\(var\(--type-caption\) \* 0\.98\)/);
    expect(primer).toMatch(/calc\(var\(--ux-type-hero\) \* 0\.97\)/);
    expect(primer).toMatch(/dashboard-readiness-ring/);
    expect(primer).toMatch(/dash-horizon/);
    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/min-h-8 max-h-8/);

    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/dashboard-readiness-ring/);
  });

  it('K80 — Execute height match + panel title/action density', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K80/);
    expect(primer).toMatch(/dashboard-execute-cta[\s\S]{0,200}min-height:\s*2rem/);
    expect(primer).toMatch(/dashboard-panel-title/);
    expect(primer).toMatch(/dashboard-panel-action/);
    expect(primer).toMatch(/0\.9221/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/size="sm"/);
    expect(dash).toMatch(/dashboard-panel-title/);
    expect(dash).toMatch(/dashboard-panel-action/);
    expect(dash).toMatch(/dashboard-panel-empty/);
  });

  it('K81 — panel denser type + ring −3% + breath gaps / one primary', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K81/);
    expect(primer).toMatch(/--space-2:\s*0\.5rem/);
    expect(primer).toMatch(/--space-3:\s*0\.75rem/);
    expect(primer).toMatch(/--space-4:\s*1rem/);
    expect(primer).toMatch(/0\.9127/);
    expect(primer).toMatch(/dashboard-breath-stack/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/dashboard-breath-stack/);

    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/size = 165/);
  });

  it('K82 — panel type −2% more + non-Minimal accent rebalance', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K82/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K82/);
    /* K91 — dark = Minimal-dark emerald; light = Minimal-light amber */
    expect(indexCss).toMatch(/--color-accent-emerald:\s*#449e80/);
    expect(indexCss).toMatch(/--color-accent-violet:\s*#9a8fb8/);
    expect(indexCss).toMatch(/--palette-green:\s*#449e80/);
    expect(indexCss).toMatch(/--palette-amber:\s*#b0892e/);
  });

  it('K84 — panel −2% + Minimal clarity transferred to non-Minimal themes', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K84/);
    expect(primer).toMatch(/0\.9037/);
    expect(primer).toMatch(/0\.9224/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K84/);
    expect(indexCss).toMatch(/dashboard-execute-cta/);
    expect(indexCss).toMatch(/dashboard-breath-stack/);
    expect(indexCss).toMatch(/0\.9037/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/dashboard-breath-stack flex flex-col/);
    expect(dash).not.toMatch(/isMinimal \? 'dashboard-breath-stack/);
  });

  it('K85 — non-Minimal hub type −2% + full main column + chrome h-8', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K85/);
    expect(indexCss).toMatch(/#dashboard-hero-greeting \.ux-page-subtitle/);
    expect(indexCss).toMatch(/dashboard-page-stats/);
    expect(indexCss).toMatch(/dashboard-hero-study-center/);
    expect(indexCss).toMatch(/calc\(0\.875rem \* 0\.98\)/);
    expect(indexCss).toMatch(/shell-main-offset/);
    expect(indexCss).toMatch(/\.platform-lang-pill \{[\s\S]*?height:\s*2rem/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K85/);
    expect(shell).toMatch(/lg:ml-14/);
    expect(shell).toMatch(/w-full min-w-0 max-w-none/);
    expect(shell).toMatch(/shell-search-button[\s\S]{0,200}h-8 min-h-8 max-h-8/);
    expect(shell).toMatch(/header-profile-settings[\s\S]{0,120}h-8/);

    /* Scrollbar-sized L/R edge pad keeps columns balanced; Minimal keeps calm gutters */
    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/flushTop\s*\n/);
    expect(dash).not.toMatch(/flushTop=\{false\}/);
    expect(dash).toMatch(/shell-edge-balance/);

    const pagePrim = read('src/components/ui/primitives.tsx');
    expect(pagePrim).toMatch(/shell-edge-balance/);

    expect(indexCss).toMatch(/--shell-scroll-balance-pad:\s*0\.75rem/);
    expect(indexCss).toMatch(/scrollbar-gutter:\s*stable/);
    expect(indexCss).toMatch(/shell-edge-balance/);
  });

  it('K86 — non-Minimal accent quiet (usage + solid mid-mix bars)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K86/);
    expect(indexCss).toMatch(/--color-accent-amber:\s*#b89440/);
    expect(indexCss).toMatch(/--palette-amber:\s*#b0892e/);
    expect(indexCss).toMatch(/color-mix\(in srgb, var\(--color-accent-amber\) 52%, var\(--color-surface-card\)\)/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/Flame className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Zap className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Target className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Brain className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Clock className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).not.toMatch(/Flame className="w-3\.5 h-3\.5 text-accent-amber"/);
    expect(dash).not.toMatch(/Target className="w-3\.5 h-3\.5 text-accent-teal"/);
  });

  it('K88 — mastery bar hues follow Minimal mid-chroma (all non-Minimal themes)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K88/);
    expect(indexCss).toMatch(/--mastery-developing:\s*#5a9eb0/);
    expect(indexCss).toMatch(/--mastery-developing:\s*#7aacc4/);
    expect(indexCss).toMatch(/--color-accent-cyan:\s*#5a9eb0/);
    expect(indexCss).not.toMatch(/--mastery-developing:\s*#62c2d1/);
    expect(indexCss).toMatch(/data-theme="spectrum"/);
    expect(indexCss).toMatch(/data-mastery-band="weak"/);
    expect(indexCss).toMatch(/saturate\(0\.7\)/);
    expect(indexCss).toMatch(/saturate\(0\.55\)/);
    expect(indexCss).toMatch(/color-mix\(in srgb, var\(--mastery-weak\) 68%, var\(--color-surface-card\)\)/);
    expect(indexCss).toMatch(/dashboard-retrieval-strength-bar/);

    const bars = read('src/components/visuals/ConceptMasteryBars.tsx');
    expect(bars).toMatch(/data-mastery-band=\{band\}/);
    expect(bars).toMatch(/mastery-bar-fill/);
    expect(bars).toMatch(/OPT-K90/);
    expect(bars).toMatch(/text-text-secondary/);
    expect(bars).not.toMatch(/style=\{\{ color: bandColor/);
  });

  it('K91 — neutral panel washes + Minimal accent parity (light/dark)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K91/);
    expect(indexCss).toMatch(/neutral panel washes/);
    expect(indexCss).toMatch(/background-color:\s*var\(--color-surface-secondary\)\s*!important/);
    expect(indexCss).toMatch(/\.bg-accent-rose\\\/5/);
    expect(indexCss).toMatch(/\.bg-brand-600\\\/5/);
    /* Light non-Minimal = Minimal-light developing */
    expect(indexCss).toMatch(/--mastery-developing:\s*#7aacc4/);
    /* Dark non-Minimal = Minimal-dark developing */
    expect(indexCss).toMatch(/--mastery-weak:\s*#c87882/);
    expect(indexCss).toMatch(/--mastery-weak:\s*#c45c6a/);

    const alertGrid = read('src/components/DashboardAlertGrid.tsx');
    expect(alertGrid).toMatch(/OPT-K91/);
    expect(alertGrid).toMatch(/bg-surface-secondary/);
    expect(alertGrid).not.toMatch(/bg-accent-cyan\/5/);
    expect(alertGrid).not.toMatch(/bg-brand-600\/5/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K91/);
    expect(dash).not.toMatch(/bg-accent-orange\/5/);
  });

  it('K94 — shell bridge sweetness <-> clarity', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K94/);
    expect(indexCss).toMatch(/Shell bridge/);
    expect(indexCss).toMatch(/shell-topbar-calm/);
    expect(indexCss).toMatch(/ux-elev-popover/);
    expect(indexCss).toMatch(/agent-calm/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K94/);
    expect(clarity).toMatch(/platform-brand-icon/);
    expect(clarity).toMatch(/platform-nav-item:not\(\.platform-nav-active\):hover/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K94/);
    expect(shell).toMatch(/shell-topbar-calm/);
    expect(shell).toMatch(/BookOpen className="w-5 h-5 shrink-0 text-text-secondary"/);
    expect(shell).toMatch(/border-border-subtle text-\[11px\].*text-text-secondary/);
    expect(shell).not.toMatch(/bg-brand-500\/15 text-brand-700/);
  });

  it('K95 — platform audit bridge (Library/Tasks/modals + Minimal warmth)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K95/);
    expect(indexCss).toMatch(/Platform audit bridge/);
    expect(indexCss).toMatch(/ink-allow-brand/);
    expect(indexCss).toMatch(/\[class\*="text-brand-"\]/);
    expect(indexCss).toMatch(/\[class\*="bg-brand-"\]\[class\*="\/"\]/);
    expect(indexCss).toMatch(/ux-modal-panel/);
    expect(indexCss).toMatch(/::selection/);
    expect(indexCss).toMatch(/library-page.*group:hover|tasks-page.*group:hover/);

    const modal = read('src/components/ui/ModalHeaderStack.tsx');
    expect(modal).toMatch(/OPT-K95/);
    expect(modal).toMatch(/text-base font-semibold/);
    expect(modal).not.toMatch(/text-lg font-bold/);
    expect(modal).not.toMatch(/useMinimalTheme/);
  });

  it('K96 — study workspace bridge (Reader / Notebook / Quiz)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K96/);
    expect(indexCss).toMatch(/Study workspace bridge/);
    expect(indexCss).toMatch(/bg-accent-cyan\//);
    expect(indexCss).toMatch(/cognitive-reader.*mark|mark\[class\*="bg-brand"\]/);
    expect(indexCss).toMatch(/ink-allow-accent\.text-accent-emerald/);
    expect(indexCss).toMatch(/quiz-confidence-rating/);

    const toolHeader = read('src/components/workspace/WorkspaceToolHeader.tsx');
    expect(toolHeader).toMatch(/OPT-K96/);
    expect(toolHeader).toMatch(/text-text-secondary/);
    expect(toolHeader).not.toMatch(/Icon className="h-3\.5 w-3\.5 text-brand-800"/);

    const chrome = read('src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx');
    expect(chrome).toMatch(/OPT-K96/);
    expect(chrome).toMatch(/ws-eyebrow type-micro text-text-secondary/);
    expect(chrome).not.toMatch(/Sparkles className="w-4 h-4 text-brand-600"/);

    const quiz = read('src/components/workspace/WorkspaceQuizSession.tsx');
    expect(quiz).toMatch(/ink-allow-accent/);
    expect(quiz).not.toMatch(/border-accent-cyan\/30 bg-accent-cyan\/10/);

    const notebook = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(notebook).toMatch(/OPT-K96/);
    expect(notebook).toMatch(/bg-surface-secondary text-text-primary ring-1 ring-border-default/);
    expect(notebook).toMatch(/studio-tool-icon.*border-border-subtle bg-surface-card text-text-secondary|bg-surface-card text-text-secondary/);
    expect(notebook).not.toMatch(/bg-brand-100\/80 text-brand-800/);
    expect(notebook).not.toMatch(/border-brand-400\/50 bg-brand-100\/70/);

    const reader = read('src/components/workspace/CognitiveReader.tsx');
    expect(reader).toMatch(/fullSource \? 'ws-chip-brand'/);
    expect(reader).toMatch(/annotateMode \? 'ws-chip-warn'/);
  });

  it('K97 — Teacher / analytics bridge', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K97/);
    expect(indexCss).toMatch(/Teacher \/ analytics bridge/);
    expect(indexCss).toMatch(/teacher-dashboard/);
    expect(indexCss).toMatch(/analytics-page/);
    expect(indexCss).toMatch(/learning-timeline/);

    const teacher = read('src/components/TeacherDashboard.tsx');
    expect(teacher).toMatch(/OPT-K97/);
    expect(teacher).toMatch(/text-text-secondary/);
    expect(teacher).not.toMatch(/Users className="w-5 h-5 text-brand-400"/);
    expect(teacher).not.toMatch(/border-brand-500\/40 bg-brand-500\/10 text-brand-300/);
    expect(teacher).toMatch(/ink-allow-accent/);

    const insights = read('src/components/analytics/AIInsightsPanel.tsx');
    expect(insights).toMatch(/OPT-K97/);
    expect(insights).toMatch(/bg-surface-secondary\/60/);
    expect(insights).not.toMatch(/border-brand-500\/25 bg-brand-600\/5/);

    const timeline = read('src/components/analytics/LearningTimelineChart.tsx');
    expect(timeline).toMatch(/OPT-K97/);
    expect(timeline).toMatch(/bg-surface-secondary\/70/);
    expect(timeline).toMatch(/ink-allow-accent/);

    const kpis = read('src/components/analytics/ProgressInsightsSections.tsx');
    expect(kpis).toMatch(/text-text-tertiary/);
    expect(kpis).toMatch(/ink-allow-accent/);
    expect(kpis).not.toMatch(/Icon className="w-3\.5 h-3\.5 text-brand-400"/);
  });

  it('K98 — markup debt (decorative brand type -> ink)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K98/);
    expect(indexCss).toMatch(/Markup debt/);
    expect(indexCss).toMatch(/--opt-k98-markup-debt/);

    const library = read('src/components/Library.tsx');
    expect(library).toMatch(/OPT-K98/);
    expect(library).not.toMatch(/text-brand-\d+/);

    const tasks = read('src/components/Tasks.tsx');
    expect(tasks).toMatch(/OPT-K98/);
    expect(tasks).not.toMatch(/text-brand-\d+/);

    const settings = read('src/components/Settings.tsx');
    expect(settings).toMatch(/OPT-K98/);
    expect(settings).not.toMatch(/text-brand-\d+/);

    const upload = read('src/components/UploadModal.tsx');
    expect(upload).toMatch(/OPT-K98/);
    expect(upload).toMatch(/bg-brand-600 text-white/);
    expect(upload).not.toMatch(/text-brand-\d+/);

    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toMatch(/OPT-K98/);
    expect(hub).not.toMatch(/text-brand-\d+/);
  });

  it('K99 — empty-state typography sweetness', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K99/);
    expect(indexCss).toMatch(/Empty-state typography sweetness/);
    expect(indexCss).toMatch(/platform-empty-state-icon/);
    expect(indexCss).toMatch(/color:\s*var\(--color-text-tertiary\)/);
    expect(indexCss).toMatch(/workspace-empty-state/);

    const platform = read('src/components/ui/PlatformEmptyState.tsx');
    expect(platform).toMatch(/OPT-K98\/K99|OPT-K99/);
    expect(platform).toMatch(/text-text-tertiary/);
    expect(platform).toMatch(/bg-surface-secondary/);
    expect(platform).toMatch(/text-xl font-medium tracking-tight/);
    expect(platform).not.toMatch(/text-brand-\d+/);

    const workspace = read('src/components/workspace/WorkspaceEmptyState.tsx');
    expect(workspace).toMatch(/OPT-K99/);
    expect(workspace).toMatch(/text-text-tertiary/);
    expect(workspace).toMatch(/bg-surface-secondary/);
    expect(workspace).not.toMatch(/border-brand-500\/20 bg-brand-500\/10/);
    expect(workspace).not.toMatch(/text-brand-\d+/);
  });

  it('K93 — cross-pollinate sweetness ↔ clarity', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K93/);
    expect(indexCss).toMatch(/Cross-pollinate sweetness/);
    expect(indexCss).toMatch(/dashboard-action-hub/);
    expect(indexCss).toMatch(/scale\(0\.985\)/);
    expect(indexCss).toMatch(/platform-hero-glow-orbs/);
    expect(indexCss).toMatch(/ux-spark-panel\.ux-callout-next/);
    expect(indexCss).toMatch(/ux-row-elev-hover:hover/);

    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K93/);
    expect(primer).toMatch(/color-mix\(in srgb, var\(--color-brand-600\) 20%/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K93/);
    expect(dash).toMatch(/border-border-subtle bg-surface-secondary/);
    expect(dash).not.toMatch(/ux-spark-panel/);
    expect(dash).toMatch(/BookOpen className="w-5 h-5 text-text-secondary"/);
    expect(dash).toMatch(/text-brand-600/); /* greeting icon keeps brand signal */
  });

  it('K92 — 1/2/3 column layout on Minimal and non-Minimal', () => {
    const prefs = read('src/lib/dashboardLayoutPrefs.ts');
    expect(prefs).toMatch(/stacked' \| 'dual' \| 'triple/);
    expect(prefs).toMatch(/dashboard-layout-mode-v3/);
    expect(prefs).toMatch(/cycleDashboardLayoutMode/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K92/);
    expect(dash).toMatch(/dashboard-layout-\$\{mode\}/);
    expect(dash).toMatch(/mode: 'stacked'/);
    expect(dash).toMatch(/mode: 'dual'/);
    expect(dash).toMatch(/mode: 'triple'/);
    expect(dash).toMatch(/xl:columns-2/);
    expect(dash).toMatch(/xl:columns-3/);
    expect(dash).toMatch(/hub-section-stack--columns/);
    expect(dash).toMatch(/data-dashboard-columns=\{columnCount\}/);
    /* Minimal no longer locked to single-column hub only */
    expect(dash).not.toMatch(/isMinimal\s*\?\s*'hub-section-stack'\s*:\s*cn\(/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K92/);
    expect(clarity).toMatch(/hub-section-stack--columns/);

    const i18n = read('src/lib/i18n.ts');
    expect(i18n).toMatch(/dashLayoutDual/);
    expect(i18n).toMatch(/dashLayoutTriple/);
    expect(i18n).toMatch(/dashLayoutGroup/);
  });

  it('K90 — ink owns type across all themes (accents never paint copy)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K90/);
    expect(indexCss).toMatch(/Ink owns type/);
    expect(indexCss).toMatch(/\[class\*="text-accent-"\]:not\(\.ink-allow-accent\)/);
    expect(indexCss).toMatch(/\.dashboard-status-rose/);
    expect(indexCss).toMatch(/\.agent-meta-badge/);
    expect(indexCss).toMatch(/data-theme="minimal-dark"/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K90/);
    expect(dash).not.toMatch(/masteryDelta >= 0 \? 'text-accent-emerald'/);
    expect(dash).not.toMatch(/text-\[10px\] text-accent-rose mt-2/);

    const alertGrid = read('src/components/DashboardAlertGrid.tsx');
    expect(alertGrid).toMatch(/OPT-K90/);
    expect(alertGrid).not.toMatch(/quiz: 'text-accent-cyan'/);
    expect(alertGrid).toMatch(/quiz: 'text-text-secondary'/);

    const agent = read('src/components/Agent.tsx');
    expect(agent).toMatch(/OPT-K90/);
    expect(agent).not.toMatch(/color: 'text-accent-cyan'/);
    expect(agent).toMatch(/color: 'text-text-secondary'/);

    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K90/);
    expect(primer).toMatch(/--mastery-developing:\s*#5a9eb0/);
    expect(primer).not.toMatch(/--mastery-weak:\s*#e0707c/);
  });

  it('K89 — dark non-Minimal central brand lifted ~2.5%', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K89/);
    expect(indexCss).toMatch(/--color-brand-500:\s*#5e7997/);
    expect(indexCss).toMatch(/--color-brand-600:\s*#4f6683/);
    expect(indexCss).toMatch(/--color-brand-500:\s*#0cb8d5/);
    expect(indexCss).toMatch(/--color-brand-600:\s*#0e94b4/);
    expect(indexCss).not.toMatch(/--color-brand-500:\s*#5a7694/);
    expect(indexCss).not.toMatch(/--color-brand-500:\s*#06b6d4/);
  });

  it('K87 — non-Minimal accent panel borders unify to border-subtle grey', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K87/);
    expect(indexCss).toMatch(/--color-banner-warn-border:\s*var\(--color-border-subtle\)/);
    expect(indexCss).toMatch(/\.ux-callout-warn/);
    expect(indexCss).toMatch(/\.platform-banner-danger/);
    expect(indexCss).toMatch(/border-accent-amber\\\/20/);
    expect(indexCss).toMatch(/border-left-color:\s*var\(--color-border-subtle\)/);
    expect(indexCss).toMatch(/\[class\*="border-accent-"\]/);
    expect(indexCss).toMatch(/\.ux-page-header-icon/);
    expect(indexCss).toMatch(/\.ux-progress-track/);

    const alertGrid = read('src/components/DashboardAlertGrid.tsx');
    expect(alertGrid).toMatch(/border-border-subtle bg-surface-secondary/);
    expect(alertGrid).not.toMatch(/border-accent-rose\/25/);
  });

  it('K79 — Minimal accent chroma/hue rebalance (semantic + categorical)', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K79/);
    expect(primer).toMatch(/--color-accent-emerald:\s*#3d9a78/);
    expect(primer).toMatch(/--color-accent-amber:\s*#b0892e/);
    expect(primer).toMatch(/--color-accent-rose:\s*#c45c6a/);
    expect(primer).toMatch(/--color-accent-cyan:\s*#4a8fa3/);
    expect(primer).toMatch(/--color-accent-violet:\s*#7d7a9e/);
    /* K90 quieted minimal-dark mid-chroma */
    expect(primer).toMatch(/--color-accent-emerald:\s*#449e80/);
    expect(primer).toMatch(/--color-accent-cyan:\s*#5a9eb0/);
    expect(primer).toMatch(/--color-accent-violet:\s*#9a8fb8/);
    expect(primer).not.toMatch(/--color-accent-violet:\s*#9aa2b0/);
    expect(primer).not.toMatch(/--color-accent-cyan:\s*#39d0d8/);
  });

  it('K77 — contrast/type floor + upload breath + notebook why disclosure', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K77/);
    expect(primer).toMatch(/bg-brand-500/);
    expect(primer).toMatch(/text-\\\[10px\\\]/);
    expect(primer).toMatch(/ux-upload-drop-zone/);
    expect(primer).toMatch(/agent-message-avatar/);
    expect(primer).toMatch(/ws-tool-why-outcome/);

    const header = read('src/components/workspace/WorkspaceToolHeader.tsx');
    expect(header).toMatch(/ws-tool-why-outcome/);
    expect(header).toMatch(/OPT-K77/);

    const upload = read('src/components/UploadModal.tsx');
    expect(upload).toMatch(/border-solid/);
    expect(upload).toMatch(/bg-brand-600 text-white/);
    expect(upload).not.toMatch(/text-red-400/);

    const agent = read('src/components/Agent.tsx');
    expect(agent).not.toMatch(/from-brand-500 to-accent-teal/);
  });

  it('K83 — Minimal radii match non-Minimal Package 2 + milder minimal-dark canvas', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K83/);
    expect(primer).toMatch(/--radius-sm:\s*0\.375rem/);
    expect(primer).toMatch(/--radius-md:\s*0\.5rem/);
    expect(primer).toMatch(/--radius-lg:\s*0\.75rem/);
    expect(primer).toMatch(/--radius-xl:\s*1rem/);
    expect(primer).toMatch(/--radius-panel:\s*1\.25rem/);
    expect(primer).toMatch(/--radius-pill:\s*9999px/);
    expect(primer).toMatch(/--color-surface-primary:\s*#141a22/);
    expect(primer).toMatch(/--color-surface-secondary:\s*#1c232d/);

    const theme = read('src/lib/theme.ts');
    expect(theme).toMatch(/minimal-dark':\s*'#141a22'/);
  });

  it('K76 — micro-harmony: tokenized radii/type + overlay remaps; progress stays stadium', () => {
    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/OPT-K76/);
    expect(primer).toMatch(/--type-body-lh:\s*1\.55/);
    expect(primer).toMatch(/workspace-boot-shell/);
    expect(primer).toMatch(/\.agent-message-bubble/);
    expect(primer).toMatch(/border-radius:\s*var\(--radius-panel\)/);
    expect(primer).toMatch(/border-radius:\s*var\(--radius-md\)/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(clarity).toMatch(/border-radius:\s*var\(--radius-panel\)/);
    expect(clarity).toMatch(/font-size:\s*var\(--type-meta\)/);
    // OPT-K63 — progress / usage tracks remain fully capped (not Primer soft-pill)
    expect(clarity).toMatch(/\.usage-bar[\s\S]{0,120}border-radius:\s*999px/);
    expect(clarity).toMatch(/border-radius:\s*9999px/);

    // Follow-on layers also tokenized (library / agent calm / notebook canvas)
    const replit = read('src/styles/replit-clarity.css');
    expect(replit).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(replit).toMatch(/border-radius:\s*var\(--radius-panel\)/);
    expect(replit).not.toMatch(/border-radius:\s*0\.(35|4|45|5|65)rem/);

    const calm = read('src/styles/chatgpt-calm.css');
    expect(calm).toMatch(/border-radius:\s*var\(--radius-panel\)/);
  });
});
