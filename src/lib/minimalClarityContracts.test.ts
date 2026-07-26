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
    /* K88 supersedes dark emerald/amber slightly above Minimal mid-chroma */
    expect(indexCss).toMatch(/--color-accent-emerald:\s*#449e80/);
    expect(indexCss).toMatch(/--color-accent-violet:\s*#7a7598/);
    expect(indexCss).toMatch(/--palette-green:\s*#3d8a62/);
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

  it('K86 — non-Minimal accent quiet (usage + soft-fill + mid-chroma tokens)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K86/);
    expect(indexCss).toMatch(/--color-accent-amber:\s*#b89438/);
    expect(indexCss).toMatch(/--color-accent-amber:\s*#b89440/);
    expect(indexCss).toMatch(/color-mix\(in srgb, var\(--color-accent-amber\) 12%/);
    expect(indexCss).toMatch(/color-mix\(in srgb, var\(--color-accent-rose\) 48%, var\(--color-text-secondary\)\)/);

    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toMatch(/OPT-K86/);
    expect(dash).toMatch(/Flame className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Zap className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Target className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Brain className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).toMatch(/Clock className="w-3\.5 h-3\.5 text-text-secondary"/);
    expect(dash).not.toMatch(/Flame className="w-3\.5 h-3\.5 text-accent-amber"/);
    expect(dash).not.toMatch(/Target className="w-3\.5 h-3\.5 text-accent-teal"/);
  });

  it('K88 — non-Minimal mastery bar hues follow Minimal mid-chroma (dark/blueprint/warm-sand)', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toMatch(/OPT-K88/);
    expect(indexCss).toMatch(/--mastery-developing:\s*#689eb0/);
    expect(indexCss).toMatch(/--mastery-developing:\s*#5a9eb0/);
    expect(indexCss).toMatch(/--mastery-developing:\s*#6a949e/);
    expect(indexCss).toMatch(/--color-accent-cyan:\s*#5a9eb0/);
    expect(indexCss).not.toMatch(/--mastery-developing:\s*#62c2d1/);
    expect(indexCss).toMatch(/data-theme="warm-sand"/);
    expect(indexCss).toMatch(/data-mastery-band="weak"/);
    expect(indexCss).toMatch(/saturate\(0\.7\)/);
    expect(indexCss).toMatch(/saturate\(0\.55\)/);
    expect(indexCss).toMatch(/color-mix\(in srgb, var\(--mastery-weak\) 68%, var\(--color-surface-card\)\)/);
    expect(indexCss).toMatch(/dashboard-retrieval-strength-bar/);

    const bars = read('src/components/visuals/ConceptMasteryBars.tsx');
    expect(bars).toMatch(/data-mastery-band=\{band\}/);
    expect(bars).toMatch(/mastery-bar-fill/);
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
    expect(alertGrid).toMatch(/border-border-subtle bg-brand-600\/5/);
    expect(alertGrid).toMatch(/border-border-subtle bg-accent-cyan\/5/);
    expect(alertGrid).toMatch(/border-border-subtle bg-accent-rose\/5/);
    expect(alertGrid).toMatch(/border-border-subtle bg-accent-amber\/5/);
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
    expect(primer).toMatch(/--color-accent-emerald:\s*#3eb87e/);
    expect(primer).toMatch(/--color-accent-cyan:\s*#5eb8c4/);
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
