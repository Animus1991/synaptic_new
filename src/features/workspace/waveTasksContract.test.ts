/**
 * Wave H5 / H5c — Tasks densify: Dashboard-parity hub chrome + warm purpose
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave H5 — Tasks productization', () => {
  const page = read('components/Tasks.tsx');
  const content = read('lib/tasksContent.ts');
  const i18n = read('lib/i18n.ts');

  it('is full-bleed work surface (page + list)', () => {
    expect(page).toContain('data-testid="tasks-page"');
    expect(page).toContain('data-testid="tasks-work-surface"');
    expect(page).toContain('data-bleed="full"');
    expect(page).toMatch(/tasks-work-surface[\s\S]{0,80}data-bleed="full"|data-bleed="full"[\s\S]{0,80}tasks-work-surface/);
    expect(page).not.toMatch(/<HeroGlow/);
  });

  it('primary CTA is Start session via PrimaryCTA in the header', () => {
    expect(page).toContain('PrimaryCTA');
    expect(page).toContain('data-testid="tasks-create-plan"');
    expect(page).toContain('c.createPlanCta');
    const headerIdx = page.indexOf('<PageHeader');
    const ctaIdx = page.indexOf('data-testid="tasks-create-plan"');
    const hubIdx = page.indexOf('data-testid="tasks-hub-chrome-tabs"');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(ctaIdx).toBeGreaterThan(headerIdx);
    expect(hubIdx).toBeGreaterThan(ctaIdx);
    expect(page).not.toContain('dashboard-study-band');
    expect(page).not.toContain('tasks-hero-study-center');
    expect(content).toMatch(/createPlanCta: 'Start session'/);
    expect(content).toMatch(/createPlanCta: 'Έναρξη συνεδρίας'/);
    expect(content).not.toMatch(/createPlanCta: 'Create Plan'/);
  });

  it('nests Today / Sessions / Plan / Alerts in Dashboard-style hub tabs', () => {
    expect(page).toContain('data-testid="tasks-hub-chrome-tabs"');
    expect(page).toContain('dashboard-hub-chrome-tablist');
    expect(page).toContain('data-testid="tasks-progress-chrome"');
    expect(page).toContain('data-testid="tasks-sessions-chrome"');
    expect(page).toContain('data-testid="tasks-plan-chrome"');
    expect(page).toContain('data-testid="tasks-alerts-chrome"');
    expect(page).toContain('data-testid="tasks-find-chrome"');
    expect(page).toMatch(/hubChromeTab === 'today'/);
    expect(page).toMatch(/hubChromeTab === 'sessions'/);
    expect(page).toMatch(/hubChromeTab === 'plan'/);
    expect(page).toMatch(/hubChromeTab === 'alerts'/);
    expect(page).not.toMatch(/CollapsibleChromeSection[\s\S]{0,120}tasks-alerts-chrome/);
    expect(page).not.toMatch(/CollapsibleChromeSection[\s\S]{0,120}tasks-sessions-chrome/);
    expect(content).toMatch(/progressChrome: 'Today at a glance'/);
    expect(content).toMatch(/progressChrome: 'Σήμερα με μια ματιά'/);
  });

  it('uses Dashboard radius tokens (cards vs nested wells)', () => {
    const css = read('index.css');
    expect(css).toContain('--tasks-card-radius: 0.625rem');
    expect(css).toContain('--tasks-well-radius: var(--radius-md)');
    expect(css).toMatch(/--tasks-card-radius\) !important/);
    expect(css).toContain('.ux-session-card');
    expect(css).toContain('.descriptive-sticky-tab');
    expect(css).toMatch(/\.tasks-mistake-well[\s\S]{0,160}border-radius:\s*var\(--tasks-well-radius\) !important/);
    expect(page).toContain('tasks-mistake-well');
    expect(page).toContain('tasks-row-icon');
    expect(page).not.toMatch(/tasks-insight-card[^\n]*rounded-xl/);
    expect(page).not.toMatch(/tasks-danger-zone[^\n]*px-0/);
  });

  it('warm purpose EN+EL (no FSRS / scheduler / Create Plan / shouting RUNNING)', () => {
    expect(content).toMatch(/pageTitle: 'What to do next'/);
    expect(content).toMatch(/pageTitle: 'Τι να κάνεις μετά'/);
    expect(content).toMatch(/pageSubtitle: 'Start a session — Synapse lines up work from your notes and reviews\.'/);
    expect(content).toMatch(/pageSubtitle: 'Ξεκίνα συνεδρία — το Synapse βάζει στη σειρά δουλειά από σημειώσεις και επαναλήψεις\.'/);
    expect(content).toMatch(/sessionSectionTitle: 'Pick a session length'/);
    expect(content).toMatch(/sessionSectionTitle: 'Διάλεξε διάρκεια συνεδρίας'/);
    expect(content).toMatch(/dangerZoneTitle: 'Exam is close'/);
    expect(content).toMatch(/dangerZoneTitle: 'Η εξέταση είναι κοντά'/);
    expect(content).toMatch(/sessionRunningBadge: 'Running'/);
    expect(content).toMatch(/sessionRunningBadge: 'Τρέχει'/);
    expect(content).not.toMatch(/tabReviewsSummary: 'FSRS/);
    expect(content).not.toMatch(/The scheduler is prioritizing/);
    expect(content).not.toMatch(/Ο scheduler δίνει/);
    expect(content).not.toMatch(/sessionRunningBadge: 'RUNNING'/);
    expect(content).not.toMatch(/tabReviews: 'Due επαναλήψεις'/);
    expect(content).not.toMatch(/pageSubtitle: '.*study mode/);
    expect(i18n).toMatch(/sessionRecommendedBadge: 'Προτείνεται'/);
    expect(i18n).not.toMatch(/sessionRecommendedBadge: 'ΠΡΟΤΕΙΝΕΤΑΙ'/);
  });
});
