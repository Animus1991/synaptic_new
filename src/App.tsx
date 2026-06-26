import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense, startTransition, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/useStore';
import { applyTheme, watchSystemTheme } from './lib/theme';
import { I18nContext, t as translate, type I18nKey } from './lib/i18n';
import { getTaskConcept, getWorkspaceTool, getMistakesForTask, getExamDurationSeconds, findPendingTask } from './lib/taskFlows';
import {
  buildTaskFlowContext,
  resolveExamQuestions,
  resolvePrerequisiteCheckpoint,
  resolvePrerequisiteSteps,
  resolveReviewCards,
} from './lib/taskFlowContent';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import type { ContentSearchHit } from './lib/globalContentSearch';
import { NotificationsPanel } from './components/NotificationsPanel';
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
import { CourseView } from './components/CourseView';
import { Settings } from './components/Settings';
import { UploadModal } from './components/UploadModal';
import { AppToastBanner } from './components/AppToastBanner';
import type { AppView } from './types';
import type { FsrsRating } from './lib/pedagogy';
import { visibleCourses } from './lib/demoMode';
import { WorkspaceBootShell } from './components/workspace/WorkspaceBootShell';

const StudyWorkspace = lazy(() =>
  import('./components/workspace/StudyWorkspace').then((m) => ({ default: m.StudyWorkspace })),
);

function preloadStudyWorkspace() {
  void import('./components/workspace/StudyWorkspace');
}

const Agent = lazy(() => import('./components/Agent').then((m) => ({ default: m.Agent })));
const Analytics = lazy(() => import('./components/Analytics').then((m) => ({ default: m.Analytics })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })));
const LessonView = lazy(() => import('./components/LessonView').then((m) => ({ default: m.LessonView })));
const PracticalLessonView = lazy(() => import('./components/PracticalLessonView').then((m) => ({ default: m.PracticalLessonView })));
const ReviewSessionView = lazy(() => import('./components/ReviewSessionView').then((m) => ({ default: m.ReviewSessionView })));

function LazyOverlay({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const resolvedFallback = fallback !== undefined ? fallback : (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-primary/95 backdrop-blur-sm"
      data-testid="lazy-overlay-loading"
    >
      <p className="text-sm text-text-secondary">Loading…</p>
    </div>
  );
  return <Suspense fallback={resolvedFallback}>{children}</Suspense>;
}

export default function App() {
  const store = useAppStore();
  const { open: paletteOpen, toggle: togglePalette, close: closePalette } = useCommandPalette();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [uploadIntent, setUploadIntent] = useState<{ mode: 'new' | 'extend'; targetCourseId?: string }>({ mode: 'new' });

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
    startTransition(() => {
      store.openStudyWorkspace();
    });
  }, [store]);

  const openWorkspaceForConcept = useCallback((concept?: string) => {
    if (store.currentView === 'landing' || store.currentView === 'onboarding') {
      store.navigate('dashboard');
    }
    startTransition(() => {
      store.openStudyWorkspaceForConcept(concept);
    });
  }, [store]);

  /** Course / library Continue — preload chunk then open workspace. */
  const openCourseWorkspace = useCallback((topicTitle?: string) => {
    preloadStudyWorkspace();
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
    startTransition(() => {
      store.openStudyWorkspaceForExamCountdown();
    });
  }, [store]);

  const hasCourses = visibleCourses(store.courses, store.user.settings).length > 0;

  const handleSeeDemo = useCallback(() => {
    store.enableDemoContent();
    store.navigate('library');
  }, [store]);

  const handleOnboardingComplete = useCallback((
    data: Parameters<typeof store.completeOnboarding>[0] & { exploreDemoMode?: boolean },
  ) => {
    const { exploreDemoMode, ...rest } = data;
    if (exploreDemoMode) {
      store.enableDemoContent();
      store.navigate('library');
      return;
    }
    store.completeOnboarding(rest);
  }, [store]);

  const demoDeepLinkFired = useRef(false);
  const viewDeepLinkFired = useRef(false);

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

  const nextPendingTask = findPendingTask(store.tasks, () => true);
  const agentSplitActive = store.studyWorkspaceOpen && store.workspaceAgentSplit && store.currentView === 'agent';

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
  };

  const studyWorkspaceElement = (
    <Suspense fallback={
      <WorkspaceBootShell
        compact={agentSplitActive}
        onClose={closeWorkspace}
        lang={store.user.settings.language === 'el' ? 'el' : 'en'}
      />
    }>
      <StudyWorkspace
        key={workspaceSessionKey}
        agentSplit={agentSplitActive}
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
        onUpload={() => openUploadModal()}
        onReuploadMaterial={() => {
          const id = store.activeTask?.courseId ?? store.selectedCourse?.id;
          openUploadModal(id ? { mode: 'extend', targetCourseId: id } : undefined);
        }}
        onReprocessMaterial={() => {
          const id = store.activeTask?.courseId ?? store.selectedCourse?.id;
          if (id) store.reprocessCourseMaterial(id);
        }}
        reprocessingMaterial={store.isReprocessing}
        sourceHighlight={store.sourceHighlight}
        openSourceAt={store.openSourceAt}
        clearSourceHighlight={store.clearSourceHighlight}
        onConceptBusDirty={store.queueConceptBusSync}
        workspaceFocus={store.workspaceFocus ?? undefined}
        setWorkspaceFocus={store.setWorkspaceFocus}
        workspaceOpenTool={store.workspaceOpenTool}
        onConsumeWorkspaceOpenTool={store.consumeWorkspaceOpenTool}
      />
    </Suspense>
  );

  const i18nValue = useMemo(() => ({
    lang: store.user.settings.language,
    t: (key: I18nKey) => translate(key, store.user.settings.language),
  }), [store.user.settings.language]);

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
    notificationCount: store.activities.length,
    breadcrumb: store.currentView === 'course' && store.selectedCourse
      ? { course: store.selectedCourse.title }
      : store.activeTask
        ? { course: store.activeTask.courseName, lesson: store.activeTask.title }
        : store.selectedCourse
        ? { course: store.selectedCourse.title }
        : undefined,
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

  useEffect(() => {
    if (store.currentView === 'course' && store.selectedCourse) {
      preloadStudyWorkspace();
    }
  }, [store.currentView, store.selectedCourse?.id]);

  const overlays = (
    <>
      <CommandPalette
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
      />
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        activities={store.activities}
      />
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
      {store.studyWorkspaceOpen && (
        agentSplitActive ? (
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
          store.openCourseReview(course);
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
      onEndSession={store.endSession}
    />
  ) : null;

  useEffect(() => {
    applyTheme(store.user.settings.theme);
    if (store.user.settings.theme !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [store.user.settings.theme]);

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
    const allowed: AppView[] = ['dashboard', 'library', 'tasks', 'agent', 'analytics', 'teacher', 'settings'];
    if (!allowed.includes(view as AppView)) return;
    viewDeepLinkFired.current = true;
    if (!hasCourses) store.enableDemoContent();
    store.navigate(view as AppView);
  }, [hasCourses, store]);

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

  // Course detail view
  if (store.currentView === 'course' && store.selectedCourse) {
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
            reprocessingMaterial={store.isReprocessing}
            onRemoveFile={store.removeUploadedFile}
            onRemoveCourse={store.removeCourse}
            tasks={store.tasks}
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
        <motion.div key={store.currentView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
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
              onSelectCourse={(course) => { preloadStudyWorkspace(); store.openCourseReview(course); }}
              onOpenWorkspace={openWorkspace}
              onOpenExamTimer={openExamTimerWorkspace}
              onFocusWeakArea={openWorkspaceForConcept}
              onUpload={() => openUploadModal()}
              onExploreDemo={!hasCourses ? handleSeeDemo : undefined}
              workspaceLive={store.workspaceLive}
              dashboardNextAction={store.dashboardNextAction}
              lang={store.user.settings.language}
            />
          )}
          {store.currentView === 'library' && (
            <Library
              courses={visibleCourses(store.courses, store.user.settings)}
              uploadedFiles={store.uploadedFiles}
              onSelectCourse={(course) => { preloadStudyWorkspace(); store.openCourseReview(course); }}
              onRemoveCourse={store.removeCourse}
              onUpload={() => openUploadModal()}
              onRemoveFile={store.removeUploadedFile}
              onReprocessCourse={store.reprocessCourseMaterial}
              reprocessingMaterial={store.isReprocessing}
              userSettings={store.user.settings}
              tasks={store.tasks}
              glossaryEntries={store.glossaryEntries}
            />
          )}
          {store.currentView === 'tasks' && (
            <Tasks
              tasks={store.tasks}
              onComplete={store.completeTask}
              onReviewRating={store.submitReviewRating}
              onStartTask={store.startTask}
              onStartSession={store.startSession}
              daysToExam={store.dashboardExtras.daysToExam}
              expandedTaskId={store.expandedTaskId}
              onExpandedTaskChange={store.setExpandedTaskId}
              openMistakes={store.pedagogyMetrics.openMistakes}
              onResolveMistake={store.resolveMistake}
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
            />
            </LazyOverlay>
          )}
          {store.currentView === 'teacher' && (
            <LazyOverlay>
            <TeacherDashboard
              settings={store.user.settings}
              lang={store.user.settings.language}
              localCourses={store.courses}
              activities={store.activities}
              learnerModel={store.learnerModel}
              onOpenCourse={(id) => {
                const course = store.courses.find((c) => c.id === id);
                if (course) store.openCourseReview(course);
              }}
            />
            </LazyOverlay>
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
            />
          )}
        </motion.div>
      </AnimatePresence>
      </Shell>
      {overlays}
    </I18nContext.Provider>
  );
}
