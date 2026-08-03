import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition, expandHeight } from '../lib/motion';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, RotateCcw, Calendar,
  Play, Flame, Brain, Target, Zap,
  HelpCircle, XCircle, RefreshCw, ArrowDownRight, TrendingUp, Minus, ArrowRight,
  List, LayoutGrid,
} from '@/lib/lucide-shim';
import type { Task, MistakeRecord, SkillNode, SpacingData } from '../types';
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
import { TaskActionIcon } from './ui/TaskActionIcon';
import { Page, PageHeader, PrimaryCTA } from './ui/primitives';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { HeroGlow, SectionHeader, SessionLauncherCard, UxCallout, DescriptiveStickyTabBar } from './ui/platformChrome';
import { TasksKanbanStatusStrip, tasksKanbanCardStatus } from './TasksKanbanStatusStrip';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { LeitnerDueQueuePanel } from './workspace/LeitnerDueQueuePanel';
import { buildFsrsDueQueue } from '../lib/leitnerDueQueue';
import { useWarmSandPageScope, warmSandScopeProps } from '../lib/useDocumentTheme';
import { useMinimalTheme } from '../lib/useMinimalTheme';
import { AllCapsLabel } from './ui/AllCapsLabel';

/* OPT-K98 — markup debt: decorative brand type -> ink */
export type { TaskFilter } from '../lib/tasksContent';

type CommandTab = 'today' | 'weak' | 'reviews' | 'mistakes';
type TasksLayoutMode = 'list' | 'board';

interface TasksProps {
  tasks: Task[];
  lang: Lang;
  onComplete: (taskId: string) => void;
  onReviewRating?: (taskId: string, rating: FsrsRating) => void;
  onStartTask?: (taskId: string) => void;
  onStartSession?: (session: SessionType) => void;
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
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
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
}: TasksProps) {
  const c = getTasksContent(lang);
  const isMinimal = useMinimalTheme();
  const sessionTypes = getSessionTypes(lang);
  const [tab, setTab] = useState<CommandTab>('today');
  const [sessionMode, setSessionMode] = useState<SessionType | null>(null);
  const [layoutMode, setLayoutMode] = useState<TasksLayoutMode>(() => (isMinimal ? 'list' : 'board'));
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
    { rating: 'again', label: c.fsrsAgain, color: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30' },
    { rating: 'hard', label: c.fsrsHard, color: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30' },
    { rating: 'good', label: c.fsrsGood, color: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30' },
    { rating: 'easy', label: c.fsrsEasy, color: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30' },
  ];

  const subtitle = useMemo(() => {
    const dateStr = new Date().toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const examPart = daysToExam === null
      ? ''
      : daysToExam === 0
        ? ` · ${c.examToday}`
        : ` · ${c.examInDays(daysToExam)}`;
    return `${dateStr}${examPart}`;
  }, [lang, daysToExam, c]);

  const recommendedSession = useMemo(
    () => getRecommendedSessionType({
      daysToExam,
      reviewDueCount: reviewTasks.length || fsrsQueue.length,
      weakCount: scopedWeak.length,
      openTaskCount: todayTasks.length,
    }),
    [daysToExam, reviewTasks.length, fsrsQueue.length, scopedWeak.length, todayTasks.length],
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

  return (
    <HeroGlow flush>
    <div
      {...warmSandScopeProps(warmSandPage)}
      data-testid="tasks-page"
      data-tasks-layout={layoutMode}
      className={cn('min-w-0 w-full', isMinimal && 'tasks-quiet')}
    >
    <Page className="max-w-none ux-fade-up !pt-0" gap="sm">
      <PageHeader
        title={c.pageTitle}
        subtitle={subtitle}
        icon={CheckCircle2}
        actions={
          <div className="flex items-center gap-2">
            <div
              className="tasks-layout-toggle inline-flex items-center rounded-lg border border-border-subtle p-0.5"
              role="group"
              aria-label={t('tasksViewToggleAria', lang)}
              data-testid="tasks-layout-toggle"
            >
              <button
                type="button"
                data-testid="tasks-layout-list"
                aria-pressed={layoutMode === 'list'}
                title={t('tasksViewList', lang)}
                onClick={() => setLayoutMode('list')}
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  layoutMode === 'list'
                    ? 'bg-surface-hover text-text-primary'
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
                onClick={() => setLayoutMode('board')}
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  layoutMode === 'board'
                    ? 'bg-surface-hover text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Flame className="w-4 h-4 text-accent-amber" aria-hidden />
                <span className="font-medium">{c.streakDays(streak)}</span>
              </div>
            )}
          </div>
        }
      />

      {!entryHintDismissed && (
        <div
          className="flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-secondary/50 px-3 py-2"
          data-testid="tasks-entry-hint"
        >
          <p className="flex-1 text-sm text-text-secondary leading-snug">{c.entryHint}</p>
          <button
            type="button"
            onClick={dismissEntryHint}
            className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
            aria-label={t('tasksEntryHintDismiss', lang)}
            title={t('tasksEntryHintDismiss', lang)}
          >
            <XCircle className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {focusCourseId && focusCourseName && (
        <div className="flex flex-wrap items-center gap-2">
          {courseScoped && <span className="text-xs text-text-secondary">{c.courseScopeLabel(focusCourseName)}</span>}
          <button
            type="button"
            onClick={() => setShowAllCourses((v) => !v)}
            className="text-xs font-medium text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
          >
            {courseScoped ? c.showAllCourses : c.courseScopeLabel(focusCourseName)}
          </button>
        </div>
      )}

      {/* Daily progress */}
      <BlueprintSurface hint className="p-3" data-testid="tasks-daily-goal">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">{c.tasksComplete(doneCount, totalCount)}</p>
            <p className="text-xs text-text-tertiary">{c.totalMinutes(totalMin)} · {c.minRemaining(remainingMin)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-text-primary">{progressPct}%</p>
            <p className="text-[11px] font-medium tracking-wide text-text-tertiary">{c.dailyGoal}</p>
          </div>
        </div>
        <div className="ux-progress-track h-2.5" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={c.dailyGoal}>
          <div className="ux-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </BlueprintSurface>

      {sessionActive && activeSessionType && (
        <div
          className="ux-card ux-chip-info border-brand-500/25 p-3 space-y-1.5"
          data-testid="tasks-session-status"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-semibold text-text-secondary">
            {c.sessionActiveBanner(sessionLabel(activeSessionType), sessionCurrentIndex, sessionTotal)}
          </p>
          {activeTask && (
            <p className="text-sm text-text-primary truncate">
              <span className="text-[10px] uppercase tracking-wide text-text-secondary mr-2"><AllCapsLabel>{c.sessionRunningNow}</AllCapsLabel></span>
              {activeTask.title}
            </p>
          )}
          {nextQueuedTask && nextQueuedTask.id !== activeTaskId && (
            <p className="text-xs text-text-tertiary truncate">{c.sessionUpNext(nextQueuedTask.title)}</p>
          )}
          <p className="text-[10px] text-text-muted">{c.sessionAutoAdvanceHint}</p>
        </div>
      )}

      {/* Session launchers — quieter under Minimal (OPT-R15); Wave I-T01 order kept */}
      <div id="tasks-session-launchers" data-testid="tasks-session-launchers">
        <CollapsibleChromeSection title={t('chromeSessions', lang)} data-testid="tasks-sessions-chrome">
          <div className="space-y-2 pb-1">
            <SectionHeader
              eyebrow={c.sessionSectionEyebrow}
              title={c.sessionSectionTitle}
              subtitle={c.sessionSectionSubtitle}
            />
            {/* Merged Create Plan + recommended start — one primary path; cards remain alternate modes */}
            <PrimaryCTA
              type="button"
              data-testid="tasks-create-plan"
              size="sm"
              disabled={!canStartRecommended}
              onClick={() => {
                setTab('today');
                setSessionMode(recommendedSession);
                onStartSession?.(recommendedSession);
              }}
              className="tasks-create-plan-cta w-full font-semibold"
            >
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {c.createPlanCta}
            </PrimaryCTA>
            <p className="text-[11px] text-text-muted text-center sm:text-left -mt-0.5">{c.createPlanHint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
              {orderedSessionTypes.map((s) => {
                const sessionTasks = filterTasksForSession(visibleTasks, s.type);
                const Icon = s.icon;
                const isRecommended = recommendedSession === s.type;
                return (
                  <SessionLauncherCard
                    key={s.type}
                    testId={`session-launcher-${s.type}`}
                    label={s.label}
                    desc={s.desc}
                    durationTag={c.sessionDurationTag(s.minutes)}
                    taskHint={sessionTasks.length > 0 ? c.sessionTaskCount(s.minutes, sessionTasks.length) : undefined}
                    icon={Icon}
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
        </CollapsibleChromeSection>
      </div>

      {studyPlan.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="tasks-study-plan-blocks">
          <span className="text-xs font-semibold text-text-secondary self-center">{c.studyPlanTitle}</span>
          {studyPlan.map((block) => (
            <button
              key={block.label}
              type="button"
              className="rounded-lg border border-border-subtle bg-surface-secondary/50 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              onClick={() => {
                const label = block.label.toLowerCase();
                if (label.includes('mistake') || label.includes('λάθ')) setTab('mistakes');
                else if (label.includes('review') || label.includes('επαναλ')) setTab('reviews');
                else if (label.includes('weak') || label.includes('αδύναμ')) setTab('weak');
                else setTab('today');
              }}
            >
              {block.label}
              <span className="ml-1 tabular-nums text-text-tertiary">· {block.minutes}′</span>
            </button>
          ))}
        </div>
      )}

      <DescriptiveStickyTabBar
        items={tabs}
        activeId={tab}
        onChange={setTab}
        testIdPrefix="tasks-tab"
        panelIdPrefix="tasks-panel"
        ariaLabel={lang === 'el' ? 'Κατηγορίες εργασιών' : 'Task categories'}
        trailing={
          <button
            type="button"
            data-testid="tasks-tab-filter"
            className="rounded-xl border border-border-subtle bg-surface-card/70 p-2.5 text-text-secondary transition-colors hover:border-brand-500/30 hover:bg-surface-hover hover:text-text-primary"
            aria-label={t('tasksTabFilterAria', lang)}
            title={t('tasksTabFilterAria', lang)}
            onClick={() => {
              document.getElementById('tasks-session-launchers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <Target className="w-4 h-4" aria-hidden />
          </button>
        }
      />

      {/* Today's Plan */}
      {tab === 'today' && (
        <div className="space-y-2" id="tasks-panel-today" data-testid="tasks-panel-today" role="tabpanel" aria-labelledby="tasks-tab-today">
          {daysToExam !== null && daysToExam <= 14 && (
            <UxCallout
              variant={daysToExam <= 3 ? 'danger' : 'warn'}
              title={c.dangerZoneTitle}
              icon={<AlertTriangle />}
              testId="tasks-danger-zone"
              className="mb-1 py-2 tasks-danger-zone"
            >
              <p className="text-sm leading-snug text-text-secondary">{c.dangerZoneBody(daysToExam)}</p>
            </UxCallout>
          )}
          {showInsightStrip && (
            /* Wave P-3 L04 — only use 2-col grid when both insight cards are
               present; a single card previously left a large empty right column. */
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
                <div className="tasks-insight-card ux-banner-warn rounded-xl border bg-accent-amber/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 ux-banner-warn-accent shrink-0" aria-hidden />
                    <p className="ux-banner-warn-accent text-xs font-semibold tracking-wide">
                      {c.almostThereTitle}
                    </p>
                  </div>
                  <p className="text-xs text-text-tertiary leading-snug">{c.almostThereHint}</p>
                  <ul className="space-y-1">
                    {almostKnownPreview.map((item) => (
                      <li key={item.concept} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-text-primary">{item.concept}</span>
                        <span className="ux-banner-warn-accent tabular-nums font-semibold shrink-0 text-[11px]">{Math.round(item.mastery)}%</span>
                      </li>
                    ))}
                  </ul>
                  {onFocusWeakArea && almostKnownPreview[0] && (
                    <button
                      type="button"
                      onClick={() => onFocusWeakArea(almostKnownPreview[0].concept)}
                      className="inline-flex items-center gap-1 min-h-8 text-xs font-semibold text-text-secondary hover:text-text-primary"
                    >
                      {c.almostThereCta} <ArrowRight className="w-3 h-3" aria-hidden />
                    </button>
                  )}
                </div>
              )}
              {antiPassiveAlert && (
                <div className="tasks-insight-card rounded-xl border border-brand-500/20 bg-brand-600/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden />
                    <p className="text-xs font-semibold tracking-wide text-text-secondary">
                      {c.recallReminderTitle}
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary leading-snug">{c.recallReminderBody}</p>
                  <button
                    type="button"
                    onClick={() => (onStartQuiz ? onStartQuiz() : onStartSession?.('10min'))}
                    className="inline-flex items-center gap-1 min-h-8 text-xs font-semibold text-text-secondary hover:text-text-primary"
                  >
                    {c.recallReminderCta} <ArrowRight className="w-3 h-3" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}
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
            <PlatformEmptyState title={c.emptyTitle} description={c.emptyDescription} icon={CheckCircle2} />
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
                    'tasks-kanban-card ux-card flex flex-col gap-0 p-0 overflow-hidden',
                    `tasks-kanban-card-${kanbanStatus}`,
                    layoutMode === 'list' && 'tasks-list-row',
                    isInProgress && 'border-brand-500/30 bg-brand-600/5',
                    task.priority === 'critical' && 'border-l-[3px] border-l-accent-rose border-accent-rose/30',
                    task.priority === 'high' && 'border-l-[3px] border-l-accent-amber',
                  )}
                >
                  <div
                    className={cn('flex items-center gap-3 cursor-pointer', layoutMode === 'list' ? 'p-3' : 'p-4')}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedTask(isExpanded ? null : task.id);
                      }
                    }}
                  >
                    {layoutMode === 'board' && (
                      <span className={cn('tasks-kanban-status-dot shrink-0', `tasks-kanban-status-${kanbanStatus}`)} aria-hidden />
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); onComplete(task.id); }} className="shrink-0 rounded-md p-0.5 hover:bg-surface-hover" data-testid={`task-complete-${task.id}`} aria-label={c.completeTaskAria(task.title)}>
                      <Circle className="w-5 h-5 text-text-muted hover:text-text-primary" />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0">
                      <TaskActionIcon task={task} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary flex-wrap">
                        <span>{task.courseName}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.estimatedMinutes} min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isRunningNow && (
                        <span
                          data-testid={`task-running-badge-${task.id}`}
                          className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[var(--color-warm-ink)] text-white"
                        >
                          <AllCapsLabel>{c.sessionRunningBadge}</AllCapsLabel>
                        </span>
                      )}
                      {(task.priority === 'critical' || task.priority === 'high') && (
                        /* Wave P-3 C14 — solid danger chip for HIGH PRIORITY on
                           white spectrum/warm cards (replaces translucent rose). */
                        <span
                          data-testid={`task-priority-badge-${task.id}`}
                          className="ux-chip-solid-danger text-[11px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-md"
                        >
                          <AllCapsLabel>{c.highPriority}</AllCapsLabel>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onStartTask?.(task.id); }}
                        className="tasks-row-start-cta flex items-center gap-1.5 px-3.5 min-h-9 rounded-lg bg-surface-secondary text-text-secondary text-[13px] font-semibold hover:bg-brand-600/20 hover:text-text-primary"
                      >
                        <Play className="w-3.5 h-3.5" /> {startButtonLabel(task, lang)}
                      </button>
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
                        className="overflow-hidden border-t border-border-subtle"
                      >
                        {/* L-T02: high-priority / flashcard expand chrome */}
                        <div
                          className={cn(
                            'px-4 pb-3.5 pt-2.5 ml-11 space-y-2',
                            (task.priority === 'high' || task.priority === 'critical') && 'bg-accent-rose/[0.04]',
                          )}
                          data-testid={`task-expand-${task.id}`}
                        >
                          {(task.priority === 'high' || task.priority === 'critical') && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-rose">
                              <AllCapsLabel>{c.highPriority}</AllCapsLabel>
                            </p>
                          )}
                          <p className="text-sm text-text-secondary leading-relaxed">{task.description}</p>
                          {task.isSpacedRepetition && task.category === 'review' && onReviewRating && (
                            <div className="space-y-2 pt-0.5">
                              <p className="text-[11px] text-text-muted">{c.fsrsReviewHint}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {fsrsRatings.map(({ rating, label, color }) => (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => onReviewRating(task.id, rating)}
                                    className={cn('tasks-fsrs-rating min-h-8 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border', color)}
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
            <PlatformEmptyState title={c.weakAreasEmpty} description={c.emptyDescription} icon={Target} />
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
                      <p className="text-sm font-semibold text-text-primary">{area.concept}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {courseNameById[area.courseId] ?? area.courseId} · {c.recentErrors(errors)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <TrendIcon className={cn('w-4 h-4', trendColor)} aria-hidden />
                      <div>
                        <p className={cn('text-lg font-bold tabular-nums', masteryColor)}>{Math.round(area.mastery)}%</p>
                        <p className="text-xs text-text-tertiary">{c.masteryLabel}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ux-progress-track mb-3 h-1.5">
                    <div className="h-full rounded-full bg-accent-rose/80" style={{ width: `${area.mastery}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onFocusWeakArea?.(area.concept)} className="tasks-row-start-cta flex items-center gap-1.5 px-3.5 min-h-9 rounded-xl bg-surface-secondary text-text-secondary text-[13px] font-semibold hover:bg-brand-600/20 hover:text-text-primary">
                      <Brain className="w-3.5 h-3.5" /> {c.studyNow}
                    </button>
                    {onOpenAgent && (
                      <button type="button" onClick={() => onOpenAgent(area.concept)} className="flex items-center gap-1.5 px-3.5 min-h-9 rounded-xl border border-border-subtle text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover">
                        <HelpCircle className="w-3.5 h-3.5" /> {c.askAi}
                      </button>
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
          {!srBannerDismissed && (reviewTasks.length > 0 || fsrsQueue.length > 0) && (
            <div
              className="ux-card ux-chip-info border-brand-500/20 text-sm flex items-start gap-2 p-3"
              data-testid="tasks-sr-banner"
            >
              <Calendar className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <p className="flex-1 leading-snug">{c.spacedReviewBanner}</p>
              <button
                type="button"
                onClick={dismissSrBanner}
                className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                aria-label={t('tasksSrBannerDismiss', lang)}
                title={t('tasksSrBannerDismiss', lang)}
              >
                <XCircle className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          {(reviewTasks.length > 0 ? reviewTasks : []).map((task) => {
            const spacingMatch = spacingReviews.find((s) =>
              task.title.toLowerCase().includes(s.concept.toLowerCase())
              || s.concept.toLowerCase().includes(task.title.toLowerCase().slice(0, 24)),
            );
            const intervalDays = spacingMatch?.interval;
            return (
            <div key={task.id} className="ux-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{task.title}</p>
                <p className="text-xs text-text-tertiary mt-1">{task.courseName} · {task.estimatedMinutes} min</p>
              </div>
              {typeof intervalDays === 'number' && (
                <span className="shrink-0 rounded-md border border-border-subtle bg-surface-secondary/60 px-2 py-1 text-[11px] font-semibold tabular-nums text-text-secondary">
                  {c.intervalLabel(`${intervalDays}d`)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onStartTask?.(task.id)}
                className="tasks-row-start-cta flex items-center gap-1.5 px-3.5 min-h-9 rounded-xl bg-surface-secondary text-text-secondary text-[13px] font-semibold shrink-0 hover:bg-brand-600/20 hover:text-text-primary"
              >
                <Play className="w-3.5 h-3.5" /> {c.startReview}
              </button>
            </div>
            );
          })}
          <LeitnerDueQueuePanel
            items={fsrsQueue}
            onSelect={onFocusWeakArea}
            lang={lang}
            defaultOpen={fsrsQueue.length > 0}
            variant="card"
          />
          {reviewTasks.length === 0 && fsrsQueue.length === 0 && (
            <PlatformEmptyState title={c.emptyTitle} description={c.emptyDescription} icon={RotateCcw} />
          )}
        </div>
      )}

      {/* Retry Mistakes */}
      {tab === 'mistakes' && (
        <div className="space-y-4" id="tasks-panel-mistakes" data-testid="tasks-panel-mistakes" role="tabpanel" aria-labelledby="tasks-tab-mistakes">
          {openMistakes.length > 0 && (
          <div className="tasks-mistake-banner ux-card border-accent-amber/25 bg-accent-amber/[0.04] text-sm text-text-secondary flex items-start gap-2 p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-accent-amber" aria-hidden />
            <p className="leading-snug">{c.mistakeBanner}</p>
          </div>
          )}
          {openMistakes.length === 0 ? (
            <PlatformEmptyState title={c.emptyTitle} description={c.emptyDescription} icon={CheckCircle2} />
          ) : (
            openMistakes.map((mistake) => {
              const ago = daysSince(mistake.createdAt);
              return (
                <div key={mistake.id} className="ux-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{mistake.concept}</p>
                      <p className="text-xs text-text-tertiary">{ago <= 1 ? c.yesterday : c.daysAgo(ago)}</p>
                    </div>
                    <XCircle className="w-4 h-4 text-accent-rose shrink-0" />
                  </div>
                  {mistake.wrongAnswer && (
                    <div className="p-3 rounded-xl border border-accent-rose/20 bg-accent-rose/5">
                      <p className="text-xs font-medium text-accent-rose mb-1">{c.yourMistake}</p>
                      <p className="text-xs text-text-secondary">{mistake.wrongAnswer || mistake.questionSummary}</p>
                    </div>
                  )}
                  {mistake.correctAnswer && (
                    <div className="p-3 rounded-xl border border-accent-emerald/20 bg-accent-emerald/5">
                      <p className="text-xs font-medium text-accent-emerald mb-1">{c.correctUnderstanding}</p>
                      <p className="text-xs text-text-secondary">{mistake.correctAnswer}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onFocusWeakArea?.(mistake.concept)}
                      className="tasks-row-start-cta flex items-center gap-1.5 px-3.5 min-h-9 rounded-xl bg-surface-secondary text-text-secondary text-[13px] font-semibold hover:bg-brand-600/20 hover:text-text-primary"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {c.similarPractice}
                    </button>
                    {onOpenAgent && (
                      <button type="button" onClick={() => onOpenAgent(mistake.concept)} className="flex items-center gap-1.5 px-3.5 min-h-9 rounded-xl border border-border-subtle text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover">
                        <Brain className="w-3.5 h-3.5" /> {c.deepExplanation}
                      </button>
                    )}
                    <button type="button" onClick={() => onResolveMistake?.(mistake.id)} className="flex items-center gap-1.5 px-3.5 min-h-9 rounded-xl border border-border-subtle text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {c.markResolved}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Page>
    </div>
    </HeroGlow>
  );
}
