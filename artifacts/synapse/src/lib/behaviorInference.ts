import type { ActivityItem, Course } from '../types';
import type { LearningEvent } from './learningEvents';
import { computeRetentionRate } from './retentionAnalytics';

export type BehaviorInference = {
  bestTimeOfDay: string;
  cognitiveLoadPreference: 'low' | 'medium' | 'high';
  transferAbility: number;
  helpSeekingRate: number;
  persistenceScore: number;
  retrievalPerformance: number;
  averageSessionLength: number;
  preferredSessionLength: number;
  totalStudyTime: number;
  totalSessions: number;
  sampleSize: number;
  inferenceConfidence: 'low' | 'medium' | 'high';
};

const HOUR_BUCKETS: { label: string; start: number; end: number }[] = [
  { label: '06:00–09:00', start: 6, end: 9 },
  { label: '09:00–12:00', start: 9, end: 12 },
  { label: '12:00–15:00', start: 12, end: 15 },
  { label: '15:00–18:00', start: 15, end: 18 },
  { label: '18:00–21:00', start: 18, end: 21 },
  { label: '21:00–24:00', start: 21, end: 24 },
];

function parseSessionMinutes(description: string): number {
  const m = description.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1]!, 10) : 0;
}

function activityScore(type: ActivityItem['type']): number {
  if (type === 'quiz_passed' || type === 'review_done' || type === 'task_complete') return 2;
  if (type === 'lesson_complete' || type === 'mistake_fixed') return 1;
  if (type === 'quiz_failed') return -1;
  return 0;
}

function inferBestTimeOfDay(activities: ActivityItem[]): string {
  const bucketScores = new Map<string, number>();
  for (const act of activities) {
    const hour = new Date(act.timestamp).getHours();
    const bucket = HOUR_BUCKETS.find((b) => hour >= b.start && hour < b.end);
    if (!bucket) continue;
    bucketScores.set(bucket.label, (bucketScores.get(bucket.label) ?? 0) + activityScore(act.type));
  }
  if (bucketScores.size === 0) return '';
  let best = '';
  let bestScore = -Infinity;
  for (const [label, score] of bucketScores) {
    if (score > bestScore) {
      bestScore = score;
      best = label;
    }
  }
  return best;
}

function inferCognitiveLoad(avgMinutes: number): 'low' | 'medium' | 'high' {
  if (avgMinutes <= 0) return 'medium';
  if (avgMinutes < 20) return 'low';
  if (avgMinutes <= 45) return 'medium';
  return 'high';
}

function inferHelpSeekingRate(
  activities: ActivityItem[],
  events: LearningEvent[],
): number {
  const agentEvents = events.filter((e) => e.type === 'agent_message');
  const hints = agentEvents.filter((e) => e.payload?.isHint === true).length;
  const agentQueries = agentEvents.length;
  const independent = activities.filter(
    (a) => a.type === 'quiz_passed' || a.type === 'task_complete' || a.type === 'review_done',
  ).length;
  const denominator = Math.max(1, independent + agentQueries);
  return Math.min(1, (hints + agentQueries * 0.35) / denominator);
}

function inferPersistence(activities: ActivityItem[]): number {
  const sorted = [...activities].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let failures = 0;
  let recoveries = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]!.type !== 'quiz_failed') continue;
    failures += 1;
    const failTime = new Date(sorted[i]!.timestamp).getTime();
    const recovered = sorted.slice(i + 1, i + 8).some((a) => {
      const dt = new Date(a.timestamp).getTime() - failTime;
      return dt >= 0 && dt <= 48 * 3600_000
        && (a.type === 'quiz_passed' || a.type === 'review_done' || a.type === 'task_complete');
    });
    if (recovered) recoveries += 1;
  }
  if (failures === 0) return activities.length >= 3 ? 0.65 : 0;
  return recoveries / failures;
}

function conceptHasPrerequisites(concept: string, courses: Course[]): boolean {
  const key = concept.toLowerCase();
  for (const c of courses) {
    for (const t of c.topics) {
      if (t.title.toLowerCase() === key && (t.prerequisites?.length ?? 0) > 0) return true;
    }
  }
  return false;
}

function extractConceptFromDescription(description: string): string | null {
  const m = description.match(/(?:on|Reviewed:|quiz on)\s+(.+?)(?:\s*\(|$)/i);
  return m?.[1]?.trim() ?? null;
}

function inferTransferAbility(
  activities: ActivityItem[],
  events: LearningEvent[],
  courses: Course[],
): number {
  const quizEvents = events.filter((e) => e.type === 'quiz_attempted');
  if (quizEvents.length >= 2) {
    const transferAttempts = quizEvents.filter((e) => {
      const concept = e.concept ?? '';
      return concept && conceptHasPrerequisites(concept, courses);
    });
    if (transferAttempts.length > 0) {
      const ok = transferAttempts.filter((e) => e.payload?.correct === true).length;
      return ok / transferAttempts.length;
    }
  }

  const quizActs = activities.filter((a) => a.type === 'quiz_passed' || a.type === 'quiz_failed');
  if (quizActs.length === 0) return 0;
  let transferTotal = 0;
  let transferOk = 0;
  for (const act of quizActs) {
    const concept = extractConceptFromDescription(act.description);
    if (!concept || !conceptHasPrerequisites(concept, courses)) continue;
    transferTotal += 1;
    if (act.type === 'quiz_passed') transferOk += 1;
  }
  if (transferTotal > 0) return transferOk / transferTotal;
  const passed = quizActs.filter((a) => a.type === 'quiz_passed').length;
  return passed / quizActs.length;
}

/**
 * Derive adaptive behavior metrics from the activity log and structured learning events.
 * Used by Dashboard Self-Reliance and Analytics Behavior tab.
 */
export function inferBehaviorFromActivities(
  activities: ActivityItem[],
  events: LearningEvent[] = [],
  courses: Course[] = [],
): BehaviorInference {
  const sampleSize = activities.length + events.length;
  const sessionActs = activities.filter((a) => a.type === 'study_time');
  const sessionMinutes = sessionActs.map((a) => parseSessionMinutes(a.description)).filter((m) => m > 0);
  const avgSession = sessionMinutes.length > 0
    ? Math.round(sessionMinutes.reduce((s, m) => s + m, 0) / sessionMinutes.length)
    : 25;
  const totalStudyTime = sessionMinutes.reduce((s, m) => s + m, 0);
  const totalSessions = sessionActs.length;

  const retrievalPerformance = computeRetentionRate(activities);
  const helpSeekingRate = inferHelpSeekingRate(activities, events);
  const persistenceScore = inferPersistence(activities);
  const transferAbility = inferTransferAbility(activities, events, courses);
  const bestTimeOfDay = inferBestTimeOfDay(activities);
  const cognitiveLoadPreference = inferCognitiveLoad(avgSession);

  let inferenceConfidence: BehaviorInference['inferenceConfidence'] = 'low';
  if (sampleSize >= 15) inferenceConfidence = 'high';
  else if (sampleSize >= 5) inferenceConfidence = 'medium';

  return {
    bestTimeOfDay,
    cognitiveLoadPreference,
    transferAbility,
    helpSeekingRate,
    persistenceScore,
    retrievalPerformance,
    averageSessionLength: avgSession,
    preferredSessionLength: Math.max(15, Math.min(60, avgSession)),
    totalStudyTime,
    totalSessions,
    sampleSize,
    inferenceConfidence,
  };
}

export function applyBehaviorInference<T extends {
  bestTimeOfDay: string;
  cognitiveLoadPreference: 'low' | 'medium' | 'high';
  transferAbility: number;
  helpSeekingRate: number;
  persistenceScore: number;
  retrievalPerformance: number;
  averageSessionLength: number;
  preferredSessionLength: number;
  totalStudyTime: number;
  totalSessions: number;
}>(
  model: T,
  inference: BehaviorInference,
): T {
  if (inference.sampleSize === 0) return model;
  return {
    ...model,
    bestTimeOfDay: inference.bestTimeOfDay || model.bestTimeOfDay,
    cognitiveLoadPreference: inference.cognitiveLoadPreference,
    transferAbility: inference.transferAbility,
    helpSeekingRate: inference.helpSeekingRate,
    persistenceScore: inference.persistenceScore,
    retrievalPerformance: inference.retrievalPerformance || model.retrievalPerformance,
    averageSessionLength: inference.averageSessionLength,
    preferredSessionLength: inference.preferredSessionLength,
    totalStudyTime: inference.totalStudyTime || model.totalStudyTime,
    totalSessions: inference.totalSessions || model.totalSessions,
  };
}
