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

    // Wave C2 moved this module to src/features/agent (src/lib is now a re-export shim).
    const ctx = read('src/features/agent/agentWorkspaceContext.ts');
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
    /* Lineage: 165 → … → 173 (OPT-K115) */
    expect(ring).toMatch(/size = 173/);
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
    expect(shell).toMatch(/border-border-subtle type-caption.*text-text-secondary/);
    expect(shell).not.toMatch(/bg-brand-500\/15 text-brand-700/);
  });

  it('K102 — Canon clarity: ink active pill + flat Minimal topbar (no type-size churn)', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K102/);
    expect(clarity).toMatch(/high-contrast/);
    expect(clarity).toMatch(
      /#platform-sidebar-nav \.platform-nav-active[\s\S]*?background:\s*var\(--color-text-primary\)/,
    );
    expect(clarity).toMatch(
      /\.shell-topbar-calm[\s\S]*?backdrop-filter:\s*none\s*!important/,
    );
    expect(clarity).toMatch(
      /\.shell-topbar-calm[\s\S]*?box-shadow:\s*none\s*!important/,
    );
    /* Must not enlarge type tokens in this pass */
    expect(clarity).not.toMatch(/OPT-K102[\s\S]{0,800}--type-(micro|caption|meta):\s*[1-9]/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K102/);
    expect(shell).toMatch(/!quietNav && 'glass-strong'/);
    /* All nav entries + overflow paths still present */
    expect(shell).toMatch(/shell-chrome-more/);
    expect(shell).toMatch(/platform-mobile-nav/);
  });

  it('K104 — header −3% · hub chrome tabs · Focus study · quiet step timeline', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K104|OPT-K108/);
    expect(clarity).toMatch(/dashboard-hub-chrome-tablist/);
    expect(clarity).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(clarity).toMatch(/padding-top:\s*calc\(0\.5rem \* 0\.9215\)/);
    expect(clarity).not.toMatch(/OPT-K104[\s\S]{0,900}border-radius:\s*0[;\s]/);

    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toContain('dashboard-hub-chrome-tabs');
    expect(hub).toContain('dashboard-today-chrome');
    expect(hub).toContain('dashboard-quick-tools-chrome');
    expect(hub).toContain('dashboard-alerts-chrome');
    expect(hub).toMatch(/role="tablist"/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toContain('shell-focus-study');
    expect(shell).toContain('data-focus-study');
    expect(shell).toContain('shell-chrome-more');

    const steps = read('src/components/workspace/WorkspaceStepRail.tsx');
    expect(steps).toContain('ws-step-timeline-item');
    expect(steps).toContain('rounded-full');

    const primer = read('src/styles/primer-minimal.css');
    expect(primer).toMatch(/0\.8409/);
  });

  it('K105 — Canon shell port: Focus hotkeys, trap dialogs, zen chip, sticky exam CTA', () => {
    const shell = read('src/components/Shell.tsx');
    expect(shell).toContain('shell-focus-study-chip');
    expect(shell).toContain('resolveShellFocusStudyShortcut');
    expect(shell).toContain('useFocusStudy');
    expect(shell).toContain('OPT-K105');

    const shortcuts = read('src/lib/workspaceKeyboardShortcuts.ts');
    expect(shortcuts).toContain('toggle-focus-study');
    expect(shortcuts).toContain('Alt+F');
    expect(shortcuts).toContain('resolveShellFocusStudyShortcut');

    const motion = read('src/lib/motionPrefs.ts');
    expect(motion).toContain('useMotionInitial');
    expect(motion).toContain('useMotionTransition');

    const dialog = read('src/components/ui/FocusTrapDialog.tsx');
    expect(dialog).toContain('FOCUS_TRAP_FOCUSABLE');
    expect(dialog).toContain('aria-modal');
    expect(dialog).toContain('OPT-K105');

    const drawer = read('src/components/ui/SheetDrawer.tsx');
    expect(drawer).toContain('SheetDrawer');
    expect(drawer).toContain('FOCUS_TRAP_FOCUSABLE');

    const help = read('src/components/workspace/WorkspaceKeyboardHelp.tsx');
    expect(help).toContain('FocusTrapDialog');
    expect(help).toContain('shell-keyboard-help-focus-toggle');

    const zen = read('src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx');
    expect(zen).toContain('workspace-zen-exit-chip');
    expect(zen).toContain('workspace-zen-toggle');

    const exam = read('src/components/ExamPrepView.tsx');
    expect(exam).toContain('StickyMobileCtaBar');
    expect(exam).toContain('exam-prep-setup-mobile-cta');
    expect(exam).toContain('exam-prep-active-mobile-cta');
  });

  it('K106 — typography floor: no sub-12px chrome in Canon-port surfaces', () => {
    const files = [
      'src/components/Shell.tsx',
      'src/components/workspace/WorkspaceKeyboardHelp.tsx',
      'src/components/ui/FocusTrapDialog.tsx',
      'src/components/ui/SheetDrawer.tsx',
      'src/components/ui/StickyMobileCtaBar.tsx',
      'src/components/ui/ConfirmDialog.tsx',
      'src/components/ThemeSelectorModal.tsx',
      'src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx',
    ];
    for (const file of files) {
      const src = read(file);
      expect(src).not.toMatch(/text-\[1[01]px\]/);
      expect(src).not.toMatch(/text-\[(?:8|9)px\]/);
    }
  });

  it('K107 — Dashboard page: visible rail collapse bar + nested secondary chrome', () => {
    const shell = read('src/components/Shell.tsx');
    expect(shell).toContain('shell-rail-collapse-top');
    expect(shell).toContain('shell-rail-collapse-bar');
    expect(shell).toContain('OPT-K107');
    expect(shell).toMatch(/shellRailCollapse/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K107/);
    expect(clarity).toMatch(/shell-rail-collapse-bar/);
    expect(clarity).toMatch(/never hide rail collapse/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toContain('dashboard-weekly-mastery-chrome');
    expect(dash).toContain('dashboard-recent-activity-chrome');
    expect(dash).toContain('SecondaryCTA');
    expect(dash).toContain('dashboard-practice-weak-cta');
    /* Alerts + Study prompts live in hub tablist (OPT-K108/K112) */
    expect(dash).toContain('alertsSlot');
    expect(dash).toContain('promptsSlot');
    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toContain('dashboard-study-prompts-chrome');
  });

  it('K108 — Dashboard hub Alerts tab + selective border diet', () => {
    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toContain("HubChromeTab = 'today' | 'tools' | 'prompts' | 'alerts' | null");
    expect(hub).toContain('alertsSlot');
    expect(hub).toContain('dashboard-alerts-chrome');
    expect(hub).toContain('--hub-chrome-cols');

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K108/);
    expect(clarity).toMatch(/--hub-chrome-cols/);
    expect(clarity).toMatch(/Dashboard border diet/);
    expect(clarity).toMatch(/segmented control/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toContain('DashboardAlertGrid');
    expect(dash).toContain('alertsMeta');
    expect(dash).not.toMatch(/alwaysCollapse[\s\S]{0,80}dashboard-alerts-chrome|dashboard-alerts-chrome[\s\S]{0,80}alwaysCollapse/);
  });

  it('K109 — Strict border diet: nest rule + single rail toggle + dashboard unbox', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K109/);
    expect(clarity).toMatch(/Strict border diet/);
    expect(clarity).toMatch(/never box-in-box|blueprint-surface-nest/);
    expect(clarity).toMatch(/dashboard-masonry[\s\S]{0,200}border:\s*none/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toContain('shell-rail-collapse-top');
    expect(shell).toContain('OPT-K109');
    expect(shell).not.toContain('shell-rail-collapse-toggle');

    const chrome = read('src/components/workspace/CollapsibleChromeSection.tsx');
    expect(chrome).toMatch(/OPT-K109|OPT-K115|hairline divider|spacing only/);
    expect(chrome).toMatch(/border-0|border-border-subtle/);

    const prim = read('src/components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K109|OPT-K111|OPT-K116/);
    expect(prim).toMatch(/border-border-subtle|border-transparent|border-0/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K109|wash strip|OPT-K111|OPT-K116/);
    expect(dash).not.toMatch(/dashboard-course-grid[\s\S]{0,400}border border-border-subtle(?!\/)/);
  });

  it('K110 — Ultra-strict border diet: frameless hub + nuclear dashboard unbox', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K110/);
    expect(clarity).toMatch(/Ultra-strict border diet|frameless hub tabs/);
    expect(clarity).toMatch(/Nuclear unbox|dashboard-page[\s\S]{0,400}\.ux-card/);
    expect(clarity).toMatch(/ux-trust-badge[\s\S]{0,120}border-color:\s*transparent/);

    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toMatch(/OPT-K110/);
    expect(hub).not.toMatch(/!flushTop && 'rounded-2xl border/);

    const cal = read('src/components/examPrep/ExamCalendarPanel.tsx');
    expect(cal).toMatch(/OPT-K110|frameless filter/);
    expect(cal).toMatch(/OPT-K115|flex flex-col gap/);
    expect(cal).not.toMatch(/divide-y/);
    expect(cal).not.toMatch(/exam-calendar-entry[\s\S]{0,80}border border-border-subtle/);

    const syllabus = read('src/components/examPrep/SyllabusCoverageWidget.tsx');
    expect(syllabus).not.toMatch(/syllabus-coverage-widget-compact[\s\S]{0,120}border border-border-subtle/);

    const preview = read('src/components/DashboardLivePreview.tsx');
    expect(preview).toMatch(/OPT-K110/);
    expect(preview).not.toMatch(/border-y border-border-subtle/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/dashboard-needs-fixing/);
    expect(dash).not.toMatch(/rounded-panel bg-surface-secondary\/70 p-5/);
  });

  it('K111 — CTA-only outline rule + alert list + nav without cages', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K111/);
    expect(clarity).toMatch(/CTA-only outline rule|cta-only/);
    expect(clarity).toMatch(/text \+ underline only|never a pill/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toContain('data-border-diet="cta-only"');

    const alerts = read('src/components/DashboardAlertGrid.tsx');
    expect(alerts).toMatch(/OPT-K111|data-layout="list"/);
    expect(alerts).toContain('dashboard-alert-list');
    expect(alerts).not.toMatch(/rounded-xl border p-3/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K111/);
    expect(shell).toMatch(/border border-transparent/);

    const prim = read('src/components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K111|OPT-K116/);
    expect(prim).toMatch(/wash CTA|hairline outline only/);
  });

  it('K112 — Study prompts in hub bar + Today glance tiles + readiness ring center', () => {
    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toContain('promptsSlot');
    expect(hub).toContain("hubChromeTab === 'prompts'");
    expect(hub).toContain('dashboard-study-prompts-chrome');

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toContain('promptsSlot=');
    expect(dash).toContain('dashboard-today-glance');
    expect(dash).not.toMatch(/CollapsibleChromeSection[\s\S]{0,120}dashboard-study-prompts-chrome/);
    expect(dash).toMatch(/size=\{127\}/);

    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K115|OPT-K114|OPT-K113|OPT-K112/);
    expect(ring).toMatch(/size = 173/);
    expect(ring).toMatch(/dominantBaseline="central"/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K112/);
    expect(clarity).toMatch(/dashboard-today-glance-grid/);
  });

  it('K113 — Exam Readiness ring sizing lineage (superseded by K115)', () => {
    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K115|OPT-K114|OPT-K113/);
    expect(ring).not.toMatch(/text-4xl/);
  });

  it('K114 — Exam Readiness ring geometric center lineage (superseded by K115)', () => {
    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K115|OPT-K114/);
    expect(ring).toMatch(/size = 173/);
    expect(ring).toMatch(/dominantBaseline="central"/);
    expect(ring).not.toMatch(/scale: 0\./);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/size=\{127\}/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K114|OPT-K115/);
  });

  it('K115 — readiness −0.5% + SVG center + aggressive divider diet', () => {
    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K115|OPT-K116/);
    expect(ring).toMatch(/size = 173/);
    expect(ring).toMatch(/dominantBaseline="central"/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/size=\{127\}/);
    expect(dash).toMatch(/OPT-K115|OPT-K116/);

    const hub = read('src/components/DashboardActionHub.tsx');
    expect(hub).toMatch(/OPT-K115/);
    expect(hub).not.toMatch(/border-b border-border-subtle\/60/);

    const alerts = read('src/components/DashboardAlertGrid.tsx');
    expect(alerts).toMatch(/flex flex-col gap/);
    expect(alerts).not.toMatch(/divide-y/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K115/);
    expect(clarity).toMatch(/Aggressive divider diet/);
  });

  it('K116 — quiet secondary accents + denser boxes + wash SecondaryCTA', () => {
    const prim = read('src/components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K116/);
    expect(prim).toMatch(/wash CTA/);
    expect(prim).toMatch(/border-0 bg-surface-secondary/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K116|OPT-K117/);
    expect(dash).toMatch(/ux-chip-soft-danger|ux-chip-soft-warn/);
    expect(dash).toMatch(/dashboard-horizon-cell/);
    expect(dash).toMatch(/size=\{34\}/);

    const ring = read('src/components/visuals/ReadinessRing.tsx');
    expect(ring).toMatch(/OPT-K116/);
    expect(ring).toMatch(/strokeWidth = 9\.2/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K116|OPT-K117/);
    expect(shell).toMatch(/border-r border-transparent/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K116/);
    expect(clarity).toMatch(/Quiet secondary accents/);
    expect(clarity).toMatch(/ux-chip-soft-danger/);
  });

  it('K117 — final divider purge: hub stack, utility rows, shell/demo hairlines', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K117/);
    expect(clarity).toMatch(/Final divider purge|frameless hub stack/);
    expect(clarity).toMatch(/UtilityRow: spacing only/);
    expect(clarity).toMatch(/multi-column masonry stays borderless/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K117/);
    expect(shell).toMatch(/border-b border-transparent/);
    expect(shell).toMatch(/shell-search-button[\s\S]{0,200}border-0/);

    const demo = read('src/components/DemoSandboxBanner.tsx');
    expect(demo).toMatch(/OPT-K117/);
    expect(demo).toMatch(/border-b border-transparent/);

    const cal = read('src/components/visuals/CalibrationChip.tsx');
    expect(cal).toMatch(/border-0/);
    expect(cal).not.toMatch(/border-b border-border-subtle/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K117/);
  });

  it('K118 — course page unbox + shared width/type parity with dashboard', () => {
    const course = read('src/components/CourseView.tsx');
    expect(course).toMatch(/OPT-K118/);
    expect(course).toContain('data-testid="course-page"');
    expect(course).toContain('data-border-diet="cta-only"');
    expect(course).toMatch(/course-topic-card/);
    expect(course).not.toMatch(/rounded-2xl border bg-surface-card/);

    const prim = read('src/components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K118/);
    expect(prim).toMatch(/shell-edge-balance/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K118/);
    expect(indexCss).toMatch(/frameless equal-width tabs|KPI tiles: wash only/);
    expect(indexCss).toMatch(/\.ux-stat-card \{[\s\S]{0,160}border:\s*none/);
    expect(indexCss).toMatch(/frameless equal-width tabs/);
    expect(indexCss).toMatch(/descriptive-sticky-tab[\s\S]{0,400}border:\s*none/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K118/);
    expect(clarity).toMatch(/Course page \+ shared chrome/);
    expect(clarity).toMatch(/course-page/);
  });

  it('K132 — Note Analysis unbox + equal summary columns', () => {
    const page = read('src/components/NoteAnalysisView.tsx');
    expect(page).toMatch(/OPT-K132/);
    expect(page).toContain('data-testid="note-analysis-page"');
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toMatch(/equal-height summary trio/);
    expect(page).not.toMatch(/note-analysis-summary[\s\S]{0,80}border border-border-subtle/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K132/);
    expect(clarity).toMatch(/Note Analysis clarity/);
  });

  it('K131 — Settings / Learning Preferences unbox + scroll sync without scrollIntoView', () => {
    const page = read('src/components/Settings.tsx');
    expect(page).toMatch(/OPT-K131/);
    expect(page).toContain('data-testid="settings-page"');
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toMatch(/Never call Element\.scrollIntoView|nav scroller only/);
    expect(page).not.toMatch(/active\?\.scrollIntoView/);
    expect(page).toMatch(/nav\.scrollTop/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K131/);
    expect(clarity).toMatch(/Learning Preferences \/ Settings clarity/);
  });

  it('K130 — Analytics depth: equal columns + quiet FSRS + beat K3 hairlines', () => {
    const page = read('src/components/Analytics.tsx');
    expect(page).toMatch(/OPT-K130/);
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toMatch(/equal-width 3-col pack|quiet FSRS spark columns/);
    expect(page).toContain('lg:grid-cols-3');
    expect(page).not.toMatch(/lg:columns-3/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K130/);
    expect(clarity).toMatch(/beat OPT-K3 hairlines/);

    const flow = read('src/components/analytics/SourceFlowDiagram.tsx');
    expect(flow).toMatch(/source-flow-node-dot/);
    expect(flow).not.toMatch(/blueprint-diagram-dot/);
  });

  it('K128 — Learning Analytics unbox + wash panels / Visual Lab', () => {
    const page = read('src/components/Analytics.tsx');
    expect(page).toMatch(/OPT-K128/);
    expect(page).toContain('data-testid="analytics-page"');
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toMatch(/denser wash FSRS tiles|CTA-only border diet/);
    expect(page).not.toMatch(/analytics-flow-banner[\s\S]{0,220}border border-border-subtle/);

    const range = read('src/components/analytics/AnalyticsDateRangeContext.tsx');
    expect(range).toMatch(/OPT-K128/);
    expect(range).toMatch(/wash segmented control/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K128/);
    expect(clarity).toMatch(/Learning Analytics clarity/);
  });

  it('K127 — Study Room lobby unbox + wash cards / fields', () => {
    const page = read('src/components/StudyRoom.tsx');
    expect(page).toMatch(/OPT-K127/);
    expect(page).toContain('data-testid="study-room-page"');
    expect(page).toContain('data-border-diet="cta-only"');
    expect(page).toMatch(/wash fields|balanced 3\/2 columns|spacing divider/);
    expect(page).not.toMatch(/border border-border-subtle/);
    expect(page).toContain('data-testid="study-room-or-divider"');

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K127/);
    expect(clarity).toMatch(/Study Room lobby clarity/);
  });

  it('K133 — Agent notebook whisper panel rules keep resize', () => {
    const nb = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K133/);
    expect(nb).toContain('notebook-panel-resizer');
    expect(nb).toContain('data-testid="notebook-resizer-sources-chat"');
    expect(nb).toContain('data-testid="notebook-resizer-chat-studio"');
    expect(nb).toMatch(/import \{ Group, Panel, Separator \}/);
    expect(nb).toMatch(/notebook-panel-resizer w-px/);
    expect(nb).not.toMatch(/notebook-panel-resizer w-2/);

    const drawer = read('src/components/workspace/studyWorkspace/ClassicChatDrawer.tsx');
    expect(drawer).toMatch(/OPT-K133/);
    expect(drawer).toContain('data-testid="classic-chat-drawer-resizer"');
    expect(drawer).toContain('<Separator');
    expect(drawer).toMatch(/notebook-panel-resizer w-px/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K133/);
    expect(clarity).toMatch(/OPT-K134/);
    expect(clarity).toMatch(/whisper 1px panel rules/);
    expect(clarity).toMatch(/14%, transparent/);
  });

  it('K135 — App-wide hidden scrollbars keep scroll', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K135/);
    expect(clarity).toMatch(/App-wide HIDDEN scrollbars/);
    expect(clarity).toMatch(/scrollbar-width:\s*none/);
    expect(clarity).toMatch(/display:\s*none\s*!important/);
    expect(clarity).not.toMatch(/overflow:\s*hidden;\s*\/\*\s*OPT-K135/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K135/);
    expect(indexCss).toMatch(/FINAL kill-switch/);
    expect(indexCss).toMatch(/scrollbar-width:\s*none\s*!important/);
    expect(indexCss).toMatch(/display:\s*none\s*!important/);
  });

  it('K126 — Workspace Agent notebook unbox + wash studio/sources', () => {
    const nb = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K126/);
    expect(nb).toContain('data-testid="notebook-workspace-layout"');
    expect(nb).toContain('data-border-diet="cta-only"');
    expect(nb).toMatch(/denser wash studio cards|wash source rows/);
    expect(nb).not.toMatch(/ring-1 ring-border-default/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K126/);
    expect(clarity).toMatch(/Workspace Agent \(notebook 3-col\)/);

    const pdf = read('src/components/workspace/PdfPageThumbnailStrip.tsx');
    expect(pdf).toMatch(/OPT-K126/);
    expect(pdf).not.toMatch(/ring-2 ring-brand-500/);
  });

  it('K137 — Sources/Studio clarity + icon diet; pages self-explanatory', () => {
    const nb = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K137/);
    expect(nb).not.toMatch(/Sparkles/);
    expect(nb).not.toMatch(/\bPin\b/);
    expect(nb).toMatch(/data-testid=\{`studio-card-ai-\$\{id\}`\}/);
    expect(nb).toMatch(/>\s*AI\s*</);
    expect(nb).toMatch(/agentPdfPagesLabel/);

    const pdf = read('src/components/workspace/PdfPageThumbnailStrip.tsx');
    expect(pdf).toMatch(/OPT-K137/);
    expect(pdf).toMatch(/Page \$\{n\}|pageChip/);

    const i18n = read('src/lib/i18n.ts');
    expect(i18n).toMatch(/Jump to a PDF page/);
    expect(i18n).toMatch(/Μετάβαση σε σελίδα PDF/);
  });

  it('K139 — Zen/focus default for study; notebook chrome kept; no exit-chip copy', () => {
    const ws = read('src/components/workspace/studyWorkspace/useStudyWorkspace.ts');
    expect(ws).toMatch(/OPT-K139/);
    expect(ws).toMatch(/isWorkspacePhoneWidth\(window\.innerWidth\) \? 'focus-lesson' : 'zen'/);
    expect(ws).toMatch(/setChromeHidden\(!notebookMode\)/);

    const chrome = read('src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx');
    expect(chrome).toMatch(/OPT-K139/);
    expect(chrome).toMatch(/layout === 'zen' && !notebookMode/);
    expect(chrome).toContain('workspace-zen-exit-chip');
    expect(chrome).toContain('workspace-zen-toggle');
    expect(chrome).toContain('notebook-workspace-chrome');
    expect(chrome).not.toMatch(/workspace-zen-exit-chip[\s\S]{0,400}wsFocusStudyOn/);
  });

  it('K141 — opening a Studio tool exits zen so ToolSurface mounts', () => {
    const ws = read('src/components/workspace/studyWorkspace/useStudyWorkspace.ts');
    expect(ws).toMatch(/OPT-K139\/K141|OPT-K141/);
    expect(ws).toMatch(/layout === 'focus-lesson' \|\| layout === 'zen'/);
    expect(ws).toMatch(/setLayout\(isMobile \? 'focus-tool' : 'split'\)/);

    const surface = read('src/components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');
    expect(surface).toMatch(/layout === 'split' \|\| layout === 'focus-tool'/);
  });

  it('K138 — one role line; studio title-only; unified chat status', () => {
    const nb = read('src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');
    expect(nb).toMatch(/OPT-K138/);
    expect(nb).not.toContain('notebook-sources-purpose');
    expect(nb).not.toContain('notebook-studio-purpose');
    expect(nb).toContain('data-testid="notebook-sources-more"');
    expect(nb).toMatch(/title=\{workspaceToolDescription/);
    expect(nb).toMatch(/!renderCenterAgent/);

    const agent = read('src/components/Agent.tsx');
    expect(agent).toMatch(/OPT-K138/);
    expect(agent).toMatch(/sessionNotice=\{embedded/);
    expect(agent).toMatch(/icon-only composer tools/);
    expect(agent).not.toMatch(/agentComposerVoice\}\s*\n?\s*<\/span>/);
    expect(agent).not.toMatch(/agentComposerSources\}\s*\n?\s*<\/span>/);
    expect(agent).toMatch(/badge only when there is no citation/);

    const banner = read('src/components/AgentContextBanner.tsx');
    expect(banner).toMatch(/OPT-K138/);
    expect(banner).toContain('sessionNotice');
    expect(banner).toContain('data-testid="agent-session-offline-strip"');
    expect(banner).toMatch(/one compact status strip/);
  });

  it('K136 — Agent chat icon diet keeps functional chrome', () => {
    const agent = read('src/components/Agent.tsx');
    expect(agent).toMatch(/OPT-K136/);
    expect(agent).not.toMatch(/agent-message-avatar/);
    expect(agent).not.toMatch(/Layers className="h-3 w-3/);
    expect(agent).toContain('data-testid="agent-tts-toggle"');
    expect(agent).toMatch(/sessionNotice=\{embedded/);
    expect(agent).toMatch(/AlertTriangle/);
    expect(agent).toMatch(/Volume2|VolumeX/);

    const banner = read('src/components/AgentContextBanner.tsx');
    expect(banner).toMatch(/OPT-K136/);
    expect(banner).not.toMatch(/MapPin[, ]/);
    expect(banner).toMatch(/AlertTriangle/);
    expect(banner).toMatch(/InfoHint/);
    expect(banner).toContain('data-testid="agent-session-offline-strip"');

    const go = read('src/components/GoToSourceButton.tsx');
    expect(go).toMatch(/OPT-K136/);
    expect(go).not.toMatch(/MapPin[, ]/);
  });

  it('K124 — Agent page unbox + wash bubbles / mode rail', () => {
    const agent = read('src/components/Agent.tsx');
    expect(agent).toMatch(/OPT-K124/);
    expect(agent).toMatch(/'agent-page'/);
    expect(agent).toContain('data-border-diet="cta-only"');
    expect(agent).toMatch(/agent-message-bubble-assistant[\s\S]{0,200}border-0/);
    expect(agent).toMatch(/border-t border-transparent/);

    const sidebar = read('src/components/agent/AgentModeSidebar.tsx');
    expect(sidebar).toMatch(/OPT-K124/);
    expect(sidebar).toMatch(/border-r border-transparent/);
    expect(sidebar).toMatch(/agent-mode-row[\s\S]{0,240}border-0/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K124/);
    expect(clarity).toMatch(/Agent page clarity/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K124/);
    expect(indexCss).toMatch(/agent chips: wash first|wash assistant bubble/);
  });

  it('K123 — discreet selected-tab hairlines platform-wide', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K123/);
    expect(indexCss).toMatch(/descriptive-sticky-tab-active \{[\s\S]{0,160}inset 0 -1px/);
    expect(indexCss).toMatch(/border-bottom:\s*1px solid transparent/);
    expect(indexCss).toMatch(/\.ux-tab-active \{[\s\S]{0,120}42%/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K123/);
    expect(clarity).toMatch(/discreet selected-tab hairline|discreet 1px/);
  });

  it('K122 — Library page unbox + wash CTAs + quiet accents', () => {
    const lib = read('src/components/Library.tsx');
    expect(lib).toMatch(/OPT-K122/);
    expect(lib).toContain('data-testid="library-page"');
    expect(lib).toContain('data-border-diet="cta-only"');
    expect(lib).toMatch(/border-0 bg-surface-secondary/);
    expect(lib).not.toMatch(/hover:border-brand-500\/35/);
    expect(lib).not.toMatch(/border border-dashed border-brand-500\/40/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K122/);
    expect(clarity).toMatch(/Library page clarity/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K122/);
    expect(indexCss).toMatch(/Library drop zones/);
  });

  it('K142 — Workspace tool panels CTA-only unbox + tight type band', () => {
    const body = read('src/components/workspace/StudyWorkspaceBody.tsx');
    expect(body).toContain('data-testid="study-workspace"');
    expect(body).toContain('data-border-diet="cta-only"');
    expect(body).toContain('data-type-rhythm="workspace-tools"');

    const frame = read('src/components/workspace/ToolFrame.tsx');
    expect(frame).toMatch(/OPT-K142/);
    expect(frame).toContain('data-testid="workspace-tool-frame"');
    expect(frame).toContain('data-border-diet="cta-only"');
    expect(frame).toMatch(/border-0 shadow-none/);

    const header = read('src/components/workspace/WorkspaceToolHeader.tsx');
    expect(header).toMatch(/OPT-K142/);
    expect(header).toMatch(/border-b border-transparent/);
    expect(header).toMatch(/ws-tool-howto rounded-lg border-0/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K142/);
    expect(clarity).toMatch(/Workspace Studio panels/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K142/);
    expect(indexCss).toMatch(/tight workspace type band/);
  });

  it('K140 — Tasks page CTA-only unbox + wash session cards + type rhythm', () => {
    const tasks = read('src/components/Tasks.tsx');
    expect(tasks).toMatch(/OPT-K140/);
    expect(tasks).toContain('data-testid="tasks-page"');
    expect(tasks).toContain('data-border-diet="cta-only"');
    expect(tasks).not.toMatch(/border-l-\[3px\]/);
    expect(tasks).not.toMatch(/type-metafont-/);

    const chrome = read('src/components/ui/platformChrome.tsx');
    expect(chrome).toMatch(/OPT-K140/);
    expect(chrome).not.toMatch(/ring-1 ring-brand-500\/40/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K140/);
    expect(clarity).toMatch(/Tasks page clarity/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K140/);
    expect(indexCss).toMatch(/session launchers: wash cards/);
  });

  it('K121 — Dashboard type rhythm applied platform-wide', () => {
    const prim = read('src/components/ui/primitives.tsx');
    expect(prim).toMatch(/OPT-K121/);
    expect(prim).toMatch(/data-type-rhythm="dashboard"/);
    expect(prim).toMatch(/dashboard-panel-title/);
    expect(prim).toMatch(/ux-kpi-value-sm/);

    const label = read('src/components/ui/SectionLabel.tsx');
    expect(label).toMatch(/OPT-K121/);
    expect(label).toMatch(/type-micro/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K121/);
    expect(clarity).toMatch(/Platform-wide type rhythm/);
    expect(clarity).toMatch(/data-type-rhythm="dashboard"/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K121/);
    expect(indexCss).toMatch(/page subtitle matches Dashboard/);
    expect(indexCss).toMatch(/tab labels match Dashboard/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/data-type-rhythm="dashboard"/);
    const library = read('src/components/Library.tsx');
    expect(library).toMatch(/data-type-rhythm="dashboard"/);
    const tasks = read('src/components/Tasks.tsx');
    expect(tasks).toMatch(/data-type-rhythm="dashboard"/);
    const analytics = read('src/components/Analytics.tsx');
    expect(analytics).toMatch(/data-type-rhythm="dashboard"/);
  });

  it('K120 — course outline / descriptive tab type proportions', () => {
    const chrome = read('src/components/ui/platformChrome.tsx');
    expect(chrome).toMatch(/OPT-K120/);
    expect(chrome).toMatch(/ux-section-subtitle/);
    expect(chrome).toMatch(/type-meta/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K120/);
    expect(indexCss).toMatch(/Descriptive tab type rhythm/);
    expect(indexCss).toMatch(/\.descriptive-sticky-tab-label \{[\s\S]{0,120}--type-meta/);
    expect(indexCss).toMatch(/\.descriptive-sticky-tab-summary \{[\s\S]{0,120}--type-caption/);
    expect(indexCss).toMatch(/\.ux-section-eyebrow \{[\s\S]{0,120}--type-micro/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K120/);
    expect(clarity).toMatch(/Course outline type proportions/);

    const course = read('src/components/CourseView.tsx');
    expect(course).toMatch(/OPT-K120/);
  });

  it('K119 — source quality panel + due queue hairline purge', () => {
    const status = read('src/components/workspace/WorkspaceSourceStatusBar.tsx');
    expect(status).toMatch(/OPT-K119/);
    expect(status).toMatch(/data-layout="k119"/);
    expect(status).toMatch(/w-full max-w-none/);
    expect(status).toMatch(/border-0/);
    expect(status).toMatch(/source-status-actions/);
    expect(status).toMatch(/min-h-9/);

    const due = read('src/components/workspace/LeitnerDueQueuePanel.tsx');
    expect(due).toMatch(/OPT-K119/);
    expect(due).toMatch(/frameless due queue/);
    expect(due).not.toMatch(/border-l-2/);
    expect(due).not.toMatch(/border-b border-border-subtle/);

    const course = read('src/components/CourseView.tsx');
    expect(course).toMatch(/OPT-K119/);

    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K119/);
    expect(clarity).toMatch(/Source quality \+ Due today/);

    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K119/);
    expect(indexCss).toMatch(/wash action chips|no left rail/);
  });

  it('K103 — soft badges/alerts + visible progressive disclosure (no radius square-off)', () => {
    const clarity = read('src/styles/cursor-clarity.css');
    expect(clarity).toMatch(/OPT-K103/);
    expect(clarity).toMatch(/ux-chrome-meta-badge/);
    expect(clarity).toMatch(/ux-soft-alert/);
    expect(clarity).toMatch(/border-radius:\s*var\(--radius-pill\)/);
    expect(clarity).toMatch(/border-radius:\s*var\(--radius-panel\)/);
    expect(clarity).not.toMatch(/OPT-K103[\s\S]{0,1200}border-radius:\s*0/);

    const chrome = read('src/components/workspace/CollapsibleChromeSection.tsx');
    expect(chrome).toMatch(/meta\?:/);
    expect(chrome).toMatch(/ux-chrome-meta-badge/);
    expect(chrome).toMatch(/OPT-K103/);

    const proactive = read('src/components/agent/ProactiveAgentAlertStrip.tsx');
    expect(proactive).toMatch(/alwaysCollapse/);
    expect(proactive).toMatch(/meta=\{alerts\.length\}/);
    expect(proactive).toMatch(/ux-soft-alert-stack/);
    expect(proactive).not.toMatch(/BlueprintSurface/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/alertsSlot|dashboard-alerts-chrome/);
    expect(dash).toMatch(/meta=\{|alertsMeta=/);
    const hubForAlerts = read('src/components/DashboardActionHub.tsx');
    expect(hubForAlerts).toMatch(/dashboard-alerts-chrome/);

    const courseBadge = read('src/components/ui/CourseStatusBadge.tsx');
    expect(courseBadge).toMatch(/KIND_CLASS_SOFT/);
    expect(courseBadge).toMatch(/rounded-md/);
    expect(courseBadge).not.toMatch(/rounded-none/);
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
    /* OPT-K137 supersedes glyph studio cards — text-led tools, no brand wash cages */
    expect(notebook).toMatch(/OPT-K137/);
    expect(notebook).toMatch(/denser wash studio cards/);
    expect(notebook).not.toMatch(/studio-tool-icon/);
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

  it('K100 — broader markup debt (Agent / Reader / tools)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K100/);
    expect(indexCss).toMatch(/Broader markup debt/);
    expect(indexCss).toMatch(/--opt-k100-markup-debt/);

    const agent = read('src/components/Agent.tsx');
    expect(agent).toMatch(/OPT-K100/);
    expect(agent).toMatch(/bg-brand-600 hover:bg-brand-500 text-white/);
    expect(agent).not.toMatch(/text-brand-\d+/);

    const reader = read('src/components/workspace/CognitiveReader.tsx');
    expect(reader).toMatch(/OPT-K100/);
    expect(reader).toMatch(/fullSource \? 'ws-chip-brand'/);
    expect(reader).toMatch(/annotateMode \? 'ws-chip-warn'/);
    expect(reader).not.toMatch(/text-brand-\d+/);

    const formula = read('src/components/workspace/FormulaScratchpad.tsx');
    expect(formula).toMatch(/OPT-K100/);
    expect(formula).not.toMatch(/text-brand-\d+/);

    const leitner = read('src/components/workspace/LeitnerPanel.tsx');
    expect(leitner).toMatch(/OPT-K100/);
    expect(leitner).not.toMatch(/text-brand-\d+/);

    const primitives = read('src/components/ui/primitives.tsx');
    expect(primitives).toMatch(/OPT-K100/);
    expect(primitives).toMatch(/ux-page-header-icon.*bg-surface-secondary text-text-secondary|bg-surface-secondary text-text-secondary/);
    expect(primitives).toMatch(/hover:border-border-default hover:text-text-primary/);
    expect(primitives).toMatch(/bg-brand-600 hover:bg-brand-700/);
    expect(primitives).not.toMatch(/hover:text-brand-\d+/);
  });

  it('K101 — residual dwell sweep (app chrome complete)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K101/);
    expect(indexCss).toMatch(/Residual dwell sweep/);
    expect(indexCss).toMatch(/--opt-k101-residual-sweep/);

    const sim = read('src/components/workspace/InteractiveSimulator.tsx');
    expect(sim).toMatch(/OPT-K101/);
    expect(sim).not.toMatch(/text-brand-\d+/);

    const board = read('src/components/workspace/StudyWhiteboard.tsx');
    expect(board).toMatch(/OPT-K101/);
    expect(board).not.toMatch(/text-brand-\d+/);

    const timer = read('src/components/workspace/StudyTimer.tsx');
    expect(timer).toMatch(/OPT-K101/);
    expect(timer).not.toMatch(/text-brand-\d+/);

    const diagram = read('src/components/visuals/DiagramGenerator.tsx');
    expect(diagram).toMatch(/OPT-K101/);
    expect(diagram).not.toMatch(/text-brand-\d+/);

    const app = read('src/App.tsx');
    expect(app).toMatch(/OPT-K101/);
    expect(app).not.toMatch(/text-brand-\d+/);

    const shell = read('src/components/Shell.tsx');
    expect(shell).toMatch(/OPT-K101/);
    expect(shell).toMatch(/inkClass: 'text-text-secondary'/);
    expect(shell).not.toMatch(/inkClass: 'text-brand-600'/);

    /* Marketing Landing keeps intentional brand type */
    const landing = read('src/components/Landing.tsx');
    expect(landing).toMatch(/text-brand-\d+/);
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
    expect(dash).toMatch(/bg-surface-secondary/);
    expect(dash).not.toMatch(/ux-spark-panel/);
    expect(dash).toMatch(/BookOpen className="w-5 h-5 text-text-secondary"/);
    /* OPT-K101 — greeting icon also follows ink-owns-type */
    expect(dash).toMatch(/className="inline-block w-5 h-5 text-text-secondary/);
    expect(dash).not.toMatch(/text-brand-\d+/);
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
    expect(primer).toMatch(/OPT-K92/);
    /* OPT-K92 — lifted mastery fills for dark track contrast */
    expect(primer).toMatch(/--mastery-developing:\s*#6eb8c8/);
    expect(primer).toMatch(/--mastery-weak:\s*#e08a94/);
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
    expect(alertGrid).toMatch(/bg-surface-secondary/);
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
