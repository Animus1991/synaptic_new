import type { ActivityItem, LearnerModel } from '../../types';
import type { PrerequisiteRepair } from '../../lib/pedagogy';

const CURVE_DAYS = [0, 1, 3, 7, 14, 21, 30] as const;

export type RetentionEvidence = {
  eligibleEvents: number;
  successes: number;
  failures: number;
};

export type DailyLearningSignal = {
  date: string;
  score: number | null;
  activityCount: number;
};

export function recallOutcomeFromActivity(activity: ActivityItem): boolean | null {
  if (activity.type === 'quiz_passed') return true;
  if (activity.type === 'quiz_failed') return false;
  if (activity.type !== 'review_done') return null;

  // Current review activities persist the FSRS rating in a trailing pair of
  // parentheses. Older records did not include an outcome and must not be
  // silently counted as successful recall.
  const rating = activity.description.match(/\((again|hard|good|easy)\)\s*$/i)?.[1]?.toLowerCase();
  if (!rating) return null;
  return rating !== 'again';
}

export function retentionEvidenceFromActivities(activities: ActivityItem[]): RetentionEvidence {
  const outcomes = activities
    .map(recallOutcomeFromActivity)
    .filter((outcome): outcome is boolean => outcome !== null);
  const successes = outcomes.filter(Boolean).length;
  return {
    eligibleEvents: outcomes.length,
    successes,
    failures: outcomes.length - successes,
  };
}

/**
 * A transparent activity-based projection, not an empirically observed
 * forgetting curve. The aggregate eligible recall rate controls the half-life.
 */
export function retentionCurveFromActivities(
  activities: ActivityItem[],
): { day: number; retention: number }[] {
  const evidence = retentionEvidenceFromActivities(activities);
  if (evidence.eligibleEvents < 2) return [];

  const passRate = evidence.successes / evidence.eligibleEvents;
  // Explicit heuristic: 3–21 day half-life, monotonically increasing with
  // observed success rate. This avoids presenting sparse logs as observations.
  const halfLifeDays = 3 + passRate * 18;

  return CURVE_DAYS.map((day) => ({
    day,
    retention: Math.max(0, Math.round(100 * 0.5 ** (day / halfLifeDays))),
  }));
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Last seven local-calendar days of activity signal. This is deliberately not
 * called mastery: +15 eligible recall success, +8 completion, −10 failure.
 */
export function weeklyLearningSignalFromActivities(
  activities: ActivityItem[],
  now: Date = new Date(),
): DailyLearningSignal[] {
  const activitiesByDay = new Map<string, ActivityItem[]>();
  for (const activity of activities) {
    const timestamp = new Date(activity.timestamp);
    if (!Number.isFinite(timestamp.getTime())) continue;
    const key = localDateKey(timestamp);
    activitiesByDay.set(key, [...(activitiesByDay.get(key) ?? []), activity]);
  }

  const days: DailyLearningSignal[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = localDateKey(date);
    const dayActs = activitiesByDay.get(key) ?? [];
    const outcomes = dayActs
      .map(recallOutcomeFromActivity)
      .filter((outcome): outcome is boolean => outcome !== null);
    const passed = outcomes.filter(Boolean).length;
    const failed = outcomes.length - passed;
    const completed = dayActs.filter((a) => a.type === 'task_complete' || a.type === 'lesson_complete').length;
    const score = passed * 15 + completed * 8 - failed * 10;
    days.push({
      date: key,
      score: dayActs.length > 0 ? Math.max(0, Math.min(100, score)) : null,
      activityCount: dayActs.length,
    });
  }
  return days;
}

/** @deprecated Persisted learner-state compatibility; use the dated signal. */
export function weeklyMasteryFromActivities(activities: ActivityItem[]): number[] {
  return weeklyLearningSignalFromActivities(activities).map((day) => day.score ?? 0);
}

export function computeRetentionRate(activities: ActivityItem[]): number {
  const evidence = retentionEvidenceFromActivities(activities);
  return evidence.eligibleEvents > 0 ? evidence.successes / evidence.eligibleEvents : 0;
}

export function adaptiveRecommendations(
  model: LearnerModel,
  activities: ActivityItem[],
  repairs: PrerequisiteRepair[],
): string[] {
  const tips: string[] = [];
  const retention = computeRetentionRate(activities);

  if (retention > 0 && retention < 0.65) {
    tips.push('Your recent quiz/review accuracy is below 65% — schedule shorter, more frequent review sessions.');
  }
  if (retention >= 0.85 && activities.length >= 5) {
    tips.push('Strong recall this week — interleave harder transfer questions from your uploaded notes.');
  }
  for (const r of repairs.slice(0, 2)) {
    tips.push(`Repair prerequisite "${r.prerequisite}" before "${r.concept}" (detected from mastery graph).`);
  }
  if (model.weakAreas.length > 0) {
    const w = model.weakAreas[0]!;
    tips.push(`Focus next on "${w.concept}" (${w.mastery}% mastery) from your generated course.`);
  }
  const recentStudy = activities.filter((a) => a.type === 'study_time').length;
  if (recentStudy === 0 && activities.length > 0) {
    tips.push('No timed focus sessions logged recently — use the workspace timer to track deliberate practice.');
  }
  if (model.retrievalPerformance < 0.55 && model.totalSessions >= 3) {
    tips.push('Retrieval practice (flashcards, exam prep) gives the highest leverage for your profile right now.');
  }
  return tips.slice(0, 5);
}
