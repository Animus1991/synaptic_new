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
  const days = range === '7d' ? 7 : range === '30d' ? 14 : 12;
  const stepDays = range === 'semester' ? 14 : 1;
  const now = new Date();
  const dayBars: DayBar[] = [];
  const labels = lang === 'el' ? DAY_LABELS_EL : DAY_LABELS_EN;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i * stepDays);
    const key = dayKey(d);
    const windowStart = new Date(d);
    windowStart.setDate(windowStart.getDate() - (stepDays - 1));
    const startKey = dayKey(windowStart);
    const count = inRange.filter((a) => {
      const day = a.timestamp.slice(0, 10);
      return day >= startKey && day <= key;
    }).length;
    dayBars.push({
      key,
      label: range === '7d' ? labels[d.getDay()]! : key.slice(5),
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
    const dayActs = inRange.filter((a) => {
      const day = a.timestamp.slice(0, 10);
      return day >= start && day <= end;
    });
    const passed = dayActs.filter((a) => a.type === 'quiz_passed' || a.type === 'review_done').length;
    const failed = dayActs.filter((a) => a.type === 'quiz_failed').length;
    const denom = passed + failed;
    const score = denom === 0 ? 0 : Math.round((passed / denom) * 100);
    return { key: d.key, label: d.label, score };
  });

  return { dayBars, sessionTypes, effectiveness };
}
