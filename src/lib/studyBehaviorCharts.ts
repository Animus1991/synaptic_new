import type { ActivityItem } from '../types';
import { filterActivitiesByRange, type AnalyticsDateRange } from './analyticsDateRange';
import { recallOutcomeFromActivity } from '../features/analytics/retentionAnalytics';
import { localeTag, parseCalendarDate } from './localeFormat';

export type DayBar = { key: string; label: string; count: number };
export type SessionTypeSlice = { key: string; label: string; value: number; color: string };
export type EffectivenessPoint = {
  key: string;
  label: string;
  score: number | null;
  sampleSize: number;
};

function dayKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function activityDayKey(activity: ActivityItem): string | null {
  const date = new Date(activity.timestamp);
  return Number.isFinite(date.getTime()) ? dayKey(date) : null;
}

export function buildStudyBehaviorModel(
  activities: ActivityItem[],
  range: AnalyticsDateRange,
  lang: 'en' | 'el',
  now: Date = new Date(),
): {
  dayBars: DayBar[];
  sessionTypes: SessionTypeSlice[];
  effectiveness: EffectivenessPoint[];
} {
  const inRange = filterActivitiesByRange(activities, range, now.getTime());
  const bucketCount = range === '7d' ? 7 : range === '30d' ? 15 : 13;
  const stepDays = range === '7d' ? 1 : range === '30d' ? 2 : 14;
  const dayBars: DayBar[] = [];
  const dailyFormatter = new Intl.DateTimeFormat(localeTag(lang), { weekday: 'short' });
  const periodFormatter = new Intl.DateTimeFormat(localeTag(lang), { month: 'short', day: 'numeric' });
  const activityRows = inRange
    .map((activity) => ({ activity, key: activityDayKey(activity) }))
    .filter((row): row is { activity: ActivityItem; key: string } => row.key !== null);

  for (let i = bucketCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i * stepDays);
    const key = dayKey(d);
    const windowStart = new Date(d);
    windowStart.setDate(windowStart.getDate() - (stepDays - 1));
    const startKey = dayKey(windowStart);
    const count = activityRows.filter((row) => {
      return row.key >= startKey && row.key <= key;
    }).length;
    dayBars.push({
      key,
      label: range === '7d'
        ? dailyFormatter.format(parseCalendarDate(key))
        : periodFormatter.format(parseCalendarDate(key)),
      count,
    });
  }

  const typeBuckets: Record<string, number> = {
    quiz: 0,
    review: 0,
    task: 0,
    other: 0,
  };
  for (const a of inRange) {
    if (a.type === 'quiz_passed' || a.type === 'quiz_failed') typeBuckets.quiz! += 1;
    else if (a.type === 'review_done') typeBuckets.review! += 1;
    else if (a.type === 'task_complete' || a.type === 'lesson_complete') typeBuckets.task! += 1;
    else typeBuckets.other! += 1;
  }
  const sessionTypes: SessionTypeSlice[] = [
    { key: 'quiz', label: lang === 'el' ? 'Quiz' : 'Quiz', value: typeBuckets.quiz!, color: 'var(--color-brand-600)' },
    { key: 'review', label: lang === 'el' ? 'Επανάληψη' : 'Review', value: typeBuckets.review!, color: 'var(--color-accent-teal)' },
    { key: 'task', label: lang === 'el' ? 'Εργασίες' : 'Tasks', value: typeBuckets.task!, color: 'var(--color-accent-amber)' },
    { key: 'other', label: lang === 'el' ? 'Άλλο' : 'Other', value: typeBuckets.other!, color: 'var(--color-text-muted)' },
  ].filter((s) => s.value > 0);

  const effectiveness: EffectivenessPoint[] = dayBars.map((d) => {
    const end = d.key;
    const startDate = new Date(`${end}T12:00:00`);
    startDate.setDate(startDate.getDate() - (stepDays - 1));
    const start = dayKey(startDate);
    const outcomes = activityRows
      .filter((row) => row.key >= start && row.key <= end)
      .map((row) => recallOutcomeFromActivity(row.activity))
      .filter((outcome): outcome is boolean => outcome !== null);
    const passed = outcomes.filter(Boolean).length;
    const score = outcomes.length === 0 ? null : Math.round((passed / outcomes.length) * 100);
    return { key: d.key, label: d.label, score, sampleSize: outcomes.length };
  });

  return { dayBars, sessionTypes, effectiveness };
}
