import type { Task } from '../types';
import { isDemoTask } from './demoMode';

export const MANUAL_TASK_PREFIX = 'manual-';
export const MANUAL_TASK_TAG = 'manual';
export const PERSONAL_COURSE_ID = 'personal';

export type ManualTaskCourse = {
  id: string;
  title: string;
  color: string;
  icon: string;
};

export const PERSONAL_COURSE: ManualTaskCourse = {
  id: PERSONAL_COURSE_ID,
  title: 'Personal',
  color: '#64748b',
  icon: '✓',
};

export type ManualTaskDraft = {
  title: string;
  description?: string;
  course: ManualTaskCourse;
  category: Task['category'];
  priority: Task['priority'];
  estimatedMinutes: number;
  dueAt?: string;
};

export function isManualTask(task: Pick<Task, 'id' | 'tags'>): boolean {
  if (isDemoTask(task.id) || task.id.startsWith('gen-')) return false;
  return task.id.startsWith(MANUAL_TASK_PREFIX) || task.tags.includes(MANUAL_TASK_TAG);
}

export function buildManualTaskId(): string {
  return `${MANUAL_TASK_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function typeForCategory(category: Task['category']): Task['type'] {
  switch (category) {
    case 'review':
      return 'review';
    case 'practice':
      return 'practice';
    case 'exam':
      return 'exam-prep';
    case 'fix':
      return 'mistake-retry';
    default:
      return 'lesson';
  }
}

function minutesXp(minutes: number): { estimatedMinutes: number; xpReward: number } {
  const estimatedMinutes = Math.max(1, Math.min(180, Math.round(minutes) || 15));
  return { estimatedMinutes, xpReward: estimatedMinutes * 2 };
}

export function createManualTask(draft: ManualTaskDraft): Task {
  const { estimatedMinutes, xpReward } = minutesXp(draft.estimatedMinutes);
  const title = draft.title.trim();
  return {
    id: buildManualTaskId(),
    title: title || 'Untitled task',
    description: draft.description?.trim() ?? '',
    type: typeForCategory(draft.category),
    courseId: draft.course.id,
    courseName: draft.course.title,
    courseColor: draft.course.color,
    courseIcon: draft.course.icon,
    priority: draft.priority,
    estimatedMinutes,
    dueAt: draft.dueAt?.trim() || undefined,
    status: 'pending',
    xpReward,
    isSpacedRepetition: false,
    tags: [MANUAL_TASK_TAG, draft.category],
    category: draft.category,
  };
}

export function updateManualTask(existing: Task, draft: ManualTaskDraft): Task {
  if (!isManualTask(existing)) return existing;
  const { estimatedMinutes, xpReward } = minutesXp(draft.estimatedMinutes);
  const title = draft.title.trim();
  const tags = existing.tags.includes(MANUAL_TASK_TAG)
    ? existing.tags.filter((tag) => tag !== existing.category).concat(draft.category)
    : [MANUAL_TASK_TAG, draft.category, ...existing.tags];
  return {
    ...existing,
    title: title || existing.title,
    description: draft.description?.trim() ?? '',
    type: typeForCategory(draft.category),
    courseId: draft.course.id,
    courseName: draft.course.title,
    courseColor: draft.course.color,
    courseIcon: draft.course.icon,
    priority: draft.priority,
    estimatedMinutes,
    dueAt: draft.dueAt?.trim() || undefined,
    xpReward,
    tags,
    category: draft.category,
  };
}

export function resolveManualTaskCourse(
  courses: readonly ManualTaskCourse[],
  courseId: string | undefined,
): ManualTaskCourse {
  if (courseId) {
    const match = courses.find((c) => c.id === courseId);
    if (match) return match;
    if (courseId === PERSONAL_COURSE_ID) return PERSONAL_COURSE;
  }
  return courses[0] ?? PERSONAL_COURSE;
}
