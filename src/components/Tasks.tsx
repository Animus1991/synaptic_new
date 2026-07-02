import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, RotateCcw,
  Shield, Calendar, ChevronDown, Play,
} from '@/lib/lucide-shim';
import type { Task, MistakeRecord } from '../types';
import type { Lang } from '../lib/i18n';
import { cn } from '../utils/cn';
import { buildStudyPlanBlocks } from '../lib/pedagogy';
import type { StudyPlanBlock } from '../lib/unifiedAdaptiveScheduler';
import type { FsrsRating } from '../lib/pedagogy';
import { filterTasksForSession, startButtonLabel, type SessionType } from '../lib/taskFlows';
import {
  getTasksContent,
  getTaskTypeLabel,
  getSessionTypes,
  taskFilterLabel,
  type TaskFilter,
} from '../lib/tasksContent';
import { TaskActionIcon } from './ui/TaskActionIcon';
import { ErrorNotebook } from './visuals/ErrorNotebook';
import { CourseIcon } from './ui/CourseIcon';
import { Page, PageHeader, PlatformSection } from './ui/primitives';
import { resolveCourseColor } from '../lib/masteryPalette';
import { PlatformEmptyState } from './ui/PlatformEmptyState';

export type { TaskFilter } from '../lib/tasksContent';

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
  studyPlan?: StudyPlanBlock[];
  focusCourseId?: string | null;
  focusCourseName?: string | null;
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
  studyPlan,
  focusCourseId = null,
  focusCourseName = null,
}: TasksProps) {
  const c = getTasksContent(lang);
  const sessionTypes = getSessionTypes(lang);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [showSessions, setShowSessions] = useState(false);
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
    setFilter(filterPreset);
    onFilterPresetConsumed?.();
  }, [filterPreset, onFilterPresetConsumed]);

  useEffect(() => {
    if (focusCourseId) setShowAllCourses(false);
  }, [focusCourseId]);

  const courseScoped = focusCourseId && !showAllCourses;
  const visibleTasks = courseScoped
    ? tasks.filter((t) => t.courseId === focusCourseId)
    : tasks;

  const studyPlanBlocks = studyPlan ?? buildStudyPlanBlocks(visibleTasks, lang);

  const filteredTasks = visibleTasks.filter(t => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'all') return true;
    return t.category === filter && t.status !== 'completed';
  });

  const pendingCount = visibleTasks.filter(t => t.status === 'pending').length;
  const completedCount = visibleTasks.filter(t => t.status === 'completed').length;
  const reviewCount = visibleTasks.filter(t => t.isSpacedRepetition && t.status === 'pending').length;
  const totalXP = visibleTasks.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.xpReward, 0);
  const dangerTasks = visibleTasks.filter(t => t.status === 'pending' && (t.priority === 'critical' || (t.type === 'prerequisite-repair')));

  const filterCounts: Record<TaskFilter, number> = {
    all: visibleTasks.length,
    learn: visibleTasks.filter(t => t.category === 'learn' && t.status !== 'completed').length,
    review: visibleTasks.filter(t => t.category === 'review' && t.status !== 'completed').length,
    practice: visibleTasks.filter(t => t.category === 'practice' && t.status !== 'completed').length,
    exam: visibleTasks.filter(t => t.category === 'exam' && t.status !== 'completed').length,
    fix: visibleTasks.filter(t => t.category === 'fix' && t.status !== 'completed').length,
    completed: completedCount,
  };

  const fsrsRatings: { rating: FsrsRating; label: string; color: string }[] = [
    { rating: 'again', label: c.fsrsAgain, color: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30' },
    { rating: 'hard', label: c.fsrsHard, color: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30' },
    { rating: 'good', label: c.fsrsGood, color: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30' },
    { rating: 'easy', label: c.fsrsEasy, color: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30' },
  ];

  return (
    <Page>
      <PageHeader
        title={c.pageTitle}
        subtitle={c.formatSubtitle(pendingCount, completedCount, totalXP)}
        icon={CheckCircle2}
        actions={
          <button onClick={() => setShowSessions(!showSessions)} className="flex items-center gap-2 px-5 py-2.5 ws-fab rounded-xl font-semibold text-sm transition-colors">
            <Play className="w-4 h-4" />
            {c.startSession}
            <ChevronDown className={cn('w-4 h-4 transition-transform', showSessions && 'rotate-180')} />
          </button>
        }
      />

      {focusCourseId && focusCourseName && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {courseScoped && (
            <span className="text-xs text-text-secondary">
              {c.courseScopeLabel(focusCourseName)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowAllCourses((v) => !v)}
            className="text-xs font-medium text-brand-700 hover:text-brand-600 underline-offset-2 hover:underline"
          >
            {courseScoped ? c.showAllCourses : c.courseScopeLabel(focusCourseName)}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showSessions && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-4">
              {sessionTypes.map(s => {
                const sessionTasks = filterTasksForSession(visibleTasks, s.type);
                return (
                <button
                  key={s.type}
                  onClick={() => { onStartSession?.(s.type); setShowSessions(false); }}
                  disabled={sessionTasks.length === 0}
                  className={cn(
                    'ws-bento p-4 transition-all text-left group',
                    sessionTasks.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-brand-500/35',
                  )}
                >
                  <s.icon className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{s.desc}</p>
                  <p className="text-xs text-brand-400 mt-2">{c.sessionTaskCount(s.minutes, sessionTasks.length)}</p>
                </button>
              );})}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {studyPlanBlocks.length > 0 && filter !== 'completed' && (
        <PlatformSection title={c.studyPlanTitle} icon={Calendar} iconClassName="text-brand-600">
          <div className="space-y-3">
            {studyPlanBlocks.map((block) => (
              <div key={block.label} className="ws-bento-soft p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-primary">{block.label}</span>
                  <span className="text-[10px] text-text-tertiary">{block.minutes} min</span>
                </div>
                <ul className="space-y-1">
                  {block.items.map((item) => (
                    <li key={item} className="text-xs text-text-secondary truncate">· {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PlatformSection>
      )}

      {openMistakes.length > 0 && filter !== 'completed' && (
        <ErrorNotebook mistakes={openMistakes} onResolve={onResolveMistake} />
      )}

      {dangerTasks.length > 0 && filter !== 'completed' && (
        <PlatformSection title={c.dangerZoneTitle} icon={Shield} tone="default" className="platform-banner-danger">
          <div className="space-y-2">
            {dangerTasks.slice(0, 3).map(task => (
              <button
                key={task.id}
                onClick={() => onStartTask?.(task.id)}
                className="w-full flex items-center gap-3 text-sm text-left hover:bg-surface-hover rounded-lg p-1.5 -m-1.5 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-accent-rose animate-pulse shrink-0" />
                <span className="flex-1 truncate text-text-primary">{task.title}</span>
                <span className="text-xs ws-chip-danger px-2 py-0.5 rounded-full">{task.estimatedMinutes}m</span>
              </button>
            ))}
          </div>
        </PlatformSection>
      )}
      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
        {reviewCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl ws-chip-warn text-sm shrink-0">
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{c.reviewsDue(reviewCount)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl ws-chip-neutral text-sm shrink-0">
          <Clock className="w-4 h-4 text-text-tertiary" />
          <span className="text-text-secondary">{c.totalMinutes(Math.round(visibleTasks.filter(t => t.status === 'pending').reduce((s, t) => s + t.estimatedMinutes, 0)))}</span>
        </div>
        {daysToExam !== null ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl ws-chip-danger text-sm shrink-0">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {daysToExam === 0 ? c.examToday : c.examInDays(daysToExam)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl ws-chip-neutral text-sm shrink-0">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="text-text-secondary">{c.noExamDate}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
        {(['all', 'learn', 'review', 'practice', 'fix', 'exam', 'completed'] as TaskFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            'platform-pill px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 flex items-center gap-1.5 border',
            filter === f ? 'platform-pill-active' : '',
          )}>
            {taskFilterLabel(f, lang)}
            {filterCounts[f] > 0 && <span className="text-[10px] opacity-60">({filterCounts[f]})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filteredTasks.map((task, i) => {
            const isExpanded = expandedTask === task.id;
            const isCompleted = task.status === 'completed';
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.03 }}
                className={cn('ws-bento transition-all', isCompleted ? 'opacity-60' : '', task.priority === 'critical' && !isCompleted && 'border-accent-rose/30')}
              >
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                  <button onClick={e => { e.stopPropagation(); if (!isCompleted) onComplete(task.id); }} className="shrink-0">
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 text-accent-emerald" /> : <Circle className="w-5 h-5 text-text-muted hover:text-brand-400 transition-colors" />}
                  </button>
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: resolveCourseColor(task.courseColor) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <CourseIcon icon={task.courseIcon} size="sm" colorClassName="text-brand-500 shrink-0" />
                      <TaskActionIcon taskType={task.type} size="xs" />
                      <span className="type-micro font-medium text-text-tertiary">{getTaskTypeLabel(task.type, lang)}</span>
                    </div>
                    <p className={cn('text-sm font-medium truncate', isCompleted && 'line-through text-text-tertiary')}>{task.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-xs text-text-tertiary">{task.estimatedMinutes}m</span>
                    <span className="text-xs text-accent-amber font-medium">+{task.xpReward}</span>
                    {task.priority === 'critical' && <span className="w-2 h-2 rounded-full bg-accent-rose animate-pulse" />}
                    <ChevronDown className={cn('w-4 h-4 text-text-muted transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 ml-8 border-t border-border-subtle pt-3">
                        <p className="text-sm text-text-secondary mb-3">{task.description}</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {task.tags.map(tag => (<span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-text-tertiary">{tag}</span>))}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-text-tertiary flex items-center gap-1"><Clock className="w-3 h-3" />{task.estimatedMinutes} min</span>
                          <span className="text-xs text-text-tertiary">{task.courseName}</span>
                          {task.isSpacedRepetition && <span className="text-xs text-accent-amber flex items-center gap-1"><RotateCcw className="w-3 h-3" />{c.spacedRepetition}</span>}
                          {task.retentionPrediction !== undefined && task.retentionPrediction < 0.8 && (
                            <span className="text-xs text-accent-rose flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{c.retention(Math.round(task.retentionPrediction * 100))}</span>
                          )}
                        </div>
                        {!isCompleted && task.isSpacedRepetition && task.category === 'review' && onReviewRating ? (
                          <div className="mt-3">
                            <p className="text-xs text-text-tertiary mb-2">{c.recallPrompt}</p>
                            <div className="flex flex-wrap gap-2">
                              {fsrsRatings.map(({ rating, label, color }) => (
                                <button
                                  key={rating}
                                  onClick={() => onReviewRating(task.id, rating)}
                                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90', color)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : !isCompleted && (
                          <button
                            onClick={() => (onStartTask ? onStartTask(task.id) : onComplete(task.id))}
                            className="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            {startButtonLabel(task, lang)}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredTasks.length === 0 && (
          <PlatformEmptyState
            title={c.emptyTitle}
            description={c.emptyDescription}
            icon={CheckCircle2}
            actionLabel={filter !== 'all' ? c.showAllTasks : undefined}
            onAction={filter !== 'all' ? () => setFilter('all') : undefined}
          />
        )}
      </div>
    </Page>
  );
}
