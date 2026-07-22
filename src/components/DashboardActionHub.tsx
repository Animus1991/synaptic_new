import { useRef, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
  UploadSimple as Upload, Play, CheckSquare, SquaresFour as Layout,
  Calendar, Image as ImageIcon, CalendarBlank, DotsThree,
} from '@phosphor-icons/react';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { AllCapsLabel } from './ui/AllCapsLabel';
import {
  buildDashboardHubActions,
  partitionDashboardHubActions,
  type DashboardHubAction,
  type DashboardHubActionId,
} from '../lib/dashboardHubRegistry';
import { DashboardLivePreview } from './DashboardLivePreview';
import { DashboardHubPopupShell } from './DashboardHubShell';
import { DashboardHubPopupBody, hubPopupTitle } from './DashboardHubPopup';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import type { Lang } from '../lib/i18n';
import type { PersonalStudyDate } from '../types';
import type { SessionType } from '../lib/taskFlows';
import { useMinimalTheme } from '../lib/useMinimalTheme';

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
  /** KPI strip between greeting and workspace (Wave J-D02 mockup order). */
  statsSlot?: ReactNode;
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
  statsSlot,
  flushTop = false,
}: Props) {
  const { t } = useI18n();
  const hubQuiet = useMinimalTheme();
  const clickTimerRef = useRef<number | null>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [activePopup, setActivePopup] = useState<DashboardHubActionId | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const actions = buildDashboardHubActions({ reviewsDue, canWorkspace, canUpload });
  const { primary, overflow } = useMemo(() => partitionDashboardHubActions(actions), [actions]);

  useEffect(() => () => {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
  }, []);

  useEffect(() => {
    if (!overflowOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!overflowRef.current?.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [overflowOpen]);

  const scrollToTarget = useCallback((targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const openPopup = useCallback((id: DashboardHubActionId) => {
    setActivePopup(id);
    setOverflowOpen(false);
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
    setOverflowOpen(false);
    if (scrollTargetId) scrollToTarget(scrollTargetId);
  };

  const onHero = Boolean(wallpaperDataUrl);
  const glassCard = onHero ? 'bg-surface-card/82 backdrop-blur-md border-white/10' : undefined;
  const heroText = onHero ? 'text-white' : undefined;

  const renderChip = (action: DashboardHubAction, testIdPrefix: string) => {
    const Icon = ACTION_ICONS[action.id];
    return (
      <button
        key={action.id}
        type="button"
        data-hub-card
        data-testid={`${testIdPrefix}-${action.id}`}
        disabled={action.disabled}
        onClick={() => handleCardClick(action.id)}
        onDoubleClick={() => handleCardDoubleClick(action.scrollTargetId)}
        className={cn(
          'dashboard-hub-chip relative flex min-w-0 flex-col items-center gap-1 rounded-xl border border-border-subtle px-2 py-2.5 text-center transition-colors',
          'hover:bg-surface-hover/40 focus-visible:ring-2 focus-visible:ring-brand-500/50',
          action.disabled && 'opacity-50 pointer-events-none',
          glassCard,
        )}
      >
        <Icon className={cn('h-4 w-4', onHero ? 'text-brand-300' : hubQuiet ? 'text-text-tertiary' : 'text-brand-500')} aria-hidden />
        <span className={cn('truncate text-[10px] font-semibold leading-tight', onHero ? 'text-white' : 'text-text-primary')}>
          {t(action.chipLabelKey)}
        </span>
        {action.badge && (
          <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-md bg-accent-rose px-1 py-0.5 text-[10px] font-bold leading-none text-white">
            {action.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <div
        id="dashboard-action-hub"
        className={cn(
          /* overflow-visible so «Περισσότερα» menu is not clipped; raise stack when open */
          'relative overflow-visible border border-border-subtle bg-surface-secondary/35',
          hubQuiet && 'hub-quiet-surface',
          overflowOpen && 'z-40',
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
        <div className={cn('p-3.5 sm:p-4 space-y-3 sm:space-y-4', heroText)}>
          {(greetingTitle || headerActions) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0" id="dashboard-hero-greeting">
                {greetingEyebrow && (
                  <p className="ws-eyebrow mb-1 text-text-secondary opacity-90"><AllCapsLabel>{greetingEyebrow}</AllCapsLabel></p>
                )}
                {greetingTitle && (
                  <h1 className="ws-serif font-medium tracking-tight text-base sm:text-lg">{greetingTitle}</h1>
                )}
                {greetingSubtitle && (
                  <div className="ux-page-subtitle mt-1 text-sm opacity-90">{greetingSubtitle}</div>
                )}
              </div>
              {headerActions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
              )}
            </div>
          )}

          <div id="dashboard-hero-personal-dates" className="sr-only">
            {(examDate || daysToExam !== null) && (
              <p data-testid="dashboard-hero-personal-dates-summary">
                {daysToExam !== null
                  ? t('dashboardHeroDaysToExam').replace('{count}', String(daysToExam))
                  : examDate
                    ? t('dashboardHeroExamDate').replace('{date}', examDate)
                    : null}
              </p>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* J-D02: KPI strip directly under greeting */}
            {statsSlot}

            {/* Study center before quick actions (canvas order) */}
            {workspaceLive ? (
              <div className={cn('rounded-xl overflow-hidden', glassCard)} data-testid="dashboard-hero-study-center">
                <DashboardLivePreview live={workspaceLive} lang={lang} onOpenWorkspace={onOpenWorkspace} compact />
              </div>
            ) : (
              <BlueprintSurface
                nest
                className={cn('p-3.5 sm:p-4', glassCard)}
                data-testid="dashboard-hero-study-center"
              >
                <div
                  className={cn(
                    'flex w-full flex-col gap-2.5 sm:gap-3',
                    /* OPT-K18 — full-span row; Continue anchors to the trailing edge */
                    hubQuiet
                      ? 'sm:flex-row sm:items-center sm:justify-between'
                      : 'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.08em]', onHero ? 'text-white/80' : 'text-text-secondary')}>
                      <AllCapsLabel>{t('dashboardLivePreviewEyebrow')}</AllCapsLabel>
                    </p>
                    <p className={cn('mt-1 text-sm font-medium', onHero ? 'text-white' : 'text-text-primary')}>
                      {t('dashboardHeroHubSideTitle')}
                    </p>
                    <p className={cn('mt-0.5 text-xs leading-relaxed', onHero ? 'text-white/75' : 'text-text-secondary')}>
                      {t('dashboardHeroHubSideBody')}
                    </p>
                  </div>
                  {onOpenWorkspace && (
                    <button
                      type="button"
                      onClick={onOpenWorkspace}
                      data-testid="dashboard-resume-workspace"
                      className={cn(
                        'dashboard-continue-hero shrink-0 self-start sm:self-center rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                        onHero
                          ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                          : hubQuiet
                            ? 'border-border-subtle bg-transparent text-text-primary hover:bg-surface-secondary'
                            : 'border-brand-500/35 bg-brand-600/10 text-brand-800 hover:bg-brand-600/15',
                      )}
                    >
                      {t('dashboardResumeContinue')}
                    </button>
                  )}
                </div>
              </BlueprintSurface>
            )}

            {/* I-D03 / J-D04: compact 4-chip row + overflow (same row so menu stacks cleanly) */}
            <div className="flex items-stretch gap-2 sm:gap-2.5">
              <div
                className="grid min-w-0 flex-1 grid-cols-4 gap-2 sm:gap-2.5"
                data-testid="dashboard-hero-action-grid"
              >
                {primary.map((action) => renderChip(action, 'dashboard-hero-action-grid'))}
              </div>

              {overflow.length > 0 && (
                <div className="relative flex shrink-0 items-stretch" ref={overflowRef}>
                  <button
                    type="button"
                    data-testid="dashboard-hero-hub-more"
                    aria-expanded={overflowOpen}
                    aria-haspopup="menu"
                    aria-label={t('dashboardHeroHubMoreAria')}
                    onClick={() => setOverflowOpen((v) => !v)}
                    className={cn(
                      'inline-flex h-full min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl border border-border-subtle px-2.5 py-2 text-[10px] font-semibold transition-colors',
                      'hover:bg-surface-hover/40',
                      glassCard,
                      onHero ? 'text-white/90' : 'text-text-secondary',
                    )}
                  >
                    <DotsThree className="h-4 w-4" weight="bold" aria-hidden />
                    <span className="leading-tight">{t('dashboardHeroHubMore')}</span>
                  </button>
                  {overflowOpen && (
                    <div
                      role="menu"
                      data-testid="dashboard-hero-hub-overflow"
                      className={cn(
                        'ux-elev-popover absolute right-0 top-full z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-xl border border-border-subtle bg-surface-card py-1 shadow-lg',
                        onHero && 'bg-surface-card/95 backdrop-blur-md',
                      )}
                    >
                      {overflow.map((action) => {
                        const Icon = ACTION_ICONS[action.id];
                        return (
                          <button
                            key={action.id}
                            type="button"
                            role="menuitem"
                            data-testid={`dashboard-hero-overflow-${action.id}`}
                            onClick={() => handleCardClick(action.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-hover/50"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{t(action.chipLabelKey)}</span>
                            {action.badge && (
                              <span className="rounded-md bg-accent-rose/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-rose">
                                {action.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
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
