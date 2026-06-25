import type { GlossaryEntry, Task } from '../types';

/** Remove course-scoped tasks when the course has no remaining source files. */
export function tasksAfterFileRemoval(
  tasks: Task[],
  courseId: string | undefined,
  remainingFilesForCourse: number,
): Task[] {
  if (!courseId || remainingFilesForCourse > 0) return tasks;
  return tasks.filter((t) => t.courseId !== courseId);
}

/** Drop glossary for a course when its last source file was removed. */
export function glossaryAfterCourseSourceRemoval(
  glossaryEntries: GlossaryEntry[],
  courseId: string | undefined,
  remainingFilesForCourse: number,
): GlossaryEntry[] {
  if (!courseId || remainingFilesForCourse > 0) return glossaryEntries;
  return glossaryEntries.filter((g) => g.courseId !== courseId);
}

export function countFilesForCourse(
  files: { courseId?: string }[],
  courseId: string,
): number {
  return files.filter((f) => f.courseId === courseId).length;
}
