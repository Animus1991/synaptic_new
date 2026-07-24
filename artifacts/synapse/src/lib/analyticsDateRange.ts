/** Analytics global date-range filter (Wave E). */

export type AnalyticsDateRange = '7d' | '30d' | 'semester';

export const ANALYTICS_DATE_RANGES: AnalyticsDateRange[] = ['7d', '30d', 'semester'];

export function analyticsRangeDays(range: AnalyticsDateRange): number {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  return 180; // semester ≈ 6 months
}

export function filterActivitiesByRange<T extends { timestamp: string }>(
  activities: T[],
  range: AnalyticsDateRange,
  nowMs: number = Date.now(),
): T[] {
  const cutoff = nowMs - analyticsRangeDays(range) * 24 * 60 * 60 * 1000;
  return activities.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function rangeLabel(range: AnalyticsDateRange, lang: 'en' | 'el'): string {
  if (range === '7d') return lang === 'el' ? '7 ημέρες' : '7 days';
  if (range === '30d') return lang === 'el' ? '30 ημέρες' : '30 days';
  return lang === 'el' ? 'Εξάμηνο' : 'Semester';
}
