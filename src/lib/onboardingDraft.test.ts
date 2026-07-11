/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearOnboardingDraft,
  isResumedDraft,
  loadOnboardingDraft,
  resolveInitialAppView,
  saveOnboardingDraft,
} from './onboardingDraft';

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  });
}

describe('onboardingDraft', () => {
  beforeEach(() => {
    mockLocalStorage();
    clearOnboardingDraft();
  });

  it('persists and reloads draft state', () => {
    saveOnboardingDraft({
      step: 'goals',
      selectedRole: 'university',
      selectedGoals: ['exam'],
      dailyTime: 45,
      examDate: '2099-06-01',
      displayName: 'Alex',
    });
    const draft = loadOnboardingDraft();
    expect(draft?.step).toBe('goals');
    expect(draft?.selectedRole).toBe('university');
    expect(draft?.selectedGoals).toEqual(['exam']);
    expect(draft?.displayName).toBe('Alex');
  });

  it('resolves initial view from profile and draft', () => {
    expect(resolveInitialAppView(true, null)).toBe('dashboard');
    expect(resolveInitialAppView(false, null)).toBe('landing');
    expect(resolveInitialAppView(false, {
      step: 'role',
      selectedRole: null,
      selectedGoals: [],
      dailyTime: 30,
      examDate: '',
      displayName: '',
      updatedAt: '',
    })).toBe('onboarding');
  });

  it('detects resumed drafts', () => {
    expect(isResumedDraft(null)).toBe(false);
    expect(isResumedDraft({
      step: 'welcome',
      selectedRole: null,
      selectedGoals: [],
      dailyTime: 30,
      examDate: '',
      displayName: '',
      updatedAt: '',
    })).toBe(false);
    expect(isResumedDraft({
      step: 'role',
      selectedRole: 'selflearner',
      selectedGoals: [],
      dailyTime: 30,
      examDate: '',
      displayName: '',
      updatedAt: '',
    })).toBe(true);
  });
});
