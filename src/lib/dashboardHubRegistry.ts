import type { PersonalStudyDate } from '../types';
import { EXAM_CALENDAR_FEED, filterExamCalendar, type ExamCalendarEntry } from './examPrep/examCalendarFeed';

export type DashboardHubActionId =
  | 'calendar'
  | 'upload'
  | 'session'
  | 'reviews'
  | 'workspace'
  | 'personal-dates'
  | 'wallpaper';

export type DashboardHubAction = {
  id: DashboardHubActionId;
  labelKey: import('./i18n').I18nKey;
  /** Short chip label for compact hub row (J-D04). */
  chipLabelKey: import('./i18n').I18nKey;
  hintKey: import('./i18n').I18nKey;
  scrollTargetId?: string;
  badge?: string;
  disabled?: boolean;
};

/** Mockup primary 4-chip row (I-D03) — extras go to overflow. */
export const DASHBOARD_HUB_PRIMARY_IDS: readonly DashboardHubActionId[] = [
  'calendar',
  'upload',
  'session',
  'workspace',
] as const;

export function partitionDashboardHubActions(actions: DashboardHubAction[]): {
  primary: DashboardHubAction[];
  overflow: DashboardHubAction[];
} {
  const primaryIds = new Set<DashboardHubActionId>(DASHBOARD_HUB_PRIMARY_IDS);
  const primary = DASHBOARD_HUB_PRIMARY_IDS
    .map((id) => actions.find((a) => a.id === id))
    .filter((a): a is DashboardHubAction => Boolean(a));
  const overflow = actions.filter((a) => !primaryIds.has(a.id));
  return { primary, overflow };
}

/** Canonical carousel order — calendar is always first. */
export function buildDashboardHubActions(opts: {
  reviewsDue: number;
  canWorkspace: boolean;
  canUpload: boolean;
}): DashboardHubAction[] {
  const actions: DashboardHubAction[] = [
    {
      id: 'calendar',
      labelKey: 'dashboardHeroCarouselCalendar',
      chipLabelKey: 'dashboardHubChipCalendar',
      hintKey: 'dashboardHeroCarouselCalendarHint',
      scrollTargetId: 'exam-calendar-panel',
    },
  ];

  if (opts.canUpload) {
    actions.push({
      id: 'upload',
      labelKey: 'dashboardHeroCarouselUpload',
      chipLabelKey: 'dashboardHubChipUpload',
      hintKey: 'dashboardHeroCarouselUploadHint',
    });
  }

  actions.push({
    id: 'session',
    labelKey: 'dashboardHeroCarouselSession',
    chipLabelKey: 'dashboardHubChipSession',
    hintKey: 'dashboardHeroCarouselSessionHint',
  });

  actions.push({
    id: 'reviews',
    labelKey: 'dashboardHeroCarouselReviews',
    chipLabelKey: 'dashboardHubChipReviews',
    hintKey: 'dashboardHeroCarouselReviewsHint',
    badge: opts.reviewsDue > 0 ? String(opts.reviewsDue) : undefined,
    scrollTargetId: 'dashboard-stat-reviews-due',
  });

  if (opts.canWorkspace) {
    actions.push({
      id: 'workspace',
      labelKey: 'dashboardHeroCarouselWorkspace',
      chipLabelKey: 'dashboardHubChipWorkspace',
      hintKey: 'dashboardHeroCarouselWorkspaceHint',
    });
  }

  actions.push({
    id: 'personal-dates',
    labelKey: 'dashboardHeroCarouselPersonalDates',
    chipLabelKey: 'dashboardHubChipPersonalDates',
    hintKey: 'dashboardHeroCarouselPersonalDatesHint',
    scrollTargetId: 'dashboard-hero-personal-dates',
  });

  actions.push({
    id: 'wallpaper',
    labelKey: 'dashboardHeroCarouselWallpaper',
    chipLabelKey: 'dashboardHubChipWallpaper',
    hintKey: 'dashboardHeroCarouselWallpaperHint',
    scrollTargetId: 'dashboard-action-hub',
  });

  return actions;
}

export type HubTimelineEntry =
  | { kind: 'personal'; id: string; date: string; label: string }
  | { kind: 'exam'; date: string }
  | { kind: 'feed'; entry: ExamCalendarEntry };

export function buildHubTimeline(
  examDate: string | undefined,
  personalStudyDates: PersonalStudyDate[],
  now = Date.now(),
): HubTimelineEntry[] {
  const items: HubTimelineEntry[] = [];

  if (examDate) {
    items.push({ kind: 'exam', date: examDate });
  }

  for (const d of personalStudyDates) {
    items.push({ kind: 'personal', id: d.id, date: d.date, label: d.label });
  }

  for (const entry of filterExamCalendar(EXAM_CALENDAR_FEED, 'all', now).slice(0, 6)) {
    items.push({ kind: 'feed', entry });
  }

  return items.sort((a, b) => {
    const da = a.kind === 'feed' ? a.entry.date : a.date;
    const db = b.kind === 'feed' ? b.entry.date : b.date;
    return new Date(da).getTime() - new Date(db).getTime();
  });
}

export function newPersonalStudyDate(label: string, date: string): PersonalStudyDate {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `psd-${Date.now()}`,
    label: label.trim(),
    date,
  };
}

export function daysUntil(isoDate: string, now = Date.now()): number | null {
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / 86_400_000);
}
