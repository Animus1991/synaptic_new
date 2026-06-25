import type { Course, GlossaryEntry, UploadedFile } from '../types';
import { reprocessCourseFromStoredText } from './pipelineReprocess';
import { countFilesForCourse } from './deleteCascade';

export type RemoveFileResult = {
  files: UploadedFile[];
  courses: Course[];
  removed: boolean;
  reprocessed: boolean;
  /** Set when the course has zero source files after removal. */
  courseFullyOrphaned?: string;
  remainingFilesForCourse: number;
};

/** Remove one uploaded file and refresh course provenance when other sources remain. */
export function removeUploadedFileFromLibrary(
  fileId: string,
  files: UploadedFile[],
  courses: Course[],
): RemoveFileResult {
  const target = files.find((f) => f.id === fileId);
  if (!target) {
    return { files, courses, removed: false, reprocessed: false, remainingFilesForCourse: 0 };
  }

  let nextFiles = files.filter((f) => f.id !== fileId);
  const courseId = target.courseId;

  let nextCourses = courses.map((c) => {
    if (!courseId || c.id !== courseId) return c;
    const remaining = nextFiles.filter((f) => f.courseId === courseId);
    return {
      ...c,
      sourceFiles: remaining.map((f) => f.name),
      conceptSpans: c.conceptSpans?.filter((s) => s.fileId !== fileId),
    };
  });

  let reprocessed = false;
  if (courseId) {
    const course = nextCourses.find((c) => c.id === courseId);
    if (course) {
      const reprocess = reprocessCourseFromStoredText(course, nextFiles);
      if (reprocess) {
        nextFiles = reprocess.files;
        nextCourses = nextCourses.map((c) => (c.id === courseId ? reprocess.course : c));
        reprocessed = true;
      }
    }
  }

  const remainingFilesForCourse = courseId ? countFilesForCourse(nextFiles, courseId) : 0;

  return {
    files: nextFiles,
    courses: nextCourses,
    removed: true,
    reprocessed,
    courseFullyOrphaned: courseId && remainingFilesForCourse === 0 ? courseId : undefined,
    remainingFilesForCourse,
  };
}

/** @deprecated Use glossaryAfterCourseSourceRemoval from deleteCascade.ts */
export function glossaryAfterFileRemoval(
  glossaryEntries: GlossaryEntry[],
  _fileId: string,
): GlossaryEntry[] {
  return glossaryEntries;
}
