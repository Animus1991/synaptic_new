import { MotionSection } from './ui/MotionSection';
import {
  Flame, Lightning as Zap, Target, Clock, BookOpen, Warning as AlertTriangle,
  CaretRight as ChevronRight, TrendUp as TrendingUp, Brain, Calendar, ArrowRight, Play,
  Shield, Lightbulb, ArrowCounterClockwise as RotateCcw, Eye, SquaresFour as Layout, CheckCircle as CheckCircle2, UploadSimple as Upload, Sparkle as Sparkles,
  HandWaving as Hand,
} from '@phosphor-icons/react';
import type { Course, DashboardStats, LearnerModel, Task } from '../types';
import { cn } from '../utils/cn';
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
import { findPendingTask, findTaskForRepair, findTaskForConcept } from '../lib/taskFlows';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { workspaceLiveIsStale } from '../lib/workspaceStoreSpine';
import { nextActionLabel } from '../lib/nextActionEngine';
import type { Lang } from '../lib/i18n';
import type { DashboardNextAction } from '../lib/dashboardNextAction';
import { TaskActionIcon } from './ui/TaskActionIcon';
import { courseRingColor, resolveCourseColor, accentHighlightVar } from '../lib/masteryPalette';
import { workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';
import { greetingForTime, dashboardSubtitle } from '../lib/greeting';
import { useI18n } from '../lib/i18n';
import { Page, PageHeader, PlatformSection, PrimaryCTA } from './ui/primitives';
import { HeroGlow, UxCallout } from './ui/platformChrome';
import { PostUploadBanner } from './ui/PostUploadBanner';
import { Layout as LucideLayout } from '@/lib/lucide-shim';
import { useMemo } from 'react';
import { buildDashboardWeakSpotCards } from '../lib/dashboardWeakSpotsModel';
import { executeDashboardNextAction } from '../lib/dashboardNextAction';
import { SyllabusCoverageWidget } from './examPrep/SyllabusCoverageWidget';
import { ExamCalendarPanel } from './examPrep/ExamCalendarPanel';
import { PostExamNextStepsPanel } from './examPrep/PostExamNextStepsPanel';
import { DashboardSmartCTAStrip } from './examPrep/DashboardSmartCTAStrip';
import { ProactiveAgentAlertStrip } from './agent/ProactiveAgentAlertStrip';
import type { DashboardSmartCTA } from '../lib/examPrep/dashboardSmartCTAs';
import type { ProactiveAgentAlert } from '../lib/proactiveAgentAlerts';
import type { WorkspacePracticeLaunch } from '../lib/dashboardNextAction';
import type { WorkspaceToolId } from '../lib/taskFlows';
import { recommendToolForTopic } from '../lib/examPrep/coveragePracticeActions';

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
  workspaceBooting?: boolean;
  dashboardNextAction?: DashboardNextAction | null;
  smartCTAs?: DashboardSmartCTA[];
  onRunSmartCTA?: (cta: DashboardSmartCTA) => void;
  proactiveAgentAlerts?: ProactiveAgentAlert[];
  onRunProactiveAgentAlert?: (alert: ProactiveAgentAlert) => void;
  onOpenWorkspacePractice?: (launch: WorkspacePracticeLaunch) => void;
  lang?: Lang;
  /** Fresh upload highlight — show workspace CTA on dashboard */
  postUploadCourse?: Course | null;
  onDismissPostUpload?: () => void;
  onOpenTasksReview?: () => void;
  settingsExamDate?: string;
}

export function Dashboard({ stats, courses, tasks, learnerModel, onNavigate, onSelectCourse, onOpenWorkspace, onOpenExamTimer, onUpload, onExploreDemo, prerequisiteRepairs = [], calibration, conceptMastery = [], activities = [], masteryDelta = 0, daysToExam = null, antiPassiveAlert = false, onStartTask, onStartSession, onResolveMisconception, onFocusWeakArea, workspaceLive = null, workspaceBooting = false, dashboardNextAction = null, smartCTAs = [], onRunSmartCTA, proactiveAgentAlerts = [], onRunProactiveAgentAlert, onOpenWorkspacePractice, lang = 'en', postUploadCourse = null, onDismissPostUpload, onOpenTasksReview, settingsExamDate }: DashboardProps) {
  const { t } = useI18n();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const criticalTasks = pendingTasks.filter(t => t.priority === 'critical' || t.priority === 'high');
  const fixTasks = pendingTasks.filter(t => t.category === 'fix');
  const examTask = findPendingTask(tasks, (t) => t.type === 'exam-prep');
  const firstReviewTask = findPendingTask(tasks, (t) => t.isSpacedRepetition && t.status === 'pending');
  const showWorkspaceResume = workspaceLive && !workspaceLiveIsStale(workspaceLive);
  const isEmpty = courses.length === 0;
  const workspaceSummaryBits = showWorkspaceResume
    ? [
        workspaceLive.snapshot.courseLabel ? `${t('dashboardResumeCourseLabel')}: ${workspaceLive.snapshot.courseLabel}` : null,
        workspaceLive.snapshot.activeConcept ? `${t('dashboardResumeConceptLabel')}: ${workspaceLive.snapshot.activeConcept}` : null,
        workspaceLive.snapshot.toolLabel ? `${t('dashboardResumeToolLabel')}: ${workspaceLive.snapshot.toolLabel}` : null,
        workspaceLive.snapshot.stepLabel ? `${t('dashboardResumeStepLabel')}: ${workspaceLive.snapshot.stepLabel}` : null,
      ].filter(Boolean)
    : [];
  const weakSpotsWithReasons = useMemo(
    () => buildDashboardWeakSpotCards(learnerModel.weakAreas, lang),
    [learnerModel.weakAreas, lang],
  );

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
      <div className="p-4 sm:p-6 lg:px-8 pb-24 lg:pb-6 w-full min-w-0 flex items-start justify-center pt-8 sm:pt-16">
        <MotionSection initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
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

  return (
    <HeroGlow>
    <Page className="ux-fade-up">
      <PageHeader
        eyebrow={t('dashboardEyebrow')}
        title={
          <>
            <span className="sr-only">{t('dashboardSrPrefix')}</span>
            {greetingForTime(lang)}!
            <Hand className="inline-block w-7 h-7 text-brand-600 shrink-0 ml-2 align-middle" aria-hidden />
          </>
        }
        subtitle={dashboardSubtitle(lang, criticalTasks.length, stats.streak)}
        actions={
          <>
            {onOpenWorkspace && (
              <button
                type="button"
                onClick={onOpenWorkspace}
                aria-busy={workspaceBooting}
                data-tour="dashboard-workspace-cta"
                {...workspaceEntryPrefetchHandlers()}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 border border-brand-500/40 text-brand-700 rounded-xl font-medium text-sm hover:bg-brand-600/10 transition-all whitespace-nowrap',
                  workspaceBooting && 'opacity-70',
                )}
              >
                <Layout className="w-4 h-4" /> {t('navStudyWorkspace')}
              </button>
            )}
            <PrimaryCTA onClick={() => onStartSession?.('25min') ?? onNavigate('tasks')} className="whitespace-nowrap bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 font-medium">
              <Play className="w-4 h-4" /> {t('startSession')}
            </PrimaryCTA>
          </>
        }
      />

      <MotionSection initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-xl border border-border-subtle bg-surface-card/50 px-4 py-3">
          <p className="text-sm text-text-secondary">{t('dashboardWorkspaceEntryHint')}</p>
        </div>
      </MotionSection>

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

      {/* Stats Row */}
      <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={<Flame className="w-5 h-5 text-accent-amber" />} label={t('dashboardStatStreak')} value={t('dashboardStatDaysSuffix').replace('{count}', String(stats.streak))} />
        <StatCard icon={<Zap className="w-5 h-5 text-brand-400" />} label={t('dashboardStatTodayXp')} value={`${stats.todayXP}`} />
        <StatCard
          icon={<Target className="w-5 h-5 text-accent-teal" />}
          label={t('dashboardStatReviewsDue')}
          value={`${stats.reviewsDue}`}
          onClick={stats.reviewsDue > 0 ? () => (onOpenTasksReview ? onOpenTasksReview() : onNavigate('tasks')) : undefined}
          data-testid="dashboard-stat-reviews-due"
        />
        <StatCard icon={<Brain className="w-5 h-5 text-accent-cyan" />} label={t('dashboardStatConceptsMastered')} value={`${stats.conceptsMastered}/${stats.totalConcepts}`} />
        <StatCard icon={<Clock className="w-5 h-5 text-accent-emerald" />} label={t('dashboardStatStudyToday')} value={t('dashboardStatStudyMinutes').replace('{count}', String(stats.studyTimeToday))} />
      </MotionSection>

      {!isEmpty && smartCTAs.length > 0 && onRunSmartCTA && (
        <DashboardSmartCTAStrip ctas={smartCTAs} onRun={onRunSmartCTA} />
      )}

      {!isEmpty && proactiveAgentAlerts.length > 0 && onRunProactiveAgentAlert && (
        <ProactiveAgentAlertStrip alerts={proactiveAgentAlerts} onRun={onRunProactiveAgentAlert} />
      )}

      {!isEmpty && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <SyllabusCoverageWidget
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
        </MotionSection>
      )}

      {!isEmpty && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ExamCalendarPanel />
          <PostExamNextStepsPanel examDate={settingsExamDate ?? courses.find((c) => c.examDate)?.examDate} />
        </MotionSection>
      )}

      {/* Exam countdown */}
      {daysToExam !== null && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <UxCallout
            variant="danger"
            title="Exam Countdown"
            icon={<Calendar className="text-accent-amber" />}
            testId="dashboard-exam-countdown"
            action={
              <button
                type="button"
                onClick={() => (examTask ? onStartTask?.(examTask.id) : onOpenExamTimer?.() ?? onOpenWorkspace?.())}
                className="platform-link text-xs flex items-center gap-1 shrink-0"
              >
                {examTask ? 'Start exam prep' : 'Exam prep'} <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {daysToExam === 0 ? 'Exam is today — good luck!' : `${daysToExam} day${daysToExam === 1 ? '' : 's'} until your exam`}
          </UxCallout>
        </MotionSection>
      )}

      {/* Anti-passive learning alert */}
      {(antiPassiveAlert || stats.antiPassiveAlert) && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="platform-banner-warn p-4 rounded-2xl border flex items-start gap-3">
          <Eye className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
          <div>
            <p className="platform-banner-title text-sm font-semibold">Active Recall Reminder</p>
            <p className="text-xs text-text-secondary mt-0.5">You've been reading for a while without answering questions. Let's test what you remember!</p>
            <button
              onClick={() => (firstReviewTask ? onStartTask?.(firstReviewTask.id) : onNavigate('tasks'))}
              className="mt-2 platform-link text-xs flex items-center gap-1"
            >
              Take a quick quiz <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </MotionSection>
      )}

      {showWorkspaceResume && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-tour="dashboard-resume">
          <PlatformSection
            tone="brand"
            title={t('dashboardResumeTitle')}
            icon={LucideLayout}
            iconClassName="text-brand-600"
            action={
              <button
                type="button"
                onClick={() => onOpenWorkspace?.()}
                data-testid="dashboard-resume-workspace"
                {...workspaceEntryPrefetchHandlers()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-700 text-white hover:bg-brand-800 transition-all shrink-0"
              >
                {t('dashboardResumeOpenWorkspace')} <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <p className="text-xs text-text-secondary mb-3">{t('dashboardResumeSubtitle')}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {workspaceLive.snapshot.toolLabel && (
                <span className="ws-chip-brand rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  {workspaceLive.snapshot.toolLabel}
                </span>
              )}
              {workspaceLive.snapshot.activeConcept && (
                <span className="ws-chip-neutral rounded-full px-2 py-0.5 text-[10px] font-semibold truncate max-w-[12rem]">
                  {workspaceLive.snapshot.activeConcept}
                </span>
              )}
            </div>
            {workspaceSummaryBits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {workspaceSummaryBits.map((bit) => (
                  <span key={bit} className="ws-chip-neutral rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    {bit}
                  </span>
                ))}
              </div>
            )}
            {workspaceLive.nextAction && (
              <p className="text-xs text-text-tertiary mt-2 line-clamp-2">
                {t('dashboardNextColon')}{' '}
                <span className="text-brand-700 font-medium">
                  {nextActionLabel(workspaceLive.nextAction.primary, lang)}
                </span>
                {' — '}{workspaceLive.nextAction.reason}
              </p>
            )}
          </PlatformSection>
        </MotionSection>
      )}

      {!showWorkspaceResume && dashboardNextAction && (
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <UxCallout
            variant="next-action"
            title={t('dashboardSuggestedNext')}
            icon={<Lightbulb />}
            testId="dashboard-next-action"
            action={
              <button
                type="button"
                onClick={handleDashboardNextAction}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium ws-empty-cta-secondary shrink-0"
              >
                {dashboardNextAction.label} <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <p className="text-[11px] text-text-tertiary">{t('dashboardSuggestedNextSubtitle')}</p>
            <p className="mt-1 text-xs line-clamp-2">{dashboardNextAction.reason}</p>
          </UxCallout>
        </MotionSection>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">

          {/* Readiness Hero */}
          <div className="ws-bento p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ReadinessRing value={learnerModel.overallMastery} sublabel="Derived from graded first-attempts only — never from self-reported skill." />
              <div className="flex-1 space-y-4">
                <SignalBars signals={[
                  { label: 'Accuracy', value: Math.round(learnerModel.retentionRate * 100), icon: 'target', color: 'var(--palette-green)', detail: 'Correct first-attempt rate' },
                  { label: 'Self-Reliance', value: Math.round((1 - learnerModel.helpSeekingRate) * 100), icon: 'strength', color: 'var(--color-brand-600)', detail: 'Solved without hints' },
                  { label: 'Practice Volume', value: Math.min(100, Math.round(learnerModel.totalSessions * 2.1)), icon: 'chart', color: 'var(--palette-teal)', detail: `${learnerModel.totalSessions} sessions completed` },
                  { label: 'Retrieval Strength', value: Math.round(learnerModel.retrievalPerformance * 100), icon: 'brain', color: 'var(--palette-amber)', detail: 'Recall without prompts' },
                ]} />
              </div>
            </div>
          </div>

          {/* Concept mastery + prerequisite repair */}
          {(conceptMastery.length > 0 || prerequisiteRepairs.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {conceptMastery.length > 0 && (
                <div className="ws-bento p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-brand-400" />Concept Mastery
                  </h3>
                  <ConceptMasteryBars concepts={conceptMastery} />
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
            </div>
          )}

          {/* Priority tasks */}
          <div className="ws-bento p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold ws-serif font-medium flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-amber" /> Priority Tasks
              </h2>
              <button onClick={() => onNavigate('tasks')} className="text-sm text-brand-400 hover:text-brand-700 flex items-center gap-1">View all <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {criticalTasks.slice(0, 5).map((task, i) => (
                <MotionSection key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }}
                  onClick={() => onStartTask?.(task.id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-all cursor-pointer group">
                  <CourseIcon icon={task.courseIcon} size="sm" colorClassName="text-brand-500 shrink-0" />
                  <TaskActionIcon task={task} size="xs" />
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: resolveCourseColor(task.courseColor) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-brand-300 transition-colors">{task.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{task.courseName} · {task.estimatedMinutes}m</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      task.priority === 'critical' ? 'bg-accent-rose/15 text-accent-rose' : 'bg-accent-amber/15 text-accent-amber'
                    )}>{task.priority}</span>
                    <span className="text-xs text-accent-amber">+{task.xpReward}</span>
                  </div>
                </MotionSection>
              ))}
              {criticalTasks.length === 0 && <p className="text-sm text-text-tertiary text-center py-6 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent-emerald" /> All caught up!</p>}
            </div>
          </div>

          {/* Needs fixing */}
          {fixTasks.length > 0 && (
            <div className="rounded-2xl border border-accent-orange/20 bg-accent-orange/5 p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Shield className="w-4 h-4 text-accent-orange" />Needs Fixing — Mistakes & Prerequisites</h3>
              <div className="space-y-2">
                {fixTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onStartTask?.(task.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-card/50 hover:bg-surface-hover cursor-pointer transition-all group"
                  >
                    <CourseIcon icon={task.courseIcon} size="sm" colorClassName="text-brand-500 shrink-0" />
                    <span className="text-sm flex-1 truncate group-hover:text-brand-300 transition-colors">{task.title}</span>
                    <span className="text-xs text-accent-orange">{task.estimatedMinutes}m</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Courses */}
          <div className="ws-bento p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold ws-serif font-medium flex items-center gap-2"><BookOpen className="w-5 h-5 text-brand-400" />Active Courses</h2>
              <button onClick={() => onNavigate('library')} className="text-sm text-brand-400 hover:text-brand-700 flex items-center gap-1">Library <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.filter(c => c.status !== 'generating').map((course, i) => (
                <MotionSection key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                  onClick={() => onSelectCourse(course)} className="p-4 rounded-xl border border-border-subtle hover:border-brand-500/30 bg-surface-primary/50 cursor-pointer transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <CourseIcon icon={course.icon} size="lg" colorClassName="text-brand-600" />
                    <MasteryRing mastery={course.mastery} size={38} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-brand-300 transition-colors">{course.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
                    <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                    <span>·</span>
                    <span>{course.conceptCount} concepts</span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${(course.completedLessons / course.totalLessons) * 100}%`, backgroundColor: resolveCourseColor(course.color) }} />
                  </div>
                </MotionSection>
              ))}
            </div>
          </div>
        </MotionSection>

        {/* Right sidebar */}
        <MotionSection initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-6">

          {/* Mastery Trend */}
          <div className="ws-bento p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-accent-emerald" />Weekly Mastery</h3>
            <div className="flex items-end gap-1.5 h-24">
              {stats.masteryTrend.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${val * 1.2}%`, backgroundColor: i === stats.masteryTrend.length - 1 ? accentHighlightVar() : 'var(--viz-track)' }} />
                  <span className="text-[9px] text-text-muted">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <span className="text-2xl font-bold">{learnerModel.overallMastery}%</span>
              <span className={cn('text-xs ml-2', masteryDelta >= 0 ? 'text-accent-emerald' : 'text-accent-rose')}>
                {masteryDelta >= 0 ? '+' : ''}{masteryDelta}% this week
              </span>
            </div>
          </div>

          {/* Weak Areas */}
          <div className="ws-bento p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-accent-rose" />Weak Areas</h3>
            <div className="space-y-3">
              {weakSpotsWithReasons.map((area) => (
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
                  className="w-full space-y-1.5 text-left hover:bg-surface-hover rounded-lg p-1 -m-1 transition-all group"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-medium group-hover:text-brand-300 transition-colors truncate">{area.concept}</span>
                    <span className="text-xs text-text-tertiary shrink-0">{area.mastery}%</span>
                  </div>
                  {area.reasons[0] && (
                    <p className="type-caption text-text-tertiary line-clamp-1">{area.reasons[0].label}</p>
                  )}
                  <div className="w-full bg-surface-hover rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-accent-rose transition-all" style={{ width: `${Math.max(area.mastery, 3)}%` }} />
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const first = learnerModel.weakAreas[0];
                if (first && onFocusWeakArea) onFocusWeakArea(first.concept);
                else onNavigate('agent');
              }}
              className="mt-4 w-full text-xs text-brand-400 hover:text-brand-700 flex items-center justify-center gap-1"
            >
              Practice weak areas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Almost Known */}
          {learnerModel.almostKnown.length > 0 && (
            <div className="rounded-2xl border border-accent-amber/20 bg-accent-amber/5 p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-accent-amber" />Almost There!</h3>
              <p className="text-xs text-text-tertiary mb-3">1-2 more practice sessions to master:</p>
              <div className="space-y-2">
                {learnerModel.almostKnown.map(a => (
                  <div key={a.concept} className="flex items-center justify-between">
                    <span className="text-xs font-medium">{a.concept}</span>
                    <span className="text-xs text-accent-amber">{a.mastery}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Exam */}
          {courses.some(c => c.examDate) && (
            <div className="rounded-2xl border border-accent-rose/20 bg-accent-rose/5 p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-accent-rose" />Upcoming Exam</h3>
              {courses.filter(c => c.examDate).map(course => {
                const daysLeft = Math.max(0, Math.ceil((new Date(course.examDate!).getTime() - Date.now()) / 86400000));
                return (
                  <div key={course.id}>
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{daysLeft} days left · Mastery: {course.mastery}%</p>
                    <div className="mt-2 w-full bg-surface-hover rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-accent-rose transition-all" style={{ width: `${course.mastery}%` }} />
                    </div>
                    {course.mastery < 70 && daysLeft < 30 && (
                      <p className="text-[10px] text-accent-rose mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Below recommended mastery for exam</p>
                    )}
                    {examTask && (
                      <button
                        onClick={() => onStartTask?.(examTask.id)}
                        className="mt-3 w-full py-2 rounded-lg text-xs font-medium bg-accent-rose/15 text-accent-rose hover:bg-accent-rose/25 transition-all"
                      >
                        Start exam simulation
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
          <div className="ws-bento p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-accent-amber" />Confidence Check</h3>
            <p className="text-xs text-text-tertiary mb-2">Complete 5+ graded attempts to unlock calibration score.</p>
          </div>
          )}
          {calibration && (
          <div className="ws-bento p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-accent-amber" />Recent Calibration</h3>
            {learnerModel.confidenceCalibration.slice(0, 3).map((p, i) => {
              const overconfident = p.predicted > p.actual + 0.15;
              return (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-text-secondary w-16 truncate">{p.concept}</span>
                  <div className="flex-1 h-1.5 bg-surface-hover rounded-full relative">
                    <div className="absolute h-1.5 rounded-full bg-brand-400" style={{ width: `${p.predicted * 100}%` }} />
                    <div className="absolute h-1.5 rounded-full bg-accent-emerald/60" style={{ width: `${p.actual * 100}%` }} />
                  </div>
                  {overconfident && <span className="text-[9px] text-accent-rose">⚠</span>}
                </div>
              );
            })}
            <button onClick={() => onNavigate('analytics')} className="mt-2 w-full text-xs text-brand-400 hover:text-brand-700 flex items-center justify-center gap-1">
              Full analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          )}

          {/* Learning Insight */}
          {learnerModel.interactionInsights.length > 0 && (
            <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-brand-400" />Learning Insight</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{learnerModel.interactionInsights[0]}</p>
            </div>
          )}

          {/* Misconceptions */}
          {learnerModel.misconceptions.length > 0 && (
            <div className="ws-bento p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-accent-orange" />Active Misconceptions</h3>
              <div className="space-y-2">
                {learnerModel.misconceptions.filter(m => !m.corrected).slice(0, 2).map(m => (
                  <div key={m.id} className="p-2.5 rounded-lg bg-accent-orange/5 border border-accent-orange/20 text-xs">
                    <p className="font-medium text-accent-orange">{m.concept}</p>
                    <p className="text-text-secondary mt-0.5">{m.description}</p>
                    {onResolveMisconception && (
                      <button
                        onClick={() => onResolveMisconception(m.id)}
                        className="mt-2 platform-link text-[10px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark as corrected
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spaced Rep Info */}
          <div className="ws-bento p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><RotateCcw className="w-4 h-4 text-accent-teal" />Spaced Repetition</h3>
            <p className="text-xs text-text-tertiary">Reviews are scheduled based on your personal forgetting curve — not fixed intervals.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <button
                type="button"
                onClick={() => (firstReviewTask ? onStartTask?.(firstReviewTask.id) : onNavigate('tasks'))}
                className="p-2 rounded-lg bg-surface-primary/50 hover:bg-surface-hover transition-all"
              >
                <p className="text-lg font-bold text-accent-teal">{stats.reviewsDue}</p>
                <p className="text-[9px] text-text-muted">Due today</p>
              </button>
              <div className="p-2 rounded-lg bg-surface-primary/50"><p className="text-lg font-bold">{Math.round(learnerModel.retentionRate * 100)}%</p><p className="text-[9px] text-text-muted">Retention</p></div>
              <div className="p-2 rounded-lg bg-surface-primary/50"><p className="text-lg font-bold">{learnerModel.streakDays}</p><p className="text-[9px] text-text-muted">Streak</p></div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="ws-bento p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-brand-400" />Recent Activity</h3>
            <ActivityFeed activities={activities} maxItems={5} />
          </div>
        </MotionSection>
      </div>
    </Page>
    </HeroGlow>
  );
}

function StatCard({
  icon,
  label,
  value,
  onClick,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
} & React.ComponentPropsWithoutRef<'div'>) {
  const clickable = Boolean(onClick);
  return (
    <div
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
        'p-4 rounded-xl border border-border-subtle bg-surface-card',
        clickable && 'cursor-pointer hover:border-brand-500/30 hover:bg-surface-hover transition-colors',
      )}
    >
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-text-tertiary font-medium">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
    </div>
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
