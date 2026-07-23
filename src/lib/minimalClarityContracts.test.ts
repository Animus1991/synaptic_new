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
    expect(primer).toMatch(/--color-text-tertiary:\s*#656d76/);
    expect(primer).toMatch(/--color-text-muted:\s*#6a737d/);
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

    expect(contrast('#656d76', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#6a737d', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#6a737d', '#f6f8fa')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#848d97', '#0d1117')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#848d97', '#161b22')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#848d97', '#21262d')).toBeGreaterThanOrEqual(4.5);
  });

  it('K74 — mobile notebook clarity: compact step, dark pill ink, thread scroll pad', () => {
    const chrome = read('src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx');
    expect(chrome).toMatch(/OPT-K74/);
    expect(chrome).toMatch(/workspace-mobile-step-progress/);
    expect(chrome).toMatch(/workspace-mobile-chrome-menu/);
    expect(chrome).toMatch(/wsStepCompact/);
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
});
