import { useMemo, useState } from 'react';
import {
  Flame, Lightning as Zap, Target, Clock, BookOpen, Warning as AlertTriangle,
  CaretRight as ChevronRight, TrendUp as TrendingUp, Brain, Calendar, ArrowRight,
  Shield, Lightbulb, ArrowCounterClockwise as RotateCcw, Eye, CheckCircle as CheckCircle2, UploadSimple as Upload, Sparkle as Sparkles,
  Sun, Moon, CloudSun, Columns,
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
import { CourseIcon } from './ui/CourseIcon';
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
import { greetingForTime, greetingIconKind, dashboardSubtitle } from '../lib/greeting';
import { useI18n } from '../lib/i18n';
import { PrimaryCTA } from './ui/primitives';
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
  toggleDashboardLayoutMode,
  type DashboardLayoutMode,
} from '../lib/dashboardLayoutPrefs';

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
  settingsExamDate?: string;
  personalStudyDates?: PersonalStudyDate[];
  onExamDateChange?: (date: string | undefined) => void;
  onPersonalStudyDatesChange?: (dates: PersonalStudyDate[]) => void;
  dashboardWallpaperDataUrl?: string;
  onDashboardWallpaperChange?: (dataUrl: string | undefined) => void;
}

export function Dashboard({ stats, courses, tasks, learnerModel, onNavigate, onSelectCourse, onOpenWorkspace, onOpenExamTimer, onUpload, onExploreDemo, prerequisiteRepairs = [], calibration, conceptMastery = [], activities = [], masteryDelta = 0, daysToExam = null, antiPassiveAlert = false, onStartTask, onStartSession, onResolveMisconception, onFocusWeakArea, workspaceLive = null, dashboardNextAction = null, smartCTAs = [], onRunSmartCTA, proactiveAgentAlerts = [], onRunProactiveAgentAlert, onOpenWorkspacePractice, lang = 'en', postUploadCourse = null, onDismissPostUpload, onOpenTasksReview, settingsExamDate, personalStudyDates = [], onExamDateChange, onPersonalStudyDatesChange, dashboardWallpaperDataUrl, onDashboardWallpaperChange }: DashboardProps) {
  const { t } = useI18n();
  const isMinimal = useMinimalTheme();
  const warmSandPage = useWarmSandPageScope();
  const [layoutMode, setLayoutMode] = useState<DashboardLayoutMode>(() => loadDashboardLayoutMode());
  const isCanvasLayout = layoutMode === 'canvas';
  const pageView = useMemo(
    () => selectDashboardPageViewModel({ stats, courses, tasks, learnerModel }),
    [stats, courses, tasks, learnerModel],
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
  const showAlertGrid = !isEmpty && (smartCTAs.length > 0 || proactiveAgentAlerts.length > 0 || daysToExam !== null);

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
            <h1 className="text-base sm:text-lg font-bold text-text-primary mb-2">
              {t('welcomeToSynapse')}
            </h1>
            <p className="text-text-secondary text-sm sm:text-base max-w-md mx-auto">
              {t('dashboardEmptyHint')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onUpload && (
              <button
                type="button"
                onClick={onUpload}
                data-tour="dashboard-upload"
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all"
              >
                <Upload className="w-4 h-4" />
                {t('uploadMaterial')}
              </button>
            )}
            {onExploreDemo && (
              <button
                type="button"
                onClick={onExploreDemo}
                className="flex items-center justify-center gap-2 px-8 py-3.5 border border-brand-500/40 bg-brand-500/5 hover:bg-brand-500/10 text-brand-300 rounded-xl font-semibold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {t('exploreDemo')}
              </button>
            )}
          </div>
          {onExploreDemo && (
            <p className="text-center text-xs text-text-muted mt-3">
              {t('dashboardDemoFootnote')}
            </p>
          )}
        </MotionSection>
      </div>
    );
  }

  const toggleLayout = () => {
    const next = toggleDashboardLayoutMode(layoutMode);
    setLayoutMode(next);
    saveDashboardLayoutMode(next);
  };

  return (
    <div
      {...warmSandScopeProps(warmSandPage)}
      className={cn('w-full min-w-0 pb-24 lg:pb-8 ux-fade-up', isMinimal && 'dashboard-calm hub-quiet')}
      data-testid="dashboard-page"
      data-dashboard-layout={layoutMode}
    >
      <MotionSection
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
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
          lang={lang}
          onUpload={onUpload}
          onStartSession={onStartSession}
          onOpenTasksReview={onOpenTasksReview}
          onOpenWorkspace={onOpenWorkspace}
          greetingEyebrow={t('dashboardEyebrow')}
          greetingTitle={
            <>
              <span className="sr-only">{t('dashboardSrPrefix')}</span>
              {greetingForTime(lang)}!
              {(() => {
                const kind = greetingIconKind();
                const Icon = kind === 'sun' ? Sun : kind === 'moon' ? Moon : CloudSun;
                return (
                  <Icon
                    className="inline-block w-5 h-5 text-brand-600 shrink-0 ml-1.5 align-middle"
                    weight="duotone"
                    aria-hidden
                  />
                );
              })()}
            </>
          }
          greetingSubtitle={
            <span className="gradient-text">{dashboardSubtitle(lang, pageStats.criticalTaskCount, pageStats.streak)}</span>
          }
          headerActions={
            <>
              {showWorkspaceResume && workspaceLive?.snapshot.activeConcept && !workspaceLive.snapshot.genericConcept && (
                <span
                  data-testid="dashboard-active-topic-pill"
                  className="inline-flex max-w-[14rem] items-center truncate rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[10px] font-semibold text-brand-800"
                  title={workspaceLive.snapshot.activeConcept}
                >
                  {t('dashboardActiveTopic').replace('{topic}', workspaceLive.snapshot.activeConcept)}
                </span>
              )}
              <button
                type="button"
                onClick={toggleLayout}
                data-testid="dashboard-layout-toggle"
                aria-pressed={isCanvasLayout}
                aria-label={isCanvasLayout ? t('dashLayoutStacked') : t('dashLayoutCanvas')}
                title={isCanvasLayout ? t('dashLayoutStacked') : t('dashLayoutCanvas')}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                  isCanvasLayout
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-700'
                    : 'border-border-subtle text-text-secondary hover:border-brand-500/30 hover:text-brand-300',
                )}
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </>
          }
          statsSlot={
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3" data-testid="dashboard-page-stats">
              <StatCard icon={<Flame className="w-3.5 h-3.5 text-accent-amber" />} label={t('dashboardStatStreak')} value={t('dashboardStatDaysSuffix').replace('{count}', String(pageStats.streak))} data-testid="dashboard-stat-streak" />
              <StatCard icon={<Zap className="w-3.5 h-3.5 text-brand-400" />} label={t('dashboardStatTodayXp')} value={`${pageStats.todayXp}`} data-testid="dashboard-stat-today-xp" />
              <StatCard
                icon={<Target className="w-3.5 h-3.5 text-accent-teal" />}
                label={t('dashboardStatReviewsDue')}
                value={`${pageStats.reviewsDue}`}
                onClick={pageStats.reviewsDue > 0 ? () => (onOpenTasksReview ? onOpenTasksReview() : onNavigate('tasks')) : undefined}
                data-testid="dashboard-stat-reviews-due"
                id="dashboard-stat-reviews-due"
              />
              <StatCard icon={<Brain className="w-3.5 h-3.5 text-accent-cyan" />} label={t('dashboardStatConceptsMastered')} value={`${pageStats.conceptsMastered}/${pageStats.totalConcepts}`} data-testid="dashboard-stat-concepts-mastered" />
              <StatCard icon={<Clock className="w-3.5 h-3.5 text-accent-emerald" />} label={t('dashboardStatStudyToday')} value={t('dashboardStatStudyMinutes').replace('{count}', String(pageStats.studyMinutesToday))} data-testid="dashboard-stat-study-today" />
            </div>
          }
        />
      </MotionSection>

      <div className="mt-3 sm:mt-4 px-4 sm:px-6 lg:px-8 space-y-2.5 sm:space-y-3">
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

      {!isEmpty && showAlertGrid && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <CollapsibleChromeSection title={t('chromeAlerts')} data-testid="dashboard-alerts-chrome">
            <DashboardAlertGrid
              daysToExam={daysToExam}
              smartCTAs={smartCTAs}
              proactiveAlerts={proactiveAgentAlerts}
              onRunSmartCTA={onRunSmartCTA}
              onRunProactiveAlert={onRunProactiveAgentAlert}
              onExamPrep={() => (examTask ? onStartTask?.(examTask.id) : onOpenExamTimer?.() ?? onOpenWorkspace?.())}
            />
          </CollapsibleChromeSection>
        </MotionSection>
      )}

      {/* Dual secondary prompts — quieter under Minimal (OPT-R15); side-by-side when both present */}
      {(daysToExam !== null || antiPassiveAlert || stats.antiPassiveAlert) && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CollapsibleChromeSection title={t('chromeStudyPrompts')} data-testid="dashboard-study-prompts-chrome">
            <div
              className={cn(
                'grid gap-3',
                daysToExam !== null && (antiPassiveAlert || stats.antiPassiveAlert)
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1',
              )}
            >
              {daysToExam !== null && (
                <UxCallout
                  variant="danger"
                  title={t('dashExamCountdown')}
                  icon={<Calendar className="text-accent-amber" />}
                  testId="dashboard-exam-countdown"
                  className="py-2.5"
                  action={
                    <button
                      type="button"
                      onClick={() => (examTask ? onStartTask?.(examTask.id) : onOpenExamTimer?.() ?? onOpenWorkspace?.())}
                      className="platform-link text-xs flex items-center gap-1 shrink-0"
                    >
                      {examTask ? t('dashStartExamPrep') : t('dashExamPrep')} <ArrowRight className="w-3 h-3" />
                    </button>
                  }
                >
                  {daysToExam === 0 ? t('dashExamToday') : (daysToExam === 1 ? t('dashDayUntilExam') : t('dashDaysUntilExam').replace('{count}', String(daysToExam)))}
                </UxCallout>
              )}
              {(antiPassiveAlert || stats.antiPassiveAlert) && (
                <div className="platform-banner-warn p-3 rounded-xl border flex items-start gap-2.5" data-testid="dashboard-anti-passive">
                  <Eye className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="platform-banner-title text-xs font-semibold">{t('dashActiveRecallTitle')}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{t('dashActiveRecallBody')}</p>
                    <button
                      type="button"
                      onClick={() => (firstReviewTask ? onStartTask?.(firstReviewTask.id) : onNavigate('tasks'))}
                      className="mt-1.5 platform-link text-xs flex items-center gap-1"
                    >
                      {t('dashTakeQuiz')} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleChromeSection>
        </MotionSection>
      )}

      {/* I-D10: workspace resume lives in hub only — no duplicate below stats */}

      {!showWorkspaceResume && dashboardNextAction && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <UxCallout
            variant="next-action"
            className={cn(!isMinimal && 'ux-spark-panel', isMinimal && 'dashboard-next-action-quiet')}
            title={dashboardNextAction.reason || t('dashboardSuggestedNext')}
            icon={<Lightbulb />}
            testId="dashboard-next-action"
            action={
              <PrimaryCTA
                onClick={handleDashboardNextAction}
                className="shrink-0 text-xs px-4 py-2 dashboard-continue-hero"
                data-testid="dashboard-execute-cta"
              >
                {t('dashExecute')} <ArrowRight className="w-3.5 h-3.5" />
              </PrimaryCTA>
            }
          >
            <p className="text-[11px] text-text-tertiary">{t('dashboardSuggestedNextSubtitle')}</p>
            {dashboardNextAction.label && (
              <p className="mt-1 text-xs line-clamp-2 text-text-secondary">{dashboardNextAction.label}</p>
            )}
          </UxCallout>
        </MotionSection>
      )}

      {/* Settings-style masonry: packs panels into short columns so a tall
          sidebar no longer leaves a full-height void beside shorter left content.
          Canvas toggle = 3 columns; stacked = 2. */}
      <div
        className={cn(
          'space-y-2.5 xl:space-y-0',
          isCanvasLayout
            ? 'xl:columns-3 xl:gap-3 [&>*]:mb-2.5 [&>*]:break-inside-avoid'
            : 'xl:columns-2 xl:gap-3 [&>*]:mb-2.5 [&>*]:break-inside-avoid',
        )}
        data-testid="dashboard-masonry"
        data-dashboard-layout-body={layoutMode}
      >
          {/* Readiness + coverage as separate masonry items (I-D05) */}
          <BlueprintSurface className="ux-calm-panel p-3.5" data-dashboard-col="a">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <ReadinessRing value={learnerModel.overallMastery} sublabel={t('dashReadinessSublabel')} />
              <div className="flex-1 space-y-2.5 w-full min-w-0">
                <SignalBars signals={[
                  { label: t('dashSignalAccuracy'), value: Math.round(learnerModel.retentionRate * 100), icon: 'target', color: 'var(--palette-green)', detail: t('dashSignalAccuracyDetail') },
                  { label: t('dashSignalReliance'), value: Math.round((1 - learnerModel.helpSeekingRate) * 100), icon: 'strength', color: 'var(--color-brand-600)', detail: t('dashSignalRelianceDetail') },
                  { label: t('dashSignalVolume'), value: Math.min(100, Math.round(learnerModel.totalSessions * 2.1)), icon: 'chart', color: 'var(--palette-teal)', detail: t('dashSignalVolumeDetail').replace('{count}', String(learnerModel.totalSessions)) },
                  { label: t('dashSignalRetrieval'), value: Math.round(learnerModel.retrievalPerformance * 100), icon: 'brain', color: 'var(--palette-amber)', detail: t('dashSignalRetrievalDetail') },
                ]} />
              </div>
            </div>
          </BlueprintSurface>
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

          {/* L-D02: Ισχύς ανάκλησης thin bar above concept mastery (canvas shot 2) */}
          <div
            className="rounded-xl border border-border-subtle bg-surface-card/50 px-3 py-2"
            data-testid="dashboard-retrieval-strength-bar"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                {t('dashSignalRetrieval')}
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-text-primary">
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

          {/* Concept mastery + prerequisite repair */}
          {(conceptMastery.length > 0 || prerequisiteRepairs.length > 0) && (
            <div
              className={cn(
                'grid grid-cols-1 gap-3',
                conceptMastery.length > 0 && prerequisiteRepairs.length > 0 && 'sm:grid-cols-2',
              )}
            >
              {conceptMastery.length > 0 && (
                <BlueprintSurface className="p-3.5">
                  <SectionLabel icon={Brain}>{t('dashConceptMastery')}</SectionLabel>
                  <ConceptMasteryBars concepts={conceptMastery} />
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
          )}

          {/* Priority tasks */}
          <BlueprintSurface className="p-3.5" data-dashboard-col="b">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-lg font-semibold ws-serif font-medium flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-amber" /> {t('dashPriorityTasks')}
              </h2>
              <button onClick={() => onNavigate('tasks')} className="text-sm text-brand-400 hover:text-brand-700 flex items-center gap-1">{t('dashViewAll')} <ChevronRight className="w-4 h-4" /></button>
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
                  className="ux-row-elev-hover flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60">
                  <CourseIcon icon={task.courseIcon} size="sm" colorClassName="text-brand-500 shrink-0" />
                  <TaskActionIcon task={task} size="xs" />
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: resolveCourseColor(task.courseColor) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-brand-300 transition-colors">{task.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{task.courseName} · {taskDurationLabel(task.estimatedMinutes, t)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Wave P-3 C14 — solid on-accent chips so HIGH/CRITICAL pills
                        clear WCAG AA on white spectrum + warm-light cards. */}
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      task.priority === 'critical' ? 'ux-chip-solid-danger' : 'ux-chip-solid-warn',
                    )}>{taskPriorityLabel(task.priority, t)}</span>
                    <span className="text-xs text-accent-amber">{taskXpLabel(task.xpReward, t)}</span>
                  </div>
                </MotionSection>
              ))}
              {criticalTasks.length === 0 && <p className="text-sm text-text-tertiary text-center py-6 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent-emerald" /> {t('dashAllCaughtUp')}</p>}
            </div>
          </BlueprintSurface>

          {/* Needs fixing */}
          {fixTasks.length > 0 && (
            <div className="rounded-panel border border-accent-orange/20 bg-accent-orange/5 p-5">
              <SectionLabel icon={Shield}>{t('dashNeedsFixing')}</SectionLabel>
              <div className="space-y-2">
                {fixTasks.slice(0, 3).map(task => (
                  <button
                    type="button"
                    key={task.id}
                    onClick={() => onStartTask?.(task.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-surface-card/50 hover:bg-surface-hover cursor-pointer transition-all group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                  >
                    <CourseIcon icon={task.courseIcon} size="sm" colorClassName="text-brand-500 shrink-0" />
                    <span className="text-sm flex-1 truncate group-hover:text-brand-300 transition-colors">{task.title}</span>
                    <span className="text-xs text-accent-orange">{taskDurationLabel(task.estimatedMinutes, t)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Courses */}
          <BlueprintSurface className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-lg font-semibold ws-serif font-medium flex items-center gap-2"><BookOpen className="w-5 h-5 text-brand-400" />{t('dashActiveCourses')}</h2>
              <button onClick={() => onNavigate('library')} className="text-sm text-brand-400 hover:text-brand-700 flex items-center gap-1">{t('dashLibrary')} <ChevronRight className="w-4 h-4" /></button>
            </div>
            {activeCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="p-4 rounded-xl border border-border-subtle hover:border-brand-500/30 bg-surface-primary/50 cursor-pointer transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <CourseIcon icon={course.icon} size="lg" colorClassName="text-brand-600" />
                      <MasteryRing mastery={courseMastery} size={38} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-brand-300 transition-colors">{course.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
                      <span>{t('dashLessonsCount').replace('{done}', String(course.completedLessons)).replace('{total}', String(course.totalLessons))}</span>
                      <span>·</span>
                      <span>{t('dashConceptsCount').replace('{count}', String(course.conceptCount))}</span>
                    </div>
                    {/* Wave P-2 C08 — Active Courses lesson-progress track uses
                        --viz-bar-track for ≥3:1 contrast vs card surface. */}
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (course.completedLessons / Math.max(course.totalLessons, 1)) * 100)}%`, backgroundColor: resolveCourseColor(course.color) }} />
                    </div>
                  </MotionSection>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-5 text-center">
                <p className="text-sm text-text-secondary">{t('dashCoursesProcessing')}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('library')}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-700"
                >
                  {t('dashLibrary')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </BlueprintSurface>

          <ExamCalendarPanel />
          <PostExamNextStepsPanel examDate={settingsExamDate ?? courses.find((c) => c.examDate)?.examDate} />

          {/* Mastery Trend */}
          <BlueprintSurface className="p-3">
            <SectionLabel icon={TrendingUp}>{t('dashWeeklyMastery')}</SectionLabel>
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
                    <span className="text-[9px] text-text-muted">{weekdayLabels[i] ?? ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-text-tertiary">{t('dashNoMasteryTrend')}</p>
            )}
            <div className="mt-2 text-center">
              <span className="ux-stat-value">{learnerModel.overallMastery}%</span>
              <span className={cn('text-xs ml-2', masteryDelta >= 0 ? 'text-accent-emerald' : 'text-accent-rose')}>
                {masteryDelta >= 0 ? '+' : ''}{masteryDelta}% {t('dashThisWeek')}
              </span>
            </div>
          </BlueprintSurface>

          {/* Weak Areas */}
          <BlueprintSurface className="p-3">
            <SectionLabel icon={Brain}>{t('dashWeakAreas')}</SectionLabel>
            <div className="space-y-2">
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
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-medium group-hover:text-brand-300 transition-colors truncate">{area.concept}</span>
                    <span className="text-xs text-text-tertiary shrink-0">{area.mastery}%</span>
                  </div>
                  {area.reasons[0] && (
                    <p className="type-caption text-text-tertiary line-clamp-1">{area.reasons[0].label}</p>
                  )}
                  {/* Wave P-C04 — track uses --viz-bar-track (theme-tuned to ≥3:1 vs card)
                      so low-mastery fills (3-20%) always reveal a visible track behind them. */}
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                    <div className="h-1.5 rounded-full bg-accent-rose transition-all" style={{ width: `${Math.max(area.mastery, 3)}%` }} />
                  </div>
                </button>
              )) : (
                <p className="py-3 text-center text-xs text-text-tertiary">{t('dashNoWeakAreas')}</p>
              )}
            </div>
            {weakSpotsWithReasons.length > 0 && (
            <button
              onClick={() => {
                const first = learnerModel.weakAreas[0];
                if (first && onFocusWeakArea) onFocusWeakArea(first.concept);
                else onNavigate('agent');
              }}
              className="mt-2.5 w-full text-xs text-brand-400 hover:text-brand-700 flex items-center justify-center gap-1"
            >
              {t('dashPracticeWeak')} <ArrowRight className="w-3 h-3" />
            </button>
            )}
          </BlueprintSurface>

          {/* Almost Known */}
          {learnerModel.almostKnown.length > 0 && (
            /* Wave P-3 C13 — ux-banner-warn drives --color-banner-warn-ink so the
               title + mastery % clear 4.5:1 on spectrum peach banners. */
            <div className="ux-banner-warn rounded-panel border border-accent-amber/20 bg-accent-amber/5 p-3">
              <SectionLabel icon={Lightbulb}>{t('dashAlmostThere')}</SectionLabel>
              <p className="text-xs text-text-tertiary mb-2">{t('dashAlmostThereHint')}</p>
              <div className="space-y-1.5">
                {learnerModel.almostKnown.map(a => (
                  <div key={a.concept} className="flex items-center justify-between">
                    <span className="text-xs font-medium">{a.concept}</span>
                    <span className="ux-banner-warn-accent text-xs">{a.mastery}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Exam */}
          {courses.some(c => c.examDate) && (
            <div className="rounded-panel border border-accent-rose/20 bg-accent-rose/5 p-3">
              <SectionLabel icon={Calendar}>{t('dashUpcomingExam')}</SectionLabel>
              {courses.filter(c => c.examDate).map(course => {
                const daysLeft = Math.max(0, Math.ceil((new Date(course.examDate!).getTime() - Date.now()) / 86400000));
                const courseMastery = selectCanonicalMastery(course);
                return (
                  <div key={course.id}>
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{t('dashDaysLeftMastery').replace('{days}', String(daysLeft)).replace('{mastery}', String(courseMastery))}</p>
                    {/* Wave P-C04 — Upcoming Exam track uses --viz-bar-track (parity with weak areas). */}
                    <div className="mt-2 w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                      <div className="h-1.5 rounded-full bg-accent-rose transition-all" style={{ width: `${courseMastery}%` }} />
                    </div>
                    {courseMastery < 70 && daysLeft < 30 && (
                      <p className="text-[10px] text-accent-rose mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t('dashBelowMastery')}</p>
                    )}
                    {examTask && (
                      /* Wave P-C05 — solid rose CTA using .ux-chip-solid-danger + --color-on-danger
                          ink; retires anemic bg-accent-rose/15 that failed 3:1 vs its own rose banner. */
                      <button
                        onClick={() => onStartTask?.(examTask.id)}
                        className="ux-focus-ring mt-3 w-full py-2 rounded-lg text-xs font-semibold ux-chip-solid-danger transition-all hover:brightness-95"
                      >
                        {t('dashStartExamSim')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Confidence Calibration mini */}
          {calibration ? (
            <CalibrationChip score={calibration.score} direction={calibration.direction} />
          ) : (
          <BlueprintSurface className="p-3.5">
            <SectionLabel icon={Eye}>{t('dashConfidenceCheck')}</SectionLabel>
            <p className="text-xs text-text-tertiary mb-2">{t('dashConfidenceCheckHint')}</p>
          </BlueprintSurface>
          )}
          {calibration && (
          <BlueprintSurface className="p-3.5">
            <SectionLabel icon={Eye}>{t('dashRecentCalibration')}</SectionLabel>
            {learnerModel.confidenceCalibration.slice(0, 3).map((p, i) => {
              const overconfident = p.predicted > p.actual + 0.15;
              return (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-text-secondary w-16 truncate">{p.concept}</span>
                  {/* Wave P-2 C09 — Recent Calibration compact bar migrated to
                      --viz-bar-track and full-opacity emerald so both predicted
                      (brand-400) and actual (emerald) segments reach ≥3:1 on all
                      themes, and the track stays visible when both bars are short. */}
                  <div className="flex-1 h-1.5 rounded-full relative" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                    <div className="absolute h-1.5 rounded-full bg-brand-400" style={{ width: `${p.predicted * 100}%` }} />
                    <div className="absolute h-1.5 rounded-full bg-accent-emerald" style={{ width: `${p.actual * 100}%`, opacity: 0.85 }} />
                  </div>
                  {overconfident && (
                    <AlertTriangle
                      className="h-3 w-3 text-accent-rose"
                      aria-label={t('dashOverconfidentPrediction')}
                    />
                  )}
                </div>
              );
            })}
            <button onClick={() => onNavigate('analytics')} className="mt-2 w-full text-xs text-brand-400 hover:text-brand-700 flex items-center justify-center gap-1">
              {t('dashFullAnalytics')} <ArrowRight className="w-3 h-3" />
            </button>
          </BlueprintSurface>
          )}

          {/* Learning Insight */}
          {learnerModel.interactionInsights.length > 0 && (
            <div className="rounded-panel border border-brand-500/20 bg-brand-500/5 p-3">
              <SectionLabel icon={Lightbulb}>{t('dashLearningInsight')}</SectionLabel>
              <p className="text-xs text-text-secondary leading-relaxed">{learnerModel.interactionInsights[0]}</p>
            </div>
          )}

          {/* Misconceptions */}
          {unresolvedMisconceptions.length > 0 && (
            <BlueprintSurface className="p-3">
              <SectionLabel icon={AlertTriangle}>{t('dashActiveMisconceptions')}</SectionLabel>
              <div className="space-y-2">
                {unresolvedMisconceptions.slice(0, 2).map(m => (
                  <div key={m.id} className="p-2 rounded-lg bg-accent-orange/5 border border-accent-orange/20 text-xs">
                    <p className="font-medium text-accent-orange">{m.concept}</p>
                    <p className="text-text-secondary mt-0.5">{m.description}</p>
                    {onResolveMisconception && (
                      <button
                        onClick={() => onResolveMisconception(m.id)}
                        className="mt-1.5 platform-link text-[10px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {t('dashMarkCorrected')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </BlueprintSurface>
          )}

          {/* Spaced Rep Info */}
          <BlueprintSurface className="p-3">
            <SectionLabel icon={RotateCcw}>{t('dashSpacedRepetition')}</SectionLabel>
            <p className="text-xs text-text-tertiary">{t('dashSpacedRepetitionHint')}</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => (firstReviewTask ? onStartTask?.(firstReviewTask.id) : onNavigate('tasks'))}
                className="p-2 rounded-lg bg-accent-amber/10 border border-accent-amber/20 hover:bg-accent-amber/15 transition-all"
                data-testid="dash-horizon-today"
              >
                <p className="ux-kpi-value text-accent-amber">{fsrsHorizon.today}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wide">{t('dashHorizonToday')}</p>
              </button>
              <div className="p-2 rounded-lg bg-surface-primary/50" data-testid="dash-horizon-tomorrow">
                <p className="ux-kpi-value">{fsrsHorizon.tomorrow}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wide">{t('dashHorizonTomorrow')}</p>
              </div>
              <div className="p-2 rounded-lg bg-surface-primary/50" data-testid="dash-horizon-3d">
                <p className="ux-kpi-value">{fsrsHorizon.within3d}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wide">{t('dashHorizon3d')}</p>
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

          {/* Activity Feed */}
          <BlueprintSurface className="p-3">
            <SectionLabel icon={Zap}>{t('dashRecentActivity')}</SectionLabel>
            <ActivityFeed activities={activities} maxItems={5} />
          </BlueprintSurface>
      </div>
    </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  onClick,
  className,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'onClick' | 'className'>) {
  const clickable = Boolean(onClick);
  return (
    <BlueprintSurface
      hint
      {...rest}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      className={cn(
        'p-2.5 card-hover',
        clickable && 'cursor-pointer hover:border-brand-500/30 hover:bg-surface-hover transition-colors',
        className,
      )}
    >
      <div className="mb-0.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] font-medium uppercase tracking-wide text-text-tertiary truncate">{label}</span>
      </div>
      <p className="ux-kpi-value-sm leading-tight">{value}</p>
    </BlueprintSurface>
  );
}

function MasteryRing({ mastery, size }: { mastery: number; size: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (mastery / 100) * c;
  const stroke = courseRingColor(mastery);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={3} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="mastery-ring" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-text-primary text-[9px] font-bold rotate-90 origin-center">{mastery}%</text>
    </svg>
  );
}
