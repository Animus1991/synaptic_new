import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { AppView, Course, AgentMessage, AgentMode, UploadedFile, UserSettings, LearnerModel, DashboardStats, MistakeRecord, ActivityItem, GlossaryEntry } from '../types';
import { createActivity } from '../lib/activityLog';
import { SEED_ACTIVITIES } from '../demo/activityDemo';
import { mockUser, mockCourses, mockTasks, mockLearnerModel, mockDashboardStats, mockAgentMessages } from '../demo/mockData';
import { loadThemePreference, applyTheme, cycleTheme } from '../lib/theme';
import { ECON_CONCEPT_IMPORTANCE } from '../data/conceptGraph';
import {
  betaMean,
  computeCalibration,
  computeExamReadiness,
  computePrerequisiteRepairs,
  deriveInsights,
  updateBetaMastery,
  updateSkillMastery,
  type FsrsRating,
} from '../lib/pedagogy';
import { ECON_CONCEPT_EDGES } from '../data/conceptGraph';
import { edgesFromCourses } from '../lib/conceptEdges';
import { loadJson, saveJson } from '../lib/persistence';
import { t } from '../lib/i18n';
import { hydrateLibrary, loadLibrarySync, saveLibrarySync } from '../lib/libraryStorage';
import { scheduleLibraryRemoteSync } from '../lib/libraryRemoteSync';
import { mergeLibraries, remoteLibraryToPersisted } from '../lib/librarySync';
import { markWorkspaceContinue } from '../lib/workspacePerf';
import {
  buildNotebookLmUploadedFile,
  parseNotebookLmExport,
  buildNotebookLmAudioImportResult,
  type NotebookLmImportResult,
} from '../lib/notebooklmImport';
import {
  prepareNotebookLmFsrsImport,
  type NotebookLmFsrsImportResult,
} from '../lib/notebooklmFsrsImport';
import { notifySuccess, notifyWarning } from '../lib/notificationBus';
import { prefetchWorkspaceEntry } from '../lib/workspaceEntryPrefetch';
import { fetchYoutubeTranscript } from '../lib/youtubeTranscript';
import { fetchRemoteLibrary, fetchRemoteSession, pushRemoteSession, authMe } from '../lib/authClient';
import {
  loadLocalSession,
  mergeSessions,
  localSessionToRemote,
  remoteSessionToLocal,
} from '../lib/sessionSync';
import {
  enrichLearnerModelFromConceptBus,
  mergeDashboardReviewsDue,
} from '../lib/conceptBusSync';
import { loadAllConceptBuses, replaceAllConceptBuses } from '../lib/workspacePersistence';
import { loadAllStepSchedules, replaceAllStepSchedules } from '../lib/spacedStepSchedule';
import { loadAllDeckStates, replaceAllDeckStates } from '../lib/leitnerDeckSync';
import { createDebouncedConceptBusPusher } from '../lib/conceptBusSessionSync';
import { mergeAgentWorkspaceContext, type WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { filterTasksForSession, getTaskAction, getTaskConcept, getAgentMode, type SessionType, type WorkspaceToolId } from '../lib/taskFlows';
import { settingsToAgentMode } from '../lib/settingsEffects';
import {
  readTextFromFiles,
  uploadedFileMeta,
  extractFileContent,
  recognizeDocumentModelsForUpload,
  attachDocumentSnapshots,
  type UploadPayload,
} from '../lib/uploadPipeline';
import { recognizeCourse } from '../lib/recognitionWorkerClient';
import { buildConceptSpans, type SourceHighlight } from '../lib/conceptProvenance';
import { enrichCourseWithCrossLinks } from '../lib/crossDocumentLink';
import { applyFsrsToSpacing, quizOutcomeToFsrsRating } from '../lib/adaptiveScheduler';
import type { TaskCalendarSyncUpdate } from '../lib/taskCalendarSync';
import type { WorkspaceFocus } from '../lib/workspaceFocus';
import { CONTENT_PIPELINE_VERSION } from '../lib/pipelineConstants';
import {
  reprocessCourseRecognition as runCourseReprocess,
  regenerateTasksAfterReprocess,
  regenerateGlossaryAfterReprocess,
  summarizeReprocessTaskDelta,
} from '../lib/pipelineReprocess';
import { reprocessCourseAnnotations } from '../lib/annotationStore';
import { clearQuizSessions } from '../lib/quizSession';
import { markCourseArtifactsStale, clearCourseArtifactsStale } from '../lib/artifactStaleness';
import { removeUploadedFileFromLibrary } from '../lib/removeUploadedFile';
import { removeCourseFromLibrary } from '../lib/removeCourse';
import {
  glossaryAfterCourseSourceRemoval,
  tasksAfterFileRemoval,
} from '../lib/deleteCascade';
import { emitAnalyticsLearningEvent } from '../lib/emitLearningEvent';
import type { TaskFilter } from '../components/Tasks';
import { selectDashboardNextAction, type WorkspacePracticeLaunch } from '../lib/dashboardNextAction';
import { recommendDailyPlan } from '../lib/unifiedAdaptiveScheduler';
import {
  buildDashboardSmartCTAs,
  smartCTAToWorkspaceLaunch,
  type DashboardSmartCTA,
} from '../lib/examPrep/dashboardSmartCTAs';
import {
  buildProactiveAgentAlerts,
  proactiveAlertToWorkspaceLaunch,
  type ProactiveAgentAlert,
} from '../lib/proactiveAgentAlerts';
import {
  buildSyllabusCoverageSnapshot,
  pickPrimaryCourseForCoverage,
} from '../lib/examPrep/syllabusCoverageTracker';
import { formatUploadSuccessToast, summarizeUploadStructure } from '../lib/uploadStructureSummary';
import type { BetaMastery } from '../lib/pedagogy';
import {
  shouldShowDemo,
  initialCourses,
  initialUploadedFiles,
  initialGlossary,
  stripDemoFiles,
  stripDemoFromTasks,
} from '../lib/demoMode';
import { mockUploadedFiles, mockGlossaryEntries } from '../demo/mockSource';
import { withDemoCourseGraphs } from '../demo/demoConceptGraph';
import { buildInitialUser, applyAuthIdentity, levelFromXp } from '../lib/identity';
import { createEmptyLearnerModel, EMPTY_DASHBOARD_STATS } from '../lib/emptyLearnerState';
import { applyBehaviorInference, inferBehaviorFromActivities } from '../lib/behaviorInference';
import { readAllLearningEvents } from '../lib/learningEvents';
import { mergeCourseTasks } from '../lib/taskGenerator';
import { syncLearnerHeatmap, computeStreakFromHeatmap } from '../lib/activityAnalytics';
import { computeRetentionRate, weeklyMasteryFromActivities } from '../lib/retentionAnalytics';
import {
  applySkillUpdate,
  ensureSkillNode,
  findSkillForConcept,
  fsrsRatingToConfidence,
  mergeBetaFromCourse,
  mergeSkillNodesFromCourse,
  updateCourseTopicMastery,
} from '../lib/skillNodes';

const STORAGE_KEY = 'session-v2';

const MOCK_COURSE_IDS = new Set(mockCourses.map((c) => c.id));

type PersistedState = {
  learnerModel: LearnerModel;
  dashboardStats: DashboardStats;
  tasks: typeof mockTasks;
  xp: number;
  betaMastery: BetaMastery[];
  firstAttemptKeys: string[];
  openMistakes: MistakeRecord[];
  activities: ActivityItem[];
  userSettings: UserSettings;
};

function initTasks(
  persisted: Partial<PersistedState>,
  generatedCourses: Course[],
  settings: UserSettings,
): typeof mockTasks {
  const showDemo = shouldShowDemo(settings);
  let tasks = persisted.tasks ?? [];
  if (showDemo && tasks.length === 0) return mockTasks;
  tasks = stripDemoFromTasks(tasks);
  for (const course of generatedCourses) {
    if (course.status !== 'generating') {
      tasks = mergeCourseTasks(tasks, course, settings.language);
    }
  }
  return tasks;
}

function initActivities(persisted: Partial<PersistedState>, settings: UserSettings): ActivityItem[] {
  if (shouldShowDemo(settings)) return persisted.activities ?? SEED_ACTIVITIES;
  return persisted.activities ?? [];
}

function initBetaMastery(settings: UserSettings): BetaMastery[] {
  if (!shouldShowDemo(settings)) return [];
  const allSkills = [
    ...mockLearnerModel.strongAreas,
    ...mockLearnerModel.weakAreas,
    ...mockLearnerModel.almostKnown,
  ];
  return allSkills.map((s) => {
    const importance = ECON_CONCEPT_IMPORTANCE[s.concept] ?? 1;
    const mastery = s.mastery / 100;
    const attempts = Math.max(1, s.practiceCount);
    return {
      concept: s.concept,
      alpha: 1 + mastery * attempts,
      beta: 1 + (1 - mastery) * attempts,
      firstAttempts: attempts,
      importance,
    };
  });
}

import { DEMO_INITIAL_MISTAKES as INITIAL_MISTAKES } from '../demo/mockData';

function loadPersisted(): Partial<PersistedState> {
  const legacy = loadJson<Partial<PersistedState>>('session-v1', {});
  const current = loadJson<Partial<PersistedState>>(STORAGE_KEY, {});
  return { ...legacy, ...current };
}

function masteryMapFromSkills(lm: LearnerModel, courses: Course[], showDemo: boolean): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of [...lm.strongAreas, ...lm.weakAreas, ...lm.almostKnown]) {
    map[s.concept] = s.mastery;
  }
  for (const c of courses) {
    if (!showDemo && MOCK_COURSE_IDS.has(c.id)) continue;
    for (const t of c.topics) {
      map[t.title] = t.mastery;
    }
  }
  return map;
}

export function useAppStore() {
  const persisted = useMemo(() => loadPersisted(), []);
  const library = useMemo(() => loadLibrarySync(), []);
  const mergedSettings = useMemo(
    () => ({
      ...mockUser.settings,
      ...persisted.userSettings,
      theme: loadThemePreference(),
    }),
    [persisted.userSettings],
  );
  const initialActivities = useMemo(
    () => initActivities(persisted, mergedSettings),
    [persisted, mergedSettings],
  );

  const [workspaceFocus, setWorkspaceFocus] = useState<WorkspaceFocus | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => buildInitialUser({
    settings: mergedSettings,
    persistedXp: persisted.xp,
    authEmail: mergedSettings.authEmail,
  }));
  const [courses, setCourses] = useState<Course[]>(
    () => initialCourses(library.generatedCourses, mergedSettings, mockCourses),
  );
  const [tasks, setTasks] = useState(
    () => initTasks(persisted, library.generatedCourses, mergedSettings),
  );
  const [learnerModel, setLearnerModel] = useState<LearnerModel>(() => {
    const base = shouldShowDemo(mergedSettings)
      ? (persisted.learnerModel ?? mockLearnerModel)
      : (persisted.learnerModel ?? createEmptyLearnerModel('u1', initialActivities));
    return syncLearnerHeatmap(base, initialActivities);
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(() => {
    const base = shouldShowDemo(mergedSettings)
      ? (persisted.dashboardStats ?? mockDashboardStats)
      : (persisted.dashboardStats ?? EMPTY_DASHBOARD_STATS);
    const heatmap = syncLearnerHeatmap(createEmptyLearnerModel('u1', initialActivities), initialActivities).heatmapData;
    return { ...base, streak: computeStreakFromHeatmap(heatmap) };
  });
  const [betaMastery, setBetaMastery] = useState<BetaMastery[]>(
    () => persisted.betaMastery ?? initBetaMastery(mergedSettings),
  );
  const [firstAttemptKeys, setFirstAttemptKeys] = useState<Set<string>>(
    new Set(persisted.firstAttemptKeys ?? []),
  );
  const [openMistakes, setOpenMistakes] = useState<MistakeRecord[]>(
    shouldShowDemo(mergedSettings) ? (persisted.openMistakes ?? INITIAL_MISTAKES) : (persisted.openMistakes ?? []),
  );
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>(
    shouldShowDemo(mergedSettings) ? mockAgentMessages : [],
  );
  const [agentMode, setAgentMode] = useState<AgentMode>('socratic');
  const [agentDraftPrompt, setAgentDraftPrompt] = useState<string | null>(null);
  const [agentAutoSend, setAgentAutoSend] = useState(false);
  const [agentWorkspaceContext, setAgentWorkspaceContext] = useState<
    import('../lib/agentWorkspaceContext').AgentWorkspaceContext | null
  >(null);
  const [workspaceLive, setWorkspaceLive] = useState<WorkspaceLiveSync | null>(null);
  const [workspaceContext, setWorkspaceContext] = useState<
    import('../lib/workspaceContextModel').WorkspaceContext | null
  >(null);
  const workspaceLiveRef = useRef<WorkspaceLiveSync | null>(null);
  const syncWorkspaceLive = useCallback((live: WorkspaceLiveSync) => {
    workspaceLiveRef.current = live;
    setWorkspaceLive(live);
    setWorkspaceContext(live.snapshot);
  }, []);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    () => initialUploadedFiles(library.uploadedFiles, mergedSettings, mockUploadedFiles),
  );
  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>(
    () => initialGlossary(library.glossaryEntries, mergedSettings, mockGlossaryEntries),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeLessonView, setActiveLessonView] = useState(false);
  const [practicalLessonView, setPracticalLessonView] = useState(false);
  const [studyWorkspaceOpen, setStudyWorkspaceOpen] = useState(false);
  /** L13-6 — NotebookLM-style 3-column shell for a course. */
  const [notebookShellCourseId, setNotebookShellCourseId] = useState<string | null>(null);
  /** Side-by-side workspace + Agent when navigating via sidebar while workspace is open. */
  const [workspaceAgentSplit, setWorkspaceAgentSplit] = useState(false);
  /** Side-by-side workspace + CourseView when opening a course while workspace stays open. */
  const [workspaceCourseSplit, setWorkspaceCourseSplit] = useState(false);
  const studyWorkspaceOpenRef = useRef(false);
  /** One-shot tool focus when opening workspace from dashboard exam countdown. */
  const [workspaceOpenTool, setWorkspaceOpenTool] = useState<WorkspaceToolId | null>(null);
  const [workspaceOpenSimulatorTab, setWorkspaceOpenSimulatorTab] = useState<'simulator' | 'exam-prep' | null>(null);
  const studyConceptOverrideRef = useRef<string | null>(null);
  /** Bumped on open to cancel an in-flight async close (flush) that would otherwise race. */
  const workspaceCloseGenRef = useRef(0);
  /** When set, the Study Workspace opens focused on this specific concept/topic
   * instead of defaulting to the course's first topic. Cleared on each open so
   * "Continue" (no concept) resumes the default entry point. */
  const [studyConceptOverride, setStudyConceptOverride] = useState<string | null>(null);

  const cancelPendingWorkspaceClose = useCallback(() => {
    workspaceCloseGenRef.current += 1;
  }, []);

  const closeCompetingTaskOverlays = useCallback((except?: 'workspace') => {
    setActiveLessonView(false);
    setPracticalLessonView(false);
    setReviewSessionOpen(false);
    setMistakeRetryOpen(false);
    setExamPrepOpen(false);
    setPrerequisiteRepairOpen(false);
    if (except !== 'workspace') {
      workspaceCloseGenRef.current += 1;
      studyWorkspaceOpenRef.current = false;
      setStudyWorkspaceOpen(false);
      setWorkspaceAgentSplit(false);
    }
  }, []);

  const openStudyWorkspace = useCallback((opts?: { keepTask?: boolean }) => {
    markWorkspaceContinue();
    prefetchWorkspaceEntry();
    cancelPendingWorkspaceClose();
    closeCompetingTaskOverlays('workspace');

    if (!opts?.keepTask) {
      setActiveTaskId(null);
    }

    setStudyConceptOverride(null);
    setWorkspaceFocus(null);
    setWorkspaceAgentSplit(false);
    setNotebookShellCourseId(null);
    studyWorkspaceOpenRef.current = true;
    setStudyWorkspaceOpen(true);
  }, [cancelPendingWorkspaceClose, closeCompetingTaskOverlays]);

  const openNotebookShell = useCallback((courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setSelectedCourse(course);
    setNotebookShellCourseId(courseId);
  }, [courses]);

  const closeNotebookShell = useCallback(() => {
    setNotebookShellCourseId(null);
  }, []);

  const openStudyWorkspaceForConcept = useCallback((concept?: string) => {
    markWorkspaceContinue();
    prefetchWorkspaceEntry();
    cancelPendingWorkspaceClose();
    closeCompetingTaskOverlays('workspace');
    setActiveTaskId(null);

    const trimmed = concept?.trim() || null;

    setStudyConceptOverride(trimmed);
    setWorkspaceFocus(trimmed ? { term: trimmed, originTool: 'dashboard' } : null);
    setWorkspaceAgentSplit(false);
    studyWorkspaceOpenRef.current = true;
    setStudyWorkspaceOpen(true);
  }, [cancelPendingWorkspaceClose, closeCompetingTaskOverlays]);

  const openStudyWorkspaceForExamCountdown = useCallback(() => {
    markWorkspaceContinue();
    prefetchWorkspaceEntry();
    cancelPendingWorkspaceClose();
    closeCompetingTaskOverlays('workspace');
    setActiveTaskId(null);
    setStudyConceptOverride(null);
    setWorkspaceFocus(null);
    setWorkspaceAgentSplit(false);
    setWorkspaceOpenSimulatorTab(null);
    setWorkspaceOpenTool('timer');
    studyWorkspaceOpenRef.current = true;
    setStudyWorkspaceOpen(true);
  }, [cancelPendingWorkspaceClose, closeCompetingTaskOverlays]);

  const openStudyWorkspaceForPractice = useCallback((launch: WorkspacePracticeLaunch) => {
    markWorkspaceContinue();
    prefetchWorkspaceEntry();
    cancelPendingWorkspaceClose();
    closeCompetingTaskOverlays('workspace');
    setActiveTaskId(null);

    if (launch.courseId) {
      const course = courses.find((c) => c.id === launch.courseId);
      if (course) setSelectedCourse(course);
    }

    const trimmed = launch.concept?.trim() || null;
    setStudyConceptOverride(trimmed);
    setWorkspaceFocus({
      ...(trimmed ? { term: trimmed } : {}),
      originTool: 'dashboard',
      preferredTool: launch.tool,
      ...(launch.simulatorTab ? { simulatorTab: launch.simulatorTab } : {}),
    });
    setWorkspaceOpenTool(launch.tool);
    setWorkspaceOpenSimulatorTab(launch.simulatorTab ?? null);
    setWorkspaceAgentSplit(false);
    studyWorkspaceOpenRef.current = true;
    setStudyWorkspaceOpen(true);
  }, [cancelPendingWorkspaceClose, closeCompetingTaskOverlays, courses]);

  const consumeWorkspaceOpenTool = useCallback(() => {
    setWorkspaceOpenTool(null);
  }, []);

  const consumeWorkspaceOpenSimulatorTab = useCallback(() => {
    setWorkspaceOpenSimulatorTab(null);
  }, []);

  const [sourceHighlight, setSourceHighlight] = useState<SourceHighlight | null>(null);
  const openSourceAt = useCallback((highlight: SourceHighlight) => {
    cancelPendingWorkspaceClose();
    closeCompetingTaskOverlays('workspace');

    emitAnalyticsLearningEvent('source_opened', {
      fileId: highlight.fileId,
      charStart: highlight.charStart,
      charEnd: highlight.charEnd,
    });
    setSourceHighlight(highlight);
    setWorkspaceAgentSplit(false);
    studyWorkspaceOpenRef.current = true;
    setStudyWorkspaceOpen(true);
  }, [cancelPendingWorkspaceClose, closeCompetingTaskOverlays]);
  const [reviewSessionOpen, setReviewSessionOpen] = useState(false);
  const [mistakeRetryOpen, setMistakeRetryOpen] = useState(false);
  const [examPrepOpen, setExamPrepOpen] = useState(false);
  const [prerequisiteRepairOpen, setPrerequisiteRepairOpen] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<string[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [activeSessionType, setActiveSessionType] = useState<SessionType | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [tasksFilterPreset, setTasksFilterPreset] = useState<TaskFilter | null>(null);
  const [appToast, setAppToast] = useState<{ id: number; message: string } | null>(null);
  const [postUploadCourseId, setPostUploadCourseId] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markPostUploadCourse = useCallback((courseId: string) => setPostUploadCourseId(courseId), []);
  const clearPostUploadHighlight = useCallback(() => setPostUploadCourseId(null), []);

  const dismissAppToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setAppToast(null);
  }, []);

  const showAppToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = Date.now();
    setAppToast({ id, message });
    toastTimerRef.current = setTimeout(() => setAppToast(null), 6000);
  }, []);

  const persistLibrary = useCallback((
    files: UploadedFile[],
    glossary: GlossaryEntry[],
    allCourses: Course[],
  ) => {
    saveLibrarySync({
      uploadedFiles: stripDemoFiles(files),
      glossaryEntries: glossary,
      generatedCourses: allCourses.filter((c) => !MOCK_COURSE_IDS.has(c.id)),
    });
    scheduleLibraryRemoteSync(user.settings);
  }, [user.settings]);

  useEffect(() => {
    void hydrateLibrary({
      uploadedFiles: library.uploadedFiles,
      glossaryEntries: library.glossaryEntries,
      generatedCourses: library.generatedCourses,
    }).then((hydrated) => {
      if (hydrated.uploadedFiles.some((f, i) => f.extractedText !== library.uploadedFiles[i]?.extractedText)) {
        setUploadedFiles(initialUploadedFiles(hydrated.uploadedFiles, mergedSettings, mockUploadedFiles));
      }
    });
  }, [library.uploadedFiles, library.glossaryEntries, library.generatedCourses, mergedSettings]);

  const persist = useCallback((
    nextLearner: LearnerModel,
    nextStats: DashboardStats,
    nextTasks: typeof tasks,
    nextXp: number,
    nextBeta: BetaMastery[],
    nextKeys: Set<string>,
    nextMistakes: MistakeRecord[],
    nextActivities: ActivityItem[],
    nextSettings: UserSettings,
  ) => {
    saveJson(STORAGE_KEY, {
      learnerModel: nextLearner,
      dashboardStats: nextStats,
      tasks: nextTasks,
      xp: nextXp,
      betaMastery: nextBeta,
      firstAttemptKeys: [...nextKeys],
      openMistakes: nextMistakes,
      activities: nextActivities,
      userSettings: nextSettings,
    } satisfies PersistedState);
  }, []);

  const logActivity = useCallback((item: ActivityItem): ActivityItem[] => {
    const next = [item, ...activities].slice(0, 50);
    setActivities(next);
    setLearnerModel((lm) => syncLearnerHeatmap(lm, next));
    setDashboardStats((stats) => ({
      ...stats,
      streak: computeStreakFromHeatmap(syncLearnerHeatmap(learnerModel, next).heatmapData),
    }));
    return next;
  }, [activities, learnerModel]);

  const recomputeLearnerMetrics = useCallback((
    lm: LearnerModel,
    beta: BetaMastery[],
    keys: Set<string>,
    _mistakes: MistakeRecord[],
    activityLog: ActivityItem[] = activities,
  ): LearnerModel => {
    const masteryMap = masteryMapFromSkills(lm, courses, shouldShowDemo(user.settings));
    const courseEdges = edgesFromCourses(courses);
    const edges = courseEdges.length > 0
      ? courseEdges
      : (shouldShowDemo(user.settings) ? ECON_CONCEPT_EDGES : []);
    const repairs = computePrerequisiteRepairs(masteryMap, edges);
    const calibration = computeCalibration(lm.confidenceCalibration);
    const firstCount = keys.size;
    const fallbackAccuracy = lm.confidenceCalibration.length > 0
      ? lm.confidenceCalibration.reduce((s, p) => s + p.actual, 0) / lm.confidenceCalibration.length
      : lm.retentionRate;

    const behavior = inferBehaviorFromActivities(
      activityLog,
      readAllLearningEvents(),
      courses,
    );
    const withBehavior = applyBehaviorInference(lm, behavior);
    const selfReliance = 1 - withBehavior.helpSeekingRate;
    const readiness = computeExamReadiness(beta, fallbackAccuracy, selfReliance, firstCount);

    return {
      ...withBehavior,
      overallMastery: readiness,
      retentionRate: withBehavior.retrievalPerformance || lm.retentionRate,
      interactionInsights: deriveInsights(withBehavior, repairs, calibration),
    };
  }, [courses, user.settings, activities]);

  useEffect(() => {
    setLearnerModel((lm) => recomputeLearnerMetrics(lm, betaMastery, firstAttemptKeys, openMistakes, activities));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when activity log changes
  }, [activities.length, activities[0]?.id]);

  const navigate = useCallback((view: AppView) => {
    if (view === 'course' || view === 'library') {
      workspaceCloseGenRef.current += 1;
      studyWorkspaceOpenRef.current = false;
      setStudyWorkspaceOpen(false);
      setWorkspaceAgentSplit(false);
      setWorkspaceCourseSplit(false);
      setActiveTaskId(null);
    }
    setCurrentView(view);
    setSidebarOpen(false);
    if (view === 'agent' && studyWorkspaceOpenRef.current) {
      setWorkspaceAgentSplit(true);
      if (workspaceLiveRef.current?.agentContext) {
        setAgentWorkspaceContext(workspaceLiveRef.current.agentContext);
      }
    } else if (view !== 'agent') {
      setWorkspaceAgentSplit(false);
    }
    window.scrollTo(0, 0);
  }, []);

  const openTasksWithFilter = useCallback((filter: TaskFilter) => {
    setTasksFilterPreset(filter);
    setCurrentView('tasks');
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const clearTasksFilterPreset = useCallback(() => {
    setTasksFilterPreset(null);
  }, []);

  const openCourseReview = useCallback((course: Course) => {
    setSelectedCourse(course);
    setCurrentView('course');
    setSidebarOpen(false);
    if (studyWorkspaceOpenRef.current) {
      setWorkspaceCourseSplit(true);
      window.scrollTo(0, 0);
      return;
    }
    workspaceCloseGenRef.current += 1;
    studyWorkspaceOpenRef.current = false;
    setStudyWorkspaceOpen(false);
    setWorkspaceAgentSplit(false);
    setWorkspaceCourseSplit(false);
    setActiveTaskId(null);
    window.scrollTo(0, 0);
  }, []);

  const exitWorkspaceAgentSplit = useCallback(() => {
    setWorkspaceAgentSplit(false);
    setCurrentView((v) => (v === 'agent' ? 'dashboard' : v));
  }, []);

  const exitWorkspaceCourseSplit = useCallback(() => {
    setWorkspaceCourseSplit(false);
    setCurrentView('library');
  }, []);

  useEffect(() => {
    studyWorkspaceOpenRef.current = studyWorkspaceOpen;
  }, [studyWorkspaceOpen]);

  useEffect(() => {
    studyConceptOverrideRef.current = studyConceptOverride;
  }, [studyConceptOverride]);

  useEffect(() => {
    if (currentView !== 'agent' || !workspaceAgentSplit || !studyWorkspaceOpen) return;
    if (!workspaceLive?.agentContext) return;
    setAgentWorkspaceContext(workspaceLive.agentContext);
  }, [workspaceLive, currentView, workspaceAgentSplit, studyWorkspaceOpen]);

  const completeTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task || task.status === 'completed') return prev;

      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: 'completed' as const } : t,
      );

      setLearnerModel((lm) => {
        const concept = task.title.split('—')[0]?.trim() ?? task.title;
        const match = findSkillForConcept(lm, concept);
        const updatedSkill = match ? updateSkillMastery(match, true, 70) : null;

        const nextWeak = updatedSkill
          ? lm.weakAreas.map((s) => (s.concept === updatedSkill.concept ? updatedSkill : s))
          : lm.weakAreas;

        let next: LearnerModel = {
          ...lm,
          weakAreas: nextWeak,
          totalSessions: lm.totalSessions + 1,
          retrievalPerformance: Math.min(1, lm.retrievalPerformance + (task.isSpacedRepetition ? 0.03 : 0.01)),
        };
        next = recomputeLearnerMetrics(next, betaMastery, firstAttemptKeys, openMistakes);

        setDashboardStats((stats) => {
          const nextStats: DashboardStats = {
            ...stats,
            tasksCompleted: stats.tasksCompleted + 1,
            todayXP: stats.todayXP + task.xpReward,
            weeklyXP: stats.weeklyXP + task.xpReward,
            reviewsDue: Math.max(0, stats.reviewsDue - (task.isSpacedRepetition ? 1 : 0)),
          };
          setUser((u) => {
            const nextXp = u.xp + task.xpReward;
            const nextActs = logActivity(createActivity('task_complete', `Completed: ${task.title}`, task.xpReward));
            persist(next, nextStats, updated, nextXp, betaMastery, firstAttemptKeys, openMistakes, nextActs, u.settings);
            return { ...u, xp: nextXp, level: levelFromXp(nextXp) };
          });
          return nextStats;
        });

        return next;
      });

      return updated;
    });
  }, [persist, betaMastery, firstAttemptKeys, openMistakes, recomputeLearnerMetrics, logActivity, activities]);

  const submitReviewRating = useCallback((taskId: string, rating: FsrsRating) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task || task.status === 'completed') return prev;

      const concept = getTaskConcept(task);
      const spacing = learnerModel.spacingIntervals.find((s) => s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 6)));
      const fsrsUpdated = applyFsrsToSpacing(spacing, concept, rating);

      const updated = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'completed' as const,
              scheduledFor: fsrsUpdated.nextReview,
            }
          : t,
      );

      setLearnerModel((lm) => {
        const correct = rating !== 'again';
        const confidence = fsrsRatingToConfidence(rating);
        const skill = ensureSkillNode(lm, concept, task.courseId);
        const updatedSkill = updateSkillMastery(skill, correct, confidence);
        let nextLm = applySkillUpdate(lm, updatedSkill);

        const betaIdx = betaMastery.findIndex(
          (b) => b.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 6))
            || concept.toLowerCase().includes(b.concept.toLowerCase().slice(0, 6)),
        );
        const betaRecord = betaIdx >= 0
          ? betaMastery[betaIdx]!
          : { concept, alpha: 1, beta: 1, firstAttempts: 0, importance: 1 };
        const nextBetaRecord = updateBetaMastery(betaRecord, correct);
        const nextBeta = betaIdx >= 0
          ? betaMastery.map((b, i) => (i === betaIdx ? nextBetaRecord : b))
          : [...betaMastery, nextBetaRecord];
        setBetaMastery(nextBeta);

        const nextSpacing = nextLm.spacingIntervals.some((s) => s.concept === concept)
          ? nextLm.spacingIntervals.map((s) =>
              s.concept === concept ? fsrsUpdated : s,
            )
          : [...nextLm.spacingIntervals, fsrsUpdated];

        let next: LearnerModel = {
          ...nextLm,
          spacingIntervals: nextSpacing,
          retrievalPerformance: correct
            ? Math.min(1, nextLm.retrievalPerformance + 0.04)
            : Math.max(0, nextLm.retrievalPerformance - 0.02),
          totalSessions: nextLm.totalSessions + 1,
        };
        next = recomputeLearnerMetrics(next, nextBeta, firstAttemptKeys, openMistakes);

        setCourses((prev) => updateCourseTopicMastery(prev, task.courseId, concept, correct ? 6 : -8, correct));

        setDashboardStats((stats) => {
          const nextStats: DashboardStats = {
            ...stats,
            tasksCompleted: stats.tasksCompleted + 1,
            todayXP: stats.todayXP + task.xpReward,
            weeklyXP: stats.weeklyXP + task.xpReward,
            reviewsDue: Math.max(0, stats.reviewsDue - 1),
          };
          setUser((u) => {
            const nextXp = u.xp + task.xpReward;
            const nextActs = logActivity(createActivity('review_done', `Reviewed: ${task.title} (${rating})`, task.xpReward));
            next = {
              ...next,
              retentionRate: computeRetentionRate(nextActs),
              weeklyMastery: weeklyMasteryFromActivities(nextActs),
            };
            persist(next, nextStats, updated, nextXp, nextBeta, firstAttemptKeys, openMistakes, nextActs, u.settings);
            return { ...u, xp: nextXp, level: levelFromXp(nextXp) };
          });
          return nextStats;
        });

        return next;
      });

      return updated;
    });
  }, [learnerModel.spacingIntervals, betaMastery, firstAttemptKeys, openMistakes, persist, recomputeLearnerMetrics]);

  const submitLeitnerRating = useCallback((concept: string, rating: FsrsRating, courseId?: string) => {
    const resolvedCourseId =
      courseId ??
      courses.find((c) => !MOCK_COURSE_IDS.has(c.id))?.id ??
      'unknown';
    const spacing = learnerModel.spacingIntervals.find((s) =>
      s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 6))
      || concept.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)),
    );
    const fsrsUpdated = applyFsrsToSpacing(spacing, concept, rating);
    const correct = rating !== 'again';
    const confidence = fsrsRatingToConfidence(rating);

    setLearnerModel((lm) => {
      const skill = ensureSkillNode(lm, concept, resolvedCourseId);
      const updatedSkill = updateSkillMastery(skill, correct, confidence);
      let nextLm = applySkillUpdate(lm, updatedSkill);

      const betaIdx = betaMastery.findIndex(
        (b) => b.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 6))
          || concept.toLowerCase().includes(b.concept.toLowerCase().slice(0, 6)),
      );
      const betaRecord = betaIdx >= 0
        ? betaMastery[betaIdx]!
        : { concept, alpha: 1, beta: 1, firstAttempts: 0, importance: 1 };
      const nextBetaRecord = updateBetaMastery(betaRecord, correct);
      const nextBeta = betaIdx >= 0
        ? betaMastery.map((b, i) => (i === betaIdx ? nextBetaRecord : b))
        : [...betaMastery, nextBetaRecord];
      setBetaMastery(nextBeta);

      const nextSpacing = nextLm.spacingIntervals.some((s) => s.concept === concept)
        ? nextLm.spacingIntervals.map((s) =>
            s.concept === concept ? fsrsUpdated : s,
          )
        : [...nextLm.spacingIntervals, fsrsUpdated];

      let next: LearnerModel = {
        ...nextLm,
        spacingIntervals: nextSpacing,
        retrievalPerformance: correct
          ? Math.min(1, nextLm.retrievalPerformance + 0.04)
          : Math.max(0, nextLm.retrievalPerformance - 0.02),
        totalSessions: nextLm.totalSessions + 1,
      };
      next = recomputeLearnerMetrics(next, nextBeta, firstAttemptKeys, openMistakes);

      setCourses((prev) => updateCourseTopicMastery(prev, resolvedCourseId, concept, correct ? 6 : -8, correct));

      const nextActs = logActivity(createActivity('review_done', `Leitner: ${concept} (${rating})`, 5));
      next = {
        ...next,
        retentionRate: computeRetentionRate(nextActs),
        weeklyMastery: weeklyMasteryFromActivities(nextActs),
      };
      persist(next, dashboardStats, tasks, user.xp, nextBeta, firstAttemptKeys, openMistakes, nextActs, user.settings);
      return next;
    });
  }, [courses, learnerModel.spacingIntervals, betaMastery, firstAttemptKeys, openMistakes, dashboardStats, tasks, user.xp, user.settings, persist, recomputeLearnerMetrics, logActivity]);

  const resolveMistake = useCallback((mistakeId: string) => {
    setOpenMistakes((prev) => {
      const next = prev.map((m) => (m.id === mistakeId ? { ...m, resolved: true } : m));
      setLearnerModel((lm) => {
        const updated = recomputeLearnerMetrics(lm, betaMastery, firstAttemptKeys, next);
        const nextActs = logActivity(createActivity('mistake_fixed', `Resolved mistake: ${next.find(m => m.id === mistakeId)?.concept ?? 'concept'}`));
        persist(updated, dashboardStats, tasks, user.xp, betaMastery, firstAttemptKeys, next, nextActs, user.settings);
        return updated;
      });
      return next;
    });
  }, [betaMastery, firstAttemptKeys, dashboardStats, tasks, user.xp, persist, recomputeLearnerMetrics]);

  const recordConfidence = useCallback((concept: string, predictedPct: number, actualPct: number) => {
    const point = {
      predicted: predictedPct / 100,
      actual: actualPct / 100,
      concept,
      timestamp: new Date().toISOString(),
    };
    const calibration = [...learnerModel.confidenceCalibration, point].slice(-20);
    const avgConf = Math.round(calibration.reduce((s, p) => s + p.predicted, 0) / calibration.length * 100);

    let next: LearnerModel = {
      ...learnerModel,
      confidenceCalibration: calibration,
      averageConfidence: avgConf,
    };
    next = recomputeLearnerMetrics(next, betaMastery, firstAttemptKeys, openMistakes);
    setLearnerModel(next);
    persist(next, dashboardStats, tasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, activities, user.settings);
  }, [learnerModel, betaMastery, firstAttemptKeys, openMistakes, dashboardStats, tasks, user.xp, user.settings, activities, persist, recomputeLearnerMetrics]);

  const recordQuizAttempt = useCallback((
    concept: string,
    correct: boolean,
    confidence: number,
    stepKey?: string,
    courseId?: string,
  ) => {
    const attemptKey = stepKey ?? `${concept}:${Date.now()}`;
    const isFirstAttempt = !firstAttemptKeys.has(attemptKey);
    const resolvedCourseId =
      courseId ??
      tasks.find((t) => getTaskConcept(t).toLowerCase() === concept.toLowerCase())?.courseId ??
      courses.find((c) => !MOCK_COURSE_IDS.has(c.id))?.id ??
      'unknown';

    const point = {
      predicted: confidence / 100,
      actual: correct ? 1 : 0,
      concept,
      timestamp: new Date().toISOString(),
    };
    const calibration = [...learnerModel.confidenceCalibration, point].slice(-20);
    const avgConf = Math.round(calibration.reduce((s, p) => s + p.predicted, 0) / calibration.length * 100);

    const nextKeys = isFirstAttempt ? new Set([...firstAttemptKeys, attemptKey]) : firstAttemptKeys;

    let nextBeta = betaMastery;
    if (isFirstAttempt) {
      const idx = betaMastery.findIndex((b) => concept.toLowerCase().includes(b.concept.toLowerCase().slice(0, 6))
        || b.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 6)));
      const record = idx >= 0
        ? betaMastery[idx]!
        : { concept, alpha: 1, beta: 1, firstAttempts: 0, importance: 1 };
      const updated = updateBetaMastery(record, correct);
      nextBeta = idx >= 0 ? betaMastery.map((b, i) => (i === idx ? updated : b)) : [...betaMastery, updated];
      setBetaMastery(nextBeta);
      setFirstAttemptKeys(nextKeys);
    }

    let nextMistakes = openMistakes;
    if (!correct && isFirstAttempt) {
      nextMistakes = [
        {
          id: `mistake-${Date.now()}`,
          concept,
          questionSummary: `Quiz on ${concept}`,
          courseId: resolvedCourseId,
          createdAt: new Date().toISOString(),
          resolved: false,
        },
        ...openMistakes,
      ].slice(0, 12);
      setOpenMistakes(nextMistakes);
    }

    const skill = ensureSkillNode(learnerModel, concept, resolvedCourseId);
    const updatedSkill = updateSkillMastery(skill, correct, confidence);
    let nextLm = applySkillUpdate(
      { ...learnerModel, confidenceCalibration: calibration, averageConfidence: avgConf },
      updatedSkill,
    );

    const spacingRow = nextLm.spacingIntervals.find((s) => s.concept === updatedSkill.concept);
    const fsrsRating = quizOutcomeToFsrsRating(correct, confidence);
    const fsrsUpdated = applyFsrsToSpacing(spacingRow, updatedSkill.concept, fsrsRating);
    const spacing = nextLm.spacingIntervals.some((s) => s.concept === updatedSkill.concept)
      ? nextLm.spacingIntervals.map((s) =>
          s.concept === updatedSkill.concept ? fsrsUpdated : s,
        )
      : [...nextLm.spacingIntervals, fsrsUpdated];

    let next: LearnerModel = {
      ...nextLm,
      spacingIntervals: spacing,
      retrievalPerformance: correct
        ? Math.min(1, nextLm.retrievalPerformance + 0.02)
        : Math.max(0, nextLm.retrievalPerformance - 0.03),
    };
    next = recomputeLearnerMetrics(next, nextBeta, nextKeys, nextMistakes);
    setLearnerModel(next);
    setCourses((prev) => updateCourseTopicMastery(prev, resolvedCourseId, concept, correct ? 8 : -10, correct));
    const actType = correct ? 'quiz_passed' : 'quiz_failed';
    const nextActs = logActivity(createActivity(actType, `${correct ? 'Passed' : 'Missed'} quiz on ${concept}`, correct ? 15 : undefined));
    const nextWithRetention = {
      ...next,
      retentionRate: computeRetentionRate(nextActs),
      weeklyMastery: weeklyMasteryFromActivities(nextActs),
    };
    setLearnerModel(nextWithRetention);
    persist(nextWithRetention, dashboardStats, tasks, user.xp, nextBeta, nextKeys, nextMistakes, nextActs, user.settings);
  }, [firstAttemptKeys, betaMastery, openMistakes, learnerModel, dashboardStats, tasks, courses, user.xp, user.settings, persist, recomputeLearnerMetrics, logActivity]);

  const addAgentMessage = useCallback((msg: AgentMessage) => {
    setAgentMessages((prev) => [...prev, msg]);
  }, []);

  const updateAgentMessage = useCallback((id: string, patch: Partial<AgentMessage>) => {
    setAgentMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const bindAgentToTask = useCallback((task: typeof mockTasks[number]) => {
    setAgentMode(getAgentMode(task));
    const concept = getTaskConcept(task);
    const contextMsg: AgentMessage = {
      id: `task-ctx-${task.id}-${Date.now()}`,
      role: 'system',
      content: `Task bound: **${task.title}** (${task.courseName}). Focus concept: **${concept}**. Work through the task, then mark it complete.`,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    setAgentMessages((prev) => [...prev, contextMsg]);
  }, []);

  const openAgentFromWorkspace = useCallback((opts?: import('../lib/agentWorkspaceContext').OpenAgentFromWorkspaceOpts) => {
    const merged = mergeAgentWorkspaceContext(workspaceLiveRef.current?.agentContext, opts?.context);
    if (opts?.mode) setAgentMode(opts.mode);
    setAgentDraftPrompt(opts?.prompt?.trim() || null);
    setAgentAutoSend(opts?.autoSend ?? false);
    setAgentWorkspaceContext(merged);
    setWorkspaceAgentSplit(false);
    studyWorkspaceOpenRef.current = false;
    setStudyWorkspaceOpen(false);
    navigate('agent');
  }, [navigate]);

  const startTaskRef = useRef<(taskId: string) => void>(() => {});

  const closeTaskViews = useCallback(() => {
    closeCompetingTaskOverlays();
  }, [closeCompetingTaskOverlays]);

  const advanceSession = useCallback((completedTaskId: string) => {
    setSessionQueue((prev) => {
      if (prev.length === 0) return prev;
      const remaining = prev[0] === completedTaskId ? prev.slice(1) : prev.filter((id) => id !== completedTaskId);
      if (remaining.length > 0) {
        setTimeout(() => startTaskRef.current(remaining[0]!), 150);
      } else {
        setActiveSessionType(null);
        setSessionTotal(0);
      }
      return remaining;
    });
  }, []);

  const completeTaskAndAdvance = useCallback((taskId: string) => {
    completeTask(taskId);
    closeTaskViews();
    setActiveTaskId(null);
    advanceSession(taskId);
  }, [completeTask, advanceSession, closeTaskViews]);

  const submitReviewAndAdvance = useCallback((taskId: string, rating: FsrsRating) => {
    submitReviewRating(taskId, rating);
    closeTaskViews();
    setActiveTaskId(null);
    advanceSession(taskId);
  }, [submitReviewRating, advanceSession, closeTaskViews]);

  const endSession = useCallback(() => {
    setSessionQueue([]);
    setSessionTotal(0);
    setActiveSessionType(null);
    setActiveTaskId(null);
    setActiveLessonView(false);
    setPracticalLessonView(false);
    setStudyWorkspaceOpen(false);
    setReviewSessionOpen(false);
    setMistakeRetryOpen(false);
    setExamPrepOpen(false);
    setPrerequisiteRepairOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setUser((prev) => {
      const nextTheme = cycleTheme(prev.settings.theme);
      applyTheme(nextTheme);
      return { ...prev, settings: { ...prev.settings, theme: nextTheme } };
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setUser((prev) => {
      const nextSettings = { ...prev.settings, ...partial };
      if (partial.theme) applyTheme(partial.theme);
      if (partial.teachingStyle || partial.explanationDepth || partial.challengeLevel) {
        setAgentMode(settingsToAgentMode(nextSettings));
      }
      persist(learnerModel, dashboardStats, tasks, prev.xp, betaMastery, firstAttemptKeys, openMistakes, activities, nextSettings);
      return { ...prev, settings: nextSettings };
    });
  }, [learnerModel, dashboardStats, tasks, betaMastery, firstAttemptKeys, openMistakes, activities, persist]);

  const logStudyMinutes = useCallback((minutes: number, label = 'Focus session') => {
    if (minutes <= 0) return;
    setDashboardStats((stats) => {
      const nextStats: DashboardStats = {
        ...stats,
        studyTimeToday: stats.studyTimeToday + minutes,
        studyTimeWeek: stats.studyTimeWeek + minutes,
      };
      const nextActs = logActivity(createActivity('study_time', `${label}: ${minutes} min`, Math.round(minutes * 2)));
      persist(learnerModel, nextStats, tasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, nextActs, user.settings);
      return nextStats;
    });
  }, [learnerModel, tasks, user.xp, user.settings, betaMastery, firstAttemptKeys, openMistakes, persist, logActivity]);

  const applyRemoteLibrary = useCallback((merged: ReturnType<typeof mergeLibraries>) => {
    setUploadedFiles(merged.uploadedFiles);
    setGlossaryEntries(merged.glossaryEntries);
    const nextCourses = initialCourses(merged.generatedCourses, user.settings, mockCourses);
    setCourses(nextCourses);

    let nextTasks = stripDemoFromTasks(tasks);
    for (const course of merged.generatedCourses) {
      if (course.status !== 'generating') {
        nextTasks = mergeCourseTasks(nextTasks, course, user.settings.language);
      }
    }
    setTasks(nextTasks);

    let nextLm = learnerModel;
    let nextBeta = betaMastery;
    for (const course of merged.generatedCourses) {
      nextBeta = mergeBetaFromCourse(nextBeta, course);
      nextLm = mergeSkillNodesFromCourse(nextLm, course);
    }
    const nextLmMetrics = recomputeLearnerMetrics(nextLm, nextBeta, firstAttemptKeys, openMistakes);
    setBetaMastery(nextBeta);
    setLearnerModel(nextLmMetrics);
    persistLibrary(merged.uploadedFiles, merged.glossaryEntries, merged.generatedCourses);
    persist(nextLmMetrics, dashboardStats, nextTasks, user.xp, nextBeta, firstAttemptKeys, openMistakes, activities, user.settings);
    void hydrateLibrary(merged).then((hydrated) => {
      if (hydrated.uploadedFiles.some((f, i) => f.extractedText !== merged.uploadedFiles[i]?.extractedText)) {
        setUploadedFiles(hydrated.uploadedFiles);
      }
    });
  }, [user.settings, tasks, learnerModel, betaMastery, firstAttemptKeys, openMistakes, dashboardStats, user.xp, activities, persist, persistLibrary, recomputeLearnerMetrics]);

  const pullLibraryFromServer = useCallback(async () => {
    const token = user.settings.authToken;
    if (!token) throw new Error('Sign in to pull your library');
    const remote = await fetchRemoteLibrary(token, user.settings);
    const local = loadLibrarySync();
    const merged = mergeLibraries(local, remoteLibraryToPersisted(remote));
    applyRemoteLibrary(merged);
    return merged;
  }, [user.settings, applyRemoteLibrary]);

  const applyRemoteSession = useCallback((merged: ReturnType<typeof mergeSessions>) => {
    if (merged.conceptBuses) replaceAllConceptBuses(merged.conceptBuses);
    if (merged.stepSchedules) replaceAllStepSchedules(merged.stepSchedules);
    if (merged.leitnerDeckStates) replaceAllDeckStates(merged.leitnerDeckStates);

    const nextTasks = stripDemoFromTasks(merged.tasks as typeof tasks);
    const nextKeys = new Set(merged.firstAttemptKeys);
    const nextLmBase = syncLearnerHeatmap(merged.learnerModel, merged.activities);
    const nextLm = enrichLearnerModelFromConceptBus(
      nextLmBase,
      merged.conceptBuses ?? {},
      merged.betaMastery,
    );
    const nextStats = {
      ...merged.dashboardStats,
      streak: computeStreakFromHeatmap(nextLm.heatmapData),
      reviewsDue: mergeDashboardReviewsDue(
        merged.dashboardStats.reviewsDue,
        merged.stepSchedules ?? {},
      ),
    };
    setLearnerModel(nextLm);
    setDashboardStats(nextStats);
    setTasks(nextTasks);
    setBetaMastery(merged.betaMastery);
    setFirstAttemptKeys(nextKeys);
    setOpenMistakes(merged.openMistakes);
    setActivities(merged.activities);
    setUser((u) => {
      const merged2 = applyAuthIdentity(u, merged.userSettings.authEmail);
      return {
        ...merged2,
        xp: merged.xp,
        level: levelFromXp(merged.xp),
        settings: { ...u.settings, ...merged.userSettings },
      };
    });
    persist(
      nextLm,
      nextStats,
      nextTasks,
      merged.xp,
      merged.betaMastery,
      nextKeys,
      merged.openMistakes,
      merged.activities,
      { ...user.settings, ...merged.userSettings },
    );
  }, [persist, user.settings]);

  const pullSessionFromServer = useCallback(async () => {
    const token = user.settings.authToken;
    if (!token) throw new Error('Sign in to pull your session');
    const remote = await fetchRemoteSession(token, user.settings);
    const local = loadLocalSession();
    const merged = mergeSessions(local, remoteSessionToLocal(remote));
    applyRemoteSession(merged);
    return merged;
  }, [user.settings, applyRemoteSession]);

  const pushSessionToServer = useCallback(async () => {
    const token = user.settings.authToken;
    if (!token) throw new Error('Sign in to push your session');
    const local = loadLocalSession();
    const payload = localSessionToRemote({
      learnerModel,
      dashboardStats,
      tasks,
      xp: user.xp,
      betaMastery,
      firstAttemptKeys: [...firstAttemptKeys],
      openMistakes,
      activities,
      userSettings: user.settings,
      conceptBuses: loadAllConceptBuses() as import('../lib/conceptBusSync').ConceptBusMap,
      stepSchedules: loadAllStepSchedules(),
      leitnerDeckStates: loadAllDeckStates(),
      ...local,
    });
    return pushRemoteSession(token, user.settings, payload);
  }, [
    user.settings,
    user.xp,
    learnerModel,
    dashboardStats,
    tasks,
    betaMastery,
    firstAttemptKeys,
    openMistakes,
    activities,
  ]);

  const conceptBusPusherRef = useRef<ReturnType<typeof createDebouncedConceptBusPusher> | null>(null);

  useEffect(() => {
    conceptBusPusherRef.current = createDebouncedConceptBusPusher(
      () => pushSessionToServer(),
      {
        debounceMs: 2500,
        isEnabled: () => Boolean(user.settings.authToken),
      },
    );
    return () => {
      conceptBusPusherRef.current?.cancel();
    };
  }, [pushSessionToServer, user.settings.authToken]);

  const queueConceptBusSync = useCallback(() => {
    conceptBusPusherRef.current?.schedule();
  }, []);

  const flushConceptBusSync = useCallback(async () => {
    await conceptBusPusherRef.current?.flush();
  }, []);

  const closeStudyWorkspace = useCallback(() => {
    ++workspaceCloseGenRef.current;
    studyWorkspaceOpenRef.current = false;
    setStudyWorkspaceOpen(false);
    setWorkspaceAgentSplit(false);
    setWorkspaceCourseSplit(false);
    setActiveTaskId(null);
    void flushConceptBusSync().catch(() => {});
  }, [flushConceptBusSync]);

  useEffect(() => {
    if (!user.settings.authToken) return;
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        void conceptBusPusherRef.current?.flush();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [user.settings.authToken]);

  const syncAccountOnLogin = useCallback(async () => {
    const token = user.settings.authToken;
    if (token) {
      try {
        const me = await authMe(token, user.settings);
        if (me.email) {
          setUser((u) => applyAuthIdentity(u, me.email));
        }
      } catch {
        /* ignore — sync still proceeds */
      }
    }
    await pullLibraryFromServer();
    await pullSessionFromServer();
    await pushSessionToServer();
  }, [user.settings, pullLibraryFromServer, pullSessionFromServer, pushSessionToServer]);

  const refreshAuthPlan = useCallback(async () => {
    const token = user.settings.authToken;
    if (!token) return null;
    const me = await authMe(token, user.settings);
    updateSettings({ authPlan: me.plan, authEmail: me.email ?? user.settings.authEmail });
    if (me.email) {
      setUser((u) => applyAuthIdentity(u, me.email));
    }
    return me.plan;
  }, [user.settings, updateSettings]);

  const autoSessionSynced = useRef<string | null>(null);
  useEffect(() => {
    const token = user.settings.authToken;
    if (!token || autoSessionSynced.current === token) return;
    autoSessionSynced.current = token;
    void pullSessionFromServer().catch(() => {
      autoSessionSynced.current = null;
    });
  }, [user.settings.authToken, pullSessionFromServer]);

  const processUpload = useCallback(async (payload: UploadPayload) => {
    setIsUploading(true);
    try {
      const MIN_SOURCE_CHARS = 80;
      const fileTexts: string[] = [];
      const newFiles: UploadedFile[] = [];
      let ytTranscript = '';
      const pasted = payload.pastedContent?.trim() ?? '';

      for (const f of payload.files) {
        const extracted = await extractFileContent(f, user.settings);
        if (extracted.text.trim()) fileTexts.push(extracted.text);
        newFiles.push(
          uploadedFileMeta(f, undefined, undefined, extracted.text, extracted.pageCount, {
            ocrUsed: extracted.ocrUsed,
            ingestMethod: extracted.ingestMethod ?? (extracted.ocrUsed ? 'ocr-client' : 'text-layer'),
            ocrRegions: extracted.ocrRegions,
            ocrModelsUsed: extracted.ocrModelsUsed,
            pdfLayoutBlocks: extracted.layoutBlocks,
          }),
        );
        if (extracted.ocrUsed) {
          emitAnalyticsLearningEvent('ocr_applied', { fileName: f.name, chars: extracted.text.length });
        }
      }
      if (payload.youtubeUrl) {
        const fetched = await fetchYoutubeTranscript(payload.youtubeUrl, user.settings);
        if (fetched?.trim()) {
          ytTranscript = fetched;
          fileTexts.push(ytTranscript);
        }
      }

      let text = [pasted, ...fileTexts].filter(Boolean).join('\n\n');
      if (text.trim().length < MIN_SOURCE_CHARS) {
        text = await readTextFromFiles(payload.files, user.settings);
      }
      if (text.trim().length < MIN_SOURCE_CHARS) {
        throw new Error(
          'Could not extract enough readable text (need at least 80 characters). '
          + 'Use PDF with selectable text, scanned PDF (OCR), DOCX, TXT/MD, images, or paste your notes directly.',
        );
      }

      if (pasted && !fileTexts.some((t) => t.includes(pasted.slice(0, 40)))) {
        newFiles.push({
          id: `file-paste-${Date.now()}`,
          name: 'Pasted notes',
          type: 'txt',
          size: pasted.length,
          uploadedAt: new Date().toISOString(),
          status: 'analyzed',
          progress: 100,
          extractedText: pasted,
        });
      }
      if (newFiles.length === 0) {
        newFiles.push({
          id: `file-source-${Date.now()}`,
          name: payload.files[0]?.name ?? 'Course notes',
          type: 'txt',
          size: text.length,
          uploadedAt: new Date().toISOString(),
          status: 'analyzed',
          progress: 100,
          extractedText: text,
        });
      }

    // Course generation runs off the main thread in a Web Worker so the UI
    // stays responsive during LLM calls, embedding clustering, and course building.
    const fileNames = payload.files.map((f) => f.name);
    const extendTarget =
      payload.uploadMode === 'extend' && payload.targetCourseId
        ? courses.find((c) => c.id === payload.targetCourseId && !MOCK_COURSE_IDS.has(c.id))
        : undefined;

    const workerPayload = {
      files: payload.files.map((f) => ({ name: f.name, type: getFileType(f.name), size: f.size })),
      pastedContent: pasted,
      youtubeUrl: payload.youtubeUrl,
      sourceMode: payload.sourceMode,
      focusTags: payload.focusTags,
      examDate: payload.examDate,
      title: payload.title,
      targetCourseId: payload.targetCourseId,
      uploadMode: payload.uploadMode,
      editedOutline: payload.editedOutline,
    };

    const lang = user.settings.language === 'el' ? 'el' : 'en';
    const documentRecognitionPromise = recognizeDocumentModelsForUpload(newFiles, text, lang);

    const result = await recognizeCourse({
      text,
      fileNames,
      payload: workerPayload,
      settings: user.settings,
      existingCount: courses.length,
      extendTarget,
      uploadedFiles,
      glossaryEntries,
    });

    let course = result.course;
    let nextGlossary = result.glossary;
    const topics = course.topics.map((t) => t.title);
    const withCourse: UploadedFile[] = result.withCourse.length > 0
      ? result.withCourse.map((meta, i) => ({
        ...meta,
        courseId: course.id,
        extractedTopics: topics,
        pipelineVersion: CONTENT_PIPELINE_VERSION,
        extractedText: newFiles[i]?.extractedText?.trim()
          ? newFiles[i]!.extractedText
          : (newFiles.length === 1 ? text : meta.extractedText),
        pageCount: newFiles[i]?.pageCount ?? meta.pageCount,
        ocrUsed: newFiles[i]?.ocrUsed,
        ingestMethod: newFiles[i]?.ingestMethod ?? (pasted ? 'paste' : undefined),
      }))
      : newFiles.map((f) => ({
        ...f,
        courseId: course.id,
        extractedTopics: topics,
        pipelineVersion: CONTENT_PIPELINE_VERSION,
        extractedText: f.extractedText?.trim() ? f.extractedText : text,
        ingestMethod: f.ingestMethod ?? (pasted ? 'paste' : undefined),
      }));
    if (result.ytFile) {
      withCourse.push({
        ...result.ytFile,
        courseId: course.id,
        extractedTopics: topics,
        extractedText: ytTranscript || undefined,
        size: ytTranscript.length,
        ingestMethod: 'youtube',
        pipelineVersion: CONTENT_PIPELINE_VERSION,
      });
    }

    const documentRecognition = await documentRecognitionPromise;
    const withRecognition = attachDocumentSnapshots(withCourse, documentRecognition);
    if (documentRecognition.courseSummary) {
      course = { ...course, recognitionSummary: documentRecognition.courseSummary };
    }

    const conceptLabels = [...new Set(course.topics.flatMap((t) => t.keyConcepts ?? [t.title]))];
    if (conceptLabels.length > 0 && withRecognition.some((f) => (f.extractedText?.trim().length ?? 0) > 40)) {
      course = {
        ...course,
        conceptSpans: buildConceptSpans(withRecognition, conceptLabels, course.id),
        pipelineMeta: course.pipelineMeta ?? {
          version: CONTENT_PIPELINE_VERSION,
          generatedAt: new Date().toISOString(),
          outlineSource: result.outline ? (extendTarget ? 'extend' : 'lexical') : 'fallback',
        },
      };
    }

    course = await enrichCourseWithCrossLinks(
      course,
      text,
      courses.filter((c) => !MOCK_COURSE_IDS.has(c.id)),
      uploadedFiles,
    );

    const nextFiles = [...uploadedFiles, ...withRecognition];

    const generatedOnly = [
      ...courses.filter((c) => !MOCK_COURSE_IDS.has(c.id) && c.id !== course.id),
      course,
    ];
    const nextCourses = initialCourses(generatedOnly, user.settings, mockCourses);
    const nextTasks = mergeCourseTasks(stripDemoFromTasks(tasks), course, user.settings.language);
    const nextBeta = mergeBetaFromCourse(betaMastery, course);
    const nextLm = mergeSkillNodesFromCourse(learnerModel, course);
    const nextLmMetrics = recomputeLearnerMetrics(nextLm, nextBeta, firstAttemptKeys, openMistakes);
    setUploadedFiles(nextFiles);
    setCourses(nextCourses);
    setTasks(nextTasks);
    setBetaMastery(nextBeta);
    setLearnerModel(nextLmMetrics);
    persistLibrary(nextFiles, nextGlossary, nextCourses.filter((c) => !MOCK_COURSE_IDS.has(c.id)));
    const actLabel = extendTarget ? `Extended course: ${course.title}` : `Created course: ${course.title}`;
    emitAnalyticsLearningEvent('course_generated', {
      topicCount: course.topics.length,
      conceptCount: course.conceptCount,
      pipelineVersion: CONTENT_PIPELINE_VERSION,
    }, { courseId: course.id });
    const nextActs = logActivity(createActivity('upload', actLabel));
    persist(nextLmMetrics, dashboardStats, nextTasks, user.xp, nextBeta, firstAttemptKeys, openMistakes, nextActs, user.settings);
      setSelectedCourse(course);
      showAppToast(formatUploadSuccessToast(summarizeUploadStructure(text, lang), lang));
    return course;
    } finally {
      setIsUploading(false);
    }
  }, [courses, uploadedFiles, glossaryEntries, learnerModel, dashboardStats, tasks, user.xp, user.settings, betaMastery, firstAttemptKeys, openMistakes, persist, persistLibrary, logActivity, showAppToast]);

  const reprocessCourseMaterial = useCallback((courseId: string) => {
    setIsReprocessing(true);
    try {
      const result = runCourseReprocess(courseId, courses, uploadedFiles);
      if (!result) {
        const lang = user.settings.language === 'el' ? 'el' : 'en';
        showAppToast(t('toastNoStoredText', lang));
        return false;
      }
      const nextCourses = courses.map((c) => (c.id === courseId ? result.course : c));
      setCourses(nextCourses);
      setUploadedFiles(result.files);
      let nextTasks = tasks;
      let taskDelta: ReturnType<typeof summarizeReprocessTaskDelta> | null = null;
      if (result.tasksRegenerated) {
        nextTasks = regenerateTasksAfterReprocess(tasks, result.course, user.settings.language);
        taskDelta = summarizeReprocessTaskDelta(
          tasks,
          nextTasks,
          courseId,
          result.course.topics.length,
        );
        setTasks(nextTasks);
      }
      const nextGlossary = regenerateGlossaryAfterReprocess(glossaryEntries, courseId, result.glossary);
      setGlossaryEntries(nextGlossary);
      if (selectedCourse?.id === courseId) setSelectedCourse(result.course);
      persistLibrary(result.files, nextGlossary, nextCourses.filter((c) => !MOCK_COURSE_IDS.has(c.id)));
      if (result.tasksRegenerated) {
        persist(learnerModel, dashboardStats, nextTasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, activities, user.settings);
      }
      const courseFiles = result.files.filter(
        (f) => f.courseId === courseId && (f.extractedText?.trim().length ?? 0) > 0,
      );
      const textByFileKey = Object.fromEntries(
        courseFiles.map((f) => [f.name, f.extractedText!.trim()]),
      );
      const annotationsFlagged = reprocessCourseAnnotations(
        courseFiles.map((f) => f.name),
        textByFileKey,
        CONTENT_PIPELINE_VERSION,
      );
      clearQuizSessions();
      markCourseArtifactsStale(courseId, CONTENT_PIPELINE_VERSION);
      const lang = user.settings.language === 'el' ? 'el' : 'en';
      const reviewHint = annotationsFlagged > 0
        ? t('toastAnnotationsReview', lang).replace('{count}', String(annotationsFlagged))
        : '';
      const taskHint = taskDelta && taskDelta.addedGenerated > 0
        ? t('toastNewTasks', lang)
          .replace('{added}', String(taskDelta.addedGenerated))
          .replace('{removed}', String(taskDelta.removedGenerated))
        : '';
      const staleHint = t('toastArtifactsStale', lang);
      showAppToast(
        (result.tasksRegenerated
          ? t('toastReprocessFull', lang)
          : t('toastReprocessRecognition', lang)) + taskHint + staleHint + reviewHint,
      );
      return true;
    } finally {
      setIsReprocessing(false);
    }
  }, [courses, uploadedFiles, glossaryEntries, tasks, selectedCourse, learnerModel, dashboardStats, user, betaMastery, firstAttemptKeys, openMistakes, activities, persistLibrary, persist, showAppToast]);

  const saveCourseExtractedText = useCallback((courseId: string, text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 40) {
      const lang = user.settings.language === 'el' ? 'el' : 'en';
      showAppToast(t('toastTextTooShort', lang));
      return false;
    }
    const linked = uploadedFiles.filter(
      (f) => f.courseId === courseId && (f.extractedText?.trim().length ?? 0) > 0,
    );
    if (linked.length === 0) return false;

    const primary = linked[0];
    const nextFiles = uploadedFiles.map((f) =>
      f.id === primary.id ? { ...f, extractedText: trimmed } : f,
    );
    setUploadedFiles(nextFiles);
    persistLibrary(nextFiles, glossaryEntries, courses.filter((c) => !MOCK_COURSE_IDS.has(c.id)));
    return true;
  }, [uploadedFiles, glossaryEntries, courses, persistLibrary, user.settings.language, showAppToast]);

  const importNotebookLm = useCallback((raw: string, opts?: { courseId?: string }): NotebookLmImportResult | null => {
    const parsed = parseNotebookLmExport(raw);
    if (!parsed.markdown.trim() && parsed.quizCards.length === 0 && parsed.chatTurns.length === 0 && parsed.audioSegments.length === 0) {
      const lang = user.settings.language === 'el' ? 'el' : 'en';
      notifyWarning(
        lang === 'el' ? 'Κενό περιεχόμενο' : 'Empty content',
        lang === 'el' ? 'Επικόλλησε κείμενο από NotebookLM.' : 'Paste text from NotebookLM.',
      );
      return null;
    }
    const file = buildNotebookLmUploadedFile(parsed, { courseId: opts?.courseId });
    const nextFiles = [...uploadedFiles, file];
    setUploadedFiles(nextFiles);
    persistLibrary(nextFiles, glossaryEntries, courses.filter((c) => !MOCK_COURSE_IDS.has(c.id)));
    const lang = user.settings.language === 'el' ? 'el' : 'en';
    notifySuccess(
      lang === 'el' ? 'Εισαγωγή NotebookLM' : 'NotebookLM import',
      parsed.kind === 'chat'
        ? (lang === 'el'
          ? `${parsed.title} · ${parsed.chatTurns.length} γύροι chat`
          : `${parsed.title} · ${parsed.chatTurns.length} chat turns`)
        : parsed.kind === 'audio-transcript'
          ? (lang === 'el'
            ? `${parsed.title} · ${parsed.audioSegments.length} κεφάλαια`
            : `${parsed.title} · ${parsed.audioSegments.length} chapters`)
          : parsed.quizCards.length > 0
            ? (lang === 'el'
              ? `${parsed.title} · ${parsed.quizCards.length} κάρτες quiz`
              : `${parsed.title} · ${parsed.quizCards.length} quiz cards`)
            : parsed.title,
    );
    return parsed;
  }, [uploadedFiles, glossaryEntries, courses, persistLibrary, user.settings.language]);

  const importNotebookLmAudioForCourse = useCallback((raw: string, courseId: string): boolean => {
    const parsed = buildNotebookLmAudioImportResult(raw);
    const lang = user.settings.language === 'el' ? 'el' : 'en';
    if (!parsed) {
      notifyWarning(
        lang === 'el' ? 'Μη έγκυρο transcript' : 'Invalid transcript',
        lang === 'el'
          ? 'Επικόλλησε transcript από NotebookLM Studio Audio (με κεφάλαια ή χρονικές σημάνσεις).'
          : 'Paste a NotebookLM Studio Audio transcript (chapters or timestamps).',
      );
      return false;
    }
    const file = buildNotebookLmUploadedFile(parsed, { courseId });
    const nextFiles = [...uploadedFiles, file];
    setUploadedFiles(nextFiles);
    persistLibrary(nextFiles, glossaryEntries, courses.filter((c) => !MOCK_COURSE_IDS.has(c.id)));
    notifySuccess(
      lang === 'el' ? 'Audio transcript' : 'Audio transcript',
      lang === 'el'
        ? `${parsed.title} · ${parsed.audioSegments.length} κεφάλαια`
        : `${parsed.title} · ${parsed.audioSegments.length} chapters`,
    );
    return true;
  }, [uploadedFiles, glossaryEntries, courses, persistLibrary, user.settings.language]);

  const importNotebookLmQuizToFsrs = useCallback((
    result: NotebookLmImportResult,
    opts?: { openWorkspace?: boolean; courseId?: string },
  ): NotebookLmFsrsImportResult | null => {
    if (result.quizCards.length === 0) {
      const lang = user.settings.language === 'el' ? 'el' : 'en';
      notifyWarning(
        lang === 'el' ? 'Χωρίς κάρτες quiz' : 'No quiz cards',
        lang === 'el' ? 'Επικόλλησε Studio Quiz από NotebookLM.' : 'Paste a Studio Quiz from NotebookLM.',
      );
      return null;
    }

    const prepared = prepareNotebookLmFsrsImport(result, learnerModel.spacingIntervals);
    const lang = user.settings.language === 'el' ? 'el' : 'en';
    const courseId =
      opts?.courseId ??
      selectedCourse?.id ??
      courses.find((c) => !MOCK_COURSE_IDS.has(c.id))?.id;

    setLearnerModel((lm) => {
      const next: LearnerModel = {
        ...lm,
        spacingIntervals: prepared.spacing,
      };
      persist(next, dashboardStats, tasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, activities, user.settings);
      return next;
    });

    if (prepared.added === 0) {
      notifyWarning(
        lang === 'el' ? 'Ήδη στο deck' : 'Already in deck',
        lang === 'el'
          ? 'Οι κάρτες quiz υπάρχουν ήδη στο FSRS deck.'
          : 'Quiz cards are already in your FSRS deck.',
      );
    } else {
      notifySuccess(
        lang === 'el' ? 'FSRS deck' : 'FSRS deck',
        lang === 'el'
          ? `${prepared.added} κάρτες · ${prepared.studyConcept}`
          : `${prepared.added} cards · ${prepared.studyConcept}`,
      );
    }

    if (opts?.openWorkspace !== false && prepared.added > 0) {
      openStudyWorkspaceForPractice({
        tool: 'leitner',
        concept: prepared.studyConcept,
        courseId,
      });
    }

    return {
      added: prepared.added,
      skipped: prepared.skipped,
      studyConcept: prepared.studyConcept,
      scopeKey: prepared.scopeKey,
    };
  }, [
    learnerModel.spacingIntervals,
    selectedCourse?.id,
    courses,
    user.settings,
    user.xp,
    dashboardStats,
    tasks,
    betaMastery,
    firstAttemptKeys,
    openMistakes,
    activities,
    persist,
    openStudyWorkspaceForPractice,
  ]);

  const removeUploadedFile = useCallback((fileId: string) => {
    const result = removeUploadedFileFromLibrary(fileId, uploadedFiles, courses);
    if (!result.removed) {
      const lang = user.settings.language === 'el' ? 'el' : 'en';
      showAppToast(t('toastFileNotFound', lang));
      return false;
    }
    const removedCourseId = uploadedFiles.find((f) => f.id === fileId)?.courseId;
    const nextGlossary = glossaryAfterCourseSourceRemoval(
      glossaryEntries,
      removedCourseId,
      result.remainingFilesForCourse,
    );
    const nextTasks = tasksAfterFileRemoval(
      tasks,
      removedCourseId,
      result.remainingFilesForCourse,
    );
    setUploadedFiles(result.files);
    setCourses(result.courses);
    setTasks(nextTasks);
    const courseId = removedCourseId;
    if (selectedCourse?.id === courseId) {
      const updated = result.courses.find((c) => c.id === courseId);
      if (updated) setSelectedCourse(updated);
    }
    persistLibrary(
      result.files,
      nextGlossary,
      result.courses.filter((c) => !MOCK_COURSE_IDS.has(c.id)),
    );
    persist(learnerModel, dashboardStats, nextTasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, activities, user.settings);
    if (result.courseFullyOrphaned && courseId) {
      clearCourseArtifactsStale(courseId);
    }
    const lang = user.settings.language === 'el' ? 'el' : 'en';
    if (result.reprocessed && courseId) {
      markCourseArtifactsStale(courseId, CONTENT_PIPELINE_VERSION);
      clearQuizSessions();
    }
    const cascadeNote = result.courseFullyOrphaned
      ? t('toastCourseTasksRemoved', lang)
      : '';
    showAppToast(
      (result.reprocessed
        ? t('toastFileRemovedReprocessed', lang)
        : t('toastFileRemoved', lang)) + cascadeNote,
    );
    return true;
  }, [uploadedFiles, courses, glossaryEntries, tasks, selectedCourse, learnerModel, dashboardStats, user, betaMastery, firstAttemptKeys, openMistakes, activities, persistLibrary, persist, showAppToast]);

  const removeCourse = useCallback((courseId: string) => {
    const result = removeCourseFromLibrary(courseId, courses, uploadedFiles, glossaryEntries, tasks);
    const lang = user.settings.language === 'el' ? 'el' : 'en';
    if (!result.removed) {
      if (result.reason === 'demo') {
        showAppToast(t('toastDemoCourseNoDelete', lang));
      } else {
        showAppToast(t('toastCourseNotFound', lang));
      }
      return false;
    }
    setCourses(result.courses);
    setUploadedFiles(result.files);
    setGlossaryEntries(result.glossary);
    setTasks(result.tasks);
    clearCourseArtifactsStale(courseId);
    clearQuizSessions();
    persistLibrary(
      result.files,
      result.glossary,
      result.courses.filter((c) => !MOCK_COURSE_IDS.has(c.id)),
    );
    persist(learnerModel, dashboardStats, result.tasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, activities, user.settings);
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(null);
      navigate('library');
    }
    showAppToast(t('toastCourseRemoved', lang));
    return true;
  }, [
    courses, uploadedFiles, glossaryEntries, tasks, selectedCourse, learnerModel, dashboardStats,
    user, betaMastery, firstAttemptKeys, openMistakes, activities, persistLibrary, persist,
    navigate, showAppToast,
  ]);

  const simulateUpload = useCallback((files: File[]) => {
    setIsUploading(true);
    const newFiles: UploadedFile[] = files.map((f, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: f.name,
      type: getFileType(f.name),
      size: f.size,
      uploadedAt: new Date().toISOString(),
      status: 'uploading' as const,
      progress: 0,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadedFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'processing' as const, progress: 100 } : f));
          setTimeout(() => {
            setUploadedFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'analyzed' as const } : f));
            setIsUploading(false);
          }, 2000);
        } else {
          setUploadedFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, progress } : f));
        }
      }, 500);
    });
  }, []);

  const startTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'completed') return;

    closeCompetingTaskOverlays();
    setActiveTaskId(taskId);
    const action = getTaskAction(task);

    switch (action) {
      case 'practical':
        setPracticalLessonView(true);
        break;
      case 'workspace':
        openStudyWorkspace({ keepTask: true });
        break;
      case 'agent':
        bindAgentToTask(task);
        navigate('agent');
        break;
      case 'tasks-review':
        setReviewSessionOpen(true);
        break;
      case 'tasks-fix':
        setMistakeRetryOpen(true);
        break;
      case 'tasks-prereq':
        setPrerequisiteRepairOpen(true);
        break;
      case 'exam-prep':
        setExamPrepOpen(true);
        break;
      default:
        setActiveLessonView(true);
        break;
    }
  }, [tasks, navigate, bindAgentToTask, openStudyWorkspace, closeCompetingTaskOverlays]);

  startTaskRef.current = startTask;

  const startSession = useCallback((sessionType: SessionType) => {
    const queue = filterTasksForSession(tasks, sessionType);
    if (queue.length === 0) {
      navigate('tasks');
      return;
    }
    const ids = queue.map((t) => t.id);
    setActiveSessionType(sessionType);
    setSessionQueue(ids);
    setSessionTotal(ids.length);
    startTask(ids[0]!);
  }, [tasks, startTask, navigate]);

  const resolveMisconception = useCallback((misconceptionId: string) => {
    setLearnerModel((lm) => {
      const target = lm.misconceptions.find((m) => m.id === misconceptionId);
      const next: LearnerModel = {
        ...lm,
        misconceptions: lm.misconceptions.map((m) =>
          m.id === misconceptionId ? { ...m, corrected: true } : m,
        ),
      };
      const updated = recomputeLearnerMetrics(next, betaMastery, firstAttemptKeys, openMistakes);
      const nextActs = logActivity(createActivity('mistake_fixed', `Corrected misconception: ${target?.concept ?? 'concept'}`));
      persist(updated, dashboardStats, tasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, nextActs, user.settings);
      return updated;
    });
  }, [betaMastery, firstAttemptKeys, openMistakes, learnerModel, dashboardStats, tasks, user, persist, recomputeLearnerMetrics, logActivity]);

  const activeTask = useMemo(
    () => (activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null),
    [activeTaskId, tasks],
  );

  const completeOnboarding = useCallback((data: {
    role?: string;
    goals?: string[];
    dailyGoalMinutes?: number;
    examDate?: string;
    openUpload?: boolean;
    openTeacher?: boolean;
    displayName?: string;
  }) => {
    const isTeacher = data.role === 'tutor' || data.openTeacher;
    setUser((prev) => {
      const nextSettings: UserSettings = {
        ...prev.settings,
        dailyGoalMinutes: data.dailyGoalMinutes ?? prev.settings.dailyGoalMinutes,
        examDate: data.examDate || prev.settings.examDate,
      };
      const trimmedName = (data.displayName ?? '').trim();
      const next = {
        ...prev,
        name: trimmedName || prev.name,
        segment: (data.role as typeof prev.segment) ?? prev.segment,
        role: isTeacher ? ('teacher' as const) : prev.role,
        onboardingComplete: true,
        settings: nextSettings,
      };
      persist(learnerModel, dashboardStats, tasks, next.xp, betaMastery, firstAttemptKeys, openMistakes, activities, nextSettings);
      return next;
    });
    if (data.openUpload) setShowUploadModal(true);
    navigate(isTeacher ? 'teacher' : 'dashboard');
  }, [learnerModel, dashboardStats, tasks, betaMastery, firstAttemptKeys, openMistakes, activities, persist, navigate]);

  const enableDemoContent = useCallback(() => {
    workspaceCloseGenRef.current += 1;
    studyWorkspaceOpenRef.current = false;
    setStudyWorkspaceOpen(false);
    setWorkspaceAgentSplit(false);
    setActiveTaskId(null);

    const demoLearner = syncLearnerHeatmap(mockLearnerModel, activities);
    const demoBeta = initBetaMastery({ ...user.settings, showDemoContent: true });
    setUser((prev) => {
      const nextSettings = { ...prev.settings, showDemoContent: true };
      applyTheme(nextSettings.theme);
      persist(mockLearnerModel, mockDashboardStats, mockTasks, prev.xp, demoBeta, firstAttemptKeys, INITIAL_MISTAKES, activities, nextSettings);
      return { ...prev, onboardingComplete: true, settings: nextSettings };
    });
    setCourses((prev) => {
      const have = new Set(prev.map((c) => c.id));
      const add = mockCourses.filter((c) => !have.has(c.id));
      const merged = add.length ? [...add, ...prev] : prev;
      return withDemoCourseGraphs(merged);
    });
    setTasks((prev) => {
      const have = new Set(prev.map((t) => t.id));
      const add = mockTasks.filter((t) => !have.has(t.id));
      return add.length ? [...add, ...prev] : prev;
    });
    setLearnerModel((prev) =>
      prev.strongAreas.length > 0 || prev.weakAreas.length > 0 || prev.almostKnown.length > 0
        ? prev
        : demoLearner,
    );
    setDashboardStats((prev) => (prev.studyTimeWeek > 0 ? prev : { ...mockDashboardStats, streak: prev.streak }));
    setBetaMastery((prev) => (prev.length > 0 ? prev : demoBeta));
    setOpenMistakes((prev) => (prev.length > 0 ? prev : INITIAL_MISTAKES));
    setAgentMessages((prev) => (prev.length > 0 ? prev : mockAgentMessages));
    setUploadedFiles((prev) => {
      const have = new Set(prev.map((f) => f.id));
      const add = mockUploadedFiles.filter((f) => !have.has(f.id));
      return add.length ? [...add, ...prev] : prev;
    });
    setGlossaryEntries((prev) => {
      const have = new Set(prev.map((g) => `${g.courseId}::${g.term}`));
      const add = mockGlossaryEntries.filter((g) => !have.has(`${g.courseId}::${g.term}`));
      return add.length ? [...add, ...prev] : prev;
    });
    setSelectedCourse((prev) => {
      if (prev) return prev;
      const merged = withDemoCourseGraphs(mockCourses);
      return merged[0] ?? null;
    });
  }, [user.settings, activities, firstAttemptKeys, persist]);

  const dashboardExtras = useMemo(() => {
    const weekly = learnerModel.weeklyMastery;
    const masteryDelta = weekly.length >= 2 ? weekly[weekly.length - 1]! - weekly[0]! : 0;
    const examDate = user.settings.examDate;
    const daysToExam = examDate
      ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
      : null;
    const pendingReviews = tasks.filter((t) => t.isSpacedRepetition && t.status === 'pending').length;
    const antiPassive = dashboardStats.studyTimeToday > 20
      && learnerModel.confidenceCalibration.length > 0
      && Date.now() - new Date(learnerModel.confidenceCalibration.at(-1)?.timestamp ?? 0).getTime() > 86400000;
    return { masteryDelta, daysToExam, pendingReviews, antiPassive };
  }, [learnerModel, user.settings.examDate, tasks, dashboardStats.studyTimeToday]);

  const pedagogyMetrics = useMemo(() => {
    const masteryMap = masteryMapFromSkills(learnerModel, courses, shouldShowDemo(user.settings));
    const courseEdges = edgesFromCourses(courses);
    const edges = courseEdges.length > 0
      ? courseEdges
      : (shouldShowDemo(user.settings) ? ECON_CONCEPT_EDGES : []);
    const repairs = computePrerequisiteRepairs(masteryMap, edges);
    const calibration = computeCalibration(learnerModel.confidenceCalibration);
    const conceptBars = betaMastery.map((b) => ({
      concept: b.concept,
      mastery: Math.round(betaMean(b.alpha, b.beta) * 100),
    }));
    return { repairs, calibration, conceptBars, openMistakes: openMistakes.filter((m) => !m.resolved) };
  }, [learnerModel, betaMastery, openMistakes, courses, user.settings]);

  const dashboardNextAction = useMemo(
    () => selectDashboardNextAction({
      lang: user.settings.language,
      learnerModel,
      betaMastery,
      tasks,
      stats: dashboardStats,
      workspaceLive,
      daysToExam: dashboardExtras.daysToExam,
      activities,
    }),
    [user.settings.language, learnerModel, betaMastery, tasks, dashboardStats, workspaceLive, dashboardExtras.daysToExam, activities],
  );

  const dailyPlan = useMemo(
    () => recommendDailyPlan({
      lang: user.settings.language,
      learnerModel,
      betaMastery,
      tasks,
      stats: dashboardStats,
      daysToExam: dashboardExtras.daysToExam,
      workspaceLive,
      activeCourseId: selectedCourse?.id ?? null,
      activities,
    }),
    [user.settings.language, learnerModel, betaMastery, tasks, dashboardStats, dashboardExtras.daysToExam, workspaceLive, selectedCourse?.id, activities],
  );

  const coverageSnapshot = useMemo(() => {
    const primary = pickPrimaryCourseForCoverage(courses);
    return primary ? buildSyllabusCoverageSnapshot(primary, user.settings.examDate) : null;
  }, [courses, user.settings.examDate]);

  const dashboardSmartCTAs = useMemo(
    () => buildDashboardSmartCTAs({
      lang: user.settings.language,
      dashboardAction: dashboardNextAction,
      snapshot: coverageSnapshot,
      stats: dashboardStats,
      daysToExam: dashboardExtras.daysToExam,
      primaryCourseId: selectedCourse?.id ?? coverageSnapshot?.courseId ?? courses[0]?.id ?? null,
    }),
    [user.settings.language, dashboardNextAction, coverageSnapshot, dashboardStats, dashboardExtras.daysToExam, selectedCourse?.id, courses],
  );

  const proactiveAgentAlerts = useMemo(
    () => buildProactiveAgentAlerts({
      lang: user.settings.language,
      learnerModel,
      activities,
    }),
    [user.settings.language, learnerModel, activities],
  );

  const runProactiveAgentAlert = useCallback((alert: ProactiveAgentAlert) => {
    if (alert.action.type === 'workspace') {
      const launch = proactiveAlertToWorkspaceLaunch(alert);
      if (launch) openStudyWorkspaceForPractice(launch);
      return;
    }
    openAgentFromWorkspace({
      mode: alert.action.mode,
      prompt: alert.action.prompt,
      autoSend: false,
      context: { concept: alert.action.concept ?? alert.concept },
    });
  }, [openStudyWorkspaceForPractice, openAgentFromWorkspace]);

  const runDashboardSmartCTA = useCallback((cta: DashboardSmartCTA) => {
    openStudyWorkspaceForPractice(smartCTAToWorkspaceLaunch(cta));
  }, [openStudyWorkspaceForPractice]);

  const agentContextForView = useMemo(
    () => mergeAgentWorkspaceContext(
      workspaceLive?.agentContext,
      agentWorkspaceContext,
    ),
    [workspaceLive, agentWorkspaceContext],
  );

  const applyTaskCalendarSync = useCallback((updates: TaskCalendarSyncUpdate[]) => {
    if (updates.length === 0) return;
    setTasks((prev) => {
      const byId = new Map(updates.map((u) => [u.taskId, u]));
      const next = prev.map((t) => {
        const u = byId.get(t.id);
        if (!u) return t;
        return {
          ...t,
          googleCalendarEventId: u.googleCalendarEventId,
          calendarSyncedAt: u.calendarSyncedAt,
        };
      });
      persist(learnerModel, dashboardStats, next, user.xp, betaMastery, firstAttemptKeys, openMistakes, activities, user.settings);
      return next;
    });
  }, [persist, learnerModel, dashboardStats, user.xp, user.settings, betaMastery, firstAttemptKeys, openMistakes, activities]);

  return {
    currentView, navigate, openCourseReview,
    sidebarOpen, setSidebarOpen,
    user, updateSettings, toggleTheme,
    courses, selectedCourse, setSelectedCourse,
    tasks, completeTask, completeTaskAndAdvance, submitReviewRating, submitReviewAndAdvance, submitLeitnerRating,
    applyTaskCalendarSync,
    startTask, startSession, endSession,
    sessionQueue, sessionTotal, activeSessionType,
    activeTask, activeTaskId, setActiveTaskId, expandedTaskId, setExpandedTaskId,
    tasksFilterPreset, openTasksWithFilter, clearTasksFilterPreset,
    learnerModel, dashboardStats, pedagogyMetrics, dashboardExtras, activities,
    recordConfidence, recordQuizAttempt,
    openMistakes, resolveMistake, resolveMisconception, completeOnboarding, enableDemoContent,
    agentMessages, addAgentMessage, updateAgentMessage, agentMode, setAgentMode, bindAgentToTask,
    agentDraftPrompt, setAgentDraftPrompt, agentAutoSend, setAgentAutoSend,
    agentWorkspaceContext, setAgentWorkspaceContext, openAgentFromWorkspace, agentContextForView,
    workspaceLive, syncWorkspaceLive, workspaceContext,
    workspaceAgentSplit, setWorkspaceAgentSplit, exitWorkspaceAgentSplit,
    workspaceCourseSplit, exitWorkspaceCourseSplit,
    dashboardNextAction,
    dailyPlan,
    dashboardSmartCTAs,
    runDashboardSmartCTA,
    proactiveAgentAlerts,
    runProactiveAgentAlert,
    coverageSnapshot,
    uploadedFiles, glossaryEntries, isUploading, isReprocessing, simulateUpload, processUpload,
    reprocessCourseMaterial, saveCourseExtractedText, removeUploadedFile, importNotebookLm, importNotebookLmAudioForCourse, importNotebookLmQuizToFsrs, removeCourse,
    pullLibraryFromServer, pullSessionFromServer, pushSessionToServer, syncAccountOnLogin,
    queueConceptBusSync, flushConceptBusSync,
    refreshAuthPlan, logStudyMinutes,
    showUploadModal, setShowUploadModal,
    activeLessonView, setActiveLessonView,
    practicalLessonView, setPracticalLessonView,
    studyWorkspaceOpen, setStudyWorkspaceOpen,
    openStudyWorkspace, closeStudyWorkspace,
    notebookShellCourseId, openNotebookShell, closeNotebookShell,
    studyConceptOverride, openStudyWorkspaceForConcept, openStudyWorkspaceForExamCountdown,
    openStudyWorkspaceForPractice,
    workspaceOpenTool, consumeWorkspaceOpenTool,
    workspaceOpenSimulatorTab, consumeWorkspaceOpenSimulatorTab,
    workspaceFocus, setWorkspaceFocus,
    sourceHighlight, openSourceAt, clearSourceHighlight: () => setSourceHighlight(null),
    reviewSessionOpen, setReviewSessionOpen,
    mistakeRetryOpen, setMistakeRetryOpen,
    examPrepOpen, setExamPrepOpen,
    prerequisiteRepairOpen, setPrerequisiteRepairOpen,
    appToast, showAppToast, dismissAppToast,
    postUploadCourseId, markPostUploadCourse, clearPostUploadHighlight,
  };
}

function getFileType(name: string): UploadedFile['type'] {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'docx': case 'doc': return 'docx';
    case 'pptx': case 'ppt': return 'pptx';
    case 'txt': return 'txt';
    case 'md': return 'md';
    case 'csv': return 'csv';
    case 'py': case 'js': case 'ts': case 'r': case 'sql': return 'code';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return 'image';
    default: return 'txt';
  }
}
