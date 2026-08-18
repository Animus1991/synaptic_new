import { useMemo, useState } from 'react';
import {
  Warning as AlertTriangle,
  CaretRight as ChevronRight, ArrowRight,
UploadSimple as Upload,
} from '@phosphor-icons/react';
import type { Course, DashboardStats, LearnerModel, PersonalStudyDate, Task } from '../types';
import { cn } from '../utils/cn';
import { MotionSection } from './ui/MotionSection';
import { ReadinessRing } from './visuals/ReadinessRing';
import { SignalBars } from './visuals/SignalBars';
import { ActivityFeed } from './visuals/ActivityFeed';
import { CalibrationChip } from './visuals/CalibrationChip';
import { ConceptMasteryBars } from './visuals/ConceptMasteryBars';
import { PrerequisiteRepairPanel } from './visuals/PrerequisiteRepair';
import type { PrerequisiteRepair } from '../lib/pedagogy';
import type { CalibrationDirection } from '../lib/pedagogy';
import type { SessionType } from '../lib/taskFlows';
import { findTaskForRepair, findTaskForConcept } from '../lib/taskFlows';
import { selectCanonicalMastery } from '../lib/coursePageSelectors';
import { selectDashboardPageViewModel } from '../lib/dashboardPageSelectors';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { workspaceLiveIsStale } from '../lib/workspaceStoreSpine';
import type { I18nKey, Lang } from '../lib/i18n';
import type { DashboardNextAction } from '../lib/dashboardNextAction';
import { TaskActionIcon } from './ui/TaskActionIcon';
import { courseRingColor, resolveCourseColor, accentHighlightVar } from '../lib/masteryPalette';
import { greetingForTime, dashboardSubtitle } from '../lib/greeting';
import { useI18n } from '../lib/i18n';
import { CardLink, PrimaryCTA, SecondaryCTA } from './ui/primitives';
import { Button } from './ui/Button';
import { UxCallout } from './ui/platformChrome';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { PostUploadBanner } from './ui/PostUploadBanner';
import { useWarmSandPageScope, warmSandScopeProps } from '../lib/useDocumentTheme';
import { SectionLabel } from './ui/SectionLabel';
import { DashboardActionHub } from './DashboardActionHub';
import { buildDashboardWeakSpotCards } from '../lib/dashboardWeakSpotsModel';
import { executeDashboardNextAction } from '../lib/dashboardNextAction';
import { SyllabusCoverageWidget } from './examPrep/SyllabusCoverageWidget';
import { ExamCalendarPanel } from './examPrep/ExamCalendarPanel';
import { PostExamNextStepsPanel } from './examPrep/PostExamNextStepsPanel';
import type { DashboardSmartCTA } from '../lib/examPrep/dashboardSmartCTAs';
import type { ProactiveAgentAlert } from '../lib/proactiveAgentAlerts';
import type { WorkspacePracticeLaunch } from '../lib/dashboardNextAction';
import type { WorkspaceToolId } from '../lib/taskFlows';
import { recommendToolForTopic } from '../lib/examPrep/coveragePracticeActions';
import { LeitnerDueQueuePanel } from './workspace/LeitnerDueQueuePanel';
import { DashboardAlertGrid } from './DashboardAlertGrid';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { useMinimalTheme } from '../lib/useMinimalTheme';
import { buildGlobalFsrsDueQueue, summarizeFsrsHorizon } from '../lib/leitnerDueQueue';
import {
  loadDashboardLayoutMode,
  saveDashboardLayoutMode,
  dashboardColumnCount,
  type DashboardLayoutMode,
} from '../lib/dashboardLayoutPrefs';
import { HubSection, UtilityRow } from './ui/UtilityPrimitives';
import { ScrollToTopButton } from './ui/ScrollToTopButton';

const DASHBOARD_WEEKDAY_KEYS: I18nKey[] = [
  'dashWeekdayMon',
  'dashWeekdayTue',
  'dashWeekdayWed',
  'dashWeekdayThu',
  'dashWeekdayFri',
  'dashWeekdaySat',
  'dashWeekdaySun',
];

function taskPriorityLabel(priority: Task['priority'], translate: (key: I18nKey) => string) {
  const keys: Record<Task['priority'], I18nKey> = {
    critical: 'dashPriorityCritical',
    high: 'dashPriorityHigh',
    medium: 'dashPriorityMedium',
    low: 'dashPriorityLow',
  };
  return translate(keys[priority]);
}

function taskDurationLabel(minutes: number, translate: (key: I18nKey) => string) {
  return translate('dashMinutesShort').replace('{count}', String(minutes));
}

function taskXpLabel(xp: number, translate: (key: I18nKey) => string) {
  return translate('dashXpReward').replace('{count}', String(xp));
}

interface DashboardProps {
  stats: DashboardStats;
  courses: Course[];
  tasks: Task[];
  learnerModel: LearnerModel;
  onNavigate: (view: 'library' | 'tasks' | 'agent' | 'course' | 'analytics') => void;
  onSelectCourse: (course: Course) => void;
  onOpenWorkspace?: () => void;
  onOpenExamTimer?: () => void;
  onUpload?: () => void;
  onExploreDemo?: () => void;
  prerequisiteRepairs?: PrerequisiteRepair[];
  calibration?: { score: number; direction: CalibrationDirection } | null;
  conceptMastery?: { concept: string; mastery: number }[];
  activities?: import('../types').ActivityItem[];
  masteryDelta?: number;
  daysToExam?: number | null;
  antiPassiveAlert?: boolean;
  onStartTask?: (taskId: string) => void;
  onStartSession?: (session: SessionType) => void;
  onResolveMisconception?: (misconceptionId: string) => void;
  /** Open Study Workspace with reader focus on a weak-area concept */
  onFocusWeakArea?: (concept: string) => void;
  /** §2.1 — last synced workspace state for resume + next-action projection */
  workspaceLive?: WorkspaceLiveSync | null;
  dashboardNextAction?: DashboardNextAction | null;
  smartCTAs?: DashboardSmartCTA[];
  onRunSmartCTA?: (cta: DashboardSmartCTA) => void;
  proactiveAgentAlerts?: ProactiveAgentAlert[];
  onRunProactiveAgentAlert?: (alert: ProactiveAgentAlert) => void;
  onOpenWorkspacePractice?: (launch: WorkspacePracticeLaunch) => void;
  lang?: Lang;
  theoryVsPractice?: number;
  /** Fresh upload highlight — show workspace CTA on dashboard */
  postUploadCourse?: Course | null;
  onDismissPostUpload?: () => void;
  onOpenTasksReview?: () => void;
  dailyGoalMinutes?: number;
  settingsExamDate?: string;
  personalStudyDates?: PersonalStudyDate[];
  onExamDateChange?: (date: string | undefined) => void;
  onPersonalStudyDatesChange?: (dates: PersonalStudyDate[]) => void;
  dashboardWallpaperDataUrl?: string;
  onDashboardWallpaperChange?: (dataUrl: string | undefined) => void;
}

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function Dashboard({ stats, courses, tasks, learnerModel, onNavigate, onSelectCourse, onOpenWorkspace, onOpenExamTimer, onUpload, onExploreDemo, prerequisiteRepairs = [], calibration, conceptMastery = [], activities = [], masteryDelta = 0, daysToExam = null, antiPassiveAlert = false, onStartTask, onStartSession, onResolveMisconception, onFocusWeakArea, workspaceLive = null, dashboardNextAction = null, smartCTAs = [], onRunSmartCTA, proactiveAgentAlerts = [], onRunProactiveAgentAlert, onOpenWorkspacePractice, lang = 'en', postUploadCourse = null, onDismissPostUpload, onOpenTasksReview, dailyGoalMinutes = 30, settingsExamDate, personalStudyDates = [], onExamDateChange, onPersonalStudyDatesChange, dashboardWallpaperDataUrl, onDashboardWallpaperChange }: DashboardProps) {
  const { t } = useI18n();
  const isMinimal = useMinimalTheme();
  const warmSandPage = useWarmSandPageScope();
  /* OPT-K92 — 1/2/3 columns on every theme (Minimal defaults dual; others stacked). */
  const [layoutMode, setLayoutMode] = useState<DashboardLayoutMode>(() =>
    loadDashboardLayoutMode('dual'),
  );
  const columnCount = dashboardColumnCount(layoutMode);
  const isMultiCol = columnCount > 1;
  const pageView = useMemo(
    () => selectDashboardPageViewModel({ stats, courses, tasks, learnerModel, dailyGoalMinutes }),
    [stats, courses, tasks, learnerModel, dailyGoalMinutes],
  );
  const {
    isEmpty,
    activeCourses,
    taskBuckets: { criticalTasks, fixTasks, firstReviewTask, examTask },
    stats: pageStats,
    masteryTrendLast7: masteryTrend,
    unresolvedMisconceptions,
  } = pageView;
  const showWorkspaceResume = workspaceLive && !workspaceLiveIsStale(workspaceLive);
  const weakSpotsWithReasons = useMemo(
    () => buildDashboardWeakSpotCards(learnerModel.weakAreas, lang),
    [learnerModel.weakAreas, lang],
  );
  const fsrsDueQueue = useMemo(
    () => buildGlobalFsrsDueQueue(learnerModel.spacingIntervals),
    [learnerModel.spacingIntervals],
  );
  const fsrsHorizon = useMemo(
    () => summarizeFsrsHorizon(learnerModel.spacingIntervals),
    [learnerModel.spacingIntervals],
  );
  const weekdayLabels = DASHBOARD_WEEKDAY_KEYS.map((key) => t(key));
  const spacedRepetitionPanel = (
    <BlueprintSurface className="p-2 sm:p-2.5" data-testid="dashboard-spaced-repetition">
      <SectionLabel>{t('dashSpacedRepetition')}</SectionLabel>
      <p className="type-caption text-text-tertiary">{t('dashSpacedRepetitionHint')}</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
        <button
          type="button"
          onClick={() => (firstReviewTask ? onStartTask?.(firstReviewTask.id) : onNavigate('tasks'))}
          className="dashboard-horizon-cell dashboard-horizon-cell--active p-1.5 rounded-md hover:bg-surface-hover transition-all"
          data-testid="dash-horizon-today"
        >
          <p className="ux-kpi-value text-text-primary">{fsrsHorizon.today}</p>
          <p className="type-caption text-text-muted leading-tight">{t('dashHorizonToday')}</p>
        </button>
        <div className="dashboard-horizon-cell p-1.5" data-testid="dash-horizon-tomorrow">
          <p className="ux-kpi-value">{fsrsHorizon.tomorrow}</p>
          <p className="type-caption text-text-muted leading-tight">{t('dashHorizonTomorrow')}</p>
        </div>
        <div className="dashboard-horizon-cell p-1.5" data-testid="dash-horizon-3d">
          <p className="ux-kpi-value">{fsrsHorizon.within3d}</p>
          <p className="type-caption text-text-muted leading-tight">{t('dashHorizon3d')}</p>
        </div>
      </div>
      {fsrsDueQueue.length > 0 && onFocusWeakArea && (
        <LeitnerDueQueuePanel
          items={fsrsDueQueue}
          onSelect={onFocusWeakArea}
          lang={lang}
          defaultOpen={!isMinimal}
          variant="card"
          className="mt-2"
        />
      )}
    </BlueprintSurface>
  );
  const recentActivityPanel = (
    <CollapsibleChromeSection
      title={t('dashRecentActivity')}
      alwaysCollapse
      meta={activities.length > 0 ? activities.length : undefined}
      data-testid="dashboard-recent-activity-chrome"
    >
      <BlueprintSurface className="p-3 border-0 shadow-none">
        <ActivityFeed activities={activities} maxItems={5} />
      </BlueprintSurface>
    </CollapsibleChromeSection>
  );
  const showAlertGrid = !isEmpty && (smartCTAs.length > 0 || proactiveAgentAlerts.length > 0 || daysToExam !== null);
  const alertsMetaCount =
    (daysToExam !== null ? 1 : 0) + proactiveAgentAlerts.length + smartCTAs.length;

  const nextActionHandlers = {
    onStartTask,
    onNavigateTasks: onOpenTasksReview ?? (() => onNavigate('tasks')),
    onOpenExamTimer,
    onOpenWorkspace,
    onFocusWeakArea,
    onStartSession: () => onStartSession?.('25min') ?? onNavigate('tasks'),
    onOpenWorkspacePractice,
  };

  const handleDashboardNextAction = () => {
    if (!dashboardNextAction) return;
    if (dashboardNextAction.kind === 'review-due') {
      if (firstReviewTask) onStartTask?.(firstReviewTask.id);
      else onOpenTasksReview?.() ?? onNavigate('tasks');
      return;
    }
    executeDashboardNextAction(dashboardNextAction, nextActionHandlers);
  };

  if (isEmpty) {
    return (
      <div
        data-testid="dashboard-empty"
        className="p-4 sm:p-6 lg:px-8 pb-24 lg:pb-6 w-full min-w-0 flex items-start justify-center pt-8 sm:pt-16"
      >
        {/* OPT-K2 — page shell stays full-width; copy column may stay readable. */}
        <MotionSection initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-[length:var(--ux-type-hero)] font-semibold leading-tight text-text-primary mb-2">
              {t('welcomeToSynapse')}
            </h1>
            <p className="ux-page-subtitle type-meta text-text-secondary max-w-md mx-auto">
              {t('dashboardEmptyHint')}
            </p>
          </div>
          {/* ~5% smaller empty-state CTAs (Upload / Explore Demo) */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onUpload && (
              <Button
                type="button"
                variant="primary"
                onClick={onUpload}
                data-tour="dashboard-upload"
              >
                <Upload className="w-4 h-4" />
                {t('uploadMaterial')}
              </Button>
            )}
            {onExploreDemo && (
              <Button
                type="button"
                variant="secondary"
                onClick={onExploreDemo}
                data-tour="dashboard-explore-demo"
              >
                {t('exploreDemo')}
              </Button>
            )}
          </div>
          {onExploreDemo && (
            <p className="text-center type-caption text-text-muted mt-3">
              {t('dashboardDemoFootnote')}
            </p>
          )}
        </MotionSection>
      </div>
    );
  }

  const setDashboardLayout = (next: DashboardLayoutMode) => {
    if (next === layoutMode) return;
    setLayoutMode(next);
    saveDashboardLayoutMode(next);
  };

  const layoutLabelKey =
    layoutMode === 'triple'
      ? 'dashLayoutTriple'
      : layoutMode === 'dual'
        ? 'dashLayoutDual'
        : 'dashLayoutStacked';

  const nextActionSlot = !showWorkspaceResume && dashboardNextAction ? (
    <UxCallout
      variant="next-action"
      className={cn(
        /* OPT-K93 / K110 — next-action calm, borderless wash */
        'dashboard-hub-next-action border-0 shadow-none',
        isMinimal ? 'dashboard-one-step-strip' : 'bg-surface-secondary/35',
      )}
      title={dashboardNextAction.reason || t('dashboardSuggestedNext')}
      testId="dashboard-next-action"
      dataTone="next"
      action={
        <PrimaryCTA
          size="sm"
          onClick={handleDashboardNextAction}
          className="shrink-0 type-caption px-3 min-h-9 dashboard-continue-hero"
          data-testid="dashboard-execute-cta"
        >
          {t('dashExecute')} <ArrowRight className="w-3.5 h-3.5" />
        </PrimaryCTA>
      }
    >
      <p className="type-caption text-text-tertiary">{t('dashboardSuggestedNextSubtitle')}</p>
      {dashboardNextAction.label && (
        <p className="mt-0.5 type-caption line-clamp-1 text-text-secondary">{dashboardNextAction.label}</p>
      )}
    </UxCallout>
  ) : undefined;

  return (
    <div
      {...warmSandScopeProps(warmSandPage)}
      className={cn(
        'w-full min-w-0 max-w-none pb-24 lg:pb-8 ux-fade-up',
        /* OPT-K85 — scrollbar-sized edge pad on both sides (L/R column balance) */
        'dashboard-calm hub-quiet shell-edge-balance',
      )}
      data-testid="dashboard-page" data-clarity-pass="k166"
      data-bleed="full"
      data-border-diet="cta-only"
      data-type-rhythm="dashboard"
      data-dashboard-layout={layoutMode}
    >
      {/* OPT-K176 — dense independent columns; one primary action at the top.
       * OPT-K171 — structured rows/headers on every theme (esp. warm-sand).
       * OPT-K169 — hero + body share one content column (shell chrome stays full-bleed).
       * OPT-K168 — calm layout is theme-independent (useMinimalTheme always true).
       * OPT-K166 — residual Dashboard epitome (text-first lists, no ALL-CAPS noise).
 * OPT-K148 — Tasks parity: text-first icon diet + equal washes + type ×0.99 */}
      {/* OPT-K117 / OPT-K116 — final divider purge + quiet accents + denser boxes */}
      <div className="dashboard-page-column w-full min-w-0 px-4 sm:px-6 lg:px-8">
      <MotionSection
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full min-w-0"
        data-testid="dashboard-hero-panel"
      >
        <DashboardActionHub
          flushTop
          reviewsDue={pageStats.reviewsDue}
          canWorkspace={Boolean(onOpenWorkspace)}
          canUpload={Boolean(onUpload)}
          daysToExam={daysToExam}
          examDate={settingsExamDate}
          personalStudyDates={personalStudyDates}
          onExamDateChange={onExamDateChange}
          onPersonalStudyDatesChange={onPersonalStudyDatesChange}
          wallpaperDataUrl={dashboardWallpaperDataUrl}
          onWallpaperChange={onDashboardWallpaperChange}
          workspaceLive={showWorkspaceResume ? workspaceLive : null}
          showDefaultStudyCenter={!dashboardNextAction}
          lang={lang}
          onUpload={onUpload}
          onStartSession={onStartSession}
          onOpenTasksReview={onOpenTasksReview}
          onOpenWorkspace={onOpenWorkspace}
          greetingTitle={
            <>
              <span className="sr-only">{t('dashboardSrPrefix')}</span>
              {/* OPT-K148 — text-first greeting (no decorative sun/moon) */}
              {greetingForTime(lang)}!
            </>
          }
          greetingSubtitle={
            <span>{dashboardSubtitle(lang, pageStats.criticalTaskCount, pageStats.streak)}</span>
          }
          headerActions={
            <>
              {showWorkspaceResume && workspaceLive?.snapshot.activeConcept && !workspaceLive.snapshot.genericConcept && (
                <span
                  data-testid="dashboard-active-topic-pill"
                  className="inline-flex max-w-[14rem] items-center truncate rounded-md bg-surface-secondary px-2.5 py-1 type-micro font-semibold text-text-secondary"
                  title={workspaceLive.snapshot.activeConcept}
                >
                  {t('dashboardActiveTopic').replace('{topic}', workspaceLive.snapshot.activeConcept)}
                </span>
              )}
              <div
                role="group"
                aria-label={t('dashLayoutGroup')}
                title={t(layoutLabelKey)}
                data-testid="dashboard-layout-toggle"
                className="inline-flex items-center rounded-lg border-0 bg-surface-secondary p-0.5"
              >
                {(
                  [
                    { mode: 'stacked' as const, label: t('dashLayoutStacked'), digit: '1' },
                    { mode: 'dual' as const, label: t('dashLayoutDual'), digit: '2' },
                    { mode: 'triple' as const, label: t('dashLayoutTriple'), digit: '3' },
                  ] as const
                ).map(({ mode, label, digit }) => {
                  const active = layoutMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDashboardLayout(mode)}
                      data-testid={`dashboard-layout-${mode}`}
                      aria-pressed={active}
                      aria-label={`${digit} — ${label}`}
                      title={label}
                      className={cn(
                        'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-1.5 type-caption font-semibold tabular-nums transition-colors',
                        active
                          ? 'bg-surface-secondary text-text-primary'
                          : 'text-text-tertiary hover:text-text-secondary',
                      )}
                    >
                      {digit}
                    </button>
                  );
                })}
              </div>
            </>
          }
          statsSlot={
            /* OPT-K112 — compact KPI tiles (not a sparse left-stacked list) */
            <div className="dashboard-today-glance" data-testid="dashboard-page-stats">
              <div className="dashboard-today-glance-grid" role="list">
                {(
                  [
                    {
                      id: 'streak',
                      label: t('dashboardStatStreak'),
                      value: t('dashboardStatDaysSuffix').replace('{count}', String(pageStats.streak)),
                      onClick: undefined as (() => void) | undefined,
                    },
                    {
                      id: 'today-xp',
                      label: t('dashboardStatTodayXp'),
                      value: `${pageStats.todayXp}`,
                      onClick: undefined,
                    },
                    {
                      id: 'reviews-due',
                      label: t('dashboardStatReviewsDue'),
                      value: `${pageStats.reviewsDue}`,
                      onClick: pageStats.reviewsDue > 0
                        ? () => (onOpenTasksReview ? onOpenTasksReview() : onNavigate('tasks'))
                        : undefined,
                    },
                    {
                      id: 'concepts-mastered',
                      label: t('dashboardStatConceptsMastered'),
                      value: `${pageStats.conceptsMastered}/${pageStats.totalConcepts}`,
                      onClick: undefined,
                      barPct: pageStats.totalConcepts > 0
                        ? Math.round((pageStats.conceptsMastered / pageStats.totalConcepts) * 100)
                        : undefined,
                    },
                    {
                      id: 'study-today',
                      label: t('dashboardStatStudyToday'),
                      value: t('dashboardStatStudyGoal')
                        .replace('{done}', String(pageStats.studyMinutesToday))
                        .replace('{goal}', String(pageStats.dailyGoalMinutes)),
                      onClick: undefined,
                      barPct: Math.min(100, Math.round((pageStats.studyMinutesToday / Math.max(1, pageStats.dailyGoalMinutes)) * 100)),
                    },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.id}
                    role={stat.onClick ? 'button' : 'listitem'}
                    className={cn(
                      'dashboard-today-stat',
                      stat.onClick && 'dashboard-today-stat--interactive',
                    )}
                    data-testid={`dashboard-stat-${stat.id}`}
                    onClick={stat.onClick}
                    onKeyDown={stat.onClick ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        stat.onClick?.();
                      }
                    } : undefined}
                    tabIndex={stat.onClick ? 0 : undefined}
                  >
                    {/* OPT-K148 — label + value only (no decorative KPI icons) */}
                    <div className="dashboard-today-stat-top">
                      <span className="dashboard-today-stat-value">{stat.value}</span>
                    </div>
                    <p className="dashboard-today-stat-label">{stat.label}</p>
                    {'barPct' in stat && typeof stat.barPct === 'number' && (
                      <div
                        className="usage-bar mt-1.5"
                        role="progressbar"
                        aria-valuenow={stat.barPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={stat.label}
                      >
                        <div className="usage-bar-fill" style={{ width: `${stat.barPct}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          }
          promptsSlot={
            (daysToExam !== null || antiPassiveAlert || stats.antiPassiveAlert) ? (
              <div
                className={cn(
                  'dashboard-multi-col grid gap-3',
                  daysToExam !== null && (antiPassiveAlert || stats.antiPassiveAlert) && isMultiCol
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1',
                )}
              >
                {daysToExam !== null && (
                  <UxCallout
                    variant={isMinimal ? 'warn' : 'danger'}
                    title={t('dashExamCountdown')}
                    testId="dashboard-exam-countdown"
                    dataTone="exam"
                    className={cn(
                      'border-0 shadow-none py-2.5',
                      isMinimal ? 'dashboard-urgency-signal bg-surface-secondary/50' : 'bg-surface-secondary/40',
                    )}
                    action={
                      <button
                        type="button"
                        onClick={() => (examTask ? onStartTask?.(examTask.id) : onOpenExamTimer?.() ?? onOpenWorkspace?.())}
                        className="platform-link type-caption flex items-center gap-1 shrink-0"
                      >
                        {examTask ? t('dashStartExamPrep') : t('dashExamPrep')} <ArrowRight className="w-3 h-3" />
                      </button>
                    }
                  >
                    {daysToExam === 0 ? t('dashExamToday') : (daysToExam === 1 ? t('dashDayUntilExam') : t('dashDaysUntilExam').replace('{count}', String(daysToExam)))}
                  </UxCallout>
                )}
                {(antiPassiveAlert || stats.antiPassiveAlert) && (
                  <div
                    className={cn(
                      'p-3 rounded-xl flex items-start gap-2.5',
                      isMinimal
                        ? 'dashboard-urgency-signal bg-surface-secondary/60'
                        : 'platform-banner-warn border-0',
                    )}
                    data-tone="recall"
                    data-testid="dashboard-anti-passive"
                  >
                    <div className="min-w-0">
                      <p className={cn('type-caption font-semibold', isMinimal ? 'text-text-primary' : 'platform-banner-title')}>
                        {t('dashActiveRecallTitle')}
                      </p>
                      <p className="type-caption text-text-secondary mt-0.5 line-clamp-2">{t('dashActiveRecallBody')}</p>
                      <button
                        type="button"
                        onClick={() => (firstReviewTask ? onStartTask?.(firstReviewTask.id) : onNavigate('tasks'))}
                        className="mt-1.5 platform-link type-caption flex items-center gap-1"
                      >
                        {t('dashTakeQuiz')} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : undefined
          }
          promptsMeta={
            (daysToExam !== null ? 1 : 0)
            + ((antiPassiveAlert || stats.antiPassiveAlert) ? 1 : 0)
            || undefined
          }
          alertsSlot={
            showAlertGrid ? (
              <DashboardAlertGrid
                daysToExam={daysToExam}
                smartCTAs={smartCTAs}
                proactiveAlerts={proactiveAgentAlerts}
                onRunSmartCTA={onRunSmartCTA}
                onRunProactiveAlert={onRunProactiveAgentAlert}
                onExamPrep={() => (examTask ? onStartTask?.(examTask.id) : onOpenExamTimer?.() ?? onOpenWorkspace?.())}
              />
            ) : undefined
          }
          alertsMeta={showAlertGrid ? alertsMetaCount : undefined}
          headerAside={nextActionSlot}
        />
      </MotionSection>

      <div
        className="mt-1 w-full min-w-0 dashboard-breath-stack flex flex-col gap-1.5"
      >
      {postUploadCourse && (
        <MotionSection initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <PostUploadBanner
            courseTitle={postUploadCourse.title}
            onOpenWorkspace={() => {
              onSelectCourse(postUploadCourse);
              onDismissPostUpload?.();
              onOpenWorkspace?.();
            }}
            onViewCourse={() => {
              onSelectCourse(postUploadCourse);
              onDismissPostUpload?.();
            }}
            onDismiss={() => onDismissPostUpload?.()}
          />
        </MotionSection>
      )}

      {/* OPT-K112 — Study prompts live in hub tablist (promptsSlot); no orphan chrome row */}

      {/* I-D10 / OPT-K177: next action now shares the hero heading row. */}

      {/* OPT-K92 — 1/2/3 column body on Minimal and non-Minimal alike. */}
      <div
        className={cn(
          'hub-section-stack',
          columnCount === 2 && 'hub-section-stack--columns xl:columns-2 xl:gap-3 [&>*]:mb-2 [&>*]:break-inside-avoid',
          columnCount === 3 && 'hub-section-stack--columns xl:columns-3 xl:gap-3 [&>*]:mb-2 [&>*]:break-inside-avoid',
        )}
        data-testid="dashboard-masonry"
        data-dashboard-layout-body={layoutMode}
        data-dashboard-columns={columnCount}
      >
          {/* Readiness + coverage as separate masonry items (I-D05) */}
          {isMinimal ? (
            <HubSection title={t('examReadiness')} data-testid="dashboard-readiness-section">
              <div
                className={cn(
                  'dashboard-readiness-row flex w-full flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8',
                )}
              >
                <ReadinessRing
                  value={learnerModel.overallMastery}
                  label={t('examReadiness')}
                  sublabel={t('dashReadinessSublabel')}
                  size={127}
                />
                {/* OPT-K9b — signals sit beside the ring and span the remaining full width */}
                <div className="proximity-track w-full flex-1 space-y-1 min-w-0">
                  <UtilityRow label={t('dashSignalAccuracy')} value={`${Math.round(learnerModel.retentionRate * 100)}%`} barPct={Math.round(learnerModel.retentionRate * 100)} hint={t('dashSignalAccuracyDetail')} />
                  <UtilityRow label={t('dashSignalReliance')} value={`${Math.round((1 - learnerModel.helpSeekingRate) * 100)}%`} barPct={Math.round((1 - learnerModel.helpSeekingRate) * 100)} hint={t('dashSignalRelianceDetail')} />
                  <UtilityRow label={t('dashSignalVolume')} value={`${Math.min(100, Math.round(learnerModel.totalSessions * 2.1))}%`} barPct={Math.min(100, Math.round(learnerModel.totalSessions * 2.1))} hint={t('dashSignalVolumeDetail').replace('{count}', String(learnerModel.totalSessions))} />
                  {/* OPT-K11 — retrieval lives here only under Minimal (no duplicate well). */}
                  <UtilityRow
                    label={t('dashSignalRetrieval')}
                    value={`${Math.round(learnerModel.retrievalPerformance * 100)}%`}
                    barPct={Math.round(learnerModel.retrievalPerformance * 100)}
                    hint={t('dashSignalRetrievalDetail')}
                    data-testid="dashboard-retrieval-strength-bar"
                  />
                </div>
              </div>
            </HubSection>
          ) : (
          /* Wave H2 — full-bleed readiness; signal detail nested closed */
          <div
            className="w-full max-w-none px-1 py-3"
            data-dashboard-col="a"
            data-testid="dashboard-readiness-section"
            data-bleed="full"
          >
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <ReadinessRing
                value={learnerModel.overallMastery}
                label={t('examReadiness')}
                sublabel={t('dashReadinessSublabel')}
                size={127}
              />
              <div className="min-w-0 flex-1">
                {/* OPT-K107 — secondary vs hub Continue (one PrimaryCTA in first study band). */}
                <SecondaryCTA
                  type="button"
                  size="sm"
                  className="ws-touch-floor min-h-9"
                  data-testid="dashboard-practice-weak-cta"
                  onClick={() => {
                    const concept = conceptMastery[0]?.concept;
                    if (concept && onFocusWeakArea) onFocusWeakArea(concept);
                    else onNavigate('tasks');
                  }}
                >
                  {t('dashPracticeWeak')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </SecondaryCTA>
              </div>
            </div>
            <CollapsibleChromeSection
              title={t('dashReadinessSignalsChrome')}
              alwaysCollapse
              data-testid="dashboard-readiness-signals-chrome"
            >
              <div className="w-full min-w-0 space-y-2.5 pb-1">
                <SignalBars signals={[
                  { label: t('dashSignalAccuracy'), value: Math.round(learnerModel.retentionRate * 100), icon: 'target', color: 'var(--dashboard-signal-ink)', detail: t('dashSignalAccuracyDetail') },
                  { label: t('dashSignalReliance'), value: Math.round((1 - learnerModel.helpSeekingRate) * 100), icon: 'strength', color: 'var(--dashboard-signal-cyan)', detail: t('dashSignalRelianceDetail') },
                  { label: t('dashSignalVolume'), value: Math.min(100, Math.round(learnerModel.totalSessions * 2.1)), icon: 'chart', color: 'var(--dashboard-signal-ink)', detail: t('dashSignalVolumeDetail').replace('{count}', String(learnerModel.totalSessions)) },
                  { label: t('dashSignalRetrieval'), value: Math.round(learnerModel.retrievalPerformance * 100), icon: 'brain', color: 'var(--dashboard-signal-ink)', detail: t('dashSignalRetrievalDetail') },
                ]} />
              </div>
            </CollapsibleChromeSection>
          </div>
          )}
          {/* OPT-K18 Minimal: coverage + mastery share one full-width pair row when both present */}
          {isMinimal && (conceptMastery.length > 0 || prerequisiteRepairs.length > 0) ? (
            <div className="dashboard-pair-row" data-testid="dashboard-pair-coverage-mastery">
              <SyllabusCoverageWidget
                compact
                courses={courses}
                settingsExamDate={settingsExamDate}
                onSelectCourse={onSelectCourse}
                onPracticeTopic={onOpenWorkspacePractice
                  ? (topic, courseId) => {
                      const tool: WorkspaceToolId = recommendToolForTopic(topic, stats, daysToExam, activities);
                      onOpenWorkspacePractice({
                        tool,
                        concept: topic.title,
                        courseId,
                        simulatorTab: tool === 'simulator' ? 'exam-prep' : undefined,
                      });
                    }
                  : undefined}
              />
              <div className="min-w-0 space-y-3">
                {conceptMastery.length > 0 && (
                  <div data-testid="dashboard-concept-mastery">
                    <SectionLabel>{t('dashConceptMastery')}</SectionLabel>
                    <ConceptMasteryBars concepts={conceptMastery} className="concept-mastery-bars" />
                  </div>
                )}
                {prerequisiteRepairs.length > 0 && (
                  <PrerequisiteRepairPanel
                    repairs={prerequisiteRepairs}
                    onStartRepair={(repair) => {
                      const task = findTaskForRepair(tasks, repair);
                      if (task) onStartTask?.(task.id);
                      else onNavigate('tasks');
                    }}
                  />
                )}
                {spacedRepetitionPanel}
              </div>
            </div>
          ) : (
            <>
              <SyllabusCoverageWidget
                compact
                courses={courses}
                settingsExamDate={settingsExamDate}
                onSelectCourse={onSelectCourse}
                onPracticeTopic={onOpenWorkspacePractice
                  ? (topic, courseId) => {
                      const tool: WorkspaceToolId = recommendToolForTopic(topic, stats, daysToExam, activities);
                      onOpenWorkspacePractice({
                        tool,
                        concept: topic.title,
                        courseId,
                        simulatorTab: tool === 'simulator' ? 'exam-prep' : undefined,
                      });
                    }
                  : undefined}
              />

              {/* L-D02: retrieval strength bar — Blueprint only (Minimal: in readiness HubSection). */}
              {!isMinimal && (
              <div
                className="rounded-xl bg-surface-secondary/55 px-3 py-2"
                data-testid="dashboard-retrieval-strength-bar"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="type-caption font-semibold text-text-secondary">
                    {t('dashSignalRetrieval')}
                  </span>
                  <span className="type-caption font-semibold tabular-nums text-text-primary">
                    {Math.round(learnerModel.retrievalPerformance * 100)}%
                  </span>
                </div>
                <div className="ux-progress-track h-1.5" aria-hidden>
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.max(2, Math.round(learnerModel.retrievalPerformance * 100))}%`,
                      backgroundColor: 'var(--palette-amber)',
                    }}
                  />
                </div>
              </div>
              )}

              {/* Concept mastery + prerequisite repair + spaced repetition */}
              {(conceptMastery.length > 0 || prerequisiteRepairs.length > 0) ? (
                <div data-testid="dashboard-concept-spaced-stack">
                  <div
                    className={cn(
                      'grid grid-cols-1 gap-3',
                      conceptMastery.length > 0 && prerequisiteRepairs.length > 0 && 'sm:grid-cols-2',
                    )}
                  >
                    {conceptMastery.length > 0 && (
                      <BlueprintSurface className="p-2 sm:p-2.5" data-testid="dashboard-concept-mastery">
                        <SectionLabel>{t('dashConceptMastery')}</SectionLabel>
                        <ConceptMasteryBars concepts={conceptMastery} className="concept-mastery-bars" />
                      </BlueprintSurface>
                    )}
                    {prerequisiteRepairs.length > 0 && (
                      <PrerequisiteRepairPanel
                        repairs={prerequisiteRepairs}
                        onStartRepair={(repair) => {
                          const task = findTaskForRepair(tasks, repair);
                          if (task) onStartTask?.(task.id);
                          else onNavigate('tasks');
                        }}
                      />
                    )}
                  </div>
                  {spacedRepetitionPanel}
                </div>
              ) : (
                spacedRepetitionPanel
              )}
            </>
          )}

          {/* Priority tasks */}
          <BlueprintSurface className="p-2 sm:p-2.5" data-dashboard-col="b">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="dashboard-panel-title font-medium">
                {t('dashPriorityTasks')}
              </h2>
              <CardLink onClick={() => onNavigate('tasks')} className="dashboard-panel-action">{t('dashViewAll')} <ChevronRight className="w-4 h-4" /></CardLink>
            </div>
            <div className="space-y-2">
              {criticalTasks.slice(0, 5).map((task, i) => (
                <MotionSection key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }}
                  onClick={() => onStartTask?.(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onStartTask?.(task.id);
                    }
                  }}
                  /* Wave P-3 D02 — soft elev-popover on hover for Priority Task rows
                      (dark theme especially); no spring — CSS class only. */
                  className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-surface-hover/70 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60">
                  <TaskActionIcon task={task} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="type-meta font-medium truncate group-hover:text-text-primary transition-colors">{task.title}</p>
                    <p className="type-caption text-text-tertiary mt-0.5">{task.courseName} · {taskDurationLabel(task.estimatedMinutes, t)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* OPT-K116 — soft priority ink chips (semantic color, no solid cage) */}
                    <span className={cn(
                      'type-micro font-medium px-1.5 py-0.5 rounded-md',
                      task.priority === 'critical' ? 'ux-chip-soft-danger' : 'ux-chip-soft-warn',
                    )}>{taskPriorityLabel(task.priority, t)}</span>
                    <span className="type-caption text-text-tertiary">{taskXpLabel(task.xpReward, t)}</span>
                  </div>
                </MotionSection>
              ))}
              {criticalTasks.length === 0 && (
                <p className="dashboard-panel-empty type-caption text-text-tertiary py-1">
                  {t('dashAllCaughtUp')}
                </p>
              )}
            </div>
          </BlueprintSurface>

          {/* OPT-K91/K110 — section label + rows; no enclosing panel outline/wash cage */}
          {fixTasks.length > 0 && (
            <div className="py-1" data-testid="dashboard-needs-fixing">
              <SectionLabel>{t('dashNeedsFixing')}</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {fixTasks.slice(0, 3).map(task => (
                  <button
                    type="button"
                    key={task.id}
                    onClick={() => onStartTask?.(task.id)}
                    className="w-full flex items-center gap-3 rounded-lg py-2 px-1 hover:bg-surface-secondary/50 cursor-pointer transition-all group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                  >
                    <span className="type-meta flex-1 truncate group-hover:text-text-primary transition-colors">{task.title}</span>
                    <span className="type-caption text-text-tertiary">{taskDurationLabel(task.estimatedMinutes, t)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Courses */}
          <BlueprintSurface className="p-2 sm:p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="dashboard-panel-title font-medium">{t('dashActiveCourses')}</h2>
              <CardLink onClick={() => onNavigate('library')} className="dashboard-panel-action">{t('dashLibrary')} <ChevronRight className="w-4 h-4" /></CardLink>
            </div>
            {activeCourses.length > 0 ? (
              <div
                className={cn(
                  'dashboard-course-grid grid gap-2',
                  isMultiCol ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
                )}
              >
                {activeCourses.map((course, i) => {
                  const courseMastery = selectCanonicalMastery(course);
                  return (
                  <MotionSection
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    onClick={() => onSelectCourse(course)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectCourse(course);
                      }
                    }}
                    className="p-2 sm:p-2.5 rounded-lg border-0 bg-transparent hover:bg-surface-secondary/55 cursor-pointer transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <MasteryRing mastery={courseMastery} size={32} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold type-meta group-hover:text-text-primary transition-colors">{course.title}</h3>
                        <div className="flex items-center gap-2 type-caption text-text-tertiary mt-0.5">
                          <span>{t('dashLessonsCount').replace('{done}', String(course.completedLessons)).replace('{total}', String(course.totalLessons))}</span>
                          <span>·</span>
                          <span>{t('dashConceptsCount').replace('{count}', String(course.conceptCount))}</span>
                        </div>
                      </div>
                    </div>
                    {/* Wave P-2 C08 — Active Courses lesson-progress track uses
                        --viz-bar-track for ≥3:1 contrast vs card surface. */}
                    <div className="w-full rounded-full h-1" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                      <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (course.completedLessons / Math.max(course.totalLessons, 1)) * 100)}%`, backgroundColor: resolveCourseColor(course.color) }} />
                    </div>
                  </MotionSection>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-surface-secondary/35 p-4 text-center">
                <p className="type-body text-text-secondary">{t('dashCoursesProcessing')}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('library')}
                  className="mt-3 inline-flex items-center gap-1 type-caption text-text-secondary hover:text-text-primary"
                >
                  {t('dashLibrary')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </BlueprintSurface>

          {(daysToExam !== null || Boolean(settingsExamDate) || courses.some((c) => Boolean(c.examDate)) || tasks.some((task) => task.category === 'exam' || task.type === 'exam-prep' || task.type === 'timed-test' || task.type === 'oral-exam')) && (
            <ExamCalendarPanel
              settingsExamDate={settingsExamDate}
              courses={courses}
              tasks={tasks}
              personalStudyDates={personalStudyDates}
            />
          )}
          <PostExamNextStepsPanel
            examDate={settingsExamDate ?? courses.find((c) => c.examDate)?.examDate}
            courseTitles={courses.map((c) => c.title)}
            weakAreas={learnerModel.weakAreas}
            misconceptions={unresolvedMisconceptions}
            reviewDueCount={pageStats.reviewsDue}
            onStartSession={onStartSession}
            onFocusWeakArea={onFocusWeakArea}
            onOpenWorkspace={onOpenWorkspace}
            onNavigate={onNavigate}
          />

          {/* Mastery Trend + recent activity stay in the same masonry column. */}
          <div data-testid="dashboard-weekly-activity-stack" className="space-y-2">
          <CollapsibleChromeSection
            title={t('dashWeeklyMastery')}
            alwaysCollapse
            meta={learnerModel.overallMastery ? `${learnerModel.overallMastery}%` : undefined}
            data-testid="dashboard-weekly-mastery-chrome"
          >
            <BlueprintSurface className="p-3 border-0 shadow-none">
              <SectionLabel>{t('dashWeeklyMastery')}</SectionLabel>
              {masteryTrend.length > 0 ? (
                <div className="flex items-end gap-1.5 h-20">
                  {masteryTrend.map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      {/* Wave P-C01 — historical bars use --viz-bar-fill-muted (theme-tuned
                          55% brand mix on card; guarantees ≥3:1 contrast). Current day keeps
                          its theme-aware accent highlight for emphasis. */}
                      <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${Math.min(100, Math.max(6, val * 1.2))}%`,
                          backgroundColor: i === masteryTrend.length - 1
                            ? accentHighlightVar()
                            : 'var(--viz-bar-fill-muted)',
                        }}
                      />
                      <span className="type-micro text-text-muted">{weekdayLabels[i] ?? ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center type-caption text-text-tertiary">{t('dashNoMasteryTrend')}</p>
              )}
              <div className="mt-2 text-center">
                <span className="ux-stat-value">{learnerModel.overallMastery}%</span>
                {/* OPT-K90 — delta copy is ink; mastery bars carry semantic hue */}
                <span className="type-caption ml-2 text-text-secondary">
                  {masteryDelta >= 0 ? '+' : ''}{masteryDelta}% {t('dashThisWeek')}
                </span>
              </div>
            </BlueprintSurface>
          </CollapsibleChromeSection>
          {recentActivityPanel}
          </div>

          {/* Weak Areas — OPT-K18: pair with Almost-there under Minimal when both exist */}
          {isMinimal && learnerModel.almostKnown.length > 0 ? (
            <div className="dashboard-pair-row" data-testid="dashboard-pair-weak-almost">
          <div className="min-w-0" data-testid="dashboard-weak-areas">
            <SectionLabel>{t('dashWeakAreas')}</SectionLabel>
            <div className="proximity-track space-y-2">
              {weakSpotsWithReasons.length > 0 ? weakSpotsWithReasons.map((area) => (
                <button
                  key={area.concept}
                  type="button"
                  onClick={() => {
                    if (onFocusWeakArea) {
                      onFocusWeakArea(area.concept);
                      return;
                    }
                    const task = findTaskForConcept(tasks, area.concept);
                    if (task) onStartTask?.(task.id);
                    else onNavigate('agent');
                  }}
                  className="w-full space-y-1 text-left hover:bg-surface-hover rounded-lg p-1 -m-1 transition-all group"
                >
                  <div className="proximity-row">
                    <span className="proximity-row-label type-caption font-medium group-hover:text-text-primary transition-colors truncate">{area.concept}</span>
                    <span className="type-caption text-text-tertiary shrink-0 tabular-nums">{area.mastery}%</span>
                  </div>
                  {area.reasons[0] && area.reasons[0].id !== 'low-mastery' && (
                    <p className="type-caption text-text-tertiary line-clamp-1">{area.reasons[0].label}</p>
                  )}
                  {/* Wave P-C04 — track uses --viz-bar-track (theme-tuned to ≥3:1 vs card)
                      so low-mastery fills (3-20%) always reveal a visible track behind them. */}
                  <div className="dashboard-progress-track">
                    <div
                      className="dashboard-progress-fill dashboard-progress-fill--weak"
                      style={{ width: `${Math.max(area.mastery, 3)}%` }}
                    />
                  </div>
                </button>
              )) : (
                <p className="py-3 text-center type-caption text-text-tertiary">{t('dashNoWeakAreas')}</p>
              )}
            </div>
            {weakSpotsWithReasons.length > 0 && (
            <SecondaryCTA
              type="button"
              size="sm"
              className="ws-touch-floor min-h-9 mt-2.5"
              onClick={() => {
                const first = learnerModel.weakAreas[0];
                if (first && onFocusWeakArea) onFocusWeakArea(first.concept);
                else onNavigate('agent');
              }}
            >
              {t('dashPracticeWeak')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </SecondaryCTA>
            )}
          </div>
              <div className="dashboard-almost-there proximity-track space-y-1 min-w-0" data-testid="dashboard-almost-there">
                <div className="mb-1.5">
                  <p className="type-caption font-semibold text-text-primary">
                    {t('dashAlmostThere')}
                  </p>
                  <p className="type-caption text-text-tertiary mt-0.5">{t('dashAlmostThereHint')}</p>
                </div>
                {learnerModel.almostKnown.map((a) => (
                  <UtilityRow
                    key={a.concept}
                    label={a.concept}
                    value={`${a.mastery}%`}
                    barPct={a.mastery}
                    data-testid={`dashboard-almost-there-${a.concept}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
          <BlueprintSurface className="p-3" data-testid="dashboard-weak-areas">
            <SectionLabel>{t('dashWeakAreas')}</SectionLabel>
            <div className="proximity-track space-y-2">
              {weakSpotsWithReasons.length > 0 ? weakSpotsWithReasons.map((area) => (
                <button
                  key={area.concept}
                  type="button"
                  onClick={() => {
                    if (onFocusWeakArea) {
                      onFocusWeakArea(area.concept);
                      return;
                    }
                    const task = findTaskForConcept(tasks, area.concept);
                    if (task) onStartTask?.(task.id);
                    else onNavigate('agent');
                  }}
                  className="w-full space-y-1 text-left hover:bg-surface-hover rounded-lg p-1 -m-1 transition-all group"
                >
                  <div className="proximity-row">
                    <span className="proximity-row-label type-caption font-medium group-hover:text-text-primary transition-colors truncate">{area.concept}</span>
                    <span className="type-caption text-text-tertiary shrink-0 tabular-nums">{area.mastery}%</span>
                  </div>
                  {area.reasons[0] && area.reasons[0].id !== 'low-mastery' && (
                    <p className="type-caption text-text-tertiary line-clamp-1">{area.reasons[0].label}</p>
                  )}
                  <div className="dashboard-progress-track">
                    <div
                      className="dashboard-progress-fill dashboard-progress-fill--weak"
                      style={{ width: `${Math.max(area.mastery, 3)}%` }}
                    />
                  </div>
                </button>
              )) : (
                <p className="py-3 text-center type-caption text-text-tertiary">{t('dashNoWeakAreas')}</p>
              )}
            </div>
            {weakSpotsWithReasons.length > 0 && (
            <SecondaryCTA
              type="button"
              size="sm"
              className="ws-touch-floor min-h-9 mt-2.5"
              onClick={() => {
                const first = learnerModel.weakAreas[0];
                if (first && onFocusWeakArea) onFocusWeakArea(first.concept);
                else onNavigate('agent');
              }}
            >
              {t('dashPracticeWeak')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </SecondaryCTA>
            )}
          </BlueprintSurface>

          {/* Almost Known — OPT-K17 Minimal: UtilityRows (no peach banner). Blueprint keeps warn well. */}
          {learnerModel.almostKnown.length > 0 && (
            isMinimal ? (
              <div className="dashboard-almost-there proximity-track space-y-1" data-testid="dashboard-almost-there">
                <div className="mb-1.5">
                  <p className="type-caption font-semibold text-text-primary">
                    {t('dashAlmostThere')}
                  </p>
                  <p className="type-caption text-text-tertiary mt-0.5">{t('dashAlmostThereHint')}</p>
                </div>
                {learnerModel.almostKnown.map((a) => (
                  <UtilityRow
                    key={a.concept}
                    label={a.concept}
                    value={`${a.mastery}%`}
                    barPct={a.mastery}
                    data-testid={`dashboard-almost-there-${a.concept}`}
                  />
                ))}
              </div>
            ) : (
              <div className="ux-banner-warn py-1" data-testid="dashboard-almost-there">
                <SectionLabel>{t('dashAlmostThere')}</SectionLabel>
                <p className="type-caption text-text-tertiary mb-2">{t('dashAlmostThereHint')}</p>
                <div className="proximity-track space-y-1.5">
                  {learnerModel.almostKnown.map(a => (
                    <div key={a.concept} className="proximity-row">
                      <span className="proximity-row-label type-caption font-medium">{a.concept}</span>
                      <span className="ux-banner-warn-accent type-caption tabular-nums shrink-0">{a.mastery}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
            </>
          )}

          {/* Upcoming Exam — OPT-K19: full-width primary under Minimal (not paired with meta) */}
          {isMinimal && courses.some(c => c.examDate) ? (
            <div className="dashboard-exam-primary min-w-0" data-testid="dashboard-upcoming-exam">
              <SectionLabel>{t('dashUpcomingExam')}</SectionLabel>
              {courses.filter(c => c.examDate).map(course => {
                const daysLeft = Math.max(0, Math.ceil((new Date(course.examDate!).getTime() - Date.now()) / 86400000));
                const courseMastery = selectCanonicalMastery(course);
                return (
                  <div key={course.id} className="proximity-track">
                    <p className="type-meta font-medium">{course.title}</p>
                    <p className="type-caption text-text-secondary mt-1">{t('dashDaysLeftMastery').replace('{days}', String(daysLeft)).replace('{mastery}', String(courseMastery))}</p>
                    <div className="dashboard-progress-track mt-2">
                      <div
                        className={cn(
                          'dashboard-progress-fill',
                          /* OPT-K64 — rose only when weak; mid/strong use calmer fills */
                          courseMastery < 50
                            ? 'dashboard-progress-fill--weak'
                            : courseMastery < 70
                              ? 'dashboard-progress-fill--mid'
                              : 'dashboard-progress-fill--strong',
                        )}
                        style={{ width: `${courseMastery}%` }}
                      />
                    </div>
                    {courseMastery < 70 && daysLeft < 30 && (
                      <p className="dashboard-status-rose type-micro mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" aria-hidden />{t('dashBelowMastery')}
                      </p>
                    )}
                    {examTask && (
                      <SecondaryCTA
                        type="button"
                        onClick={() => onStartTask?.(examTask.id)}
                        className="ux-focus-ring dashboard-exam-cta mt-3 w-full"
                        data-testid="dashboard-start-exam-sim"
                      >
                        {t('dashStartExamSim')}
                      </SecondaryCTA>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            courses.some(c => c.examDate) && (
              <div className="py-1" data-testid="dashboard-upcoming-exam-panel">
                <SectionLabel>{t('dashUpcomingExam')}</SectionLabel>
                {courses.filter(c => c.examDate).map(course => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(course.examDate!).getTime() - Date.now()) / 86400000));
                  const courseMastery = selectCanonicalMastery(course);
                  return (
                    <div key={course.id} className="proximity-track">
                      <p className="type-meta font-medium">{course.title}</p>
                      <p className="type-caption text-text-secondary mt-1">{t('dashDaysLeftMastery').replace('{days}', String(daysLeft)).replace('{mastery}', String(courseMastery))}</p>
                      <div className="dashboard-progress-track mt-2">
                        <div
                          className={cn(
                            'dashboard-progress-fill',
                            courseMastery < 50
                              ? 'dashboard-progress-fill--weak'
                              : courseMastery < 70
                                ? 'dashboard-progress-fill--mid'
                                : 'dashboard-progress-fill--strong',
                          )}
                          style={{ width: `${courseMastery}%` }}
                        />
                      </div>
                      {courseMastery < 70 && daysLeft < 30 && (
                        <p className="type-micro text-text-secondary mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" aria-hidden />{t('dashBelowMastery')}</p>
                      )}
                      {examTask && (
                        <SecondaryCTA
                          type="button"
                          onClick={() => onStartTask?.(examTask.id)}
                          className="ux-focus-ring dashboard-exam-cta mt-3 w-full"
                          data-testid="dashboard-start-exam-sim"
                        >
                          {t('dashStartExamSim')}
                        </SecondaryCTA>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Calibration + insight — OPT-K19: quiet meta pair under Minimal when both exist */}
          {isMinimal ? (
              <div
                className={cn(
                  learnerModel.interactionInsights.length > 0 && 'dashboard-pair-row',
                )}
                data-testid={
                  learnerModel.interactionInsights.length > 0
                    ? 'dashboard-pair-calibration-insight'
                    : 'dashboard-calibration-block'
                }
              >
                <div className="min-w-0 space-y-3">
                  {calibration ? (
                    <CalibrationChip score={calibration.score} direction={calibration.direction} />
                  ) : (
                    <div>
                      <SectionLabel>{t('dashConfidenceCheck')}</SectionLabel>
                      <p className="dashboard-prose type-caption text-text-tertiary mb-2">{t('dashConfidenceCheckHint')}</p>
                    </div>
                  )}
                  {calibration && (
                    <div>
                      <SectionLabel>{t('dashRecentCalibration')}</SectionLabel>
                      {learnerModel.confidenceCalibration.slice(0, 3).map((p, i) => {
                        const overconfident = p.predicted > p.actual + 0.15;
                        return (
                          <div key={i} className="flex items-center gap-2 mb-1.5">
                            <span className="type-micro text-text-secondary w-16 truncate">{p.concept}</span>
                            <div className="dashboard-progress-track flex-1 relative">
                              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-400" style={{ width: `${p.predicted * 100}%` }} />
                              <div className="absolute inset-y-0 left-0 rounded-full bg-accent-emerald opacity-90" style={{ width: `${p.actual * 100}%` }} />
                            </div>
                            {overconfident && (
                              <AlertTriangle
                                className="h-3 w-3 dashboard-status-rose"
                                aria-label={t('dashOverconfidentPrediction')}
                              />
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => onNavigate('analytics')} className="mt-2 w-full type-caption text-text-secondary hover:text-text-primary flex items-center justify-center gap-1">
                        {t('dashFullAnalytics')} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {learnerModel.interactionInsights.length > 0 && (
                  <div className="min-w-0">
                    <SectionLabel>{t('dashLearningInsight')}</SectionLabel>
                    <p className="dashboard-prose type-body text-text-secondary leading-relaxed">{learnerModel.interactionInsights[0]}</p>
                  </div>
                )}
              </div>
          ) : (
            <>
              {calibration ? (
                <CalibrationChip score={calibration.score} direction={calibration.direction} />
              ) : (
              <BlueprintSurface className="p-3.5">
                <SectionLabel>{t('dashConfidenceCheck')}</SectionLabel>
                <p className="type-caption text-text-tertiary mb-2">{t('dashConfidenceCheckHint')}</p>
              </BlueprintSurface>
              )}
              {calibration && (
              <BlueprintSurface className="p-3.5">
                <SectionLabel>{t('dashRecentCalibration')}</SectionLabel>
                {learnerModel.confidenceCalibration.slice(0, 3).map((p, i) => {
                  const overconfident = p.predicted > p.actual + 0.15;
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <span className="type-micro text-text-secondary w-16 truncate">{p.concept}</span>
                      <div className="flex-1 h-1.5 rounded-full relative" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                        <div className="absolute h-1.5 rounded-full bg-brand-400" style={{ width: `${p.predicted * 100}%` }} />
                        <div className="absolute h-1.5 rounded-full bg-accent-emerald" style={{ width: `${p.actual * 100}%`, opacity: 0.85 }} />
                      </div>
                      {overconfident && (
                        <AlertTriangle
                          className="h-3 w-3 text-text-secondary"
                          aria-label={t('dashOverconfidentPrediction')}
                        />
                      )}
                    </div>
                  );
                })}
                <button onClick={() => onNavigate('analytics')} className="mt-2 w-full type-caption text-text-secondary hover:text-text-primary flex items-center justify-center gap-1">
                  {t('dashFullAnalytics')} <ArrowRight className="w-3 h-3" />
                </button>
              </BlueprintSurface>
              )}
              {learnerModel.interactionInsights.length > 0 && (
                <div className="py-1" data-testid="dashboard-learning-insight">
                  <SectionLabel>{t('dashLearningInsight')}</SectionLabel>
                  <p className="type-body text-text-secondary leading-relaxed">{learnerModel.interactionInsights[0]}</p>
                </div>
              )}
            </>
          )}

          {/* Misconceptions — spaced repetition lives under concept mastery */}
          {isMinimal && unresolvedMisconceptions.length > 0 ? (
            <div className="min-w-0" data-testid="dashboard-pair-misconceptions-spaced">
              <SectionLabel>{t('dashActiveMisconceptions')}</SectionLabel>
              <div className="proximity-track-wide flex flex-col gap-2">
                {unresolvedMisconceptions.slice(0, 2).map(m => (
                  <div key={m.id} className="type-caption">
                    <p className="font-medium text-text-primary">{m.concept}</p>
                    <p className="text-text-secondary mt-0.5">{m.description}</p>
                    {onResolveMisconception && (
                      <button
                        onClick={() => onResolveMisconception(m.id)}
                        className="dashboard-misconception-resolve mt-1.5 platform-link type-micro flex items-center gap-1"
                      >
                        {t('dashMarkCorrected')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            unresolvedMisconceptions.length > 0 && (
              <BlueprintSurface className="p-2 sm:p-2.5">
                <SectionLabel>{t('dashActiveMisconceptions')}</SectionLabel>
                <div className="proximity-track-wide flex flex-col gap-2">
                  {unresolvedMisconceptions.slice(0, 2).map(m => (
                    <div key={m.id} className="type-caption">
                      <p className="font-medium text-text-primary">{m.concept}</p>
                      <p className="text-text-secondary mt-0.5">{m.description}</p>
                      {onResolveMisconception && (
                        <button
                          onClick={() => onResolveMisconception(m.id)}
                          className="dashboard-misconception-resolve mt-1.5 platform-link type-micro flex items-center gap-1"
                        >
                          {t('dashMarkCorrected')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </BlueprintSurface>
            )
          )}
      </div>
    </div>
      </div>
    <ScrollToTopButton />
    </div>
  );
}

function MasteryRing({ mastery, size }: { mastery: number; size: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (mastery / 100) * c;
  const stroke = courseRingColor(mastery);
  const mid = size / 2;
  const pctFont = Math.max(9, Math.round(size * 0.28));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={3} />
        <circle cx={mid} cy={mid} r={r} fill="none" stroke={stroke} strokeWidth={3} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="mastery-ring" />
      </svg>
      {/* OPT-K115 — unrotated SVG text for true geometric center */}
      <svg width={size} height={size} className="pointer-events-none absolute inset-0" aria-hidden>
        <text
          x={mid}
          y={mid}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-text-primary)"
          style={{ fontSize: pctFont, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {mastery}%
        </text>
      </svg>
    </div>
  );
}
