import { useMemo, useState } from 'react';
import { ArrowRight, Trash } from '@phosphor-icons/react';
import type { PersonalStudyDate } from '../types';
import type { SessionType } from '../lib/taskFlows';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { useI18n } from '../lib/i18n';
import {
  buildHubTimeline,
  daysUntil,
  newPersonalStudyDate,
  type DashboardHubActionId,
} from '../lib/dashboardHubRegistry';
import { DashboardLivePreview } from './DashboardLivePreview';
import type { Lang } from '../lib/i18n';

export interface DashboardHubPopupProps {
  actionId: DashboardHubActionId;
  examDate?: string;
  personalStudyDates?: PersonalStudyDate[];
  onExamDateChange?: (date: string | undefined) => void;
  onPersonalStudyDatesChange?: (dates: PersonalStudyDate[]) => void;
  wallpaperDataUrl?: string;
  onWallpaperChange?: (dataUrl: string | undefined) => void;
  reviewsDue?: number;
  workspaceLive?: WorkspaceLiveSync | null;
  lang?: Lang;
  onUpload?: () => void;
  onStartSession?: (session: SessionType) => void;
  onOpenTasksReview?: () => void;
  onOpenWorkspace?: () => void;
  onScrollToSection?: (targetId: string) => void;
  onClose: () => void;
}

export function DashboardHubPopupBody({
  actionId,
  examDate,
  personalStudyDates = [],
  onExamDateChange,
  onPersonalStudyDatesChange,
  wallpaperDataUrl,
  onWallpaperChange,
  reviewsDue = 0,
  workspaceLive = null,
  lang = 'en',
  onUpload,
  onStartSession,
  onOpenTasksReview,
  onOpenWorkspace,
  onScrollToSection,
  onClose,
}: DashboardHubPopupProps) {
  const { t } = useI18n();
  const [draftLabel, setDraftLabel] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const timeline = useMemo(
    () => buildHubTimeline(examDate, personalStudyDates),
    [examDate, personalStudyDates],
  );

  const addPersonalDate = () => {
    if (!draftLabel.trim() || !draftDate || !onPersonalStudyDatesChange) return;
    onPersonalStudyDatesChange([
      ...personalStudyDates,
      newPersonalStudyDate(draftLabel, draftDate),
    ]);
    setDraftLabel('');
    setDraftDate('');
  };

  const removePersonalDate = (id: string) => {
    onPersonalStudyDatesChange?.(personalStudyDates.filter((d) => d.id !== id));
  };

  const primaryBtn =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors';
  const ghostBtn =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle text-sm text-text-secondary hover:bg-surface-hover transition-colors';

  const launchAfterClose = (fn?: () => void) => {
    onClose();
    if (fn) queueMicrotask(fn);
  };

  if (actionId === 'calendar' || actionId === 'personal-dates') {
    return (
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-text-tertiary block mb-2">
            {t('dashboardHeroPopupExamDateLabel')}
          </label>
          <input
            type="date"
            data-testid="hub-exam-date-input"
            value={examDate ?? ''}
            onChange={(e) => onExamDateChange?.(e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm"
          />
          {examDate && daysUntil(examDate) !== null && (
            <p className="mt-1.5 text-xs text-text-secondary">
              {t('dashboardHeroDaysToExam').replace('{count}', String(daysUntil(examDate)))}
            </p>
          )}
        </div>

        {onPersonalStudyDatesChange && (
          <div className="rounded-xl border border-border-subtle p-3 space-y-3">
            <p className="text-xs font-semibold text-text-primary">{t('dashboardHeroPopupAddMilestone')}</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder={t('dashboardHeroPopupMilestonePlaceholder')}
                className="px-3 py-2 rounded-lg bg-surface-input border border-border-subtle text-sm"
              />
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-input border border-border-subtle text-sm"
              />
              <button type="button" onClick={addPersonalDate} className={ghostBtn}>
                {t('dashboardHeroPopupAdd')}
              </button>
            </div>
            {personalStudyDates.length > 0 && (
              <ul className="space-y-2">
                {personalStudyDates.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted shrink-0">{d.date}</span>
                    <span className="flex-1 truncate text-text-primary">{d.label}</span>
                    <button type="button" onClick={() => removePersonalDate(d.id)} aria-label={t('delete')}>
                      <Trash className="w-3.5 h-3.5 text-text-muted hover:text-accent-rose" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-text-primary mb-2">{t('dashboardHeroPopupTimeline')}</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {timeline.map((item) => {
              if (item.kind === 'exam') {
                return (
                  <li key="exam" className="text-xs rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2">
                    <span className="font-medium text-brand-400">{t('dashboardHeroPopupYourExam')}</span>
                    <span className="text-text-muted ml-2">{item.date}</span>
                  </li>
                );
              }
              if (item.kind === 'personal') {
                return (
                  <li key={item.id} className="text-xs rounded-lg border border-border-subtle px-3 py-2">
                    <span className="font-medium text-text-primary">{item.label}</span>
                    <span className="text-text-muted ml-2">{item.date}</span>
                  </li>
                );
              }
              return (
                <li key={item.entry.id} className="text-xs rounded-lg border border-border-subtle/80 px-3 py-2">
                  <span className="text-text-muted">{item.entry.date}</span>
                  <span className="ml-2 text-text-primary">{t(item.entry.titleKey as never)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="button"
          className={ghostBtn}
          onClick={() => {
            onClose();
            onScrollToSection?.('exam-calendar-panel');
          }}
        >
          {t('dashboardHeroPopupViewFullCalendar')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (actionId === 'wallpaper') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">{t('dashboardHeroPopupWallpaperBody')}</p>
        <div
          className="h-36 rounded-xl border border-border-subtle bg-surface-card overflow-hidden"
          style={
            wallpaperDataUrl
              ? { backgroundImage: `url(${wallpaperDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        />
        <div className="flex flex-wrap gap-2">
          <label className={`${primaryBtn} cursor-pointer`}>
            {t('dashboardHeroWallpaperAdd')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="hub-wallpaper-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !onWallpaperChange || file.size > 600_000) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') onWallpaperChange(reader.result);
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
          </label>
          {wallpaperDataUrl && (
            <button type="button" className={ghostBtn} onClick={() => onWallpaperChange?.(undefined)}>
              {t('dashboardHeroWallpaperRemove')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (actionId === 'upload') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">{t('dashboardHeroPopupUploadBody')}</p>
        <button
          type="button"
          data-testid="hub-popup-open-upload"
          className={primaryBtn}
          onClick={() => launchAfterClose(onUpload)}
        >
          {t('dashboardHeroPopupOpenUpload')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (actionId === 'session') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">{t('dashboardHeroPopupSessionBody')}</p>
        <div className="grid gap-2">
          {(['10min', '25min', 'review'] as SessionType[]).map((session) => (
            <button
              key={session}
              type="button"
              data-testid={`hub-popup-session-${session}`}
              className={ghostBtn}
              onClick={() => launchAfterClose(() => onStartSession?.(session))}
            >
              {session === '10min'
                ? t('sessionQuickSprint')
                : session === '25min'
                  ? t('sessionFocused')
                  : t('sessionSpacedReview')}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (actionId === 'reviews') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {reviewsDue > 0
            ? t('dashboardHeroPopupReviewsDue').replace('{count}', String(reviewsDue))
            : t('dashboardHeroPopupReviewsClear')}
        </p>
        <button
          type="button"
          data-testid="hub-popup-open-reviews"
          className={primaryBtn}
          onClick={() => launchAfterClose(onOpenTasksReview)}
        >
          {t('dashboardHeroPopupOpenReviews')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (actionId === 'workspace') {
    return (
      <div className="space-y-4">
        {workspaceLive ? (
          <DashboardLivePreview live={workspaceLive} lang={lang} onOpenWorkspace={onOpenWorkspace} />
        ) : (
          <p className="text-sm text-text-secondary">{t('dashboardHeroPopupWorkspaceEmpty')}</p>
        )}
        <button
          type="button"
          data-testid="hub-popup-open-workspace"
          className={primaryBtn}
          onClick={() => launchAfterClose(onOpenWorkspace)}
        >
          {t('dashboardHeroPopupOpenWorkspace')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}

export function hubPopupTitle(actionId: DashboardHubActionId, t: (key: import('../lib/i18n').I18nKey) => string): string {
  const keys: Record<DashboardHubActionId, import('../lib/i18n').I18nKey> = {
    calendar: 'dashboardHeroCarouselCalendar',
    upload: 'dashboardHeroCarouselUpload',
    session: 'dashboardHeroCarouselSession',
    reviews: 'dashboardHeroCarouselReviews',
    workspace: 'dashboardHeroCarouselWorkspace',
    'personal-dates': 'dashboardHeroCarouselPersonalDates',
    wallpaper: 'dashboardHeroCarouselWallpaper',
  };
  return t(keys[actionId]);
}
