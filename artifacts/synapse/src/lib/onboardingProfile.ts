import type { User, UserSettings } from '../types';

export const ONBOARDING_ROLE_IDS = [
  'university',
  'highschool',
  'selflearner',
  'tutor',
  'company',
] as const;

export type OnboardingRoleId = (typeof ONBOARDING_ROLE_IDS)[number];

export const ONBOARDING_GOAL_IDS = [
  'exam',
  'understand',
  'review',
  'practice',
  'organize',
  'explore',
] as const;

export type OnboardingGoalId = (typeof ONBOARDING_GOAL_IDS)[number];

export type OnboardingProfile = {
  role: OnboardingRoleId;
  goals: OnboardingGoalId[];
  dailyGoalMinutes: number;
  examDate?: string;
  displayName?: string;
};

export type OnboardingCompletionOptions = {
  openUpload?: boolean;
  openTeacher?: boolean;
  exploreDemoMode?: boolean;
  skipWizard?: boolean;
};

export type OnboardingValidationError =
  | 'roleRequired'
  | 'goalRequired'
  | 'examDateRequired'
  | 'examDatePast';

const ROLE_SET = new Set<string>(ONBOARDING_ROLE_IDS);
const GOAL_SET = new Set<string>(ONBOARDING_GOAL_IDS);

export function isOnboardingRoleId(value: string): value is OnboardingRoleId {
  return ROLE_SET.has(value);
}

export function isOnboardingGoalId(value: string): value is OnboardingGoalId {
  return GOAL_SET.has(value);
}

export function parseOnboardingGoals(values: string[]): OnboardingGoalId[] {
  return values.filter(isOnboardingGoalId);
}

function primaryGoal(goals: OnboardingGoalId[]): OnboardingGoalId | undefined {
  return goals[0];
}

function theoryVsPracticeFromGoals(goals: OnboardingGoalId[]): number {
  const primary = primaryGoal(goals);
  switch (primary) {
    case 'practice': return 78;
    case 'understand': return 22;
    case 'exam': return 58;
    case 'review': return 42;
    case 'organize': return 32;
    case 'explore': return 50;
    default: return 50;
  }
}

function practiceIntensityFromGoals(goals: OnboardingGoalId[]): UserSettings['practiceIntensity'] {
  if (goals.includes('practice') || goals.includes('exam')) return 'intense';
  if (goals.includes('review')) return 'light';
  return 'moderate';
}

function pacingFromProfile(profile: OnboardingProfile): UserSettings['pacing'] {
  if (profile.goals.includes('understand')) return 'slow';
  if (profile.goals.includes('exam') && profile.examDate) {
    const days = Math.ceil((new Date(profile.examDate).getTime() - Date.now()) / 86400000);
    if (days <= 21) return 'fast';
  }
  return 'moderate';
}

function revisionLoopsFromGoals(goals: OnboardingGoalId[]): UserSettings['revisionLoops'] {
  if (goals.includes('review') || goals.includes('exam')) return 'more';
  return 'moderate';
}

/** Pure mapper: onboarding answers → persisted settings deltas (B2). */
export function applyOnboardingProfileToSettings(
  base: UserSettings,
  profile: OnboardingProfile,
): UserSettings {
  const hasExamGoal = profile.goals.includes('exam');
  return {
    ...base,
    dailyGoalMinutes: profile.dailyGoalMinutes,
    learningGoals: profile.goals,
    theoryVsPractice: theoryVsPracticeFromGoals(profile.goals),
    practiceIntensity: practiceIntensityFromGoals(profile.goals),
    pacing: pacingFromProfile(profile),
    revisionLoops: revisionLoopsFromGoals(profile.goals),
    examDate: hasExamGoal && profile.examDate ? profile.examDate : undefined,
    teachingStyle: profile.role === 'tutor' ? 'direct' : base.teachingStyle,
  };
}

export function validateOnboardingStep(
  step: 'role' | 'goals' | 'schedule',
  input: {
    role: string | null;
    goals: string[];
    examDate: string;
  },
): OnboardingValidationError | null {
  if (step === 'role' && !input.role) return 'roleRequired';
  if (step === 'goals' && input.goals.length === 0) return 'goalRequired';
  if (step === 'schedule') {
    const goals = parseOnboardingGoals(input.goals);
    if (goals.includes('exam') && !input.examDate.trim()) return 'examDateRequired';
    if (input.examDate.trim()) {
      const picked = new Date(input.examDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      picked.setHours(0, 0, 0, 0);
      if (picked < today) return 'examDatePast';
    }
  }
  return null;
}

function userRoleFromOnboardingSegment(role: OnboardingRoleId, openTeacher?: boolean): User['role'] {
  if (role === 'tutor' || openTeacher) return 'teacher';
  if (role === 'selflearner') return 'self-learner';
  if (role === 'company') return 'corporate';
  return 'student';
}

export function buildOnboardingUserPatch(
  user: User,
  profile: OnboardingProfile,
  opts: { openTeacher?: boolean },
): User {
  const trimmedName = (profile.displayName ?? '').trim();
  return {
    ...user,
    name: trimmedName || user.name,
    segment: profile.role,
    role: userRoleFromOnboardingSegment(profile.role, opts.openTeacher),
    onboardingComplete: true,
    settings: applyOnboardingProfileToSettings(user.settings, profile),
  };
}
