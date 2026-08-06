/**
 * Wave QZ — Quiz warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clipQuizOptionText, QUIZ_OPTION_MAX_CHARS } from '../../lib/workspaceContentFallback';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave QZ — Quiz productization', () => {
  const panel = read('components/workspace/QuizPanel.tsx');
  const quiz = read('components/workspace/WorkspaceQuiz.tsx');
  const badge = read('components/workspace/QuizIrtBadge.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const i18n = read('lib/i18n.ts');
  const extractors = read('lib/noteContentExtractors.ts');
  const fallback = read('lib/workspaceContentFallback.ts');

  it('purpose is warm learner copy (no IRT / active-recall jargon)', () => {
    expect(spine).toMatch(/Quick questions from your notes/);
    expect(spine).toMatch(/Γρήγορες ερωτήσεις από τις σημειώσεις σου/);
    expect(spine).not.toMatch(/IRT-aware difficulty/);
    expect(spine).not.toMatch(/Active-recall knowledge checks/);
  });

  it('how-to is friendly and notes-first', () => {
    expect(guide).toMatch(/Pick the answer that best matches your notes/);
    expect(guide).toMatch(/Διάλεξε την απάντηση/);
    expect(guide).not.toMatch(/Answer each active-recall question/);
  });

  it('panel is full-bleed with demoted find chrome', () => {
    expect(panel).toContain('data-testid="quiz-panel"');
    expect(panel).toContain('w-full min-w-0');
    expect(panel).toContain('quiz-filters-chrome');
    expect(panel).toContain('alwaysCollapse');
    expect(panel).toContain('quiz-session-scroll');
  });

  it('MC options wrap fully (no mid-option ellipsis chrome)', () => {
    expect(quiz).toContain('quiz-mc-options');
    expect(quiz).toMatch(/whitespace-normal break-words/);
    expect(quiz).toMatch(/text-pretty/);
    expect(extractors).toContain('clipQuizOptionText');
    expect(fallback).toContain('QUIZ_OPTION_MAX_CHARS');
    expect(QUIZ_OPTION_MAX_CHARS).toBeGreaterThanOrEqual(300);
  });

  it('clipQuizOptionText keeps mid-length sentences intact', () => {
    const mid = 'a'.repeat(200);
    expect(clipQuizOptionText(mid)).toBe(mid);
    const long = `${'word '.repeat(100)}end`;
    const clipped = clipQuizOptionText(long, 80);
    expect(clipped.endsWith('…')).toBe(true);
    expect(clipped.length).toBeLessThanOrEqual(81);
  });

  it('IRT badge drops Calibrating scientific tone', () => {
    expect(badge).toMatch(/Getting to know your level/);
    expect(badge).toMatch(/Μαθαίνουμε το επίπεδό σου/);
    expect(badge).not.toMatch(/Calibrating ·/);
  });

  it('warn and empty are warm', () => {
    expect(i18n).toMatch(/still quite general/);
    expect(i18n).not.toMatch(/Questions are passage-grounded \(generic concept\)/);
    expect(empty).toMatch(/No questions yet/);
    expect(empty).toMatch(/Δεν υπάρχουν ακόμα ερωτήσεις/);
  });
});

describe('Wave FY2 — Feynman full-width composer', () => {
  const check = read('components/workspace/FeynmanCheck.tsx');

  it('uses full layout until feedback side appears', () => {
    expect(check).toContain('data-testid="feynman-layout"');
    expect(check).toContain("data-side={showFeedbackSide ? 'split' : 'full'}");
    expect(check).toContain('w-full');
    expect(check).not.toMatch(/xl:grid-cols-\[1fr_0\.9fr\]/);
  });
});
