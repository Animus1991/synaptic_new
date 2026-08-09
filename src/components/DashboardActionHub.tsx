import { useRef, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
  UploadSimple as Upload, Play, CheckSquare, SquaresFour as Layout,
  Calendar, Image as ImageIcon, CalendarBlank, DotsThree,
} from '@phosphor-icons/react';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { PrimaryCTA } from './ui/primitives';
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
import { ArrowRight, CaretDown, CaretRight } from '@phosphor-icons/react';

type HubChromeTab = 'today' | 'tools' | 'prompts' | 'alerts' | null;

function ChevronIcon({ open }: { open: boolean }) {
  return open
    ? <CaretDown className="h-3.5 w-3.5 shrink-0 opacity-70" weight="bold" aria-hidden />
    : <CaretRight className="h-3.5 w-3.5 shrink-0 opacity-70" weight="bold" aria-hidden />;
}

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
  /**
   * OPT-K108 — Alerts share the same hub disclosure bar as Today / Quick tools.
   * When omitted, the Alerts tab is hidden (empty / no alert surface).
   */
  alertsSlot?: ReactNode;
  /** Optional count badge on the Alerts tab (hidden when 0 / undefined). */
  alertsMeta?: number;
  /**
   * OPT-K112 — Study prompts share the same hub disclosure bar.
   * When omitted, the Study prompts tab is hidden.
   */
  promptsSlot?: ReactNode;
  /** Optional count badge on the Study prompts tab. */
  promptsMeta?: number;
  /** Flush to shell top — no side/top gap under demo banner. */
  flushTop?: boolean;
}

/* OPT-K166 — sentence-case hero + quieter hub chrome.
 * OPT-K98 — markup debt: decorative brand type -> ink */
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
  alertsSlot,
  alertsMeta,
  promptsSlot,
  promptsMeta,
  flushTop = false,
}: Props) {
  const { t } = useI18n();
  const hubQuiet = useMinimalTheme();
  const clickTimerRef = useRef<number | null>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [activePopup, setActivePopup] = useState<DashboardHubActionId | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [hubChromeTab, setHubChromeTab] = useState<HubChromeTab>(null);
  const showAlertsTab = Boolean(alertsSlot);
  const showPromptsTab = Boolean(promptsSlot);
  const alertsBadge = alertsMeta && alertsMeta > 0 ? String(alertsMeta) : null;
  const promptsBadge = promptsMeta && promptsMeta > 0 ? String(promptsMeta) : null;
  /* tools always + optional today / prompts / alerts */
  const hubTabCount = 1 + (statsSlot ? 1 : 0) + (showPromptsTab ? 1 : 0) + (showAlertsTab ? 1 : 0);
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
  /* OPT-K72 — Minimal: flat overlay (no Aero/blur); other themes keep soft glass */
  const glassCard = onHero
    ? hubQuiet
      ? 'bg-surface-card/90 border-white/10'
      : 'bg-surface-card/82 backdrop-blur-md border-white/10'
    : undefined;
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
          /* OPT-K109 — wash chips; no per-chip outline */
          'dashboard-hub-chip relative flex min-w-0 flex-col items-center gap-0.5 rounded-lg border border-transparent bg-surface-secondary/55 px-2 py-2 text-center transition-colors',
          'hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand-500/50',
          action.disabled && 'opacity-50 pointer-events-none',
          glassCard,
        )}
        aria-label={t(action.chipLabelKey)}
      >
        <Icon className={cn('h-4 w-4', onHero ? 'text-white/90' : hubQuiet ? 'text-text-tertiary' : 'text-text-secondary')} aria-hidden />
        <span className={cn('truncate type-micro font-semibold leading-tight max-w-full', onHero ? 'text-white' : 'text-text-primary')}>
          {t(action.chipLabelKey)}
        </span>
        {action.badge && (
          <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-md bg-surface-secondary px-1 py-0.5 type-micro font-semibold leading-none text-text-secondary">
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
          /* OPT-K115 — full-bleed hero; spacing only (no hairline cage) */
          'relative overflow-visible border-0 bg-transparent',
          hubQuiet && 'hub-quiet-surface',
          overflowOpen && 'z-40',
          !flushTop && 'rounded-none',
        )}
        data-testid="dashboard-action-hub" data-clarity-pass="k166"
        data-bleed="full"
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
        {/* Wave H2 — hero budget: greeting · Continue · nest stats/tools */}
        <div className={cn('space-y-2.5 px-3 py-3 sm:px-4', heroText)}>
          {(greetingTitle || headerActions) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0" id="dashboard-hero-greeting">
                {greetingEyebrow && (
                  <p className="ws-eyebrow mb-1 type-micro font-semibold text-text-secondary">{greetingEyebrow}</p>
                )}
                {greetingTitle && (
                  <h1 className="ws-serif font-semibold tracking-tight text-[length:var(--ux-type-hero)] leading-tight">
                    {greetingTitle}
                  </h1>
                )}
                {greetingSubtitle && (
                  <div className="ux-page-subtitle mt-1 type-body line-clamp-2 sm:line-clamp-none">{greetingSubtitle}</div>
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

          <div className="space-y-2">
            {/* Primary study strip — Continue is the one obvious CTA */}
            {workspaceLive ? (
              <div
                className={cn('w-full max-w-none overflow-hidden', glassCard)}
                data-testid="dashboard-hero-study-center"
                data-bleed="full"
              >
                <DashboardLivePreview live={workspaceLive} lang={lang} onOpenWorkspace={onOpenWorkspace} compact />
              </div>
            ) : (
              <div
                className={cn(
                  /* OPT-K110 — bare study strip (spacing only; no wash cage) */
                  'flex w-full max-w-none flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3',
                  glassCard,
                )}
                data-testid="dashboard-hero-study-center"
                data-bleed="full"
              >
                <div className="min-w-0 flex-1 px-0.5">
                  <p className={cn('type-micro font-semibold', onHero ? 'text-white/80' : 'text-text-secondary')}>
                    {t('dashboardLivePreviewEyebrow')}
                  </p>
                  <p className={cn('mt-0.5 type-meta font-medium', onHero ? 'text-white' : 'text-text-primary')}>
                    {t('dashboardHeroHubSideTitle')}
                  </p>
                  <p className={cn('mt-0.5 type-caption leading-relaxed', onHero ? 'text-white/75' : 'text-text-secondary')}>
                    {t('dashboardHeroHubSideBody')}
                  </p>
                </div>
                {onOpenWorkspace && (
                  <PrimaryCTA
                    type="button"
                    size="md"
                    onClick={onOpenWorkspace}
                    data-testid="dashboard-resume-workspace"
                    className="dashboard-continue-hero ws-touch-floor min-h-10 shrink-0 self-start rounded-lg px-4 sm:self-center"
                  >
                    {t('dashboardResumeContinue')}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </PrimaryCTA>
                )}
              </div>
            )}

            {/* OPT-K112 — Today | Quick tools | Study prompts | Alerts (frameless underline tabs). */}
            <div
              className="dashboard-hub-chrome-tabs w-full"
              data-testid="dashboard-hub-chrome-tabs"
              data-hub-tab-count={hubTabCount}
              style={{ ['--hub-chrome-cols' as string]: String(hubTabCount) }}
            >
              <div
                className="dashboard-hub-chrome-tablist"
                role="tablist"
                aria-label={t('dashHubChromeTabsAria')}
              >
                {statsSlot && (
                  <button
                    type="button"
                    role="tab"
                    id="dashboard-today-tab"
                    aria-selected={hubChromeTab === 'today'}
                    aria-controls="dashboard-today-panel"
                    data-testid="dashboard-today-chrome"
                    className={cn(
                      'dashboard-hub-chrome-tab',
                      hubChromeTab === 'today' && 'is-active',
                    )}
                    onClick={() => setHubChromeTab((v) => (v === 'today' ? null : 'today'))}
                  >
                    <span className="truncate">{t('dashTodayChrome')}</span>
                    <ChevronIcon open={hubChromeTab === 'today'} />
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  id="dashboard-tools-tab"
                  aria-selected={hubChromeTab === 'tools'}
                  aria-controls="dashboard-tools-panel"
                  data-testid="dashboard-quick-tools-chrome"
                  className={cn(
                    'dashboard-hub-chrome-tab',
                    hubChromeTab === 'tools' && 'is-active',
                  )}
                  onClick={() => setHubChromeTab((v) => (v === 'tools' ? null : 'tools'))}
                >
                  <span className="truncate">{t('dashQuickToolsChrome')}</span>
                  <ChevronIcon open={hubChromeTab === 'tools'} />
                </button>
                {showPromptsTab && (
                  <button
                    type="button"
                    role="tab"
                    id="dashboard-prompts-tab"
                    aria-selected={hubChromeTab === 'prompts'}
                    aria-controls="dashboard-prompts-panel"
                    data-testid="dashboard-study-prompts-chrome"
                    className={cn(
                      'dashboard-hub-chrome-tab',
                      hubChromeTab === 'prompts' && 'is-active',
                    )}
                    onClick={() => setHubChromeTab((v) => (v === 'prompts' ? null : 'prompts'))}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                      <span className="truncate">{t('chromeStudyPrompts')}</span>
                      {promptsBadge && (
                        <span
                          className="ux-chrome-meta-badge shrink-0"
                          data-testid="dashboard-study-prompts-chrome-meta"
                        >
                          {promptsBadge}
                        </span>
                      )}
                    </span>
                    <ChevronIcon open={hubChromeTab === 'prompts'} />
                  </button>
                )}
                {showAlertsTab && (
                  <button
                    type="button"
                    role="tab"
                    id="dashboard-alerts-tab"
                    aria-selected={hubChromeTab === 'alerts'}
                    aria-controls="dashboard-alerts-panel"
                    data-testid="dashboard-alerts-chrome"
                    className={cn(
                      'dashboard-hub-chrome-tab',
                      hubChromeTab === 'alerts' && 'is-active',
                    )}
                    onClick={() => setHubChromeTab((v) => (v === 'alerts' ? null : 'alerts'))}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                      <span className="truncate">{t('chromeAlerts')}</span>
                      {alertsBadge && (
                        <span
                          className="ux-chrome-meta-badge shrink-0"
                          data-testid="dashboard-alerts-chrome-meta"
                        >
                          {alertsBadge}
                        </span>
                      )}
                    </span>
                    <ChevronIcon open={hubChromeTab === 'alerts'} />
                  </button>
                )}
              </div>

              {statsSlot && hubChromeTab === 'today' && (
                <div
                  role="tabpanel"
                  id="dashboard-today-panel"
                  aria-labelledby="dashboard-today-tab"
                  data-testid="dashboard-today-chrome-body"
                  className="dashboard-hub-chrome-panel"
                >
                  <div className="px-0.5 pb-1">{statsSlot}</div>
                </div>
              )}

              {hubChromeTab === 'tools' && (
                <div
                  role="tabpanel"
                  id="dashboard-tools-panel"
                  aria-labelledby="dashboard-tools-tab"
                  data-testid="dashboard-quick-tools-chrome-body"
                  className="dashboard-hub-chrome-panel"
                >
                  <div className="flex items-stretch gap-2 px-0.5 pb-1 sm:gap-2.5">
                    <div
                      className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5"
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
                            'inline-flex h-full min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-2 type-micro font-semibold transition-colors',
                            'hover:bg-surface-hover/40',
                            /* OPT-K109 — wash only; popover keeps its own border */
                            'border border-transparent bg-surface-secondary/60',
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
                              'ux-elev-popover absolute right-0 top-full z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-lg border border-border-subtle bg-surface-card py-1 shadow-lg',
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
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption text-text-primary hover:bg-surface-hover/50"
                                >
                                  <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
                                  <span className="min-w-0 flex-1 truncate">{t(action.chipLabelKey)}</span>
                                  {action.badge && (
                                    <span className="rounded-md bg-accent-rose/15 px-1.5 py-0.5 type-micro font-bold text-accent-rose">
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
              )}

              {showPromptsTab && hubChromeTab === 'prompts' && (
                <div
                  role="tabpanel"
                  id="dashboard-prompts-panel"
                  aria-labelledby="dashboard-prompts-tab"
                  data-testid="dashboard-study-prompts-chrome-body"
                  className="dashboard-hub-chrome-panel"
                >
                  <div className="px-0.5 pb-1">{promptsSlot}</div>
                </div>
              )}

              {showAlertsTab && hubChromeTab === 'alerts' && (
                <div
                  role="tabpanel"
                  id="dashboard-alerts-panel"
                  aria-labelledby="dashboard-alerts-tab"
                  data-testid="dashboard-alerts-chrome-body"
                  className="dashboard-hub-chrome-panel"
                >
                  <div className="px-0.5 pb-1">{alertsSlot}</div>
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
