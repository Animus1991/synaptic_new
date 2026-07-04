/**
 * Proactive Agent alerts — FSRS forgetting risk, quiz fail streaks, open misconceptions.
 */

import { fsrsRetrievability } from './adaptiveScheduler';
import { conceptsWithQuizFailStreak, QUIZ_FAIL_STREAK_THRESHOLD } from './adaptiveGapRouting';
import { t, type Lang } from './i18n';
import type { ActivityItem, AgentMode, LearnerModel } from '../types';
import type { WorkspaceToolId } from './taskFlows';

export type ProactiveAlertKind =
  | 'forgetting-risk'
  | 'quiz-fail-streak'
  | 'misconception';

export type ProactiveAlertAction =
  | { type: 'workspace'; tool: WorkspaceToolId; concept?: string; courseId?: string }
  | { type: 'agent'; mode: AgentMode; prompt: string; concept?: string; courseId?: string };

export type ProactiveAgentAlert = {
  id: string;
  kind: ProactiveAlertKind;
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  concept?: string;
  courseId?: string;
  action: ProactiveAlertAction;
};

const RETRIEVABILITY_ALERT_THRESHOLD = 0.72;

function severityRank(s: ProactiveAgentAlert['severity']): number {
  if (s === 'urgent') return 3;
  if (s === 'warning') return 2;
  return 1;
}

export function buildProactiveAgentAlerts(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  activities: ActivityItem[];
  now?: Date;
  maxAlerts?: number;
}): ProactiveAgentAlert[] {
  const { lang, learnerModel, activities, now = new Date(), maxAlerts = 3 } = opts;
  const alerts: ProactiveAgentAlert[] = [];
  const seenConcepts = new Set<string>();

  for (const spacing of learnerModel.spacingIntervals) {
    if (spacing.reviewCount <= 0) continue;
    const r = fsrsRetrievability(spacing, now);
    if (r >= RETRIEVABILITY_ALERT_THRESHOLD) continue;
    const key = spacing.concept.toLowerCase();
    if (seenConcepts.has(key)) continue;
    seenConcepts.add(key);
    alerts.push({
      id: `forget-${key.replace(/\s+/g, '-')}`,
      kind: 'forgetting-risk',
      severity: r < 0.55 ? 'urgent' : 'warning',
      title: t('proactiveAlertForgettingTitle', lang),
      message: t('proactiveAlertForgettingMessage', lang)
        .replace('{concept}', spacing.concept)
        .replace('{pct}', String(Math.round(r * 100))),
      concept: spacing.concept,
      action: {
        type: 'workspace',
        tool: 'leitner',
        concept: spacing.concept,
      },
    });
  }

  for (const { concept, failStreak } of conceptsWithQuizFailStreak(activities)) {
    const key = concept.toLowerCase();
    if (seenConcepts.has(key)) continue;
    seenConcepts.add(key);
    const weak = learnerModel.weakAreas.find((w) => w.concept.toLowerCase() === key);
    alerts.push({
      id: `gap-${key.replace(/\s+/g, '-')}`,
      kind: 'quiz-fail-streak',
      severity: 'urgent',
      title: t('proactiveAlertGapTitle', lang),
      message: t('proactiveAlertGapMessage', lang)
        .replace('{concept}', concept)
        .replace('{count}', String(failStreak))
        .replace('{threshold}', String(QUIZ_FAIL_STREAK_THRESHOLD)),
      concept,
      courseId: weak?.courseId,
      action: {
        type: 'workspace',
        tool: 'feynman',
        concept,
        courseId: weak?.courseId,
      },
    });
  }

  for (const misc of learnerModel.misconceptions.filter((m) => !m.corrected)) {
    if (misc.frequency < 2) continue;
    const key = misc.concept.toLowerCase();
    if (seenConcepts.has(key)) continue;
    seenConcepts.add(key);
    alerts.push({
      id: `misc-${misc.id}`,
      kind: 'misconception',
      severity: 'warning',
      title: t('proactiveAlertMisconceptionTitle', lang),
      message: misc.description,
      concept: misc.concept,
      action: {
        type: 'agent',
        mode: 'error-diagnosis',
        prompt: t('proactiveAlertMisconceptionPrompt', lang).replace('{concept}', misc.concept),
        concept: misc.concept,
      },
    });
  }

  return alerts
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, maxAlerts);
}

export function proactiveAlertToWorkspaceLaunch(
  alert: ProactiveAgentAlert,
): { tool: WorkspaceToolId; concept?: string; courseId?: string } | null {
  if (alert.action.type !== 'workspace') return null;
  return {
    tool: alert.action.tool,
    concept: alert.action.concept ?? alert.concept,
    courseId: alert.action.courseId ?? alert.courseId,
  };
}
