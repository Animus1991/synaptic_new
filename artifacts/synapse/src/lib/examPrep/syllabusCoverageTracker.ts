import type { Course, Lesson } from '../../types';

export type TopicCoverageRow = {
  topicId: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  mastery: number;
  isComplete: boolean;
};

export type SyllabusCoverageSnapshot = {
  courseId: string;
  courseTitle: string;
  examDate?: string;
  daysToExam: number | null;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  totalLessons: number;
  completedLessons: number;
  coveragePct: number;
  topics: TopicCoverageRow[];
};

function lessonComplete(lesson: Lesson): boolean {
  return lesson.status === 'completed' || lesson.mastery >= 80;
}

export function countCompletedLessons(course: Course): number {
  let n = 0;
  for (const topic of course.topics) {
    for (const lesson of topic.lessons) {
      if (lessonComplete(lesson)) n++;
    }
  }
  return n;
}

export function countTotalLessons(course: Course): number {
  return course.topics.reduce((sum, t) => sum + t.lessons.length, 0);
}

export function daysUntilExam(examDate?: string, now = Date.now()): number | null {
  if (!examDate?.trim()) return null;
  const target = new Date(examDate).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now) / 86_400_000));
}

export function buildSyllabusCoverageSnapshot(
  course: Course,
  settingsExamDate?: string,
  now = Date.now(),
): SyllabusCoverageSnapshot {
  const examDate = course.examDate ?? settingsExamDate;
  const topics: TopicCoverageRow[] = course.topics.map((topic) => {
    const total = topic.lessons.length;
    const completed = topic.lessons.filter(lessonComplete).length;
    const isComplete = total > 0 && completed >= total;
    return {
      topicId: topic.id,
      title: topic.title,
      totalLessons: total,
      completedLessons: completed,
      mastery: topic.mastery,
      isComplete,
    };
  });

  const totalLessons = countTotalLessons(course);
  const completedLessons = countCompletedLessons(course);
  const completedTopics = topics.filter((t) => t.isComplete).length;

  return {
    courseId: course.id,
    courseTitle: course.title,
    examDate,
    daysToExam: daysUntilExam(examDate, now),
    totalTopics: topics.length,
    completedTopics,
    remainingTopics: Math.max(0, topics.length - completedTopics),
    totalLessons,
    completedLessons,
    coveragePct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    topics,
  };
}

export function pickPrimaryCourseForCoverage(courses: Course[]): Course | null {
  const ready = courses.filter((c) => c.status === 'ready' || c.status === 'in-progress');
  if (ready.length === 0) return courses[0] ?? null;
  return [...ready].sort((a, b) => {
    const aDate = a.examDate ? new Date(a.examDate).getTime() : Infinity;
    const bDate = b.examDate ? new Date(b.examDate).getTime() : Infinity;
    if (aDate !== bDate) return aDate - bDate;
    return (b.lastStudied ?? '').localeCompare(a.lastStudied ?? '');
  })[0] ?? null;
}
