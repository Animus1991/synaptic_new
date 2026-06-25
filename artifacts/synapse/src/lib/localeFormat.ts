import type { Lang } from './i18n';

export function localeTag(lang: Lang): string {
  return lang === 'el' ? 'el-GR' : 'en-US';
}

/** Parse YYYY-MM-DD without UTC drift. */
export function parseCalendarDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatShortDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(localeTag(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCalendarDate(dateKey: string, lang: Lang): string {
  return parseCalendarDate(dateKey).toLocaleDateString(localeTag(lang), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(localeTag(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHeatmapDayTooltip(dateKey: string, minutes: number, lang: Lang): string {
  const dateLabel = formatCalendarDate(dateKey, lang);
  const minLabel = lang === 'el'
    ? `${minutes} ${minutes === 1 ? 'λεπτό' : 'λεπτά'}`
    : `${minutes} min`;
  return `${dateLabel}: ${minLabel}`;
}

export function formatRelativeTime(iso: string, lang: Lang, nowMs = Date.now()): string {
  const diff = nowMs - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return lang === 'el' ? 'Μόλις τώρα' : 'Just now';
  }
  if (mins < 60) {
    if (lang === 'el') {
      return mins === 1 ? 'πριν 1 λεπτό' : `πριν ${mins} λεπτά`;
    }
    return mins === 1 ? '1 min ago' : `${mins} min ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    if (lang === 'el') {
      return hours === 1 ? 'πριν 1 ώρα' : `πριν ${hours} ώρες`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return lang === 'el' ? 'Χθες' : 'Yesterday';
  }
  if (days < 7) {
    if (lang === 'el') {
      return days === 1 ? 'πριν 1 μέρα' : `πριν ${days} μέρες`;
    }
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  return formatShortDate(iso, lang);
}
