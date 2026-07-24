/**
 * Wave 6.8k — QA spine for Timer exam countdown ↔ dashboard parity.
 */

import { t, type Lang } from './i18n';
import { loadExamTarget, saveExamTarget } from './workspacePersistence';
import { selectDashboardNextAction } from './dashboardNextAction';
import type { DashboardStats, LearnerModel, Task } from '../types';

export type TimerExamCountdownIssue = {
  code: 'missing-timer-target' | 'date-source-drift' | 'missing-dashboard-date' | 'next-action-gap';
  message: string;
};

export type TimerExamCountdownDashboardReport = {
  ok: boolean;
  dashboardDays: number | null;
  timerDays: number | null;
  effectiveExamIso: string | null;
  synced: boolean;
  examPrepWindow: boolean;
  nextActionKind: string | null;
  syncOk: boolean;
  issues: TimerExamCountdownIssue[];
  bannerSummary: string | null;
};

export function normalizeExamDateIso(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(raw).toISOString();
}

/** Same day-count formula as dashboardExtras.daysToExam in useStore. */
export function computeDashboardDaysToExam(
  examDateIso: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!examDateIso) return null;
  const t = new Date(examDateIso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - now) / 86_400_000));
}

export function resolveEffectiveExamIso(input: {
  settingsExamDate?: string | null;
  courseExamDate?: string | null;
  scopeKey: string;
}): string | null {
  const fromSettings = normalizeExamDateIso(input.settingsExamDate);
  if (fromSettings) return fromSettings;
  const fromCourse = normalizeExamDateIso(input.courseExamDate);
  if (fromCourse) return fromCourse;
  return loadExamTarget(input.scopeKey);
}

/** Push settings/course exam date into workspace scope when timer target is missing or drifted. */
export function syncExamTargetFromDashboard(input: {
  scopeKey: string;
  settingsExamDate?: string | null;
  courseExamDate?: string | null;
}): { synced: boolean; effectiveIso: string | null } {
  const canonical = normalizeExamDateIso(input.settingsExamDate)
    ?? normalizeExamDateIso(input.courseExamDate);
  if (!canonical) {
    return { synced: false, effectiveIso: loadExamTarget(input.scopeKey) };
  }

  const existing = loadExamTarget(input.scopeKey);
  const canonicalDays = computeDashboardDaysToExam(canonical);
  const existingDays = existing ? computeDashboardDaysToExam(existing) : null;

  if (existingDays === canonicalDays) {
    return { synced: false, effectiveIso: existing ?? canonical };
  }

  saveExamTarget(input.scopeKey, canonical);
  return { synced: true, effectiveIso: canonical };
}

export function auditTimerExamCountdownDashboard(input: {
  scopeKey: string;
  settingsExamDate?: string | null;
  courseExamDate?: string | null;
  lang: Lang;
  now?: number;
  learnerModel?: LearnerModel;
  tasks?: Task[];
  stats?: DashboardStats;
}): TimerExamCountdownDashboardReport {
  const now = input.now ?? Date.now();
  const issues: TimerExamCountdownIssue[] = [];

  const dashboardSource = input.settingsExamDate ?? input.courseExamDate ?? null;
  const dashboardDays = computeDashboardDaysToExam(dashboardSource, now);

  const { synced, effectiveIso } = syncExamTargetFromDashboard(input);
  const timerDays = computeDashboardDaysToExam(effectiveIso, now);

  if (dashboardDays !== null && timerDays === null) {
    issues.push({
      code: 'missing-timer-target',
      message: 'Dashboard has exam date but timer scope has no target',
    });
  }

  if (dashboardDays !== null && timerDays !== null && dashboardDays !== timerDays) {
    issues.push({
      code: 'date-source-drift',
      message: `Dashboard ${dashboardDays}d vs timer ${timerDays}d`,
    });
  }

  if (timerDays !== null && dashboardDays === null) {
    issues.push({
      code: 'missing-dashboard-date',
      message: 'Timer scope has exam target but dashboard settings lack exam date',
    });
  }

  const examPrepWindow = dashboardDays !== null && dashboardDays <= 14;
  let nextActionKind: string | null = null;

  if (input.learnerModel && input.tasks && input.stats) {
    const next = selectDashboardNextAction({
      lang: input.lang,
      learnerModel: input.learnerModel,
      tasks: input.tasks,
      stats: input.stats,
      daysToExam: dashboardDays,
    });
    nextActionKind = next?.kind ?? null;
    if (examPrepWindow && nextActionKind !== 'exam-prep') {
      issues.push({
        code: 'next-action-gap',
        message: `Within 14d window but next action is ${nextActionKind ?? 'none'}`,
      });
    }
  }

  const syncOk = !issues.some(
    (i) => i.code === 'date-source-drift' || i.code === 'missing-timer-target',
  );

  return {
    ok: issues.length === 0,
    dashboardDays,
    timerDays,
    effectiveExamIso: effectiveIso,
    synced,
    examPrepWindow,
    nextActionKind,
    syncOk,
    issues,
    bannerSummary: formatTimerExamCountdownBanner({
      dashboardDays,
      timerDays,
      synced,
      lang: input.lang,
    }),
  };
}

export function formatTimerExamCountdownBanner(input: {
  dashboardDays: number | null;
  timerDays: number | null;
  synced: boolean;
  lang: Lang;
}): string | null {
  if (input.dashboardDays === null && input.timerDays === null) return null;
  const lang = input.lang;
  const days = input.dashboardDays ?? input.timerDays;
  if (days === null) return null;

  const countdown = days === 0
    ? t('qaExamToday', lang)
    : t('panelDaysToExam', lang).replace('{days}', String(days));

  const syncNote = input.synced
    ? t('qaSyncedNote', lang)
    : (input.dashboardDays !== null && input.timerDays !== null && input.dashboardDays === input.timerDays
      ? t('qaDashboardTimerNote', lang)
      : '');

  return `${t('qaCountdownTitle', lang)} · ${countdown}${syncNote}`;
}
