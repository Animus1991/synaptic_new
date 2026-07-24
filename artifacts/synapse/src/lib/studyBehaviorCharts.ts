import type { ActivityItem } from '../types';
import { filterActivitiesByRange, type AnalyticsDateRange } from './analyticsDateRange';

export type DayBar = { key: string; label: string; count: number };
export type SessionTypeSlice = { key: string; label: string; value: number; color: string };
export type EffectivenessPoint = { key: string; label: string; score: number };

const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_EL = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildStudyBehaviorModel(
  activities: ActivityItem[],
  range: AnalyticsDateRange,
  lang: 'en' | 'el',
): {
  dayBars: DayBar[];
  sessionTypes: SessionTypeSlice[];
  effectiveness: EffectivenessPoint[];
} {
  const inRange = filterActivitiesByRange(activities, range);
  const days = range === '7d' ? 7 : range === '30d' ? 14 : 14;
  const now = new Date();
  const dayBars: DayBar[] = [];
  const labels = lang === 'el' ? DAY_LABELS_EL : DAY_LABELS_EN;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const count = inRange.filter((a) => a.timestamp.slice(0, 10) === key).length;
    dayBars.push({
      key,
      label: days <= 7 ? labels[d.getDay()]! : key.slice(5),
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
    const dayActs = inRange.filter((a) => a.timestamp.slice(0, 10) === d.key);
    const passed = dayActs.filter((a) => a.type === 'quiz_passed' || a.type === 'review_done').length;
    const failed = dayActs.filter((a) => a.type === 'quiz_failed').length;
    const denom = passed + failed;
    const score = denom === 0 ? 0 : Math.round((passed / denom) * 100);
    return { key: d.key, label: d.label, score };
  });

  return { dayBars, sessionTypes, effectiveness };
}
