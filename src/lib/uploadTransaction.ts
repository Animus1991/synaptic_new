import type { ActivityItem, Course, DashboardStats, GlossaryEntry, LearnerModel, Task, UploadedFile } from '../types';
import type { BetaMastery } from './pedagogy';

/** Snapshot of store slices mutated by processUpload — used for rollback on commit failure. */
export type UploadStoreSnapshot = {
  courses: Course[];
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
  tasks: Task[];
  betaMastery: BetaMastery[];
  learnerModel: LearnerModel;
  activities: ActivityItem[];
  dashboardStats: DashboardStats;
  selectedCourseId: string | null;
};

export type UploadStoreSetters = {
  setCourses: (courses: Course[]) => void;
  setUploadedFiles: (files: UploadedFile[]) => void;
  setGlossaryEntries: (entries: GlossaryEntry[]) => void;
  setTasks: (tasks: Task[]) => void;
  setBetaMastery: (beta: BetaMastery[]) => void;
  setLearnerModel: (lm: LearnerModel) => void;
  setActivities: (items: ActivityItem[]) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setSelectedCourse: (course: Course | null) => void;
};

export function captureUploadSnapshot(input: UploadStoreSnapshot): UploadStoreSnapshot {
  return {
    courses: input.courses,
    uploadedFiles: input.uploadedFiles,
    glossaryEntries: input.glossaryEntries,
    tasks: input.tasks,
    betaMastery: input.betaMastery,
    learnerModel: input.learnerModel,
    activities: input.activities,
    dashboardStats: input.dashboardStats,
    selectedCourseId: input.selectedCourseId,
  };
}

export function restoreUploadSnapshot(snapshot: UploadStoreSnapshot, setters: UploadStoreSetters): void {
  setters.setUploadedFiles(snapshot.uploadedFiles);
  setters.setCourses(snapshot.courses);
  setters.setGlossaryEntries(snapshot.glossaryEntries);
  setters.setTasks(snapshot.tasks);
  setters.setBetaMastery(snapshot.betaMastery);
  setters.setLearnerModel(snapshot.learnerModel);
  setters.setActivities(snapshot.activities);
  setters.setDashboardStats(snapshot.dashboardStats);
  const prevSelected = snapshot.selectedCourseId
    ? snapshot.courses.find((c) => c.id === snapshot.selectedCourseId) ?? null
    : null;
  setters.setSelectedCourse(prevSelected);
}

export function isUploadForceFailEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('synapse:upload-force-fail') === '1';
  } catch {
    return false;
  }
}

export function extendCourseTopicCount(courses: Course[], courseId: string): number {
  return courses.find((c) => c.id === courseId)?.topics.length ?? 0;
}
