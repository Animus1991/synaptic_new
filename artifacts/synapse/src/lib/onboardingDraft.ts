import type { AppView } from '../types';
import { loadJson, saveJson } from './persistence';
import type { OnboardingGoalId, OnboardingRoleId } from './onboardingProfile';

export type OnboardingWizardStep = 'welcome' | 'role' | 'goals' | 'schedule';

export type OnboardingDraft = {
  step: OnboardingWizardStep;
  selectedRole: OnboardingRoleId | null;
  selectedGoals: OnboardingGoalId[];
  dailyTime: number;
  examDate: string;
  displayName: string;
  updatedAt: string;
};

const DRAFT_KEY = 'onboarding-draft-v1';

export function loadOnboardingDraft(): OnboardingDraft | null {
  const draft = loadJson<OnboardingDraft | null>(DRAFT_KEY, null);
  if (!draft?.step) return null;
  return draft;
}

export function saveOnboardingDraft(draft: Omit<OnboardingDraft, 'updatedAt'>): void {
  saveJson(DRAFT_KEY, { ...draft, updatedAt: new Date().toISOString() });
}

export function clearOnboardingDraft(): void {
  try {
    localStorage.removeItem(`synapse:${DRAFT_KEY}`);
  } catch {
    // ignore
  }
}

export function hasOnboardingDraft(): boolean {
  return loadOnboardingDraft() != null;
}

export function isResumedDraft(draft: OnboardingDraft | null): boolean {
  if (!draft) return false;
  return draft.step !== 'welcome'
    || draft.displayName.trim().length > 0
    || draft.selectedRole != null
    || draft.selectedGoals.length > 0;
}

/** Initial route when the app boots (B2 resume). */
export function resolveInitialAppView(
  onboardingComplete: boolean,
  draft: OnboardingDraft | null,
): AppView {
  if (onboardingComplete) return 'dashboard';
  if (draft) return 'onboarding';
  return 'landing';
}
