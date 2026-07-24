import type { Course, GlossaryEntry, Task, UploadedFile } from '../types';
import { isDemoCourse } from './demoMode';
import { countFilesForCourse } from './deleteCascade';

export type RemoveCourseResult = {
  courses: Course[];
  files: UploadedFile[];
  glossary: GlossaryEntry[];
  tasks: Task[];
  removed: boolean;
  reason?: 'not-found' | 'demo';
};

/** Remove a user-generated course and all attached library artifacts. */
export function removeCourseFromLibrary(
  courseId: string,
  courses: Course[],
  files: UploadedFile[],
  glossary: GlossaryEntry[],
  tasks: Task[],
): RemoveCourseResult {
  if (isDemoCourse(courseId)) {
    return { courses, files, glossary, tasks, removed: false, reason: 'demo' };
  }
  if (!courses.some((c) => c.id === courseId)) {
    return { courses, files, glossary, tasks, removed: false, reason: 'not-found' };
  }

  return {
    courses: courses.filter((c) => c.id !== courseId),
    files: files.filter((f) => f.courseId !== courseId),
    glossary: glossary.filter((g) => g.courseId !== courseId),
    tasks: tasks.filter((t) => t.courseId !== courseId),
    removed: true,
  };
}

export function courseDeleteStats(
  courseId: string,
  files: UploadedFile[],
  tasks: Task[],
  glossary: GlossaryEntry[],
) {
  return {
    fileCount: countFilesForCourse(files, courseId),
    generatedTaskCount: tasks.filter((t) => t.courseId === courseId).length,
    glossaryCount: glossary.filter((g) => g.courseId === courseId).length,
  };
}
