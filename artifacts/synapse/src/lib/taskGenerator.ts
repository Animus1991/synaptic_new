import type { Course, Task } from '../types';
import type { Lang } from './i18n';
import { getTasksContent } from './tasksContent';
import { isDemoCourse } from './demoMode';

function mkTask(
  id: string,
  title: string,
  desc: string,
  type: Task['type'],
  course: Course,
  topicTitle: string,
  priority: Task['priority'],
  mins: number,
  xp: number,
  category: Task['category'],
  tags: string[],
  extra?: Partial<Task>,
): Task {
  return {
    id,
    title,
    description: desc,
    type,
    courseId: course.id,
    courseName: course.title,
    courseColor: course.color,
    courseIcon: course.icon,
    priority,
    estimatedMinutes: mins,
    xpReward: xp,
    isSpacedRepetition: false,
    status: 'pending',
    category,
    tags: [...tags, topicTitle.toLowerCase().replace(/\s+/g, '-')],
    ...extra,
  };
}

/**
 * Derive study tasks from a user-generated course outline (topics + key concepts).
 * Replaces mock task lists when material is uploaded.
 */
export function generateTasksFromCourse(course: Course, lang: Lang = 'en'): Task[] {
  const tasks: Task[] = [];
  const ready = course.status !== 'generating';
  const tc = getTasksContent(lang);

  course.topics.forEach((topic, idx) => {
    const concept = topic.keyConcepts?.[0] ?? topic.title;
    const mins = Math.max(8, Math.min(30, topic.estimatedMinutes || 15));

    if (ready) {
      tasks.push(mkTask(
        `gen-${course.id}-lesson-${topic.id}`,
        tc.generatedLessonTitle(topic.title),
        topic.description || tc.generatedLessonDesc(topic.title),
        'lesson',
        course,
        topic.title,
        idx === 0 ? 'high' : 'medium',
        mins,
        40 + idx * 5,
        'learn',
        ['lesson', 'generated'],
      ));

      if (topic.keyConcepts && topic.keyConcepts.length > 0) {
        tasks.push(mkTask(
          `gen-${course.id}-workspace-${topic.id}`,
          tc.generatedWorkspaceTitle(concept),
          tc.generatedWorkspaceDesc,
          'self-explanation',
          course,
          topic.title,
          'medium',
          Math.max(12, mins),
          50,
          'practice',
          ['workspace', 'generated'],
        ));
      }

      if ((topic.objectives?.length ?? 0) > 0 || idx % 2 === 1) {
        tasks.push(mkTask(
          `gen-${course.id}-review-${topic.id}`,
          tc.generatedReviewTitle(topic.title),
          tc.generatedReviewDesc(topic.title),
          'flashcards',
          course,
          topic.title,
          'medium',
          Math.max(6, Math.floor(mins / 2)),
          25,
          'review',
          ['review', 'generated'],
          { isSpacedRepetition: true },
        ));
      }
    }
  });

  if (ready && course.examDate) {
    tasks.push(mkTask(
      `gen-${course.id}-exam`,
      tc.generatedExamPrepTitle(course.title),
      tc.generatedExamPrepDesc,
      'exam-prep',
      course,
      course.title,
      'high',
      30,
      80,
      'exam',
      ['exam', 'generated'],
      { dueAt: course.examDate },
    ));
  }

  return tasks;
}

/** Prefix for auto-generated tasks tied to a course outline (replaced on reprocess). */
export function generatedTaskPrefix(courseId: string): string {
  return `gen-${courseId}-`;
}

export function isGeneratedCourseTask(task: Task, courseId: string): boolean {
  return task.id.startsWith(generatedTaskPrefix(courseId));
}

export function mergeCourseTasks(existing: Task[], course: Course, lang: Lang = 'en'): Task[] {
  const prefix = generatedTaskPrefix(course.id);
  const without = existing.filter((t) => !t.id.startsWith(prefix));
  return [...without, ...generateTasksFromCourse(course, lang)];
}

export function mergeAllGeneratedTasks(existing: Task[], courses: Course[], lang: Lang = 'en'): Task[] {
  const userCourses = courses.filter((c) => !isDemoCourse(c.id));
  let next = existing.filter((t) => !t.id.startsWith('gen-'));
  for (const course of userCourses) {
    if (course.status === 'generating') continue;
    next = mergeCourseTasks(next, course, lang);
  }
  return next;
}
