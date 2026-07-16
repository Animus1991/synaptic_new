import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, RotateCcw, Calendar,
  Play, Flame, Brain, Target,
  HelpCircle, XCircle, RefreshCw, ArrowDownRight, TrendingUp, Minus,
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
import { Page, PageHeader } from './ui/primitives';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { HeroGlow, SectionHeader, SessionLauncherCard, UxCallout, DescriptiveStickyTabBar } from './ui/platformChrome';
import { TasksKanbanStatusStrip, tasksKanbanCardStatus } from './TasksKanbanStatusStrip';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { LeitnerDueQueuePanel } from './workspace/LeitnerDueQueuePanel';
import { buildFsrsDueQueue } from '../lib/leitnerDueQueue';
import { useDocumentThemeIsLight } from '../lib/useDocumentTheme';

export type { TaskFilter } from '../lib/tasksContent';

type CommandTab = 'today' | 'weak' | 'reviews' | 'mistakes';

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
  spacingReviews?: SpacingData[];
  streak?: number;
  onFocusWeakArea?: (concept: string) => void;
  onOpenAgent?: () => void;
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
  focusCourseId = null,
  focusCourseName = null,
  weakAreas = [],
  spacingReviews = [],
  streak = 0,
  onFocusWeakArea,
  onOpenAgent,
  courseNameById = {},
  activeSessionType = null,
  sessionCurrentIndex = 0,
  sessionTotal = 0,
  sessionQueueIds = [],
  activeTaskId = null,
}: TasksProps) {
  const c = getTasksContent(lang);
  const sessionTypes = getSessionTypes(lang);
  const [tab, setTab] = useState<CommandTab>('today');
  const [sessionMode, setSessionMode] = useState<SessionType | null>(null);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [localExpanded, setLocalExpanded] = useState<string | null>(null);
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
    else if (filterPreset === 'completed') setTab('today');
    else setTab('today');
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
  const isLightTheme = useDocumentThemeIsLight();

  const tabs: { id: CommandTab; label: string; summary: string; count: number }[] = [
    { id: 'today', label: c.tabToday, summary: c.tabTodaySummary, count: todayTasks.length },
    { id: 'weak', label: c.tabWeak, summary: c.tabWeakSummary, count: scopedWeak.length },
    { id: 'reviews', label: c.tabReviews, summary: c.tabReviewsSummary, count: reviewTasks.length || fsrsQueue.length || scopedSpacing.length },
    { id: 'mistakes', label: c.tabMistakes, summary: c.tabMistakesSummary, count: openMistakes.length },
  ];

  return (
    <HeroGlow flush>
    <div
      {...(isLightTheme ? { 'data-theme': 'warm-sand' as const } : {})}
      data-testid="tasks-page"
      className="min-w-0 w-full"
    >
    <Page className="max-w-none ux-fade-up !pt-0" gap="sm">
      <PageHeader
        title={c.pageTitle}
        subtitle={subtitle}
        icon={CheckCircle2}
        actions={
          streak > 0 ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Flame className="w-4 h-4 text-accent-amber" aria-hidden />
              <span className="font-medium">{c.streakDays(streak)}</span>
            </div>
          ) : undefined
        }
      />

      <p className="text-sm text-text-secondary pb-1">{c.entryHint}</p>

      {focusCourseId && focusCourseName && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {courseScoped && <span className="text-xs text-text-secondary">{c.courseScopeLabel(focusCourseName)}</span>}
          <button
            type="button"
            onClick={() => setShowAllCourses((v) => !v)}
            className="text-xs font-medium text-brand-700 hover:text-brand-600 underline-offset-2 hover:underline"
          >
            {courseScoped ? c.showAllCourses : c.courseScopeLabel(focusCourseName)}
          </button>
        </div>
      )}

      {/* Daily progress */}
      <BlueprintSurface hint className="mb-2 p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">{c.tasksComplete(doneCount, totalCount)}</p>
            <p className="text-xs text-text-tertiary">{c.totalMinutes(totalMin)} · {c.minRemaining(remainingMin)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-text-primary">{progressPct}%</p>
            <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{c.dailyGoal}</p>
          </div>
        </div>
        <div className="ux-progress-track h-2">
          <div className="ux-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </BlueprintSurface>

      {sessionActive && activeSessionType && (
        <div className="ux-card ux-chip-info border-brand-500/25 mb-3 p-3 space-y-1.5" data-testid="tasks-session-status">
          <p className="text-xs font-semibold text-brand-300">
            {c.sessionActiveBanner(sessionLabel(activeSessionType), sessionCurrentIndex, sessionTotal)}
          </p>
          {activeTask && (
            <p className="text-sm text-text-primary truncate">
              <span className="text-[10px] uppercase tracking-wide text-brand-400 mr-2">{c.sessionRunningNow}</span>
              {activeTask.title}
            </p>
          )}
          {nextQueuedTask && nextQueuedTask.id !== activeTaskId && (
            <p className="text-xs text-text-tertiary truncate">{c.sessionUpNext(nextQueuedTask.title)}</p>
          )}
          <p className="text-[10px] text-text-muted">{c.sessionAutoAdvanceHint}</p>
        </div>
      )}

      {/* Tabs — task list above fold; sessions collapse below */}
      <DescriptiveStickyTabBar
        items={tabs}
        activeId={tab}
        onChange={setTab}
        testIdPrefix="tasks-tab"
      />

      {/* Today's Plan */}
      {tab === 'today' && (
        <div className="space-y-2">
          {daysToExam !== null && daysToExam <= 14 && (
            <UxCallout
              variant="danger"
              title={c.dangerZoneTitle}
              icon={<AlertTriangle />}
              testId="tasks-danger-zone"
              className="mb-1 py-2.5"
            >
              <p className="text-sm">{c.dangerZoneBody(daysToExam)}</p>
            </UxCallout>
          )}
          {todayTasks.length > 0 && (
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
              const kanbanStatus = tasksKanbanCardStatus(task, activeTaskId);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'tasks-kanban-card ux-card flex flex-col gap-0 p-0 overflow-hidden',
                    `tasks-kanban-card-${kanbanStatus}`,
                    isInProgress && 'border-brand-500/30 bg-brand-600/5',
                    task.priority === 'critical' && 'border-l-[3px] border-l-accent-rose border-accent-rose/30',
                    task.priority === 'high' && 'border-l-[3px] border-l-accent-amber',
                  )}
                >
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                    <span className={cn('tasks-kanban-status-dot shrink-0', `tasks-kanban-status-${kanbanStatus}`)} aria-hidden />
                    <button type="button" onClick={(e) => { e.stopPropagation(); onComplete(task.id); }} className="shrink-0" data-testid={`task-complete-${task.id}`} aria-label={`Complete ${task.title}`}>
                      <Circle className="w-5 h-5 text-text-muted hover:text-brand-400" />
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
                        {isRunningNow && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full ux-chip-info">{c.sessionRunningNow}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.priority === 'critical' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full ux-chip-error">{c.highPriority}</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onStartTask?.(task.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600/15 text-brand-400 text-xs font-medium hover:bg-brand-600/25"
                      >
                        <Play className="w-3 h-3" /> {startButtonLabel(task, lang)}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border-subtle">
                        <div className="px-4 pb-4 pt-3 ml-11">
                          <p className="text-sm text-text-secondary mb-2">{task.description}</p>
                          {task.isSpacedRepetition && task.category === 'review' && onReviewRating && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {fsrsRatings.map(({ rating, label, color }) => (
                                <button key={rating} type="button" onClick={() => onReviewRating(task.id, rating)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', color)}>
                                  {label}
                                </button>
                              ))}
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
        <div className="space-y-3">
          {scopedWeak.length === 0 ? (
            <PlatformEmptyState title={c.weakAreasEmpty} description={c.emptyDescription} icon={Target} />
          ) : (
            scopedWeak.map((area) => {
              const errors = Math.round(area.errorRate * 10);
              const TrendIcon = area.mastery < 30 ? ArrowDownRight : area.mastery > 50 ? TrendingUp : Minus;
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
                      <TrendIcon className="w-4 h-4 text-accent-rose" />
                      <div>
                        <p className="text-lg font-bold tabular-nums text-accent-rose">{Math.round(area.mastery)}%</p>
                        <p className="text-xs text-text-tertiary">mastery</p>
                      </div>
                    </div>
                  </div>
                  <div className="ux-progress-track mb-3 h-1.5">
                    <div className="h-full rounded-full bg-accent-rose/80" style={{ width: `${area.mastery}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onFocusWeakArea?.(area.concept)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/15 text-brand-400 text-xs font-medium">
                      <Brain className="w-3 h-3" /> {c.studyNow}
                    </button>
                    {onOpenAgent && (
                      <button type="button" onClick={onOpenAgent} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle text-xs text-text-secondary hover:text-text-primary">
                        <HelpCircle className="w-3 h-3" /> {c.askAi}
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
        <div className="space-y-3">
          <div className="ux-card ux-chip-info border-brand-500/20 text-sm flex items-center gap-2 p-3">
            <Calendar className="w-4 h-4 shrink-0" />
            {c.spacedReviewBanner}
          </div>
          {(reviewTasks.length > 0 ? reviewTasks : []).map((task) => (
            <div key={task.id} className="ux-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{task.title}</p>
                <p className="text-xs text-text-tertiary mt-1">{task.courseName} · {task.estimatedMinutes} min</p>
              </div>
              <button type="button" onClick={() => onStartTask?.(task.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/15 text-brand-400 text-xs font-medium shrink-0">
                <Play className="w-3 h-3" /> {c.startReview}
              </button>
            </div>
          ))}
          <LeitnerDueQueuePanel
            items={fsrsQueue}
            onSelect={onFocusWeakArea}
            lang={lang}
            defaultOpen
            variant="card"
          />
          {reviewTasks.length === 0 && fsrsQueue.length === 0 && (
            <PlatformEmptyState title={c.emptyTitle} description={c.emptyDescription} icon={RotateCcw} />
          )}
        </div>
      )}

      {/* Retry Mistakes */}
      {tab === 'mistakes' && (
        <div className="space-y-4">
          <div className="ux-card border-accent-amber/30 bg-accent-amber/5 text-sm text-accent-amber flex items-center gap-2 p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {c.mistakeBanner}
          </div>
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
                    {onOpenAgent && (
                      <button type="button" onClick={onOpenAgent} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/15 text-brand-400 text-xs font-medium">
                        <Brain className="w-3 h-3" /> {c.deepExplanation}
                      </button>
                    )}
                    <button type="button" onClick={() => onResolveMistake?.(mistake.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle text-xs text-text-secondary hover:text-text-primary">
                      <RefreshCw className="w-3 h-3" /> {c.similarPractice}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <details
        className="ux-disclosure mt-4"
        open={todayTasks.length === 0 && !sessionActive}
        data-testid="tasks-session-launchers"
      >
        <summary className="ux-disclosure-summary">{c.sessionLaunchersToggle}</summary>
        <div className="ux-disclosure-body space-y-3">
          <SectionHeader
            eyebrow={c.sessionSectionEyebrow}
            title={c.sessionSectionTitle}
            subtitle={c.sessionSectionSubtitle}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {sessionTypes.map((s) => {
              const sessionTasks = filterTasksForSession(visibleTasks, s.type);
              const Icon = s.icon;
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
                  recommended={recommendedSession === s.type}
                  recommendedLabel={t('sessionRecommendedBadge', lang)}
                  disabled={sessionTasks.length === 0}
                  onClick={() => {
                    setSessionMode(s.type);
                    onStartSession?.(s.type);
                  }}
                />
              );
            })}
          </div>
        </div>
      </details>
    </Page>
    </div>
    </HeroGlow>
  );
}
