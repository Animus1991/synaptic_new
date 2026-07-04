/**
 * Adaptive gap routing — after repeated quiz failures, switch remediation to Feynman.
 */

import type { ActivityItem } from '../types';
import type { WorkspaceToolId } from './taskFlows';

export const QUIZ_FAIL_STREAK_THRESHOLD = 3;

function normConcept(s: string): string {
  return s.trim().toLowerCase();
}

export function conceptsMatch(a: string, b: string): boolean {
  const na = normConcept(a);
  const nb = normConcept(b);
  if (na === nb) return true;
  const prefix = na.slice(0, 6);
  return prefix.length >= 4 && (na.includes(nb) || nb.includes(na) || nb.includes(prefix));
}

export function extractConceptFromQuizActivity(activity: ActivityItem): string | null {
  if (activity.type !== 'quiz_failed' && activity.type !== 'quiz_passed') return null;
  const m = activity.description.match(/(?:Passed|Missed) quiz on (.+)$/i);
  return m?.[1]?.trim() ?? null;
}

/** Count consecutive recent quiz failures for a concept (stops at first pass). */
export function countRecentConsecutiveQuizFailures(
  activities: ActivityItem[],
  concept: string,
): number {
  const sorted = [...activities]
    .filter((a) => a.type === 'quiz_failed' || a.type === 'quiz_passed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let streak = 0;
  for (const act of sorted) {
    const c = extractConceptFromQuizActivity(act);
    if (!c || !conceptsMatch(c, concept)) continue;
    if (act.type === 'quiz_failed') streak += 1;
    else break;
  }
  return streak;
}

export function conceptsWithQuizFailStreak(
  activities: ActivityItem[],
  threshold = QUIZ_FAIL_STREAK_THRESHOLD,
): { concept: string; failStreak: number }[] {
  const seen = new Set<string>();
  const results: { concept: string; failStreak: number }[] = [];

  for (const act of activities) {
    if (act.type !== 'quiz_failed') continue;
    const concept = extractConceptFromQuizActivity(act);
    if (!concept) continue;
    const key = normConcept(concept);
    if (seen.has(key)) continue;
    seen.add(key);
    const failStreak = countRecentConsecutiveQuizFailures(activities, concept);
    if (failStreak >= threshold) {
      results.push({ concept, failStreak });
    }
  }

  return results.sort((a, b) => b.failStreak - a.failStreak);
}

export function recommendPracticeToolForConcept(
  concept: string,
  activities: ActivityItem[],
  defaultTool: WorkspaceToolId = 'quiz',
): WorkspaceToolId {
  if (countRecentConsecutiveQuizFailures(activities, concept) >= QUIZ_FAIL_STREAK_THRESHOLD) {
    return 'feynman';
  }
  return defaultTool;
}

export function shouldRouteAdaptiveGapToFeynman(
  concept: string,
  activities: ActivityItem[],
): boolean {
  return recommendPracticeToolForConcept(concept, activities) === 'feynman';
}
