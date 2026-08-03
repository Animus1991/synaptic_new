import type { SessionType } from './taskFlows';
import { loadDailyCheckIn } from './dailyLearningCheckIn';

export type RecommendedSessionInput = {
  daysToExam?: number | null;
  reviewDueCount: number;
  weakCount: number;
  openTaskCount: number;
  /** Optional chat-first check-in nudges (energy / minutes / intent). */
  checkInEnergy?: 'low' | 'ok' | 'high';
  checkInMinutes?: number;
  checkInIntent?: 'learn' | 'review' | 'practice' | 'exam' | 'light';
};

/** Pedagogy-light session recommendation for Tasks launcher "ΠΡΟΤΕΙΝΕΤΑΙ" badge. */
export function getRecommendedSessionType(input: RecommendedSessionInput): SessionType {
  // Chat-captured daily state wins for “what fits me right now”.
  if (input.checkInIntent === 'exam') return 'cram';
  if (input.checkInIntent === 'review') return 'review';
  if (input.checkInIntent === 'light' || input.checkInEnergy === 'low') return '10min';
  if (typeof input.checkInMinutes === 'number') {
    if (input.checkInMinutes <= 15) return '10min';
    if (input.checkInMinutes >= 45) return '50min';
    return '25min';
  }

  const days = input.daysToExam ?? null;
  if (days != null && days <= 7) return 'cram';
  if (input.reviewDueCount >= 3) return 'review';
  if (input.weakCount >= 2) return '25min';
  if (input.openTaskCount > 0 && input.openTaskCount <= 2) return '10min';
  return '25min';
}

/** Minimal task shape for App/Shell/Dashboard recommendation (store snapshot). */
export type RecommendedSessionTask = {
  status: string;
  category?: string;
  isSpacedRepetition?: boolean;
};

export type RecommendedSessionLearnerSlice = {
  daysToExam?: number | null;
  spacingIntervalCount?: number;
  weakAreaCount?: number;
};

/**
 * Single entry for Shell / Dashboard next-action — identical counting rules everywhere.
 * Tasks.tsx may still call getRecommendedSessionType directly with course-scoped counts.
 */
export function recommendSessionFromAppState(
  tasks: RecommendedSessionTask[],
  learner: RecommendedSessionLearnerSlice,
): SessionType {
  const reviewDueCount = tasks.filter(
    (task) =>
      task.status !== 'completed'
      && (task.category === 'review' || Boolean(task.isSpacedRepetition)),
  ).length;
  const openTaskCount = tasks.filter((task) => task.status !== 'completed').length;
  const checkIn = loadDailyCheckIn();
  return getRecommendedSessionType({
    daysToExam: learner.daysToExam ?? null,
    reviewDueCount: reviewDueCount || (learner.spacingIntervalCount ?? 0),
    weakCount: learner.weakAreaCount ?? 0,
    openTaskCount,
    checkInEnergy: checkIn.answers.energy,
    checkInMinutes: checkIn.answers.availableMinutes,
    checkInIntent: checkIn.answers.sessionIntent,
  });
}
