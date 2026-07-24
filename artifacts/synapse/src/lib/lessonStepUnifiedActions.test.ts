import { describe, expect, it } from 'vitest';
import {
  LESSON_STEP_UNIFIED_ACTIONS,
  buildLessonStepUnifiedActions,
} from './lessonStepUnifiedActions';

describe('lessonStepUnifiedActions (SW-P1-03)', () => {
  it('exposes four core actions in order', () => {
    expect(LESSON_STEP_UNIFIED_ACTIONS).toEqual([
      'study-section',
      'test-me',
      'explain-zero',
      'ask-agent',
    ]);
  });

  it('marks nextAction primary when it is a unified action', () => {
    const actions = buildLessonStepUnifiedActions('en', {
      primary: 'test-me',
      reason: 'Quiz due',
      secondary: ['study-section'],
    });
    expect(actions.find((a) => a.id === 'test-me')?.recommended).toBe(true);
    expect(actions.find((a) => a.id === 'study-section')?.recommended).toBe(false);
  });

  it('does not mark reprocess or flashcards as recommended', () => {
    const actions = buildLessonStepUnifiedActions('el', {
      primary: 'reprocess',
      reason: 'Pipeline',
      secondary: ['flashcards'],
    });
    expect(actions.every((a) => !a.recommended)).toBe(true);
    expect(actions[0].label).toBe('Μελέτη ενότητας');
  });
});
