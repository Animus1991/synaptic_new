import { useEffect, useState, useMemo, useCallback, useRef, Suspense, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from './store/useStore';
import { applyTheme, watchSystemTheme } from './lib/theme';
import { I18nContext, t as translate, type I18nKey } from './lib/i18n';
import { getTaskConcept, getWorkspaceTool, getMistakesForTask, getExamDurationSeconds, findPendingTask } from './lib/taskFlows';
import { executeDashboardNextAction } from './lib/dashboardNextAction';
import {
  buildTaskFlowContext,
  resolveExamQuestions,
  resolvePrerequisiteCheckpoint,
  resolvePrerequisiteSteps,
  resolveReviewCards,
} from './lib/taskFlowContent';
import { AppCommandPaletteMount, useCommandPalette } from './components/CommandPalette';
import { NavAccessDenied } from './components/NavAccessDenied';
import { canAccessShellView } from './lib/navCapabilities';
import { buildShellBreadcrumb } from './lib/shellBreadcrumb';
import type { GlobalQuickActionId } from './lib/globalActionRegistry';
import { persistWorkspaceV2CanaryFromUrl, reportWorkspaceCanaryCohort } from './lib/workspaceFeatureFlags';
import type { ContentSearchHit } from './lib/globalContentSearch';
import { NotificationsPanel } from './components/NotificationsPanel';
import { NotificationToastStack } from './components/NotificationToastStack';
import { BlueprintSvgDefs } from './components/ui/BlueprintSvgDefs';
import { PlatformViewTransition } from './components/ui/PlatformViewTransition';
import { PlatformLazyOverlaySkeleton } from './components/ui/UxShimmerSkeleton';
import { MistakeRetryView } from './components/MistakeRetryView';
import { ExamPrepView } from './components/ExamPrepView';
import { PrerequisiteRepairView } from './components/PrerequisiteRepairView';
import { SessionQueueBar } from './components/SessionQueueBar';
import { Landing } from './components/Landing';
import { Onboarding } from './components/Onboarding';
import { Shell } from './components/Shell';
import { Dashboard } from './components/Dashboard';
import { Library } from './components/Library';
import { Tasks } from './components/Tasks';
import { NoteAnalysisView } from './components/NoteAnalysisView';
import { CourseView } from './components/CourseView';
import { Settings } from './components/Settings';
import { UploadModal } from './components/UploadModal';
import { AppToastBanner } from './components/AppToastBanner';
import type { AppView } from './types';
import type { FsrsRating } from './lib/pedagogy';
import { visibleCourses } from './lib/demoMode';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StudyWorkspaceLazy } from './components/workspace/StudyWorkspaceLazy';
import { NotebookShellView } from './components/NotebookShellView';
import { parseNotebookLmExport } from './lib/notebooklmImport';
import {
  buildNotebookLmExportPayload,
  exportToNotebookLm,
} from './lib/notebooklmExport';
import { prefetchWorkspaceEntry } from './lib/workspaceEntryPrefetch';
import { preloadCriticalChunks } from './lib/preloadCriticalChunks';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { ProductTour } from './components/ProductTour';
import { useProductTour } from './hooks/useProductTour';
import { isProductTourComplete } from './lib/productTour';
import { TakeBreathModal } from './components/examPrep/TakeBreathModal';
import { subscribeTakeBreathPrompt } from './lib/examPrep/takeBreathEvents';

const Agent = lazyWithRetry(() => import('./components/Agent').then((m) => ({ default: m.Agent })), 'agent');
const Analytics = lazyWithRetry(() => import('./components/Analytics').then((m) => ({ default: m.Analytics })), 'analytics');
const TeacherDashboard = lazyWithRetry(() => import('./components/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })), 'teacher');
const StudentOrgView = lazyWithRetry(() => import('./components/StudentOrgView').then((m) => ({ default: m.StudentOrgView })), 'student-org');
const LessonView = lazyWithRetry(() => import('./components/LessonView').then((m) => ({ default: m.LessonView })), 'lesson');
const PracticalLessonView = lazyWithRetry(() => import('./components/PracticalLessonView').then((m) => ({ default: m.PracticalLessonView })), 'practical-lesson');
const ReviewSessionView = lazyWithRetry(() => import('./components/ReviewSessionView').then((m) => ({ default: m.ReviewSessionView })), 'review-session');

/**
 * Wraps lazy overlay subtrees in an ErrorBoundary so a chunk-load failure
 * renders a Try-again / Reload card instead of stranding the user on a blank
 * spinner. `flow` is forwarded into the Suspense fallback testid for E2E.
 */
function LazyOverlay({
  children,
  fallback,
  flow,
  onRecover,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  flow?: string;
  onRecover?: () => void;
}) {
  const resolvedFallback = fallback !== undefined ? fallback : (
    <PlatformLazyOverlaySkeleton flow={flow} />
  );
  return (
    <ErrorBoundary overlay onRecover={onRecover}>
      <Suspense fallback={resolvedFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  const store = useAppStore();
  const { open: paletteOpen, toggle: togglePalette, close: closePalette } = useCommandPalette();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [uploadIntent, setUploadIntent] = useState<{ mode: 'new' | 'extend'; targetCourseId?: string }>({ mode: 'new' });
  const [productTourOpen, setProductTourOpen] = useState(false);
  const [takeBreathOpen, setTakeBreathOpen] = useState(false);

  const closeLessonView = () => {
    store.setActiveLessonView(false);
    store.setActiveTaskId(null);
  };

  const closePracticalView = () => {
    store.setPracticalLessonView(false);
    store.setActiveTaskId(null);
  };

  const completeActiveTask = () => {
    if (store.activeTaskId) {
      store.completeTaskAndAdvance(store.activeTaskId);
    }
  };

  const completeAgentTask = () => {
    if (store.activeTaskId) {
      store.completeTaskAndAdvance(store.activeTaskId);
    }
  };

  const closeWorkspace = () => {
    store.closeStudyWorkspace();
  };

  const openWorkspace = useCallback(() => {
    if (store.currentView === 'landing' || store.currentView === 'onboarding') {
      store.navigate('dashboard');
    }
    store.openStudyWorkspace();
  }, [store]);

  const openWorkspaceForConcept = useCallback((concept?: string) => {
    if (store.currentView === 'landing' || store.currentView === 'onboarding') {
      store.navigate('dashboard');
    }
    store.openStudyWorkspaceForConcept(concept);
  }, [store]);

  /** Course / library Continue — store marks TTI + prefetches chunk. */
  const openCourseWorkspace = useCallback((topicTitle?: string) => {
    if (topicTitle?.trim()) {
      store.openStudyWorkspaceForConcept(topicTitle.trim());
      return;
    }
    store.openStudyWorkspace();
  }, [store]);

  const openExamTimerWorkspace = useCallback(() => {
    if (store.currentView === 'landing' || store.currentView === 'onboarding') {
      store.navigate('dashboard');
    }
    store.openStudyWorkspaceForExamCountdown();
  }, [store]);

  const hasCourses = visibleCourses(store.courses, store.user.settings).length > 0;

  useEffect(() => subscribeTakeBreathPrompt(() => setTakeBreathOpen(true)), []);

  const runDashboardNextAction = useCallback(() => {
    const action = store.dashboardNextAction;
    if (!action) return;
    if (action.kind === 'review-due') {
      const firstReviewTask = findPendingTask(store.tasks, (t) => t.isSpacedRepetition && t.status === 'pending');
      if (firstReviewTask) store.startTask(firstReviewTask.id);
      else executeDashboardNextAction(action, {
        onNavigateTasks: () => store.openTasksWithFilter('review'),
        onOpenWorkspacePractice: store.openStudyWorkspaceForPractice,
      });
      return;
    }
    executeDashboardNextAction(action, {
      onStartTask: store.startTask,
      onNavigateTasks: () => store.openTasksWithFilter('review'),
      onOpenExamTimer: openExamTimerWorkspace,
      onOpenWorkspace: openWorkspace,
      onFocusWeakArea: openWorkspaceForConcept,
      onStartSession: () => store.startSession('25min'),
      onOpenWorkspacePractice: store.openStudyWorkspaceForPractice,
    });
  }, [store, openExamTimerWorkspace, openWorkspace, openWorkspaceForConcept]);

  const handleSeeDemo = useCallback(() => {
    store.closeStudyWorkspace();
    store.enableDemoContent();
    store.navigate('library');
  }, [store]);

  const handleOnboardingComplete = useCallback((
    data: Parameters<typeof store.completeOnboarding>[0] & { exploreDemoMode?: boolean },
  ) => {
    const { exploreDemoMode, ...rest } = data;
    store.completeOnboarding(rest);
    if (exploreDemoMode) {
      store.closeStudyWorkspace();
      store.enableDemoContent();
      store.navigate('library');
      return;
    }
    if (rest.role !== 'tutor' && !rest.openTeacher && !rest.skipWizard) {
      window.setTimeout(() => setProductTourOpen(true), 400);
    }
  }, [store]);

  const replayProductTour = useCallback(() => {
    setProductTourOpen(false);
    store.navigate('dashboard');
    window.setTimeout(() => setProductTourOpen(true), 100);
  }, [store]);

  const productTour = useProductTour({
    open: productTourOpen && !store.studyWorkspaceOpen,
    currentView: store.currentView,
    onNavigate: store.navigate,
    onClose: () => setProductTourOpen(false),
  });

  useEffect(() => {
    if (
      !store.user.onboardingComplete
      || store.currentView !== 'dashboard'
      || store.studyWorkspaceOpen
      || isProductTourComplete()
      || productTourOpen
    ) {
      return;
    }
    const timer = window.setTimeout(() => setProductTourOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [store.user.onboardingComplete, store.currentView, store.studyWorkspaceOpen, productTourOpen]);

  const demoDeepLinkFired = useRef(false);
  const viewDeepLinkFired = useRef(false);
  const samlDeepLinkFired = useRef(false);
  const ltiDeepLinkFired = useRef(false);
  const [samlEmailHint, setSamlEmailHint] = useState<string | null>(null);
  const [ltiLaunchHint, setLtiLaunchHint] = useState<{
    contextId: string;
    contextTitle?: string;
    email?: string;
    linkedClassId?: string;
  } | null>(null);

  const closeReviewSession = () => {
    store.setReviewSessionOpen(false);
    store.setActiveTaskId(null);
  };

  const openUploadModal = (intent?: { mode: 'new' | 'extend'; targetCourseId?: string }) => {
    setUploadIntent(intent ?? { mode: 'new' });
    store.setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    store.setShowUploadModal(false);
    setUploadIntent({ mode: 'new' });
  };

  const handleQuickAccess = useCallback((action: GlobalQuickActionId) => {
    if (action === 'note-analysis') store.openNoteAnalysis();
    else if (action === 'upload') openUploadModal();
    else if (action === 'workspace') openWorkspace();
    else {
      store.openTasksWithFilter('exam');
      store.setExamPrepOpen(true);
    }
  }, [store, openWorkspace]);

  const handleReviewRating = (rating: FsrsRating) => {
    if (store.activeTaskId) {
      store.submitReviewAndAdvance(store.activeTaskId, rating);
    } else {
      store.setReviewSessionOpen(false);
    }
  };

  const workspaceSessionKey = `${store.activeTaskId ?? store.selectedCourse?.id ?? 'free'}-${store.studyConceptOverride ?? 'default'}-${store.uploadedFiles.length}`;

  const taskConcept = store.activeTask ? getTaskConcept(store.activeTask) : undefined;
  const workspaceCourse =
    store.courses.find((c) => c.id === (store.activeTask?.courseId ?? store.selectedCourse?.id))
    ?? store.selectedCourse;
  const workspaceConcept = taskConcept
    ?? store.studyConceptOverride
    ?? workspaceCourse?.topics[0]?.title
    ?? workspaceCourse?.title
    ?? 'Introduction';
  const taskFlowCtx = useMemo(
    () => buildTaskFlowContext({
      uploadedFiles: store.uploadedFiles,
      glossaryEntries: store.glossaryEntries,
      courses: store.courses,
      courseId: store.activeTask?.courseId,
      lang: store.user.settings.language,
    }),
    [store.uploadedFiles, store.glossaryEntries, store.courses, store.activeTask?.courseId, store.user.settings.language],
  );
  const workspaceTool = store.activeTask ? getWorkspaceTool(store.activeTask) : undefined;
  const reviewCards = taskConcept ? resolveReviewCards(taskConcept, taskFlowCtx) : undefined;
  const examQuestions = taskConcept ? resolveExamQuestions(taskConcept, taskFlowCtx) : undefined;
  const examDuration = store.activeTask ? getExamDurationSeconds(store.activeTask.estimatedMinutes) : 180;
  const prerequisiteSteps = taskConcept
    ? resolvePrerequisiteSteps(taskConcept, taskFlowCtx, store.pedagogyMetrics.repairs[0]?.concept)
    : undefined;
  const prerequisiteCheckpoint = taskConcept ? resolvePrerequisiteCheckpoint(taskConcept, taskFlowCtx) : undefined;
  const prerequisiteTarget = store.pedagogyMetrics.repairs[0]?.concept;
  const taskMistakes = store.activeTask
    ? getMistakesForTask(store.activeTask, store.openMistakes)
    : [];
  const sessionCurrentIndex = store.sessionTotal > 0
    ? store.sessionTotal - store.sessionQueue.length + 1
    : 0;
  const sessionNextTaskId = store.sessionQueue.find((id) => id !== store.activeTaskId);
  const sessionNextTask = sessionNextTaskId
    ? store.tasks.find((t) => t.id === sessionNextTaskId) ?? null
    : null;

  const nextPendingTask = findPendingTask(store.tasks, () => true);
  const agentSplitActive = store.studyWorkspaceOpen && store.workspaceAgentSplit && store.currentView === 'agent';
  const courseSplitActive = Boolean(
    store.studyWorkspaceOpen && store.workspaceCourseSplit && store.currentView === 'course' && store.selectedCourse,
  );
  const embeddedSplitActive = agentSplitActive || courseSplitActive;

  const agentPanelProps = {
    messages: store.agentMessages,
    mode: store.agentMode,
    courses: store.courses,
    onSendMessage: store.addAgentMessage,
    onUpdateMessage: store.updateAgentMessage,
    onChangeMode: store.setAgentMode,
    activeTaskTitle: store.activeTask?.title,
    activeTaskConcept: taskConcept,
    xpReward: store.activeTask?.xpReward,
    onCompleteTask: store.activeTaskId ? completeAgentTask : undefined,
    settings: store.user.settings,
    uploadedFiles: store.uploadedFiles,
    onGoToSource: store.openSourceAt,
    lang: store.user.settings.language,
    draftPrompt: store.agentDraftPrompt,
    onConsumeDraftPrompt: () => store.setAgentDraftPrompt(null),
    autoSendDraft: store.agentAutoSend,
    onConsumeAutoSend: () => store.setAgentAutoSend(false),
    workspaceContext: store.agentContextForView,
    onChangeSourceMode: (sourceMode: import('./types').UserSettings['sourceMode']) => store.updateSettings({ sourceMode }),
    dashboardNextAction: store.dashboardNextAction,
    weakAreas: store.learnerModel.weakAreas,
  };

  const studyWorkspaceElement = (
    <ErrorBoundary
      overlay
      remountKey={workspaceSessionKey}
      onRecover={closeWorkspace}
      onRetry={closeWorkspace}
    >
      <StudyWorkspaceLazy
        key={workspaceSessionKey}
        bootCompact={embeddedSplitActive}
        bootLang={store.user.settings.language === 'el' ? 'el' : 'en'}
        agentSplit={embeddedSplitActive}
        onClose={closeWorkspace}
        onOpenAgent={() => store.openAgentFromWorkspace()}
        onOpenAgentWithPrompt={store.openAgentFromWorkspace}
        onWorkspaceLiveSync={store.syncWorkspaceLive}
        onComplete={completeActiveTask}
        taskTitle={store.activeTask?.title}
        courseName={store.activeTask?.courseName ?? store.selectedCourse?.title}
        quizConcept={workspaceConcept}
        xpReward={store.activeTask?.xpReward}
        initialTool={workspaceTool}
        taskId={store.activeTaskId}
        learnerModel={store.learnerModel}
        activities={store.activities}
        dashboardStats={store.dashboardStats}
        conceptBars={store.pedagogyMetrics.conceptBars}
        uploadedFiles={store.uploadedFiles}
        glossaryEntries={store.glossaryEntries}
        courses={store.courses}
        courseId={store.activeTask?.courseId ?? store.selectedCourse?.id}
        tasks={store.tasks}
        onStartTask={store.startTask}
        onQuizAttempt={(c, corr, conf, sk) => store.recordQuizAttempt(c, corr, conf, sk, store.activeTask?.courseId)}
        onLeitnerRate={(concept, rating) => store.submitLeitnerRating(concept, rating, store.activeTask?.courseId ?? store.selectedCourse?.id)}
        onLogStudyMinutes={store.logStudyMinutes}
        userSettings={store.user.settings}
        onToggleTheme={store.toggleTheme}
        onUpload={() => openUploadModal()}
        onReuploadMaterial={() => {
          const id = store.activeTask?.courseId ?? store.selectedCourse?.id;
          openUploadModal(id ? { mode: 'extend', targetCourseId: id } : undefined);
        }}
        onReprocessMaterial={() => {
          const id =
            store.activeTask?.courseId
            ?? store.selectedCourse?.id
            ?? store.uploadedFiles.find((f) => f.courseId)?.courseId;
          if (!id) return false;
          return store.reprocessCourseMaterial(id);
        }}
        onSaveCourseExtractedText={(courseId, text) => store.saveCourseExtractedText(courseId, text)}
        reprocessingMaterial={store.isReprocessing}
        sourceHighlight={store.sourceHighlight}
        openSourceAt={store.openSourceAt}
        clearSourceHighlight={store.clearSourceHighlight}
        onConceptBusDirty={store.queueConceptBusSync}
        onSessionDirty={store.queueConceptBusSync}
        workspaceFocus={store.workspaceFocus ?? undefined}
        setWorkspaceFocus={store.setWorkspaceFocus}
        workspaceOpenTool={store.workspaceOpenTool}
        onConsumeWorkspaceOpenTool={store.consumeWorkspaceOpenTool}
        workspaceOpenSimulatorTab={store.workspaceOpenSimulatorTab}
        onConsumeWorkspaceOpenSimulatorTab={store.consumeWorkspaceOpenSimulatorTab}
        renderCenterAgent={
          store.workspaceInlineAgentOpen
            ? () => (
                <div className="h-full min-h-0 flex flex-col" data-testid="workspace-inline-agent">
                  <LazyOverlay>
                    <Agent
                      {...agentPanelProps}
                      embedded
                      autoFocusInput
                      onOpenFullPage={() => store.openAgentFromWorkspace({ fullPage: true })}
                    />
                  </LazyOverlay>
                </div>
              )
            : undefined
        }
        onCloseInlineAgent={() => store.setWorkspaceInlineAgentOpen(false)}
      />
    </ErrorBoundary>
  );

  const i18nValue = useMemo(() => ({
    lang: store.user.settings.language,
    t: (key: I18nKey) => translate(key, store.user.settings.language),
  }), [store.user.settings.language]);

  const shellActiveCourse = store.selectedCourse ?? visibleCourses(store.courses, store.user.settings)[0] ?? null;

  const shellBreadcrumb = buildShellBreadcrumb({
    currentView: store.currentView,
    t: (key) => translate(key, store.user.settings.language),
    courseTitle: store.currentView === 'course' && store.selectedCourse
      ? store.selectedCourse.title
      : store.currentView === 'note-analysis' && shellActiveCourse
        ? shellActiveCourse.title
        : store.selectedCourse?.title,
    taskCourse: store.activeTask?.courseName,
    taskTitle: store.activeTask?.title,
  });

  const shellProps = {
    currentView: store.currentView,
    onNavigate: store.navigate,
    sidebarOpen: store.sidebarOpen,
    onToggleSidebar: store.setSidebarOpen,
    user: store.user,
    stats: store.dashboardStats,
    onUpload: () => openUploadModal(),
    theme: store.user.settings.theme,
    onToggleTheme: store.toggleTheme,
    onOpenSearch: () => togglePalette(),
    onOpenNotifications: () => setNotificationsOpen(true),
    notificationCount: store.notificationUnreadCount,
    breadcrumb: shellBreadcrumb,
    workspaceLive: store.workspaceLive,
    onOpenWorkspace: openWorkspace,
    studyWorkspaceOpen: store.studyWorkspaceOpen,
    onTakeBreath: () => setTakeBreathOpen(true),
    activeCourse: shellActiveCourse
      ? {
          title: shellActiveCourse.title,
          mastery: shellActiveCourse.mastery,
          daysToExam: store.dashboardExtras.daysToExam,
        }
      : null,
    onContinueCourse: () => {
      if (shellActiveCourse) store.openCourseReview(shellActiveCourse);
      openCourseWorkspace();
    },
    hasCourses: visibleCourses(store.courses, store.user.settings).length > 0,
    onQuickAccess: handleQuickAccess,
    language: (store.user.settings.language === 'el' ? 'el' : 'en') as 'en' | 'el',
    onLanguageChange: (lang: 'en' | 'el') => store.updateSettings({ language: lang }),
  };

  const handleContentSelect = (hit: ContentSearchHit) => {
    if (hit.courseId) {
      const course = store.courses.find((c) => c.id === hit.courseId);
      if (course) {
        store.openCourseReview(course);
      }
    }
    if (hit.kind === 'topic' || hit.kind === 'glossary' || hit.kind === 'note') {
      openWorkspaceForConcept(hit.concept ?? hit.label);
    }
  };

  const overlays = (
    <>
      <BlueprintSvgDefs />
      <AppCommandPaletteMount
        open={paletteOpen}
        onClose={closePalette}
        tasks={store.tasks}
        courses={store.courses}
        uploadedFiles={store.uploadedFiles}
        glossaryEntries={store.glossaryEntries}
        onNavigate={store.navigate}
        onStartTask={store.startTask}
        onStartSession={store.startSession}
        onContentSelect={handleContentSelect}
        onOpenWorkspace={openWorkspace}
        dashboardNextAction={store.dashboardNextAction}
        onDashboardNextAction={runDashboardNextAction}
        hasSelectedCourse={Boolean(store.selectedCourse)}
        onNotebookLmBridge={(id) => {
          if (id === 'import') {
            store.navigate('library');
            return;
          }
          if (id === 'shell' && store.selectedCourse) {
            store.openNotebookShell(store.selectedCourse.id);
            return;
          }
          if (id === 'export-review' && store.selectedCourse) {
            const lang = store.user.settings.language === 'el' ? 'el' : 'en';
            const payload = buildNotebookLmExportPayload('review-pack', {
              course: store.selectedCourse,
              glossary: store.glossaryEntries.filter((g) => g.courseId === store.selectedCourse!.id),
              learnerModel: store.learnerModel,
              lang,
            });
            void exportToNotebookLm(payload, lang);
          }
        }}
        user={store.user}
        onQuickAction={handleQuickAccess}
      />
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        activities={store.activities}
        lastSeenAt={store.user.settings.notificationsLastSeenAt}
        onMarkAllRead={store.markNotificationsRead}
        onNavigate={store.navigate}
        onOpenTasks={(filter) => {
          if (filter) store.openTasksWithFilter(filter);
        }}
      />
      <NotificationToastStack />
      <TakeBreathModal open={takeBreathOpen} onClose={() => setTakeBreathOpen(false)} />
      {productTourOpen && !store.studyWorkspaceOpen && (
        <ProductTour
          step={productTour.step}
          stepIndex={productTour.stepIndex}
          totalSteps={productTour.totalSteps}
          ready={productTour.ready}
          onNext={productTour.next}
          onSkip={productTour.skip}
        />
      )}
      {store.activeLessonView && (
        <LazyOverlay>
        <LessonView
          onClose={closeLessonView}
          onOpenAgent={() => { store.setActiveLessonView(false); store.navigate('agent'); }}
          onComplete={completeActiveTask}
          onQuizAttempt={(c, corr, conf, sk) => store.recordQuizAttempt(c, corr, conf, sk, store.activeTask?.courseId)}
          taskTitle={store.activeTask?.title}
          courseName={store.activeTask?.courseName}
          quizConcept={taskConcept}
          xpReward={store.activeTask?.xpReward}
          taskId={store.activeTaskId ?? undefined}
          courseId={store.activeTask?.courseId}
          settings={store.user.settings}
          overallMastery={Math.round(store.learnerModel.overallMastery)}
          streak={store.dashboardStats.streak}
          onStartNextTask={() => { if (nextPendingTask) store.startTask(nextPendingTask.id); }}
          uploadedFiles={store.uploadedFiles}
          glossaryEntries={store.glossaryEntries}
          courses={store.courses}
          onUpload={() => openUploadModal()}
        />
        </LazyOverlay>
      )}
      {store.practicalLessonView && (
        <LazyOverlay>
        <PracticalLessonView
          onClose={closePracticalView}
          onOpenAgent={() => { store.setPracticalLessonView(false); store.navigate('agent'); }}
          onComplete={completeActiveTask}
          onPracticeAttempt={(concept, correct) => store.recordQuizAttempt(concept, correct, 70, undefined, store.activeTask?.courseId)}
          taskTitle={store.activeTask?.title}
          courseName={store.activeTask?.courseName}
          quizConcept={taskConcept}
          xpReward={store.activeTask?.xpReward}
          uploadedFiles={store.uploadedFiles}
          glossaryEntries={store.glossaryEntries}
          courses={store.courses}
          courseId={store.activeTask?.courseId}
          lang={store.user.settings.language}
          onUpload={() => openUploadModal()}
        />
        </LazyOverlay>
      )}
      {store.notebookShellCourseId && store.selectedCourse && (
        <NotebookShellView
          course={store.selectedCourse}
          sources={store.uploadedFiles.filter((f) => f.courseId === store.selectedCourse!.id)}
          glossaryEntries={store.glossaryEntries.filter((g) => g.courseId === store.selectedCourse!.id)}
          learnerModel={store.learnerModel}
          lang={store.user.settings.language === 'el' ? 'el' : 'en'}
          onClose={store.closeNotebookShell}
          onOpenWorkspace={() => {
            store.closeNotebookShell();
            openCourseWorkspace();
          }}
          onOpenLibraryImport={() => {
            store.closeNotebookShell();
            store.navigate('library');
          }}
          onAddQuizToFsrs={() => {
            const source = store.uploadedFiles.find(
              (f) => f.courseId === store.selectedCourse!.id && f.extractedText?.trim(),
            );
            if (!source?.extractedText) return;
            const parsed = parseNotebookLmExport(source.extractedText);
            store.importNotebookLmQuizToFsrs(parsed, { courseId: store.selectedCourse!.id });
          }}
          onAddAudioToFsrs={(fileId) => {
            store.importNotebookLmAudioToFsrs(fileId, store.selectedCourse!.id);
          }}
        />
      )}
      {store.studyWorkspaceOpen && (
        courseSplitActive && store.selectedCourse ? (
          <div className="fixed inset-0 z-50 flex bg-surface-primary" data-testid="workspace-course-split">
            <div className="w-[58%] min-w-0 shrink-0 border-r border-border-subtle">
              {studyWorkspaceElement}
            </div>
            <div className="flex w-[42%] min-w-0 flex-col bg-surface-primary overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-3 py-2 gap-2">
                <span className="text-xs font-semibold text-brand-700 truncate">{store.selectedCourse.title}</span>
                <button
                  type="button"
                  onClick={store.exitWorkspaceCourseSplit}
                  className="type-micro font-medium text-text-secondary hover:text-brand-700 transition-colors shrink-0"
                >
                  {store.user.settings.language === 'el' ? 'Πλήρες workspace' : 'Full workspace'}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <CourseView
                  course={store.selectedCourse}
                  uploadedFiles={store.uploadedFiles.filter((f) => f.courseId === store.selectedCourse!.id)}
                  glossaryEntries={store.glossaryEntries.filter((g) => g.courseId === store.selectedCourse!.id)}
                  onGoToSource={store.openSourceAt}
                  onBack={store.exitWorkspaceCourseSplit}
                  onStartLesson={(topicTitle?: string) => openCourseWorkspace(topicTitle)}
                  onOpenAgent={() => store.navigate('agent')}
                  onUploadMore={() => openUploadModal({ mode: 'extend', targetCourseId: store.selectedCourse!.id })}
                  onReprocessMaterial={() => store.reprocessCourseMaterial(store.selectedCourse!.id)}
                  onSaveCourseExtractedText={(courseId, text) => store.saveCourseExtractedText(courseId, text)}
                  reprocessingMaterial={store.isReprocessing}
                  onRemoveFile={store.removeUploadedFile}
                  onRemoveCourse={store.removeCourse}
                  tasks={store.tasks}
                  showPostUploadBanner={store.postUploadCourseId === store.selectedCourse!.id}
                  onDismissPostUpload={store.clearPostUploadHighlight}
                  userSettings={store.user.settings}
                  onImportAudioTranscript={store.importNotebookLmAudioForCourse}
                  onUploadAudio={store.transcribeAudioForCourse}
                  onAddAudioToFsrs={store.importNotebookLmAudioToFsrs}
                  learnerModel={store.learnerModel}
                />
              </div>
            </div>
          </div>
        ) : agentSplitActive ? (
          <div className="fixed inset-0 z-50 flex bg-surface-primary" data-testid="workspace-agent-split">
            <div className="w-[58%] min-w-0 shrink-0 border-r border-border-subtle">
              {studyWorkspaceElement}
            </div>
            <div className="flex w-[42%] min-w-0 flex-col bg-surface-primary">
              <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-3 py-2">
                <span className="text-xs font-semibold text-brand-300">Synapse Agent</span>
                <button
                  type="button"
                  onClick={store.exitWorkspaceAgentSplit}
                  className="text-[10px] font-medium text-text-secondary hover:text-brand-300 transition-colors"
                >
                  {store.user.settings.language === 'el' ? 'Πλήρες workspace' : 'Full workspace'}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <LazyOverlay>
                  <Agent {...agentPanelProps} />
                </LazyOverlay>
              </div>
            </div>
          </div>
        ) : (
          studyWorkspaceElement
        )
      )}
      {store.reviewSessionOpen && (
        <LazyOverlay>
        <ReviewSessionView
          onClose={closeReviewSession}
          onOpenAgent={() => { store.setReviewSessionOpen(false); store.navigate('agent'); }}
          onReviewRating={handleReviewRating}
          taskTitle={store.activeTask?.title}
          courseName={store.activeTask?.courseName}
          quizConcept={taskConcept}
          xpReward={store.activeTask?.xpReward}
          cards={reviewCards}
        />
        </LazyOverlay>
      )}
      {store.mistakeRetryOpen && (
        <MistakeRetryView
          onClose={() => { store.setMistakeRetryOpen(false); store.setActiveTaskId(null); }}
          onOpenAgent={() => {
            if (store.activeTask) store.bindAgentToTask(store.activeTask);
            store.setMistakeRetryOpen(false);
            store.navigate('agent');
          }}
          onComplete={completeActiveTask}
          onResolveMistake={store.resolveMistake}
          mistakes={taskMistakes}
          taskTitle={store.activeTask?.title}
          courseName={store.activeTask?.courseName}
          quizConcept={taskConcept}
          xpReward={store.activeTask?.xpReward}
        />
      )}
      {store.examPrepOpen && (
        <ExamPrepView
          onClose={() => { store.setExamPrepOpen(false); store.setActiveTaskId(null); }}
          onOpenAgent={() => { store.setExamPrepOpen(false); store.navigate('agent'); }}
          onComplete={completeActiveTask}
          onQuizAttempt={(c, corr, conf) => store.recordQuizAttempt(c, corr, conf, undefined, store.activeTask?.courseId)}
          taskTitle={store.activeTask?.title}
          courseName={store.activeTask?.courseName}
          quizConcept={taskConcept}
          xpReward={store.activeTask?.xpReward}
          durationSeconds={examDuration}
          questions={examQuestions}
        />
      )}
      {store.prerequisiteRepairOpen && (
        <PrerequisiteRepairView
          onClose={() => { store.setPrerequisiteRepairOpen(false); store.setActiveTaskId(null); }}
          onOpenAgent={() => {
            if (store.activeTask) store.bindAgentToTask(store.activeTask);
            store.setPrerequisiteRepairOpen(false);
            store.navigate('agent');
          }}
          onComplete={completeActiveTask}
          onQuizAttempt={(c, corr, conf) => store.recordQuizAttempt(c, corr, conf, undefined, store.activeTask?.courseId)}
          taskTitle={store.activeTask?.title}
          courseName={store.activeTask?.courseName}
          quizConcept={taskConcept}
          targetConcept={prerequisiteTarget}
          xpReward={store.activeTask?.xpReward}
          steps={prerequisiteSteps}
          checkpoint={prerequisiteCheckpoint}
        />
      )}
      <UploadModal
        isOpen={store.showUploadModal}
        onClose={closeUploadModal}
        onUpload={() => {}}
        onProcessUpload={store.processUpload}
        onUploadComplete={(course) => {
          closeUploadModal();
          setUploadIntent({ mode: 'new' });
          store.markPostUploadCourse(course.id);
          store.openNoteAnalysis(course.id);
        }}
        onProceed={() => {
          /* Navigation handled in onUploadComplete after successful upload */
        }}
        courses={visibleCourses(store.courses, store.user.settings)}
        defaultUploadMode={uploadIntent.mode}
        defaultTargetCourseId={uploadIntent.targetCourseId}
        userSettings={store.user.settings}
      />
      <AppToastBanner toast={store.appToast} onDismiss={store.dismissAppToast} />
    </>
  );

  const sessionBar = store.activeSessionType && store.sessionTotal > 0 ? (
    <SessionQueueBar
      sessionType={store.activeSessionType}
      currentIndex={sessionCurrentIndex}
      total={store.sessionTotal}
      currentTaskTitle={store.activeTask?.title}
      nextTaskTitle={sessionNextTask?.title}
      lang={store.user.settings.language}
      onEndSession={store.endSession}
    />
  ) : null;

  useEffect(() => {
    applyTheme(store.user.settings.theme);
    if (store.user.settings.theme !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [store.user.settings.theme]);

  useEffect(() => {
    if (persistWorkspaceV2CanaryFromUrl()) reportWorkspaceCanaryCohort();
  }, []);

  /** Warm the workspace + secondary chunks after first paint to keep flows snappy. */
  useEffect(() => {
    const warm = () => {
      prefetchWorkspaceEntry();
      preloadCriticalChunks();
    };
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warm, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'success' || !store.user.settings.authToken) return;
    void store.refreshAuthPlan().finally(() => {
      window.history.replaceState({}, '', window.location.pathname);
    });
  }, [store.user.settings.authToken, store.refreshAuthPlan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') !== '1' || demoDeepLinkFired.current) return;
    demoDeepLinkFired.current = true;
    handleSeeDemo();
  }, [handleSeeDemo]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (!view || viewDeepLinkFired.current) return;
    const allowed: AppView[] = ['dashboard', 'library', 'tasks', 'agent', 'analytics', 'teacher', 'student-org', 'settings'];
    if (!allowed.includes(view as AppView)) return;
    viewDeepLinkFired.current = true;
    if (!hasCourses) store.enableDemoContent();
    if (canAccessShellView(view as AppView, store.user)) {
      store.navigate(view as AppView);
    } else {
      store.navigate('dashboard');
    }
  }, [hasCourses, store]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('saml') !== '1' || samlDeepLinkFired.current) return;
    samlDeepLinkFired.current = true;
    const email = params.get('saml_email');
    const authCode = params.get('saml_auth_code');

    void (async () => {
      if (authCode) {
        try {
          const { completeSamlAuth } = await import('./lib/orgClient');
          const session = await completeSamlAuth(authCode, store.user.settings);
          store.updateSettings({
            authToken: session.token,
            authEmail: session.email,
            authPlan: (session.plan as typeof store.user.settings.authPlan) ?? 'free',
          });
        } catch {
          /* fall back to email hint only */
        }
      }
      if (email) setSamlEmailHint(email);
      store.navigate('student-org');
      for (const key of ['saml', 'saml_email', 'saml_auth_code', 'saml_org', 'saml_provisioned', 'relay_state']) {
        params.delete(key);
      }
      const qs = params.toString();
      window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    })();
  }, [store]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lti') !== '1' || ltiDeepLinkFired.current) return;
    ltiDeepLinkFired.current = true;
    const contextId = params.get('lti_context');
    if (params.get('lti_verified') === '1' && contextId) {
      setLtiLaunchHint({
        contextId,
        contextTitle: params.get('lti_context_title') ?? undefined,
        email: params.get('lti_email') ?? undefined,
        linkedClassId: params.get('lti_linked_class') ?? undefined,
      });
      store.navigate('teacher');
    }
    for (const key of [
      'lti',
      'lti_verified',
      'lti_sub',
      'lti_email',
      'lti_role',
      'lti_context',
      'lti_context_title',
      'lti_linked_class',
      'lti_state',
      'lti_error',
    ]) {
      params.delete(key);
    }
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [store]);

  // Landing page
  if (store.currentView === 'landing') {
    return (
      <I18nContext.Provider value={i18nValue}>
        <Landing
          onGetStarted={() => store.navigate('onboarding')}
          onSeeDemo={handleSeeDemo}
        />
      </I18nContext.Provider>
    );
  }

  // Onboarding
  if (store.currentView === 'onboarding') {
    return (
      <I18nContext.Provider value={i18nValue}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </I18nContext.Provider>
    );
  }

  // Course detail view (full page — skipped when workspace+course split is active)
  if (store.currentView === 'course' && store.selectedCourse && !store.workspaceCourseSplit) {
    const selectedCourse = store.selectedCourse;
    return (
      <I18nContext.Provider value={i18nValue}>
        <Shell {...shellProps} currentView={store.currentView}>
          <CourseView
            course={selectedCourse}
            uploadedFiles={store.uploadedFiles.filter((f) => f.courseId === selectedCourse.id)}
            glossaryEntries={store.glossaryEntries.filter((g) => g.courseId === selectedCourse.id)}
            onGoToSource={store.openSourceAt}
            onBack={() => store.navigate('library')}
            onStartLesson={(topicTitle?: string) => openCourseWorkspace(topicTitle)}
            onOpenAgent={() => store.navigate('agent')}
            onUploadMore={() => openUploadModal({ mode: 'extend', targetCourseId: selectedCourse.id })}
            onReprocessMaterial={() => store.reprocessCourseMaterial(selectedCourse.id)}
            onSaveCourseExtractedText={(courseId, text) => store.saveCourseExtractedText(courseId, text)}
            reprocessingMaterial={store.isReprocessing}
            onRemoveFile={store.removeUploadedFile}
            onRemoveCourse={store.removeCourse}
            tasks={store.tasks}
            showPostUploadBanner={store.postUploadCourseId === selectedCourse.id}
            onDismissPostUpload={store.clearPostUploadHighlight}
            userSettings={store.user.settings}
            onImportAudioTranscript={store.importNotebookLmAudioForCourse}
            onUploadAudio={store.transcribeAudioForCourse}
            onAddAudioToFsrs={store.importNotebookLmAudioToFsrs}
            learnerModel={store.learnerModel}
          />
        </Shell>
        {overlays}
      </I18nContext.Provider>
    );
  }

  // Main app views
  return (
    <I18nContext.Provider value={i18nValue}>
      <Shell {...shellProps}>
        {sessionBar}
        <AnimatePresence mode="wait">
        <PlatformViewTransition viewKey={store.currentView}>
          {store.currentView === 'dashboard' && (
            <Dashboard
              stats={store.dashboardStats}
              courses={store.courses}
              tasks={store.tasks}
              learnerModel={store.learnerModel}
              prerequisiteRepairs={store.pedagogyMetrics.repairs}
              calibration={store.pedagogyMetrics.calibration}
              conceptMastery={store.pedagogyMetrics.conceptBars}
              activities={store.activities}
              masteryDelta={store.dashboardExtras.masteryDelta}
              daysToExam={store.dashboardExtras.daysToExam}
              antiPassiveAlert={store.dashboardExtras.antiPassive}
              onStartTask={store.startTask}
              onStartSession={store.startSession}
              onResolveMisconception={store.resolveMisconception}
              onNavigate={(view: AppView) => store.navigate(view)}
              onSelectCourse={(course) => store.openCourseReview(course)}
              onOpenWorkspace={openWorkspace}
              onOpenExamTimer={openExamTimerWorkspace}
              onFocusWeakArea={openWorkspaceForConcept}
              onUpload={() => openUploadModal()}
              onExploreDemo={!hasCourses ? handleSeeDemo : undefined}
              workspaceLive={store.workspaceLive}
              dashboardNextAction={store.dashboardNextAction}
              smartCTAs={store.dashboardSmartCTAs}
              onRunSmartCTA={store.runDashboardSmartCTA}
              proactiveAgentAlerts={store.proactiveAgentAlerts}
              onRunProactiveAgentAlert={store.runProactiveAgentAlert}
              onOpenWorkspacePractice={store.openStudyWorkspaceForPractice}
              lang={store.user.settings.language}
              theoryVsPractice={store.user.settings.theoryVsPractice}
              postUploadCourse={
                store.postUploadCourseId
                  ? store.courses.find((c) => c.id === store.postUploadCourseId) ?? null
                  : null
              }
              onDismissPostUpload={store.clearPostUploadHighlight}
              onOpenTasksReview={() => store.openTasksWithFilter('review')}
              settingsExamDate={store.user.settings.examDate}
            />
          )}
          {store.currentView === 'library' && (
            <Library
              courses={visibleCourses(store.courses, store.user.settings)}
              uploadedFiles={store.uploadedFiles}
              onSelectCourse={(course) => store.openCourseReview(course)}
              onRemoveCourse={store.removeCourse}
              onUpload={() => openUploadModal()}
              onRemoveFile={store.removeUploadedFile}
              onReprocessCourse={store.reprocessCourseMaterial}
              reprocessingMaterial={store.isReprocessing}
              userSettings={store.user.settings}
              tasks={store.tasks}
              glossaryEntries={store.glossaryEntries}
              postUploadCourseId={store.postUploadCourseId}
              onOpenWorkspace={openCourseWorkspace}
              onDismissPostUpload={store.clearPostUploadHighlight}
              onImportNotebookLm={store.importNotebookLm}
              onAddNotebookLmToFsrs={store.importNotebookLmQuizToFsrs}
              onOpenNotebookShell={store.openNotebookShell}
              onOpenConcept={openWorkspaceForConcept}
            />
          )}
          {store.currentView === 'note-analysis' && (() => {
            const analysisCourse = store.noteAnalysisCourseId
              ? store.courses.find((c) => c.id === store.noteAnalysisCourseId) ?? shellActiveCourse
              : shellActiveCourse;
            if (!analysisCourse) return null;
            return (
              <NoteAnalysisView
                course={analysisCourse}
                files={store.uploadedFiles.filter((f) => f.courseId === analysisCourse.id)}
                lang={store.user.settings.language}
                onBack={store.closeNoteAnalysis}
                onOpenCourse={() => store.openCourseReview(analysisCourse)}
                onOpenWorkspace={() => {
                  store.openCourseReview(analysisCourse);
                  openCourseWorkspace();
                }}
              />
            );
          })()}
          {store.currentView === 'tasks' && (
            <Tasks
              tasks={store.tasks}
              lang={store.user.settings.language}
              focusCourseId={store.selectedCourse?.id}
              focusCourseName={store.selectedCourse?.title}
              onComplete={store.completeTask}
              onReviewRating={store.submitReviewRating}
              onStartTask={store.startTask}
              onStartSession={store.startSession}
              daysToExam={store.dashboardExtras.daysToExam}
              expandedTaskId={store.expandedTaskId}
              onExpandedTaskChange={store.setExpandedTaskId}
              openMistakes={store.pedagogyMetrics.openMistakes}
              onResolveMistake={store.resolveMistake}
              filterPreset={store.tasksFilterPreset}
              onFilterPresetConsumed={store.clearTasksFilterPreset}
              studyPlan={store.dailyPlan.studyPlanBlocks}
              weakAreas={store.learnerModel.weakAreas}
              spacingReviews={store.learnerModel.spacingIntervals}
              streak={store.dashboardStats.streak}
              onFocusWeakArea={openWorkspaceForConcept}
              onOpenAgent={() => store.navigate('agent')}
              courseNameById={Object.fromEntries(store.courses.map((c) => [c.id, c.title]))}
              activeSessionType={store.activeSessionType}
              sessionCurrentIndex={sessionCurrentIndex}
              sessionTotal={store.sessionTotal}
              sessionQueueIds={store.sessionQueue}
              activeTaskId={store.activeTaskId}
            />
          )}
          {store.currentView === 'agent' && !agentSplitActive && (
            <LazyOverlay>
            <Agent {...agentPanelProps} />
            </LazyOverlay>
          )}
          {store.currentView === 'analytics' && (
            <LazyOverlay>
            <Analytics
              learnerModel={store.learnerModel}
              stats={store.dashboardStats}
              courses={store.courses}
              activities={store.activities}
              prerequisiteRepairs={store.pedagogyMetrics.repairs}
              daysToExam={store.dashboardExtras.daysToExam}
            />
            </LazyOverlay>
          )}
          {store.currentView === 'teacher' && (
            canAccessShellView('teacher', store.user) ? (
            <LazyOverlay>
            <TeacherDashboard
              settings={store.user.settings}
              lang={store.user.settings.language}
              localCourses={store.courses}
              activities={store.activities}
              learnerModel={store.learnerModel}
              ltiLaunchHint={ltiLaunchHint}
              onOpenCourse={(id) => {
                const course = store.courses.find((c) => c.id === id);
                if (course) store.openCourseReview(course);
              }}
              onOpenSettings={() => store.navigate('settings')}
            />
            </LazyOverlay>
            ) : (
              <NavAccessDenied
                onGoDashboard={() => store.navigate('dashboard')}
                onOpenSettings={() => store.navigate('settings')}
              />
            )
          )}
          {store.currentView === 'student-org' && (
            canAccessShellView('student-org', store.user) ? (
            <LazyOverlay>
            <StudentOrgView
              settings={store.user.settings}
              lang={store.user.settings.language}
              samlEmailHint={samlEmailHint}
              onOpenCourse={(id) => {
                const course = store.courses.find((c) => c.id === id);
                if (course) store.openCourseReview(course);
              }}
              onOpenSettings={() => store.navigate('settings')}
            />
            </LazyOverlay>
            ) : (
              <NavAccessDenied
                onGoDashboard={() => store.navigate('dashboard')}
                onOpenSettings={() => store.navigate('settings')}
              />
            )
          )}
          {store.currentView === 'settings' && (
            <Settings
              settings={store.user.settings}
              onUpdate={store.updateSettings}
              onPullLibrary={store.pullLibraryFromServer}
              onPullSession={store.pullSessionFromServer}
              onPushSession={store.pushSessionToServer}
              onSyncAccount={store.syncAccountOnLogin}
              onRefreshPlan={store.refreshAuthPlan}
              onReplayProductTour={replayProductTour}
              tasks={store.tasks}
              onApplyCalendarSync={store.applyTaskCalendarSync}
            />
          )}
        </PlatformViewTransition>
      </AnimatePresence>
      </Shell>
      {overlays}
    </I18nContext.Provider>
  );
}
