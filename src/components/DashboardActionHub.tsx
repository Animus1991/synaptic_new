import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  UploadSimple as Upload, Play, CheckSquare, SquaresFour as Layout,
  Calendar, Image as ImageIcon, CalendarBlank, CaretLeft as ChevronLeft, CaretRight as ChevronRight,
} from '@phosphor-icons/react';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { BlueprintSurface } from './ui/BlueprintSurface';
import {
  buildDashboardHubActions,
  type DashboardHubActionId,
} from '../lib/dashboardHubRegistry';
import { DashboardLivePreview } from './DashboardLivePreview';
import { DashboardHubPopupShell } from './DashboardHubShell';
import { DashboardHubPopupBody, hubPopupTitle } from './DashboardHubPopup';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import type { Lang } from '../lib/i18n';
import type { PersonalStudyDate } from '../types';
import type { SessionType } from '../lib/taskFlows';

const ACTION_ICONS: Record<DashboardHubActionId, typeof Upload> = {
  calendar: Calendar,
  upload: Upload,
  session: Play,
  reviews: CheckSquare,
  workspace: Layout,
  'personal-dates': CalendarBlank,
  wallpaper: ImageIcon,
};

const CLICK_DELAY_MS = 260;

interface Props {
  reviewsDue: number;
  canWorkspace: boolean;
  canUpload?: boolean;
  daysToExam?: number | null;
  examDate?: string;
  personalStudyDates?: PersonalStudyDate[];
  onExamDateChange?: (date: string | undefined) => void;
  onPersonalStudyDatesChange?: (dates: PersonalStudyDate[]) => void;
  wallpaperDataUrl?: string;
  onWallpaperChange?: (dataUrl: string | undefined) => void;
  workspaceLive?: WorkspaceLiveSync | null;
  lang?: Lang;
  onUpload?: () => void;
  onStartSession?: (session: SessionType) => void;
  onOpenTasksReview?: () => void;
  onOpenWorkspace?: () => void;
  greetingEyebrow?: ReactNode;
  greetingTitle?: ReactNode;
  greetingSubtitle?: ReactNode;
  headerActions?: ReactNode;
  /** Flush to shell top — no side/top gap under demo banner. */
  flushTop?: boolean;
}

export function DashboardActionHub({
  reviewsDue,
  canWorkspace,
  canUpload = true,
  daysToExam = null,
  examDate,
  personalStudyDates = [],
  onExamDateChange,
  onPersonalStudyDatesChange,
  wallpaperDataUrl,
  onWallpaperChange,
  workspaceLive = null,
  lang = 'en',
  onUpload,
  onStartSession,
  onOpenTasksReview,
  onOpenWorkspace,
  greetingEyebrow,
  greetingTitle,
  greetingSubtitle,
  headerActions,
  flushTop = false,
}: Props) {
  const { t } = useI18n();
  const carouselRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<number | null>(null);
  const [activePopup, setActivePopup] = useState<DashboardHubActionId | null>(null);
  const actions = buildDashboardHubActions({ reviewsDue, canWorkspace, canUpload });

  useEffect(() => () => {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
  }, []);

  const scrollToTarget = useCallback((targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const openPopup = useCallback((id: DashboardHubActionId) => {
    setActivePopup(id);
  }, []);

  const handleCardClick = (id: DashboardHubActionId) => {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      openPopup(id);
      clickTimerRef.current = null;
    }, CLICK_DELAY_MS);
  };

  const handleCardDoubleClick = (scrollTargetId?: string) => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setActivePopup(null);
    if (scrollTargetId) scrollToTarget(scrollTargetId);
  };

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-hub-card]');
    const delta = (card?.offsetWidth ?? 240) + 12;
    el.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

  const onHero = Boolean(wallpaperDataUrl);
  const glassCard = onHero ? 'bg-surface-card/82 backdrop-blur-md border-white/10' : undefined;
  const heroText = onHero ? 'text-white' : undefined;

  return (
    <>
      <div
        id="dashboard-action-hub"
        className={cn(
          'relative overflow-hidden border border-border-subtle bg-surface-secondary/35',
          flushTop
            ? 'rounded-none border-x-0 border-t-0'
            : 'rounded-2xl',
        )}
        data-testid="dashboard-action-hub"
        data-tour="dashboard-hero-panel"
        style={
          wallpaperDataUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.42), rgba(0,0,0,0.68)), url(${wallpaperDataUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className={cn('p-4 sm:p-5 space-y-3', heroText)}>
          {(greetingTitle || headerActions) && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0" id="dashboard-hero-greeting">
                {greetingEyebrow && (
                  <p className="ws-eyebrow mb-1.5 text-text-secondary opacity-90">{greetingEyebrow}</p>
                )}
                {greetingTitle && (
                  <h1 className="ws-serif font-medium tracking-tight text-lg sm:text-xl">{greetingTitle}</h1>
                )}
                {greetingSubtitle && (
                  <div className="ux-page-subtitle mt-1.5 text-sm opacity-90">{greetingSubtitle}</div>
                )}
              </div>
              {headerActions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div id="dashboard-hero-personal-dates">
              <p className="type-micro font-semibold uppercase tracking-wider opacity-80">
                {t('dashboardHeroHubEyebrow')}
              </p>
              {(examDate || daysToExam !== null) && (
                <p className="mt-1 text-sm font-medium" data-testid="dashboard-hero-personal-dates-summary">
                  {daysToExam !== null
                    ? t('dashboardHeroDaysToExam').replace('{count}', String(daysToExam))
                    : examDate
                      ? t('dashboardHeroExamDate').replace('{date}', examDate)
                      : null}
                </p>
              )}
              <p className="mt-1 text-xs opacity-75">{t('dashboardHeroActionHint')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                aria-label={t('dashboardHeroCarouselPrev')}
                onClick={() => scrollCarousel(-1)}
                className={cn('p-1.5 rounded-lg border border-border-subtle hover:bg-surface-hover/30', glassCard)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={t('dashboardHeroCarouselNext')}
                onClick={() => scrollCarousel(1)}
                className={cn('p-1.5 rounded-lg border border-border-subtle hover:bg-surface-hover/30', glassCard)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile: horizontal snap carousel */}
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-0.5 scrollbar-thin md:hidden"
              data-testid="dashboard-hero-carousel"
            >
              {actions.map((action) => {
                const Icon = ACTION_ICONS[action.id];
                return (
                  <BlueprintSurface
                    key={action.id}
                    nest
                    hint
                    as="button"
                    type="button"
                    data-hub-card
                    data-testid={`dashboard-hero-action-${action.id}`}
                    onClick={() => handleCardClick(action.id)}
                    onDoubleClick={() => handleCardDoubleClick(action.scrollTargetId)}
                    className={cn(
                      'snap-start shrink-0 w-[min(100%,14rem)] text-left p-4 transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-500/50',
                      glassCard,
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn('w-5 h-5', onHero ? 'text-brand-300' : 'text-brand-400')} />
                      {action.badge && (
                        <span className="ml-auto text-[10px] font-bold ws-chip-danger px-2 py-0.5 rounded-full">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className={cn('text-sm font-semibold', onHero ? 'text-white' : 'text-text-primary')}>
                      {t(action.labelKey)}
                    </p>
                    <p className={cn('mt-1 text-xs leading-relaxed', onHero ? 'text-white/75' : 'text-text-secondary')}>
                      {t(action.hintKey)}
                    </p>
                  </BlueprintSurface>
                );
              })}
            </div>

            {/* Desktop+: equal grid — no side panel overlap */}
            <div
              className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3"
              data-testid="dashboard-hero-action-grid"
            >
              {actions.map((action) => {
                const Icon = ACTION_ICONS[action.id];
                return (
                  <BlueprintSurface
                    key={`grid-${action.id}`}
                    nest
                    hint
                    as="button"
                    type="button"
                    data-hub-card
                    data-testid={`dashboard-hero-action-grid-${action.id}`}
                    onClick={() => handleCardClick(action.id)}
                    onDoubleClick={() => handleCardDoubleClick(action.scrollTargetId)}
                    className={cn(
                      'w-full text-left p-4 transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-brand-500/50',
                      glassCard,
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn('w-5 h-5', onHero ? 'text-brand-300' : 'text-brand-400')} />
                      {action.badge && (
                        <span className="ml-auto text-[10px] font-bold ws-chip-danger px-2 py-0.5 rounded-full">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className={cn('text-sm font-semibold', onHero ? 'text-white' : 'text-text-primary')}>
                      {t(action.labelKey)}
                    </p>
                    <p className={cn('mt-1 text-xs leading-relaxed', onHero ? 'text-white/75' : 'text-text-secondary')}>
                      {t(action.hintKey)}
                    </p>
                  </BlueprintSurface>
                );
              })}
            </div>

            {/* Study center: compact full-width strip (never stretched beside cards) */}
            {workspaceLive ? (
              <div className={cn('rounded-xl overflow-hidden', glassCard)} data-testid="dashboard-hero-study-center">
                <DashboardLivePreview live={workspaceLive} lang={lang} onOpenWorkspace={onOpenWorkspace} />
              </div>
            ) : (
              <BlueprintSurface
                nest
                className={cn('p-3.5 sm:p-4', glassCard)}
                data-testid="dashboard-hero-study-center"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', onHero ? 'text-white' : 'text-text-primary')}>
                      {t('dashboardHeroHubSideTitle')}
                    </p>
                    <p className={cn('mt-1 text-xs leading-relaxed', onHero ? 'text-white/75' : 'text-text-secondary')}>
                      {t('dashboardHeroHubSideBody')}
                    </p>
                  </div>
                  {onOpenWorkspace && (
                    <button
                      type="button"
                      onClick={onOpenWorkspace}
                      className={cn(
                        'shrink-0 self-start rounded-xl border px-3 py-2 text-xs font-semibold transition-colors sm:self-auto',
                        onHero
                          ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                          : 'border-brand-500/35 bg-brand-600/10 text-brand-800 hover:bg-brand-600/15',
                      )}
                    >
                      {t('navStudyWorkspace')}
                    </button>
                  )}
                </div>
              </BlueprintSurface>
            )}
          </div>
        </div>
      </div>

      <DashboardHubPopupShell
        open={activePopup !== null}
        actionId={activePopup}
        title={activePopup ? hubPopupTitle(activePopup, t) : ''}
        onClose={() => setActivePopup(null)}
      >
        {activePopup && (
          <DashboardHubPopupBody
            actionId={activePopup}
            examDate={examDate}
            personalStudyDates={personalStudyDates}
            onExamDateChange={onExamDateChange}
            onPersonalStudyDatesChange={onPersonalStudyDatesChange}
            wallpaperDataUrl={wallpaperDataUrl}
            onWallpaperChange={onWallpaperChange}
            reviewsDue={reviewsDue}
            workspaceLive={workspaceLive}
            lang={lang}
            onUpload={onUpload}
            onStartSession={onStartSession}
            onOpenTasksReview={onOpenTasksReview}
            onOpenWorkspace={onOpenWorkspace}
            onScrollToSection={scrollToTarget}
            onClose={() => setActivePopup(null)}
          />
        )}
      </DashboardHubPopupShell>
    </>
  );
}
