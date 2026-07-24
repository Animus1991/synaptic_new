import type { SessionType } from './taskFlows';

/** Pedagogy-light session recommendation for Tasks launcher "ΠΡΟΤΕΙΝΕΤΑΙ" badge. */
export function getRecommendedSessionType(input: {
  daysToExam?: number | null;
  reviewDueCount: number;
  weakCount: number;
  openTaskCount: number;
}): SessionType {
  const days = input.daysToExam ?? null;
  if (days != null && days <= 7) return 'cram';
  if (input.reviewDueCount >= 3) return 'review';
  if (input.weakCount >= 2) return '25min';
  if (input.openTaskCount > 0 && input.openTaskCount <= 2) return '10min';
  return '25min';
}
