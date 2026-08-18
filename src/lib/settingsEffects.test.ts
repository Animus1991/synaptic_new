import { describe, expect, it } from 'vitest';
import { mockUser } from '../demo/mockData';
import {
  dailyGoalProgressPct,
  lessonStepCount,
  quizQuestionCount,
  sessionPaceMinutes,
  shouldIncludeWorkedExample,
  shouldPreferManyExamples,
  shouldShowDiagrams,
} from './settingsEffects';

const base = mockUser.settings;

describe('settingsEffects pedagogy wiring', () => {
  it('maps question frequency and practice intensity to quiz count', () => {
    expect(quizQuestionCount({ ...base, questionFrequency: 'minimal', practiceIntensity: 'moderate' })).toBe(2);
    expect(quizQuestionCount({ ...base, questionFrequency: 'frequent', practiceIntensity: 'moderate' })).toBe(5);
    expect(quizQuestionCount({ ...base, questionFrequency: 'moderate', practiceIntensity: 'intense' })).toBe(4);
    expect(quizQuestionCount({ ...base, questionFrequency: 'minimal', practiceIntensity: 'light' })).toBe(2);
  });

  it('maps pacing to a recommended session length', () => {
    expect(sessionPaceMinutes({ ...base, pacing: 'fast' })).toBe(10);
    expect(sessionPaceMinutes({ ...base, pacing: 'moderate' })).toBe(25);
    expect(sessionPaceMinutes({ ...base, pacing: 'slow' })).toBe(50);
  });

  it('grows lesson steps with length and revision loops', () => {
    expect(lessonStepCount({ ...base, lessonLength: 'short', revisionLoops: 'fewer' })).toBe(5);
    expect(lessonStepCount({ ...base, lessonLength: 'medium', revisionLoops: 'moderate' })).toBe(6);
    expect(lessonStepCount({ ...base, lessonLength: 'long', revisionLoops: 'more' })).toBe(8);
  });

  it('reads example and diagram density', () => {
    expect(shouldIncludeWorkedExample({ ...base, exampleDensity: 'fewer' })).toBe(false);
    expect(shouldPreferManyExamples({ ...base, exampleDensity: 'many' })).toBe(true);
    expect(shouldShowDiagrams({ ...base, diagramFrequency: 'minimal' })).toBe(false);
    expect(shouldShowDiagrams({ ...base, diagramFrequency: 'rich' })).toBe(true);
  });

  it('compares study minutes to the daily goal', () => {
    expect(dailyGoalProgressPct(15, 30)).toBe(50);
    expect(dailyGoalProgressPct(45, 30)).toBe(100);
  });
});
