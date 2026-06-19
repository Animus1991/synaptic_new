import { useState, useCallback, useMemo } from 'react';
import type { AppView, Course, AgentMessage, AgentMode, UploadedFile, UserSettings, LearnerModel, DashboardStats } from '../types';
import { mockUser, mockCourses, mockTasks, mockLearnerModel, mockDashboardStats, mockAgentMessages } from '../data/mockData';
import { computeCalibrationGap, computeOverallMastery, computeReviewInterval, deriveInsights, updateSkillMastery } from '../lib/pedagogy';
import { loadJson, saveJson } from '../lib/persistence';

const STORAGE_KEY = 'session-v1';

type PersistedState = {
  learnerModel: LearnerModel;
  dashboardStats: DashboardStats;
  tasks: typeof mockTasks;
  xp: number;
};

function loadPersisted(): Partial<PersistedState> {
  return loadJson<Partial<PersistedState>>(STORAGE_KEY, {});
}

export function useAppStore() {
  const persisted = useMemo(() => loadPersisted(), []);

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ ...mockUser, xp: persisted.xp ?? mockUser.xp });
  const [courses] = useState(mockCourses);
  const [tasks, setTasks] = useState(persisted.tasks ?? mockTasks);
  const [learnerModel, setLearnerModel] = useState<LearnerModel>(persisted.learnerModel ?? mockLearnerModel);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(persisted.dashboardStats ?? mockDashboardStats);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>(mockAgentMessages);
  const [agentMode, setAgentMode] = useState<AgentMode>('socratic');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeLessonView, setActiveLessonView] = useState(false);
  const [practicalLessonView, setPracticalLessonView] = useState(false);
  const [studyWorkspaceOpen, setStudyWorkspaceOpen] = useState(false);

  const persist = useCallback((
    nextLearner: LearnerModel,
    nextStats: DashboardStats,
    nextTasks: typeof tasks,
    nextXp: number,
  ) => {
    saveJson(STORAGE_KEY, {
      learnerModel: nextLearner,
      dashboardStats: nextStats,
      tasks: nextTasks,
      xp: nextXp,
    } satisfies PersistedState);
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

        const next: LearnerModel = {
          ...lm,
          weakAreas: nextWeak,
          overallMastery: updatedSkill
            ? computeOverallMastery(allSkills.map((s) => (s.concept === updatedSkill.concept ? updatedSkill : s)))
            : lm.overallMastery,
          totalSessions: lm.totalSessions + 1,
          retrievalPerformance: Math.min(100, lm.retrievalPerformance + (task.isSpacedRepetition ? 3 : 1)),
          interactionInsights: deriveInsights(lm),
        };

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
            persist(next, nextStats, updated, nextXp);
            return { ...u, xp: nextXp };
          });
          return nextStats;
        });

        return next;
      });

      return updated;
    });
  }, [persist]);

  const recordConfidence = useCallback((concept: string, predicted: number, actual: number) => {
    setLearnerModel((lm) => {
      const point = {
        predicted,
        actual,
        concept,
        timestamp: new Date().toISOString(),
      };
      const calibration = [...lm.confidenceCalibration, point].slice(-20);
      const gap = computeCalibrationGap(calibration);
      const avgConf = Math.round(calibration.reduce((s, p) => s + p.predicted, 0) / calibration.length);

      const next: LearnerModel = {
        ...lm,
        confidenceCalibration: calibration,
        averageConfidence: avgConf,
        interactionInsights: gap > 15
          ? ['Calibration alert: predicted higher than actual — slow down and verify sources.', ...lm.interactionInsights.slice(0, 3)]
          : lm.interactionInsights,
      };

      setDashboardStats((stats) => {
        persist(next, stats, tasks, user.xp);
        return stats;
      });
      return next;
    });
  }, [persist, tasks, user.xp]);

  const recordQuizAttempt = useCallback((concept: string, correct: boolean, confidence: number) => {
    recordConfidence(concept, confidence, correct ? 100 : 0);
    setLearnerModel((lm) => {
      const allSkills = [...lm.strongAreas, ...lm.weakAreas, ...lm.almostKnown];
      const match = allSkills.find((s) => concept.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)))
        ?? lm.weakAreas[0];
      if (!match) return lm;

      const updated = updateSkillMastery(match, correct, confidence);
      const spacing = lm.spacingIntervals.map((s) =>
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

      return {
        ...lm,
        weakAreas: lm.weakAreas.map((s) => (s.concept === updated.concept ? updated : s)),
        strongAreas: lm.strongAreas.map((s) => (s.concept === updated.concept ? updated : s)),
        almostKnown: lm.almostKnown.map((s) => (s.concept === updated.concept ? updated : s)),
        overallMastery: computeOverallMastery(allSkills.map((s) => (s.concept === updated.concept ? updated : s))),
        spacingIntervals: spacing,
        retrievalPerformance: correct
          ? Math.min(100, lm.retrievalPerformance + 2)
          : Math.max(0, lm.retrievalPerformance - 3),
      };
    });
  }, [recordConfidence]);

  const addAgentMessage = useCallback((msg: AgentMessage) => {
    setAgentMessages((prev) => [...prev, msg]);
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setUser((prev) => ({ ...prev, settings: { ...prev.settings, ...partial } }));
  }, []);

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

  return {
    currentView, navigate,
    sidebarOpen, setSidebarOpen,
    user, updateSettings,
    courses, selectedCourse, setSelectedCourse,
    tasks, completeTask,
    learnerModel, dashboardStats,
    recordConfidence, recordQuizAttempt,
    agentMessages, addAgentMessage, agentMode, setAgentMode,
    uploadedFiles, isUploading, simulateUpload,
    showUploadModal, setShowUploadModal,
    activeLessonView, setActiveLessonView,
    practicalLessonView, setPracticalLessonView,
    studyWorkspaceOpen, setStudyWorkspaceOpen,
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
