import type { ActivityItem, ActivityType } from '../types';
import type { Lang } from './i18n';
import { formatRelativeTime as formatRelativeTimeLocale } from './localeFormat';

export function formatRelativeTime(iso: string, lang: Lang = 'en'): string {
  return formatRelativeTimeLocale(iso, lang);
}

export function createActivity(
  type: ActivityType,
  description: string,
  xp?: number,
): ActivityItem {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    description,
    xp,
    timestamp: new Date().toISOString(),
  };
}
