import { describe, expect, it } from 'vitest';
import { defaultSettings, mockUser } from '../demo/mockData';
import {
  applyOnboardingProfileToSettings,
  buildOnboardingUserPatch,
  parseOnboardingGoals,
  validateOnboardingStep,
} from './onboardingProfile';

describe('onboardingProfile', () => {
  it('maps exam + practice goals to higher practice bias and intense intensity', () => {
    const next = applyOnboardingProfileToSettings(defaultSettings, {
      role: 'university',
      goals: ['exam', 'practice'],
      dailyGoalMinutes: 45,
      examDate: '2099-06-01',
    });
    expect(next.learningGoals).toEqual(['exam', 'practice']);
    expect(next.theoryVsPractice).toBeGreaterThan(50);
    expect(next.practiceIntensity).toBe('intense');
    expect(next.examDate).toBe('2099-06-01');
  });

  it('clears exam date when exam is not a selected goal', () => {
    const base = { ...defaultSettings, examDate: '2099-01-01' };
    const next = applyOnboardingProfileToSettings(base, {
      role: 'selflearner',
      goals: ['understand'],
      dailyGoalMinutes: 30,
      examDate: '2099-06-01',
    });
    expect(next.examDate).toBeUndefined();
    expect(next.theoryVsPractice).toBeLessThan(40);
  });

  it('validates role, goals, and past exam dates', () => {
    expect(validateOnboardingStep('role', { role: null, goals: [], examDate: '' })).toBe('roleRequired');
    expect(validateOnboardingStep('goals', { role: 'university', goals: [], examDate: '' })).toBe('goalRequired');
    expect(
      validateOnboardingStep('schedule', {
        role: 'university',
        goals: ['exam'],
        examDate: '',
      }),
    ).toBe('examDateRequired');
    expect(
      validateOnboardingStep('schedule', {
        role: 'university',
        goals: ['understand'],
        examDate: '2000-01-01',
      }),
    ).toBe('examDatePast');
  });

  it('filters unknown goal ids', () => {
    expect(parseOnboardingGoals(['exam', 'bogus', 'practice'])).toEqual(['exam', 'practice']);
  });

  it('maps segment to user role on completion', () => {
    const next = buildOnboardingUserPatch(mockUser, {
      role: 'selflearner',
      goals: ['explore'],
      dailyGoalMinutes: 30,
    }, {});
    expect(next.role).toBe('self-learner');
    expect(next.segment).toBe('selflearner');
    expect(next.onboardingComplete).toBe(true);
  });
});
