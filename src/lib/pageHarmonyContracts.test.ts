import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/**
 * Page-harmony contracts (phases 1–6).
 *
 * Every shell page was aligned to the same micro-rules as Library / Dashboard / Tasks:
 * one page scope for the muted-ink lift, type tokens instead of raw font-size utilities,
 * the shared button primitives instead of hand-rolled brand fills, sentence-case chrome,
 * and the shared confirm dialog instead of native `window.confirm`.
 *
 * `teacher` (TeacherDashboard) is deliberately out of the Page/PageHeader migration —
 * it still hand-rolls its admin frame. Tokens, shared Button CTAs, and muted-ink lift
 * still apply. Exam prep is in the list below.
 */
const PAGES: { id: string; file: string }[] = [
  { id: 'dashboard', file: 'src/components/Dashboard.tsx' },
  { id: 'library', file: 'src/components/Library.tsx' },
  { id: 'tasks', file: 'src/components/Tasks.tsx' },
  { id: 'agent', file: 'src/components/Agent.tsx' },
  { id: 'study-room', file: 'src/components/StudyRoom.tsx' },
  { id: 'analytics', file: 'src/components/Analytics.tsx' },
  { id: 'student-org', file: 'src/components/StudentOrgView.tsx' },
  { id: 'settings', file: 'src/components/Settings.tsx' },
  { id: 'exam-prep', file: 'src/components/ExamPrepPage.tsx' },
  { id: 'note-analysis', file: 'src/components/NoteAnalysisView.tsx' },
];

/** Panels that render inside a page above and share its type/chrome rules. */
const PAGE_CHILDREN = [
  'src/components/agent/AgentModeSidebar.tsx',
  'src/components/analytics/StudyBehaviorCharts.tsx',
  'src/components/analytics/LearningTimelineChart.tsx',
];

/** Solid brand fill behind white ink — superseded by PrimaryCTA / Button `primary`. */
const SOLID_BRAND_CTA =
  /bg-brand-\d{3}(?!\/)[^"'`\n]*text-white|text-white[^"'`\n]*bg-brand-\d{3}(?!\/)/;
const RAW_FONT_SIZE = /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/;

describe('page harmony — every shell page shares the Library/Dashboard micro-rules', () => {
  it('each page declares its own scope id and type rhythm', () => {
    for (const { id, file } of PAGES) {
      const src = read(file);
      expect(src, `${file} must carry the ${id}-page testid`).toContain(`${id}-page`);
      expect(src, `${file} must set data-type-rhythm`).toMatch(/data-type-rhythm/);
    }
  });

  it('each page scope gets the muted-ink lift in index.css', () => {
    const css = read('src/index.css');
    for (const { id } of PAGES) {
      expect(css, `index.css must scope [data-testid="${id}-page"]`).toContain(
        `[data-testid="${id}-page"]`,
      );
    }
    /* Phase 6 closed the last two gaps. */
    expect(css).toMatch(/Phase 6 — Agent \/ My institution token lock/);
    expect(css).toMatch(
      /\[data-testid="agent-page"\],\s*\n\[data-testid="student-org-page"\] \{[\s\S]{0,240}--color-text-muted: color-mix/,
    );
  });

  it('pages size text with type tokens, never raw font-size utilities', () => {
    for (const { file } of PAGES) {
      expect(read(file), `${file} must use type-* tokens`).not.toMatch(RAW_FONT_SIZE);
    }
  });

  it('pages route brand CTAs through the shared button primitives', () => {
    for (const { file } of PAGES) {
      const src = read(file);
      expect(src, `${file} must not hand-roll a solid brand CTA`).not.toMatch(SOLID_BRAND_CTA);
    }
  });

  it('page chrome stays sentence case', () => {
    for (const file of [...PAGES.map((p) => p.file), ...PAGE_CHILDREN]) {
      expect(read(file), `${file} must not shout`).not.toMatch(/uppercase tracking-/);
    }
    /* Agent group labels ride the shared sentence-case eyebrow rule. */
    expect(read('src/index.css')).toMatch(/\.agent-mode-group-label \{\s*\n\s*text-transform: none/);
  });

  it('destructive confirms use the shared dialog, not native prompts', () => {
    for (const { file } of PAGES) {
      const src = read(file);
      expect(src, `${file} must not call window.confirm`).not.toMatch(/window\.confirm/);
      expect(src, `${file} must not call window.alert`).not.toMatch(/window\.alert/);
    }
    const settings = read('src/components/Settings.tsx');
    expect(settings).toMatch(/from '\.\/ui\/ConfirmDialog'/);
    expect(settings).toMatch(/data-testid="settings-clear-data-dialog"/);
    expect(settings).toMatch(/data-testid="settings-delete-account-dialog"/);
  });

  it('My institution uses the shared page frame instead of a hand-rolled header', () => {
    const org = read('src/components/StudentOrgView.tsx');
    expect(org).toMatch(/from '\.\/ui\/primitives'/);
    expect(org).toMatch(/<Page gap="sm">/);
    expect(org).toMatch(/<PageHeader/);
    expect(org).toMatch(/<SectionHeading/);
    expect(org).toMatch(/PlatformEmptyState/);
    /* Class completion bars reuse the Dashboard weak-area track. */
    expect(org).toMatch(/dashboard-progress-track/);
    expect(org).not.toMatch(/platform-btn-primary/);
    /* Every other shell page opts into the CTA-only border diet; this one used to cage cards. */
    expect(org).toMatch(/data-border-diet="cta-only"/);
    expect(read('src/index.css')).toMatch(
      /\[data-testid="student-org-page"\]\[data-border-diet="cta-only"\]/,
    );
  });
});
