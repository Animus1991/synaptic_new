import { describe, expect, it } from 'vitest';
import { buildLessonStepToolbarTools } from './lessonStepToolbarNextActionSync';

describe('lessonStepToolbarNextActionSync', () => {
  it('prepends feynman when next action is explain-zero', () => {
    const report = buildLessonStepToolbarTools({
      step: { title: 'Core idea', type: 'core' },
      stepIndex: 2,
      stepCount: 8,
      nextAction: {
        primary: 'explain-zero',
        reason: 'Section marked confusing',
        secondary: ['ask-agent'],
      },
    });
    expect(report.recommendedTool).toBe('feynman');
    expect(report.tools[0]).toBe('feynman');
    expect(report.ok).toBe(true);
  });

  it('prepends quiz for test-me next action', () => {
    const report = buildLessonStepToolbarTools({
      step: { title: 'Retrieval', type: 'retrieval' },
      stepIndex: 6,
      stepCount: 8,
      nextAction: {
        primary: 'test-me',
        reason: 'Ready for knowledge check',
        secondary: ['flashcards'],
      },
    });
    expect(report.tools[0]).toBe('quiz');
  });
});
