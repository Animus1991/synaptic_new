import { describe, expect, it } from 'vitest';
import {
  daysUntilExam,
  examPracticePresetForScenario,
  suggestExamPracticePreset,
  workSecondsForExamPractice,
} from './examPracticePresets';

describe('examPracticePresets', () => {
  it('maps simulator scenarios to exam practice blocks', () => {
    expect(examPracticePresetForScenario('demand-boom')).toBe('scenario-shock');
    expect(examPracticePresetForScenario('baseline')).toBe('section-focus');
    expect(workSecondsForExamPractice('sprint-drill')).toBe(15 * 60);
  });

  it('suggests full block when exam is within a week and mastery is high', () => {
    expect(suggestExamPracticePreset({ conceptMastery: 80, daysToExam: 5 })).toBe('full-exam-block');
    expect(suggestExamPracticePreset({ conceptMastery: 30, daysToExam: 5 })).toBe('scenario-shock');
  });

  it('prefers scenario-linked block after simulator engagement', () => {
    expect(
      suggestExamPracticePreset({
        conceptMastery: 50,
        lastSimulatorScenario: 'supply-shock',
        simulatorEngaged: true,
      }),
    ).toBe('scenario-shock');
  });

  it('computes days until exam from ISO target', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const days = daysUntilExam(future.toISOString());
    expect(days).toBeGreaterThanOrEqual(2);
    expect(days).toBeLessThanOrEqual(4);
  });
});
