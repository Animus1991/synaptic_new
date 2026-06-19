import { useState, useCallback, useMemo, useRef } from 'react';
import type { AppView, Course, AgentMessage, AgentMode, UploadedFile, UserSettings, LearnerModel, DashboardStats, MistakeRecord, ActivityItem } from '../types';
import { createActivity, SEED_ACTIVITIES } from '../lib/activityLog';
import { mockUser, mockCourses, mockTasks, mockLearnerModel, mockDashboardStats, mockAgentMessages } from '../data/mockData';
import { loadThemePreference, applyTheme } from '../lib/theme';
import { ECON_CONCEPT_IMPORTANCE } from '../data/conceptGraph';
import {
  betaMean,
  computeCalibration,
  computeExamReadiness,
  computePrerequisiteRepairs,
  computeReviewInterval,
  deriveInsights,
  fsrsIntervalDays,
  updateBetaMastery,
  updateSkillMastery,
  type FsrsRating,
} from '../lib/pedagogy';
import { ECON_CONCEPT_EDGES } from '../data/conceptGraph';
import { loadJson, saveJson } from '../lib/persistence';
import { filterTasksForSession, getTaskAction, getTaskConcept, getAgentMode, type SessionType } from '../lib/taskFlows';
import { settingsToAgentMode } from '../lib/settingsEffects';
import { buildCourseFromUpload, readTextFromFiles, uploadedFileMeta, extractFileContent, type UploadPayload } from '../lib/uploadPipeline';
import type { BetaMastery } from '../lib/pedagogy';

const STORAGE_KEY = 'session-v2';

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

function initBetaMastery(): BetaMastery[] {
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

const INITIAL_MISTAKES: MistakeRecord[] = [
  {
    id: 'mistake-1',
    concept: 'Elasticity Calculations',
    questionSummary: 'Price elasticity when price rises 10% and quantity falls 15%',
    wrongAnswer: 'Used absolute change instead of percentage',
    correctAnswer: 'PED = -15% / 10% = -1.5',
    courseId: 'c1',
    createdAt: '2026-01-10',
    resolved: false,
  },
  {
    id: 'mistake-2',
    concept: 'Consumer Surplus',
    questionSummary: 'Area under demand curve above market price',
    wrongAnswer: 'Included producer surplus region',
    correctAnswer: 'Only triangle between demand curve and price line',
    courseId: 'c1',
    createdAt: '2026-01-09',
    resolved: false,
  },
];

function loadPersisted(): Partial<PersistedState> {
  const legacy = loadJson<Partial<PersistedState>>('session-v1', {});
  const current = loadJson<Partial<PersistedState>>(STORAGE_KEY, {});
  return { ...legacy, ...current };
}

function masteryMapFromSkills(lm: LearnerModel): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of [...lm.strongAreas, ...lm.weakAreas, ...lm.almostKnown]) {
    map[s.concept] = s.mastery;
  }
  for (const t of mockCourses[0]?.topics ?? []) {
    map[t.title] = t.mastery;
  }
  return map;
}

export function useAppStore() {
  const persisted = useMemo(() => loadPersisted(), []);

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({
    ...mockUser,
    xp: persisted.xp ?? mockUser.xp,
    settings: {
      ...mockUser.settings,
      ...persisted.userSettings,
      theme: loadThemePreference(),
    },
  });
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [tasks, setTasks] = useState(persisted.tasks ?? mockTasks);
  const [learnerModel, setLearnerModel] = useState<LearnerModel>(persisted.learnerModel ?? mockLearnerModel);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(persisted.dashboardStats ?? mockDashboardStats);
  const [betaMastery, setBetaMastery] = useState<BetaMastery[]>(persisted.betaMastery ?? initBetaMastery());
  const [firstAttemptKeys, setFirstAttemptKeys] = useState<Set<string>>(
    new Set(persisted.firstAttemptKeys ?? []),
  );
  const [openMistakes, setOpenMistakes] = useState<MistakeRecord[]>(
    persisted.openMistakes ?? INITIAL_MISTAKES,
  );
  const [activities, setActivities] = useState<ActivityItem[]>(persisted.activities ?? SEED_ACTIVITIES);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>(mockAgentMessages);
  const [agentMode, setAgentMode] = useState<AgentMode>('socratic');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeLessonView, setActiveLessonView] = useState(false);
  const [practicalLessonView, setPracticalLessonView] = useState(false);
  const [studyWorkspaceOpen, setStudyWorkspaceOpen] = useState(false);
  const [reviewSessionOpen, setReviewSessionOpen] = useState(false);
  const [mistakeRetryOpen, setMistakeRetryOpen] = useState(false);
  const [examPrepOpen, setExamPrepOpen] = useState(false);
  const [prerequisiteRepairOpen, setPrerequisiteRepairOpen] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<string[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [activeSessionType, setActiveSessionType] = useState<SessionType | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

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
    return next;
  }, [activities]);

  const recomputeLearnerMetrics = useCallback((
    lm: LearnerModel,
    beta: BetaMastery[],
    keys: Set<string>,
    mistakes: MistakeRecord[],
  ): LearnerModel => {
    const masteryMap = masteryMapFromSkills(lm);
    const repairs = computePrerequisiteRepairs(masteryMap, ECON_CONCEPT_EDGES);
    const calibration = computeCalibration(lm.confidenceCalibration);
    const firstCount = keys.size;
    const fallbackAccuracy = lm.confidenceCalibration.length > 0
      ? lm.confidenceCalibration.reduce((s, p) => s + p.actual, 0) / lm.confidenceCalibration.length
      : lm.retentionRate;
    const selfReliance = 1 - lm.helpSeekingRate;
    const readiness = computeExamReadiness(beta, fallbackAccuracy, selfReliance, firstCount);

    return {
      ...lm,
      overallMastery: readiness,
      interactionInsights: deriveInsights(lm, repairs, calibration),
    };
  }, []);

  const navigate = useCallback((view: AppView) => {
    setCurrentView(view);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const completeTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task || task.status === 'completed') return prev;

      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: 'completed' as const } : t,
      );

      setLearnerModel((lm) => {
        const concept = task.title.split('—')[0]?.trim() ?? task.title;
        const allSkills = [...lm.strongAreas, ...lm.weakAreas, ...lm.almostKnown];
        const match = allSkills.find((s) => s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 8)));
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
            return { ...u, xp: nextXp };
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
      const stability = spacing?.stability ?? 0.5;
      const reviewCount = spacing?.reviewCount ?? 0;
      const days = fsrsIntervalDays(stability, rating, reviewCount);

      const updated = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'completed' as const,
              scheduledFor: new Date(Date.now() + days * 86400000).toISOString(),
            }
          : t,
      );

      setLearnerModel((lm) => {
        const nextSpacing = lm.spacingIntervals.some((s) => s.concept === concept)
          ? lm.spacingIntervals.map((s) =>
              s.concept === concept
                ? {
                    ...s,
                    interval: days,
                    reviewCount: s.reviewCount + 1,
                    nextReview: new Date(Date.now() + days * 86400000).toISOString(),
                    stability: rating === 'again' ? Math.max(0.1, s.stability - 0.15) : Math.min(1, s.stability + 0.1),
                  }
                : s,
            )
          : [
              ...lm.spacingIntervals,
              {
                concept,
                interval: days,
                nextReview: new Date(Date.now() + days * 86400000).toISOString(),
                stability: rating === 'again' ? 0.3 : 0.55,
                difficulty: 0.5,
                reviewCount: 1,
              },
            ];

        let next: LearnerModel = {
          ...lm,
          spacingIntervals: nextSpacing,
          retrievalPerformance: rating === 'again'
            ? Math.max(0, lm.retrievalPerformance - 0.02)
            : Math.min(1, lm.retrievalPerformance + 0.04),
          totalSessions: lm.totalSessions + 1,
        };
        next = recomputeLearnerMetrics(next, betaMastery, firstAttemptKeys, openMistakes);

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
            persist(next, nextStats, updated, nextXp, betaMastery, firstAttemptKeys, openMistakes, nextActs, u.settings);
            return { ...u, xp: nextXp };
          });
          return nextStats;
        });

        return next;
      });

      return updated;
    });
  }, [learnerModel.spacingIntervals, betaMastery, firstAttemptKeys, openMistakes, persist, recomputeLearnerMetrics]);

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

  const recordQuizAttempt = useCallback((concept: string, correct: boolean, confidence: number, stepKey?: string) => {
    const attemptKey = stepKey ?? `${concept}:${Date.now()}`;
    const isFirstAttempt = !firstAttemptKeys.has(attemptKey);

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
        ? betaMastery[idx]
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
          courseId: 'c1',
          createdAt: new Date().toISOString(),
          resolved: false,
        },
        ...openMistakes,
      ].slice(0, 12);
      setOpenMistakes(nextMistakes);
    }

    const allSkills = [...learnerModel.strongAreas, ...learnerModel.weakAreas, ...learnerModel.almostKnown];
    const match = allSkills.find((s) => concept.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)))
      ?? learnerModel.weakAreas[0];

    if (match) {
      const updated = isFirstAttempt ? updateSkillMastery(match, correct, confidence) : match;
      const spacing = learnerModel.spacingIntervals.map((s) =>
        s.concept === updated.concept
          ? {
              ...s,
              interval: computeReviewInterval(s.reviewCount + 1, confidence, correct),
              reviewCount: s.reviewCount + 1,
              nextReview: new Date(Date.now() + computeReviewInterval(s.reviewCount + 1, confidence, correct) * 86400000).toISOString(),
              stability: correct ? Math.min(1, s.stability + 0.08) : Math.max(0.1, s.stability - 0.12),
            }
          : s,
      );

      let next: LearnerModel = {
        ...learnerModel,
        confidenceCalibration: calibration,
        averageConfidence: avgConf,
        weakAreas: learnerModel.weakAreas.map((s) => (s.concept === updated.concept ? updated : s)),
        strongAreas: learnerModel.strongAreas.map((s) => (s.concept === updated.concept ? updated : s)),
        almostKnown: learnerModel.almostKnown.map((s) => (s.concept === updated.concept ? updated : s)),
        spacingIntervals: spacing,
        retrievalPerformance: correct
          ? Math.min(1, learnerModel.retrievalPerformance + 0.02)
          : Math.max(0, learnerModel.retrievalPerformance - 0.03),
      };
      next = recomputeLearnerMetrics(next, nextBeta, nextKeys, nextMistakes);
      setLearnerModel(next);
      const actType = correct ? 'quiz_passed' : 'quiz_failed';
      const nextActs = logActivity(createActivity(actType, `${correct ? 'Passed' : 'Missed'} quiz on ${concept}`, correct ? 15 : undefined));
      persist(next, dashboardStats, tasks, user.xp, nextBeta, nextKeys, nextMistakes, nextActs, user.settings);
    }
  }, [firstAttemptKeys, betaMastery, openMistakes, learnerModel, dashboardStats, tasks, user.xp, user.settings, persist, recomputeLearnerMetrics, logActivity]);

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

  const startTaskRef = useRef<(taskId: string) => void>(() => {});

  const closeTaskViews = useCallback(() => {
    setActiveLessonView(false);
    setPracticalLessonView(false);
    setStudyWorkspaceOpen(false);
    setReviewSessionOpen(false);
    setMistakeRetryOpen(false);
    setExamPrepOpen(false);
    setPrerequisiteRepairOpen(false);
  }, []);

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
      const nextTheme = prev.settings.theme === 'light' ? 'dark' : 'light';
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

  const processUpload = useCallback(async (payload: UploadPayload) => {
    setIsUploading(true);
    const fileTexts: string[] = [];
    const newFiles: UploadedFile[] = [];
    for (const f of payload.files) {
      const extracted = await extractFileContent(f);
      if (extracted.text.trim()) fileTexts.push(extracted.text);
      newFiles.push(uploadedFileMeta(f, undefined, undefined, extracted.text, extracted.pageCount));
    }
    const text = [payload.pastedContent, ...fileTexts].filter(Boolean).join('\n\n') || (await readTextFromFiles(payload.files));
    const course = buildCourseFromUpload({ ...payload, pastedContent: text }, courses.length);
    const topics = course.topics.map((t) => t.title);
    const withCourse = newFiles.map((meta) => ({ ...meta, courseId: course.id, extractedTopics: topics }));
    if (payload.youtubeUrl) {
      withCourse.push({
        id: `file-yt-${Date.now()}`,
        name: payload.youtubeUrl,
        type: 'txt',
        size: 0,
        uploadedAt: new Date().toISOString(),
        status: 'analyzed',
        progress: 100,
        courseId: course.id,
        extractedTopics: topics,
      });
    }
    setUploadedFiles((prev) => [...prev, ...withCourse]);
    setCourses((prev) => [...prev, course]);
    setIsUploading(false);
    const nextActs = logActivity(createActivity('upload', `Created course: ${course.title}`));
    persist(learnerModel, dashboardStats, tasks, user.xp, betaMastery, firstAttemptKeys, openMistakes, nextActs, user.settings);
    return course;
  }, [courses.length, learnerModel, dashboardStats, tasks, user.xp, user.settings, betaMastery, firstAttemptKeys, openMistakes, persist, logActivity]);

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

    setActiveTaskId(taskId);
    const action = getTaskAction(task);

    switch (action) {
      case 'practical':
        setPracticalLessonView(true);
        break;
      case 'workspace':
        setStudyWorkspaceOpen(true);
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
  }, [tasks, navigate, bindAgentToTask]);

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
  }) => {
    setUser((prev) => {
      const nextSettings: UserSettings = {
        ...prev.settings,
        dailyGoalMinutes: data.dailyGoalMinutes ?? prev.settings.dailyGoalMinutes,
        examDate: data.examDate || prev.settings.examDate,
      };
      const next = {
        ...prev,
        segment: (data.role as typeof prev.segment) ?? prev.segment,
        onboardingComplete: true,
        settings: nextSettings,
      };
      persist(learnerModel, dashboardStats, tasks, next.xp, betaMastery, firstAttemptKeys, openMistakes, activities, nextSettings);
      return next;
    });
    if (data.openUpload) setShowUploadModal(true);
    navigate('dashboard');
  }, [learnerModel, dashboardStats, tasks, betaMastery, firstAttemptKeys, openMistakes, activities, persist, navigate]);

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
    const masteryMap = masteryMapFromSkills(learnerModel);
    const repairs = computePrerequisiteRepairs(masteryMap, ECON_CONCEPT_EDGES);
    const calibration = computeCalibration(learnerModel.confidenceCalibration);
    const conceptBars = betaMastery.map((b) => ({
      concept: b.concept,
      mastery: Math.round(betaMean(b.alpha, b.beta) * 100),
    }));
    return { repairs, calibration, conceptBars, openMistakes: openMistakes.filter((m) => !m.resolved) };
  }, [learnerModel, betaMastery, openMistakes]);

  return {
    currentView, navigate,
    sidebarOpen, setSidebarOpen,
    user, updateSettings, toggleTheme,
    courses, selectedCourse, setSelectedCourse,
    tasks, completeTask, completeTaskAndAdvance, submitReviewRating, submitReviewAndAdvance,
    startTask, startSession, endSession,
    sessionQueue, sessionTotal, activeSessionType,
    activeTask, activeTaskId, setActiveTaskId, expandedTaskId, setExpandedTaskId,
    learnerModel, dashboardStats, pedagogyMetrics, dashboardExtras, activities,
    recordConfidence, recordQuizAttempt,
    openMistakes, resolveMistake, resolveMisconception, completeOnboarding,
    agentMessages, addAgentMessage, updateAgentMessage, agentMode, setAgentMode, bindAgentToTask,
    uploadedFiles, isUploading, simulateUpload, processUpload, logStudyMinutes,
    showUploadModal, setShowUploadModal,
    activeLessonView, setActiveLessonView,
    practicalLessonView, setPracticalLessonView,
    studyWorkspaceOpen, setStudyWorkspaceOpen,
    reviewSessionOpen, setReviewSessionOpen,
    mistakeRetryOpen, setMistakeRetryOpen,
    examPrepOpen, setExamPrepOpen,
    prerequisiteRepairOpen, setPrerequisiteRepairOpen,
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
