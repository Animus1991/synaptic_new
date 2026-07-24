import type { Course, Task } from '../types';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

export const COURSE_TAB_IDS = ['path', 'map', 'sources', 'analytics'] as const;
export type CourseTabId = (typeof COURSE_TAB_IDS)[number];

export type CoursePageStats = {
  progressPercent: number;
  masteryPercent: number;
  pendingTasks: number;
  dueReviews: number;
  sourceQualityScore: number | null;
  sourceQualityBand: 'weak' | 'moderate' | 'strong' | null;
  isStalePipeline: boolean;
};

const TAB_STORAGE_PREFIX = 'synapse:course-tab-v1:';

export function courseTabStorageKey(courseId: string): string {
  return `${TAB_STORAGE_PREFIX}${courseId}`;
}

export function isCourseTabId(value: string): value is CourseTabId {
  return (COURSE_TAB_IDS as readonly string[]).includes(value);
}

export function readPersistedCourseTab(courseId: string): CourseTabId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(courseTabStorageKey(courseId));
    return raw && isCourseTabId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writePersistedCourseTab(courseId: string, tab: CourseTabId): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(courseTabStorageKey(courseId), tab);
  } catch {
    /* ignore quota */
  }
}

export function selectCourseProgressPercent(course: Course): number {
  const total = Math.max(course.totalLessons, 1);
  return Math.round((course.completedLessons / total) * 100);
}

/** Single canonical mastery value for Course, Library cards, and Analytics. */
export function selectCanonicalMastery(course: Course): number {
  return Math.max(0, Math.min(100, Math.round(course.mastery)));
}

export function selectCourseTaskMetrics(course: Course, tasks: Task[]) {
  const pendingTasks = tasks.filter(
    (t) => t.courseId === course.id && t.status !== 'completed' && t.status !== 'skipped',
  ).length;
  const now = new Date();
  const dueReviews = tasks.filter(
    (t) =>
      t.courseId === course.id &&
      t.status === 'pending' &&
      t.isSpacedRepetition &&
      t.dueAt &&
      new Date(t.dueAt) <= now,
  ).length;
  const isStalePipeline = Boolean(
    course.pipelineMeta && course.pipelineMeta.version !== CONTENT_PIPELINE_VERSION,
  );
  return { pendingTasks, dueReviews, isStalePipeline };
}

export function selectCoursePageStats(course: Course, tasks: Task[]): CoursePageStats {
  const taskMetrics = selectCourseTaskMetrics(course, tasks);
  return {
    progressPercent: selectCourseProgressPercent(course),
    masteryPercent: selectCanonicalMastery(course),
    pendingTasks: taskMetrics.pendingTasks,
    dueReviews: taskMetrics.dueReviews,
    sourceQualityScore: course.sourceQuality?.score ?? null,
    sourceQualityBand: course.sourceQuality?.band ?? null,
    isStalePipeline: taskMetrics.isStalePipeline,
  };
}
