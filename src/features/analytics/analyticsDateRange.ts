/** Analytics global date-range filter (Wave E). */

export type AnalyticsDateRange = '7d' | '30d' | 'semester';

export const ANALYTICS_DATE_RANGES: AnalyticsDateRange[] = ['7d', '30d', 'semester'];

export function analyticsRangeDays(range: AnalyticsDateRange): number {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  return 180; // semester ≈ 6 months
}

export function rangeCutoffMs(range: AnalyticsDateRange, nowMs: number = Date.now()): number {
  return nowMs - analyticsRangeDays(range) * 24 * 60 * 60 * 1000;
}

export function filterActivitiesByRange<T extends { timestamp: string }>(
  activities: T[],
  range: AnalyticsDateRange,
  nowMs: number = Date.now(),
): T[] {
  const cutoff = rangeCutoffMs(range, nowMs);
  return activities.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    // This is an observed-data window. Future-dated telemetry (clock skew,
    // imports, or corrupt records) must not become evidence in the charts.
    return Number.isFinite(t) && t >= cutoff && t <= nowMs;
  });
}

export function filterEventsByRange<T extends { timestamp: string }>(
  events: T[],
  range: AnalyticsDateRange,
  nowMs: number = Date.now(),
): T[] {
  return filterActivitiesByRange(events, range, nowMs);
}

export function rangeLabel(range: AnalyticsDateRange, lang: 'en' | 'el'): string {
  if (range === '7d') return lang === 'el' ? '7 ημέρες' : '7 days';
  if (range === '30d') return lang === 'el' ? '30 ημέρες' : '30 days';
  return lang === 'el' ? 'Εξάμηνο' : 'Semester';
}
