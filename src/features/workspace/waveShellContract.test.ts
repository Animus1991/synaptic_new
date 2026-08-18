/**
 * Wave S1 — Shell Quick Access dedupe + remaining-page chrome (no functionality loss)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave S1 — Shell + remaining page chrome', () => {
  const shell = read('components/Shell.tsx');
  const registry = read('lib/globalActionRegistry.ts');
  const i18n = read('lib/i18n.ts');
  const course = read('components/CourseView.tsx');
  const exam = read('components/ExamPrepPage.tsx');
  const teacher = read('components/TeacherDashboard.tsx');

  it('keeps Workspace in nav + palette, not Quick Access', () => {
    expect(shell).toContain('data-testid="nav-workspace"');
    expect(registry).toMatch(/id: 'workspace'[\s\S]{0,180}showInQuickAccess: false/);
    expect(registry).toMatch(/id: 'workspace'[\s\S]{0,220}showInPalette: true/);
    expect(registry).toMatch(/id: 'note-analysis'[\s\S]{0,180}showInQuickAccess: true/);
    expect(registry).toMatch(/id: 'exam'[\s\S]{0,180}showInQuickAccess: true/);
    expect(shell).toContain('data-testid={`quick-access-${action.id}`}');
    expect(shell).toContain('data-testid={`quick-access-mobile-${action.id}`}');
  });

  it('nests remaining Quick Access shortcuts closed by default', () => {
    expect(shell).toContain('data-testid="nav-quick-access-chrome"');
    expect(shell).toContain('data-testid="nav-mobile-quick-access-chrome"');
    expect(shell).toMatch(
      /nav-quick-access-chrome[\s\S]{0,160}alwaysCollapse|alwaysCollapse[\s\S]{0,160}nav-quick-access-chrome/,
    );
    expect(shell).toMatch(
      /nav-mobile-quick-access-chrome[\s\S]{0,160}alwaysCollapse|alwaysCollapse[\s\S]{0,160}nav-mobile-quick-access-chrome/,
    );
  });

  it('localizes profile level/XP and course chrome (EN+EL)', () => {
    expect(i18n).toMatch(/shellProfileLevel: 'Level \{level\} · \{xp\} XP'/);
    expect(i18n).toMatch(/shellProfileLevel: 'Επίπεδο \{level\} · \{xp\} XP'/);
    expect(shell).not.toMatch(/Level \{user\.level\}/);
    expect(course).toContain("t('courseBackToLibrary')");
    expect(course).not.toContain('Back to library');
    expect(i18n).toMatch(/courseBackToLibrary: 'Back to library'/);
    expect(i18n).toMatch(/courseBackToLibrary: 'Πίσω στη βιβλιοθήκη'/);
  });

  it('Exam prep is full-bleed; Teacher uses shared Button CTAs', () => {
    expect(exam).toContain('data-testid="exam-prep-page"');
    expect(exam).toContain('data-bleed="full"');
    expect(teacher).toContain('data-testid="teacher-dashboard"');
    expect(teacher).toContain('data-bleed="full"');
    expect(teacher).toMatch(/from '\.\/ui\/Button'/);
    expect(teacher).not.toMatch(/bg-brand-600 text-white/);
  });
});

describe('Wave S1 — Focus study quiet pages', () => {
  const shell = read('components/Shell.tsx');
  const chrome = read('components/workspace/CollapsibleChromeSection.tsx');
  const clarity = read('styles/cursor-clarity.css');
  const pages = read('lib/focusStudyPages.ts');

  it('applies Focus study only on study views (not Settings / Teacher)', () => {
    expect(pages).toContain("'dashboard'");
    expect(pages).toContain("'exam-prep'");
    expect(pages).not.toContain("'settings'");
    expect(pages).not.toContain("'teacher'");
    expect(shell).toContain('isFocusStudyView');
    expect(shell).toContain('focusApplies');
    expect(shell).toContain('focusEligible && (');
    expect(shell).toContain('data-focus-study={focusApplies ? \'true\' : undefined}');
  });

  it('hides secondary collapsible chrome while keeping dialog chrome', () => {
    expect(chrome).toContain('data-focus-chrome={focusChrome}');
    expect(clarity).toMatch(/data-focus-chrome="secondary"/);
    expect(clarity).toMatch(/\[role="dialog"\] \[data-focus-chrome="secondary"\]/);
    expect(clarity).toMatch(/dashboard-masonry/);
    expect(clarity).toMatch(/dashboard-hub-chrome-tabs/);
    expect(clarity).toMatch(/analytics-visual-lab/);
  });
});
