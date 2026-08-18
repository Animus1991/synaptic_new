import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition, expandHeight } from '../lib/motion';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Calendar,
  Play, Brain,
  HelpCircle, XCircle, RefreshCw, ArrowDownRight, TrendingUp, Minus, ArrowRight,
  List, LayoutGrid, ChevronDown, ChevronRight,
} from '@/lib/lucide-shim';
import type { Task, MistakeRecord, SkillNode, SpacingData, UserSettings } from '../types';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { cn } from '../utils/cn';
import type { FsrsRating } from '../lib/pedagogy';
import { filterTasksForSession, startButtonLabel, sessionLabel, type SessionType } from '../lib/taskFlows';
import {
  getTasksContent,
  getSessionTypes,
  type TaskFilter,
} from '../lib/tasksContent';
import { getRecommendedSessionType } from '../lib/recommendedSessionType';
import { resolveStudyPlanLaunch } from '../lib/studyPlanLaunch';
import { TaskActionIcon } from './ui/TaskActionIcon';
import { Page, PageHeader, PrimaryCTA, SecondaryCTA } from './ui/primitives';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { TaskFormDialog } from './TaskFormDialog';
import { isManualTask, type ManualTaskCourse } from '../lib/personalTask';
import { downloadTaskIcs } from '../lib/taskIcs';
import { SectionHeader, SessionLauncherCard, UxCallout, DescriptiveStickyTabBar } from './ui/platformChrome';
import { TasksKanbanStatusStrip, tasksKanbanCardStatus } from './TasksKanbanStatusStrip';
import { LeitnerDueQueuePanel } from './workspace/LeitnerDueQueuePanel';
import { buildFsrsDueQueue } from '../lib/leitnerDueQueue';
import { useWarmSandPageScope, warmSandScopeProps } from '../lib/useDocumentTheme';
import { useMinimalTheme } from '../lib/useMinimalTheme';
/* OPT-K98 — markup debt: decorative brand type -> ink */
/* OPT-K140–K151 — Tasks CTA-only diet; denser Tasks type (restored pre-K150) */
export type { TaskFilter } from '../lib/tasksContent';

type CommandTab = 'today' | 'weak' | 'reviews' | 'mistakes';
type TasksLayoutMode = 'list' | 'board';
type TasksHubTab = 'today' | 'sessions' | 'plan' | 'alerts' | null;

function HubChromeChevron({ open }: { open: boolean }) {
  return open
    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />;
}

interface TasksProps {
  tasks: Task[];
  lang: Lang;
  onComplete: (taskId: string) => void;
  onReviewRating?: (taskId: string, rating: FsrsRating) => void;
  onStartTask?: (taskId: string) => void;
  onStartSession?: (session: SessionType, preferredTaskIds?: readonly string[]) => void;
  daysToExam?: number | null;
  expandedTaskId?: string | null;
  onExpandedTaskChange?: (taskId: string | null) => void;
  openMistakes?: MistakeRecord[];
  onResolveMistake?: (id: string) => void;
  filterPreset?: TaskFilter | null;
  onFilterPresetConsumed?: () => void;
  studyPlan?: import('../lib/unifiedAdaptiveScheduler').StudyPlanBlock[];
  focusCourseId?: string | null;
  focusCourseName?: string | null;
  weakAreas?: SkillNode[];
  almostKnown?: SkillNode[];
  antiPassiveAlert?: boolean;
  spacingReviews?: SpacingData[];
  streak?: number;
  onFocusWeakArea?: (concept: string) => void;
  onOpenAgent?: (concept?: string) => void;
  onStartQuiz?: () => void;
  courseNameById?: Record<string, string>;
  activeSessionType?: SessionType | null;
  sessionCurrentIndex?: number;
  sessionTotal?: number;
  sessionQueueIds?: string[];
  activeTaskId?: string | null;
  courses?: ManualTaskCourse[];
  defaultCourseId?: string | null;
  onUpsertTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  pacing?: UserSettings['pacing'];
  studyTimeToday?: number;
  dailyGoalMinutes?: number;
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

const TASKS_LAYOUT_KEY = 'synapse:tasks-layout';

function loadTasksLayoutMode(fallback: TasksLayoutMode): TasksLayoutMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(TASKS_LAYOUT_KEY);
    if (raw === 'list' || raw === 'board') return raw;
  } catch {
    /* ignore quota / private mode */
  }
  return fallback;
}

function saveTasksLayoutMode(mode: TasksLayoutMode) {
  try {
    window.localStorage.setItem(TASKS_LAYOUT_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function Tasks({
  tasks,
  lang,
  onComplete,
  onReviewRating,
  onStartTask,
  onStartSession,
  daysToExam = null,
  expandedTaskId = null,
  onExpandedTaskChange,
  openMistakes = [],
  onResolveMistake,
  filterPreset = null,
  onFilterPresetConsumed,
  studyPlan = [],
  focusCourseId = null,
  focusCourseName = null,
  weakAreas = [],
  almostKnown = [],
  antiPassiveAlert = false,
  spacingReviews = [],
  streak = 0,
  onFocusWeakArea,
  onOpenAgent,
  onStartQuiz,
  courseNameById = {},
  activeSessionType = null,
  sessionCurrentIndex = 0,
  sessionTotal = 0,
  sessionQueueIds = [],
  activeTaskId = null,
  courses = [],
  defaultCourseId = null,
  onUpsertTask,
  onDeleteTask,
  pacing,
  studyTimeToday,
  dailyGoalMinutes,
}: TasksProps) {
  const c = getTasksContent(lang);
  const isMinimal = useMinimalTheme();
  const sessionTypes = getSessionTypes(lang);
  const [tab, setTab] = useState<CommandTab>('today');
  const [hubChromeTab, setHubChromeTab] = useState<TasksHubTab>(null);
  const [sessionMode, setSessionMode] = useState<SessionType | null>(null);
  const [layoutMode, setLayoutMode] = useState<TasksLayoutMode>(() =>
    loadTasksLayoutMode(isMinimal ? 'list' : 'board'),
  );
  const setTasksLayout = (mode: TasksLayoutMode) => {
    setLayoutMode(mode);
    saveTasksLayoutMode(mode);
  };
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [localExpanded, setLocalExpanded] = useState<string | null>(null);
  const [entryHintDismissed, setEntryHintDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('synapse:tasks-hint-dismiss') === '1';
    } catch {
      return false;
    }
  });
  const [srBannerDismissed, setSrBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('synapse:tasks-sr-banner-dismiss') === '1';
    } catch {
      return false;
    }
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const expandedTask = expandedTaskId ?? localExpanded;
  const setExpandedTask = (id: string | null) => {
    setLocalExpanded(id);
    onExpandedTaskChange?.(id);
  };

  useEffect(() => {
    if (expandedTaskId) setLocalExpanded(expandedTaskId);
  }, [expandedTaskId]);

  useEffect(() => {
    if (!filterPreset) return;
    if (filterPreset === 'review') setTab('reviews');
    else if (filterPreset === 'fix') setTab('mistakes');
    else if (filterPreset === 'practice' || filterPreset === 'learn') setTab('weak');
    else if (filterPreset === 'exam') {
      setTab('today');
      setSessionMode('cram');
    } else setTab('today');
    onFilterPresetConsumed?.();
  }, [filterPreset, onFilterPresetConsumed]);

  useEffect(() => {
    if (focusCourseId) setShowAllCourses(false);
  }, [focusCourseId]);

  useEffect(() => {
    if (activeSessionType) setSessionMode(activeSessionType);
  }, [activeSessionType]);

  const sessionActive = Boolean(activeSessionType && sessionTotal > 0);
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;
  const nextQueuedTaskId = sessionQueueIds.find((id) => id !== activeTaskId) ?? sessionQueueIds[1];
  const nextQueuedTask = nextQueuedTaskId ? tasks.find((t) => t.id === nextQueuedTaskId) ?? null : null;

  const courseScoped = focusCourseId && !showAllCourses;
  const visibleTasks = courseScoped
    ? tasks.filter((t) => t.courseId === focusCourseId)
    : tasks;

  const todayTasks = visibleTasks.filter((t) => t.status !== 'completed');
  const doneCount = visibleTasks.filter((t) => t.status === 'completed').length;
  const totalCount = visibleTasks.length;
  const totalMin = todayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  const remainingMin = Math.round(totalMin * (1 - (totalCount ? doneCount / totalCount : 0)));
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const reviewTasks = visibleTasks.filter((t) => t.isSpacedRepetition && t.status === 'pending');
  const scopedWeak = courseScoped
    ? weakAreas.filter((w) => w.courseId === focusCourseId)
    : weakAreas;
  const scopedSpacing = courseScoped
    ? spacingReviews.filter((s) => {
        const task = tasks.find((t) => t.title.includes(s.concept) || t.description.includes(s.concept));
        return !task || task.courseId === focusCourseId;
      })
    : spacingReviews;

  const fsrsQueue = useMemo(
    () => buildFsrsDueQueue(scopedSpacing, [], '', new Date(), 14, 20),
    [scopedSpacing],
  );

  const fsrsRatings: { rating: FsrsRating; label: string; color: string }[] = [
    { rating: 'again', label: c.fsrsAgain, color: 'border-0 bg-accent-rose/15 text-accent-rose' },
    { rating: 'hard', label: c.fsrsHard, color: 'border-0 bg-accent-orange/15 text-accent-orange' },
    { rating: 'good', label: c.fsrsGood, color: 'border-0 bg-accent-amber/15 text-accent-amber' },
    { rating: 'easy', label: c.fsrsEasy, color: 'border-0 bg-accent-emerald/15 text-accent-emerald' },
  ];

  const recommendedSession = useMemo(
    () => getRecommendedSessionType({
      daysToExam,
      reviewDueCount: reviewTasks.length || fsrsQueue.length,
      weakCount: scopedWeak.length,
      openTaskCount: todayTasks.length,
      pacing,
    }),
    [daysToExam, reviewTasks.length, fsrsQueue.length, scopedWeak.length, todayTasks.length, pacing],
  );
  /* Hierarchy: recommended first — all five session types remain available */
  const orderedSessionTypes = useMemo(() => {
    const rec = sessionTypes.find((s) => s.type === recommendedSession);
    if (!rec) return sessionTypes;
    return [rec, ...sessionTypes.filter((s) => s.type !== recommendedSession)];
  }, [sessionTypes, recommendedSession]);

  const dismissEntryHint = () => {
    try {
      sessionStorage.setItem('synapse:tasks-hint-dismiss', '1');
    } catch {
      /* ignore */
    }
    setEntryHintDismissed(true);
  };
  const dismissSrBanner = () => {
    try {
      sessionStorage.setItem('synapse:tasks-sr-banner-dismiss', '1');
    } catch {
      /* ignore */
    }
    setSrBannerDismissed(true);
  };

  const warmSandPage = useWarmSandPageScope();
  const almostKnownPreview = almostKnown.slice(0, 2);
  const showInsightStrip = almostKnownPreview.length > 0 || antiPassiveAlert;

  const tabs: { id: CommandTab; label: string; summary: string; count: number }[] = [
    { id: 'today', label: c.tabToday, summary: c.tabTodaySummary, count: todayTasks.length },
    { id: 'weak', label: c.tabWeak, summary: c.tabWeakSummary, count: scopedWeak.length },
    {
      id: 'reviews',
      label: c.tabReviews,
      summary: c.tabReviewsSummary,
      count: reviewTasks.length + fsrsQueue.length,
    },
    { id: 'mistakes', label: c.tabMistakes, summary: c.tabMistakesSummary, count: openMistakes.length },
  ];

  const recommendedSessionTasks = filterTasksForSession(visibleTasks, recommendedSession);
  const canStartRecommended = recommendedSessionTasks.length > 0;
  const todayAlertCount =
    (daysToExam !== null && daysToExam <= 14 ? 1 : 0)
    + (almostKnownPreview.length > 0 ? 1 : 0)
    + (antiPassiveAlert ? 1 : 0);
  const showSrAlert = !srBannerDismissed && (reviewTasks.length > 0 || fsrsQueue.length > 0);
  const showMistakeAlert = openMistakes.length > 0;
  const showAlertsTab = todayAlertCount > 0 || showSrAlert || showMistakeAlert;
  const alertsMeta =
    todayAlertCount + (showSrAlert ? 1 : 0) + (showMistakeAlert ? 1 : 0);
  const showPlanTab = studyPlan.length > 0;
  const hubTabCount = 2 + (showPlanTab ? 1 : 0) + (showAlertsTab ? 1 : 0);

  const startRecommendedSession = () => {
    setTab('today');
    setSessionMode(recommendedSession);
    onStartSession?.(recommendedSession);
  };

  return (
    <div
      {...warmSandScopeProps(warmSandPage)}
      data-testid="tasks-page"
      data-bleed="full"
      data-border-diet="cta-only"
      data-tasks-layout={layoutMode}
      data-type-rhythm="tasks"
      className={cn('min-w-0 w-full max-w-none', isMinimal && 'tasks-quiet')}
    >
    <Page className="max-w-none ux-fade-up !pt-0" gap="sm" data-soft-sep="stack" data-type-rhythm="tasks" data-bleed="full">
      <PageHeader
        eyebrow={t('tasks', lang)}
        title={c.pageTitle}
        subtitle={c.pageSubtitle}
        actions={
          <div className="flex items-center gap-2 ux-page-header-actions--pair">
            <PrimaryCTA
              type="button"
              data-testid="tasks-create-plan"
              size="sm"
              disabled={!canStartRecommended}
              onClick={startRecommendedSession}
              className="tasks-create-plan-cta whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {c.createPlanCta}
            </PrimaryCTA>
            {onUpsertTask && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  setFormOpen(true);
                }}
                data-testid="tasks-add-task"
              >
                {c.addTaskCta}
              </Button>
            )}
            <div
              className="tasks-layout-toggle inline-flex items-center rounded-lg border-0 bg-surface-secondary/55 p-0.5"
              role="group"
              aria-label={t('tasksViewToggleAria', lang)}
              data-testid="tasks-layout-toggle"
            >
              <button
                type="button"
                data-testid="tasks-layout-list"
                aria-pressed={layoutMode === 'list'}
                title={t('tasksViewList', lang)}
                onClick={() => setTasksLayout('list')}
                className={cn(
                  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors',
                  layoutMode === 'list'
                    ? 'bg-surface-primary text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                <List className="w-3.5 h-3.5" aria-hidden />
              </button>
              <button
                type="button"
                data-testid="tasks-layout-board"
                aria-pressed={layoutMode === 'board'}
                title={t('tasksViewBoard', lang)}
                onClick={() => setTasksLayout('board')}
                className={cn(
                  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors',
                  layoutMode === 'board'
                    ? 'bg-surface-primary text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          </div>
        }
      />

      <div
        className="tasks-work-surface w-full max-w-none space-y-2"
        data-testid="tasks-work-surface"
        data-bleed="full"
        data-soft-card="off"
      >
      {sessionActive && activeSessionType && (
        <div
          className="ux-card ux-chip-info border-0 bg-brand-600/5 p-3 space-y-1.5"
          data-testid="tasks-session-status"
          role="status"
          aria-live="polite"
        >
          <p className="type-caption font-semibold text-text-secondary">
            {c.sessionActiveBanner(sessionLabel(activeSessionType), sessionCurrentIndex, sessionTotal)}
          </p>
          {activeTask && (
            <p className="type-body text-text-primary truncate">
              <span className="type-micro text-text-secondary mr-2">{c.sessionRunningNow}</span>
              {activeTask.title}
            </p>
          )}
          {nextQueuedTask && nextQueuedTask.id !== activeTaskId && (
            <p className="type-caption text-text-tertiary truncate">{c.sessionUpNext(nextQueuedTask.title)}</p>
          )}
          <p className="type-micro text-text-muted">{c.sessionAutoAdvanceHint}</p>
        </div>
      )}

      <div
        className="dashboard-hub-chrome-tabs w-full"
        data-testid="tasks-hub-chrome-tabs"
        data-hub-tab-count={hubTabCount}
        style={{ ['--hub-chrome-cols' as string]: String(hubTabCount) }}
      >
        <div className="dashboard-hub-chrome-tablist" role="tablist" aria-label={c.hubChromeAria}>
          <button
            type="button"
            role="tab"
            id="tasks-today-chrome-tab"
            aria-selected={hubChromeTab === 'today'}
            aria-controls="tasks-today-chrome-panel"
            data-testid="tasks-progress-chrome"
            className={cn('dashboard-hub-chrome-tab', hubChromeTab === 'today' && 'is-active')}
            onClick={() => setHubChromeTab((v) => (v === 'today' ? null : 'today'))}
          >
            <span className="truncate">{c.progressChrome}</span>
            <HubChromeChevron open={hubChromeTab === 'today'} />
          </button>
          <button
            type="button"
            role="tab"
            id="tasks-sessions-chrome-tab"
            aria-selected={hubChromeTab === 'sessions'}
            aria-controls="tasks-sessions-chrome-panel"
            data-testid="tasks-sessions-chrome"
            className={cn('dashboard-hub-chrome-tab', hubChromeTab === 'sessions' && 'is-active')}
            onClick={() => setHubChromeTab((v) => (v === 'sessions' ? null : 'sessions'))}
          >
            <span className="truncate">{t('chromeSessions', lang)}</span>
            <HubChromeChevron open={hubChromeTab === 'sessions'} />
          </button>
          {showPlanTab && (
            <button
              type="button"
              role="tab"
              id="tasks-plan-chrome-tab"
              aria-selected={hubChromeTab === 'plan'}
              aria-controls="tasks-plan-chrome-panel"
              data-testid="tasks-plan-chrome"
              className={cn('dashboard-hub-chrome-tab', hubChromeTab === 'plan' && 'is-active')}
              onClick={() => setHubChromeTab((v) => (v === 'plan' ? null : 'plan'))}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <span className="truncate">{c.studyPlanTitle}</span>
                <span className="ux-chrome-meta-badge shrink-0" data-testid="tasks-plan-chrome-meta">
                  {studyPlan.length}
                </span>
              </span>
              <HubChromeChevron open={hubChromeTab === 'plan'} />
            </button>
          )}
          {showAlertsTab && (
            <button
              type="button"
              role="tab"
              id="tasks-alerts-chrome-tab"
              aria-selected={hubChromeTab === 'alerts'}
              aria-controls="tasks-alerts-chrome-panel"
              data-testid="tasks-alerts-chrome"
              className={cn('dashboard-hub-chrome-tab', hubChromeTab === 'alerts' && 'is-active')}
              onClick={() => setHubChromeTab((v) => (v === 'alerts' ? null : 'alerts'))}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <span className="truncate">{t('chromeAlerts', lang)}</span>
                <span className="ux-chrome-meta-badge shrink-0" data-testid="tasks-alerts-chrome-meta">
                  {alertsMeta}
                </span>
              </span>
              <HubChromeChevron open={hubChromeTab === 'alerts'} />
            </button>
          )}
        </div>

        {hubChromeTab === 'today' && (
          <div
            role="tabpanel"
            id="tasks-today-chrome-panel"
            aria-labelledby="tasks-today-chrome-tab"
            data-testid="tasks-progress-chrome-body"
            className="dashboard-hub-chrome-panel"
          >
            <div className="dashboard-today-glance px-0.5 pb-1" data-testid="tasks-daily-goal">
              <div className="dashboard-today-glance-grid" role="list">
                <div className="dashboard-today-stat" role="listitem">
                  <div className="dashboard-today-stat-top">
                    <span className="dashboard-today-stat-value ux-kpi-value-sm">{progressPct}%</span>
                  </div>
                  <p className="dashboard-today-stat-label">{c.tasksComplete(doneCount, totalCount)}</p>
                  <div className="usage-bar mt-1.5" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={c.dailyGoal}>
                    <div className="usage-bar-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
                <div className="dashboard-today-stat" role="listitem">
                  <div className="dashboard-today-stat-top">
                    <span className="dashboard-today-stat-value">{remainingMin}</span>
                  </div>
                  <p className="dashboard-today-stat-label">{c.minRemaining(remainingMin)}</p>
                </div>
                {typeof studyTimeToday === 'number' && typeof dailyGoalMinutes === 'number' && (
                  <div className="dashboard-today-stat" role="listitem">
                    <div className="dashboard-today-stat-top">
                      <span className="dashboard-today-stat-value">{studyTimeToday}/{dailyGoalMinutes}m</span>
                    </div>
                    <p className="dashboard-today-stat-label">{c.dailyGoal}</p>
                    <div
                      className="usage-bar mt-1.5"
                      role="progressbar"
                      aria-valuenow={Math.min(100, Math.round((studyTimeToday / Math.max(1, dailyGoalMinutes)) * 100))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={c.dailyGoal}
                    >
                      <div
                        className="usage-bar-fill"
                        style={{ width: `${Math.min(100, Math.round((studyTimeToday / Math.max(1, dailyGoalMinutes)) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
                {streak > 0 && (
                  <div className="dashboard-today-stat" role="listitem">
                    <div className="dashboard-today-stat-top">
                      <span className="dashboard-today-stat-value">{streak}</span>
                    </div>
                    <p className="dashboard-today-stat-label">{c.streakDays(streak)}</p>
                  </div>
                )}
                {daysToExam !== null && (
                  <div className="dashboard-today-stat" role="listitem">
                    <div className="dashboard-today-stat-top">
                      <span className="dashboard-today-stat-value">{daysToExam}</span>
                    </div>
                    <p className="dashboard-today-stat-label">{daysToExam === 0 ? c.examToday : c.examInDays(daysToExam)}</p>
                  </div>
                )}
              </div>
              {focusCourseId && focusCourseName && (
                <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="tasks-find-chrome" data-soft-card="off">
                  {courseScoped && <span className="type-caption text-text-secondary">{c.courseScopeLabel(focusCourseName)}</span>}
                  <button
                    type="button"
                    onClick={() => setShowAllCourses((v) => !v)}
                    className="inline-flex min-h-9 items-center type-caption font-medium text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
                  >
                    {courseScoped ? c.showAllCourses : c.courseScopeLabel(focusCourseName)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {hubChromeTab === 'sessions' && (
          <div
            role="tabpanel"
            id="tasks-sessions-chrome-panel"
            aria-labelledby="tasks-sessions-chrome-tab"
            data-testid="tasks-session-launchers"
            className="dashboard-hub-chrome-panel"
          >
            <div className="space-y-2 px-0.5 pb-1">
              {!entryHintDismissed && (
                <div
                  className="flex items-start gap-2 border-0 px-1 py-1"
                  data-testid="tasks-help-chrome"
                >
                  <p className="flex-1 type-caption text-text-secondary leading-snug" data-testid="tasks-entry-hint">{c.entryHint}</p>
                  <button
                    type="button"
                    onClick={dismissEntryHint}
                    className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                    aria-label={t('tasksEntryHintDismiss', lang)}
                    title={t('tasksEntryHintDismiss', lang)}
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
              <SectionHeader
                title={c.sessionSectionTitle}
                subtitle={c.sessionSectionSubtitle}
              />
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 items-stretch"
                data-testid="tasks-session-card-grid"
              >
                {orderedSessionTypes.map((s) => {
                  const sessionTasks = filterTasksForSession(visibleTasks, s.type);
                  const isRecommended = recommendedSession === s.type;
                  return (
                    <SessionLauncherCard
                      key={s.type}
                      testId={`session-launcher-${s.type}`}
                      label={s.label}
                      desc={s.desc}
                      durationTag={c.sessionDurationTag(s.minutes)}
                      taskHint={sessionTasks.length > 0 ? c.sessionTaskCount(s.minutes, sessionTasks.length) : undefined}
                      active={sessionMode === s.type}
                      recommended={isRecommended}
                      recommendedLabel={t('sessionRecommendedBadge', lang)}
                      disabled={sessionTasks.length === 0}
                      onClick={() => {
                        if (isRecommended) setTab('today');
                        setSessionMode(s.type);
                        onStartSession?.(s.type);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {showPlanTab && hubChromeTab === 'plan' && (
          <div
            role="tabpanel"
            id="tasks-plan-chrome-panel"
            aria-labelledby="tasks-plan-chrome-tab"
            className="dashboard-hub-chrome-panel"
          >
            <div className="flex flex-wrap gap-2 px-0.5 pb-1" data-testid="tasks-study-plan-blocks" data-soft-card="off">
              {studyPlan.map((block) => {
                const launch = resolveStudyPlanLaunch(block, visibleTasks);
                return (
                <button
                  key={block.label}
                  type="button"
                  aria-pressed={tab === launch.tab}
                  title={c.studyPlanLaunchHint}
                  data-testid={`tasks-study-plan-${launch.kind}`}
                  className={cn(
                    'platform-pill min-h-9 px-3 py-1.5 rounded-md type-caption font-medium border-0 text-text-secondary hover:text-text-primary hover:bg-surface-hover',
                    tab === launch.tab ? 'platform-pill-active bg-surface-secondary text-text-primary' : 'bg-surface-secondary/40',
                  )}
                  onClick={() => {
                    setTab(launch.tab);
                    setSessionMode(launch.session);
                    onStartSession?.(launch.session, launch.taskIds);
                  }}
                >
                  {block.label}
                  <span className="ml-1 tabular-nums text-text-tertiary">· {block.minutes}′</span>
                </button>
                );
              })}
            </div>
          </div>
        )}

        {showAlertsTab && hubChromeTab === 'alerts' && (
          <div
            role="tabpanel"
            id="tasks-alerts-chrome-panel"
            aria-labelledby="tasks-alerts-chrome-tab"
            className="dashboard-hub-chrome-panel"
          >
            <div className="space-y-2 px-0.5 pb-1">
              {daysToExam !== null && daysToExam <= 14 && (
                <UxCallout
                  variant={daysToExam <= 3 ? 'danger' : 'warn'}
                  title={c.dangerZoneTitle}
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  testId="tasks-danger-zone"
                  className="mb-1 py-1.5 px-3 tasks-danger-zone border-0 shadow-none"
                >
                  <p className="type-caption leading-snug text-text-secondary">{c.dangerZoneBody(daysToExam)}</p>
                </UxCallout>
              )}
              {showInsightStrip && (
                <div
                  className={cn(
                    'gap-2 mb-2',
                    almostKnownPreview.length > 0 && antiPassiveAlert
                      ? 'grid grid-cols-1 sm:grid-cols-2'
                      : 'flex flex-col',
                  )}
                  data-testid="tasks-insight-strip"
                >
                  {almostKnownPreview.length > 0 && (
                    <div className="tasks-insight-card ux-banner-warn border-0 bg-accent-amber/5 p-3 space-y-1.5">
                      <p className="ux-banner-warn-accent type-caption font-semibold tracking-wide">
                        {c.almostThereTitle}
                      </p>
                      <p className="type-caption text-text-tertiary leading-snug">{c.almostThereHint}</p>
                      <ul className="space-y-1">
                        {almostKnownPreview.map((item) => (
                          <li key={item.concept} className="flex items-center justify-between gap-2 type-caption">
                            <span className="truncate font-medium text-text-primary">{item.concept}</span>
                            <span className="ux-banner-warn-accent tabular-nums font-semibold shrink-0 type-caption">{Math.round(item.mastery)}%</span>
                          </li>
                        ))}
                      </ul>
                      {onFocusWeakArea && almostKnownPreview[0] && (
                        <button
                          type="button"
                          onClick={() => onFocusWeakArea(almostKnownPreview[0].concept)}
                          className="platform-link inline-flex min-h-9 items-center gap-1 type-caption font-semibold"
                        >
                          {c.almostThereCta} <ArrowRight className="w-3 h-3" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                  {antiPassiveAlert && (
                    <div className="tasks-insight-card border-0 bg-brand-600/5 p-3 space-y-1.5">
                      <p className="type-caption font-semibold tracking-wide text-text-secondary">
                        {c.recallReminderTitle}
                      </p>
                      <p className="type-caption text-text-secondary leading-snug">{c.recallReminderBody}</p>
                      <button
                        type="button"
                        onClick={() => (onStartQuiz ? onStartQuiz() : onStartSession?.('10min'))}
                        className="platform-link inline-flex min-h-9 items-center gap-1 type-caption font-semibold"
                      >
                        {c.recallReminderCta} <ArrowRight className="w-3 h-3" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {showSrAlert && (
                <div
                  className="ux-card ux-chip-info border-0 bg-brand-600/5 type-body flex items-start gap-2 p-3"
                  data-testid="tasks-sr-banner"
                >
                  <Calendar className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <p className="flex-1 leading-snug">{c.spacedReviewBanner}</p>
                  <button
                    type="button"
                    onClick={dismissSrBanner}
                    className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                    aria-label={t('tasksSrBannerDismiss', lang)}
                    title={t('tasksSrBannerDismiss', lang)}
                  >
                    <XCircle className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
              {showMistakeAlert && (
                <div className="tasks-mistake-banner ux-card border-0 bg-accent-amber/[0.06] type-body text-text-secondary flex items-start gap-2 p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-accent-amber" aria-hidden />
                  <p className="leading-snug">{c.mistakeBanner}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OPT-K144 — no trailing Target: tabs are self-explanatory; scroll affordance was opaque */}
      <DescriptiveStickyTabBar
        items={tabs}
        activeId={tab}
        onChange={setTab}
        testIdPrefix="tasks-tab"
        panelIdPrefix="tasks-panel"
        ariaLabel={lang === 'el' ? 'Κατηγορίες εργασιών' : 'Task categories'}
      />

      {/* Today's Plan */}
      {tab === 'today' && (
        <div className="space-y-2" id="tasks-panel-today" data-testid="tasks-panel-today" role="tabpanel" aria-labelledby="tasks-tab-today">
          {todayTasks.length > 0 && layoutMode === 'board' && (
            <TasksKanbanStatusStrip
              tasks={visibleTasks}
              activeTaskId={activeTaskId}
              sessionQueueIds={sessionQueueIds}
              doneCount={doneCount}
              className="mb-3"
            />
          )}
          {todayTasks.length === 0 ? (
            <PlatformEmptyState
              title={c.emptyTitle}
              description={c.emptyDescription}
              icon={null}
              className="tasks-empty-state"
              data-testid="tasks-empty-today"
            />
          ) : (
            todayTasks.map((task, i) => {
              const isExpanded = expandedTask === task.id;
              const isInProgress = task.status === 'in-progress' || task.id === activeTaskId;
              const isRunningNow = task.id === activeTaskId && sessionActive;
              const kanbanStatus = tasksKanbanCardStatus(task, activeTaskId, sessionQueueIds);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'tasks-kanban-card ux-card flex flex-col gap-0 p-0 overflow-hidden border-0',
                    `tasks-kanban-card-${kanbanStatus}`,
                    layoutMode === 'list' && 'tasks-list-row',
                    isInProgress && 'bg-brand-600/5',
                    task.priority === 'critical' && 'bg-accent-rose/[0.06]',
                    task.priority === 'high' && !isInProgress && 'bg-accent-amber/[0.05]',
                  )}
                >
                  <div
                    className={cn('flex items-center gap-3', layoutMode === 'list' ? 'p-3' : 'p-4')}
                  >
                    {layoutMode === 'board' && (
                      <span className={cn('tasks-kanban-status-dot shrink-0', `tasks-kanban-status-${kanbanStatus}`)} aria-hidden />
                    )}
                    <button type="button" onClick={() => onComplete(task.id)} className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50" data-testid={`task-complete-${task.id}`} aria-label={c.completeTaskAria(task.title)}>
                      <Circle className="w-5 h-5 text-text-muted hover:text-text-primary" aria-hidden />
                    </button>
                    <div className="tasks-row-icon w-8 h-8 bg-brand-600/15 flex items-center justify-center shrink-0" aria-hidden>
                      <TaskActionIcon task={task} size="sm" />
                    </div>
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-inset rounded"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                    >
                      <p className="type-body font-medium text-text-primary truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 type-caption text-text-tertiary flex-wrap">
                        <span>{task.courseName}</span>
                        <span aria-hidden>·</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden />{task.estimatedMinutes} min</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {isRunningNow && (
                        <span
                          data-testid={`task-running-badge-${task.id}`}
                          className="type-caption font-semibold px-2 py-0.5 rounded-md bg-surface-secondary text-text-secondary"
                        >
                          {c.sessionRunningBadge}
                        </span>
                      )}
                      {(task.priority === 'critical' || task.priority === 'high') && (
                        /* Wave P-3 C14 — solid danger chip for HIGH PRIORITY on
                           white spectrum/warm cards (replaces translucent rose). */
                        <span
                          data-testid={`task-priority-badge-${task.id}`}
                          className="ux-chip-soft-danger type-caption font-medium px-2 py-0.5 rounded-md"
                        >
                          {c.highPriority}
                        </span>
                      )}
                      <SecondaryCTA
                        type="button"
                        size="sm"
                        onClick={() => onStartTask?.(task.id)}
                        className="tasks-row-start-cta min-h-9"
                      >
                        <Play className="w-3.5 h-3.5" aria-hidden /> {startButtonLabel(task, lang)}
                      </SecondaryCTA>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        variants={expandHeight}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={emphasizedTransition}
                        className="overflow-hidden"
                      >
                        {/* L-T02: high-priority / flashcard expand chrome */}
                        <div
                          className={cn(
                            'px-4 pb-3.5 pt-2.5 ml-11 space-y-2',
                            (task.priority === 'high' || task.priority === 'critical') && 'bg-accent-rose/5',
                          )}
                          data-testid={`task-expand-${task.id}`}
                        >
                          {(task.priority === 'high' || task.priority === 'critical') && (
                            <p className="type-micro font-medium text-text-secondary">
                              {c.highPriority}
                            </p>
                          )}
                          <p className="type-body text-text-secondary leading-relaxed">{task.description}</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => downloadTaskIcs(task)}
                              data-testid={`task-export-ics-${task.id}`}
                              aria-label={c.taskExportIcsAria(task.title)}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              {c.taskExportIcs}
                            </Button>
                          </div>
                          {isManualTask(task) && (onUpsertTask || onDeleteTask) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {onUpsertTask && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setFormOpen(true);
                                  }}
                                  data-testid={`task-edit-${task.id}`}
                                >
                                  {c.taskEdit}
                                </Button>
                              )}
                              {onDeleteTask && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingTask(task)}
                                  data-testid={`task-delete-${task.id}`}
                                >
                                  {c.taskDelete}
                                </Button>
                              )}
                            </div>
                          )}
                          {task.isSpacedRepetition && task.category === 'review' && onReviewRating && (
                            <div className="space-y-2 pt-0.5">
                              <p className="type-caption text-text-muted">{c.fsrsReviewHint}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {fsrsRatings.map(({ rating, label, color }) => (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => onReviewRating(task.id, rating)}
                                    className={cn('tasks-fsrs-rating min-h-9 px-2.5 py-1.5 rounded-md type-caption font-medium', color)}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Weak Areas */}
      {tab === 'weak' && (
        <div className="space-y-3" id="tasks-panel-weak" data-testid="tasks-panel-weak" role="tabpanel" aria-labelledby="tasks-tab-weak">
          {scopedWeak.length === 0 ? (
            <PlatformEmptyState
              title={c.weakAreasEmpty}
              description={c.emptyDescription}
              icon={null}
              className="tasks-empty-state"
            />
          ) : (
            scopedWeak.map((area) => {
              const errors = Math.round(area.errorRate * 10);
              const TrendIcon = area.mastery < 30 ? ArrowDownRight : area.mastery > 50 ? TrendingUp : Minus;
              const trendColor =
                area.mastery < 30
                  ? 'text-accent-rose'
                  : area.mastery > 50
                    ? 'text-accent-emerald'
                    : 'text-text-muted';
              const masteryColor =
                area.mastery < 30
                  ? 'text-accent-rose'
                  : area.mastery > 50
                    ? 'text-accent-emerald'
                    : 'text-text-secondary';
              return (
                <div key={area.concept} className="ux-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="type-meta font-semibold text-text-primary">{area.concept}</p>
                      <p className="type-caption text-text-tertiary mt-0.5">
                        {courseNameById[area.courseId] ?? area.courseId} · {c.recentErrors(errors)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <TrendIcon className={cn('w-4 h-4', trendColor)} aria-hidden />
                      <div>
                        <p className={cn('ux-kpi-value', masteryColor)}>{Math.round(area.mastery)}%</p>
                        <p className="type-caption text-text-tertiary">{c.masteryLabel}</p>
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-progress-track mb-3">
                    <div
                      className="dashboard-progress-fill dashboard-progress-fill--weak"
                      style={{ width: `${Math.max(area.mastery, 3)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryCTA
                      type="button"
                      size="sm"
                      onClick={() => onFocusWeakArea?.(area.concept)}
                      className="tasks-row-start-cta min-h-9"
                    >
                      <Brain className="w-3.5 h-3.5" /> {c.studyNow}
                    </SecondaryCTA>
                    {onOpenAgent && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => onOpenAgent(area.concept)} className="tasks-row-secondary">
                        <HelpCircle className="w-3.5 h-3.5" /> {c.askAi}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Due Reviews */}
      {tab === 'reviews' && (
        <div className="space-y-3" id="tasks-panel-reviews" data-testid="tasks-panel-reviews" role="tabpanel" aria-labelledby="tasks-tab-reviews">
          {(reviewTasks.length > 0 ? reviewTasks : []).map((task) => {
            const spacingMatch = spacingReviews.find((s) =>
              task.title.toLowerCase().includes(s.concept.toLowerCase())
              || s.concept.toLowerCase().includes(task.title.toLowerCase().slice(0, 24)),
            );
            const intervalDays = spacingMatch?.interval;
            return (
            <div key={task.id} className="ux-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="type-body font-medium text-text-primary">{task.title}</p>
                <p className="type-caption text-text-tertiary mt-1">{task.courseName} · {task.estimatedMinutes} min</p>
              </div>
              {typeof intervalDays === 'number' && (
                <span className="shrink-0 rounded-md border-0 bg-surface-secondary/60 px-2 py-1 type-caption font-semibold tabular-nums text-text-secondary">
                  {c.intervalLabel(`${intervalDays}d`)}
                </span>
              )}
              <SecondaryCTA
                type="button"
                size="sm"
                onClick={() => onStartTask?.(task.id)}
                className="tasks-row-start-cta min-h-9 shrink-0"
              >
                <Play className="w-3.5 h-3.5" /> {c.startReview}
              </SecondaryCTA>
            </div>
            );
          })}
          <LeitnerDueQueuePanel
            items={fsrsQueue}
            onSelect={onFocusWeakArea}
            lang={lang}
            defaultOpen={false}
            variant="card"
          />
          {reviewTasks.length === 0 && fsrsQueue.length === 0 && (
            <PlatformEmptyState
              title={c.emptyTitle}
              description={c.emptyDescription}
              icon={null}
              className="tasks-empty-state"
            />
          )}
        </div>
      )}

      {/* Retry Mistakes */}
      {tab === 'mistakes' && (
        <div className="space-y-4" id="tasks-panel-mistakes" data-testid="tasks-panel-mistakes" role="tabpanel" aria-labelledby="tasks-tab-mistakes">
          {openMistakes.length === 0 ? (
            <PlatformEmptyState
              title={c.emptyTitle}
              description={c.emptyDescription}
              icon={null}
              className="tasks-empty-state"
            />
          ) : (
            openMistakes.map((mistake) => {
              const ago = daysSince(mistake.createdAt);
              return (
                <div key={mistake.id} className="ux-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="type-meta font-semibold text-text-primary">{mistake.concept}</p>
                      <p className="type-caption text-text-tertiary">{ago <= 1 ? c.yesterday : c.daysAgo(ago)}</p>
                    </div>
                    <XCircle className="w-4 h-4 text-accent-rose shrink-0" />
                  </div>
                  {mistake.wrongAnswer && (
                    <div className="tasks-mistake-well p-3 border-0 bg-accent-rose/5">
                      <p className="type-caption font-medium text-accent-rose mb-1">{c.yourMistake}</p>
                      <p className="type-caption text-text-secondary">{mistake.wrongAnswer || mistake.questionSummary}</p>
                    </div>
                  )}
                  {mistake.correctAnswer && (
                    <div className="tasks-mistake-well p-3 border-0 bg-accent-emerald/5">
                      <p className="type-caption font-medium text-accent-emerald mb-1">{c.correctUnderstanding}</p>
                      <p className="type-caption text-text-secondary">{mistake.correctAnswer}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <SecondaryCTA
                      type="button"
                      size="sm"
                      onClick={() => onFocusWeakArea?.(mistake.concept)}
                      className="tasks-row-start-cta min-h-9"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {c.similarPractice}
                    </SecondaryCTA>
                    {onOpenAgent && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => onOpenAgent(mistake.concept)} className="tasks-row-secondary">
                        <Brain className="w-3.5 h-3.5" /> {c.deepExplanation}
                      </Button>
                    )}
                    <Button type="button" variant="secondary" size="sm" onClick={() => onResolveMistake?.(mistake.id)} className="tasks-row-secondary">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {c.markResolved}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      </div>
    </Page>
    {onUpsertTask && (
      <TaskFormDialog
        open={formOpen}
        lang={lang}
        courses={courses}
        defaultCourseId={defaultCourseId ?? focusCourseId}
        editing={editingTask}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSave={(task) => {
          onUpsertTask(task);
          setTab('today');
          setExpandedTask(task.id);
        }}
      />
    )}
    {onDeleteTask && (
      <ConfirmDialog
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) onDeleteTask(deletingTask.id);
          setDeletingTask(null);
        }}
        title={c.taskDeleteTitle}
        description={c.taskDeleteBody}
        confirmLabel={c.taskDeleteConfirm}
        cancelLabel={c.taskCancel}
        destructive
        data-testid="task-delete-confirm"
      />
    )}
    </div>
  );
}
