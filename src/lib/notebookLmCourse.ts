import type { Course, UploadedFile } from '../types';
import { buildCourseFromUpload } from './uploadPipeline';
import {
  buildNotebookLmUploadedFile,
  type NotebookLmImportResult,
} from './notebooklmImport';

export const NOTEBOOKLM_COURSE_MIN_CHARS = 80;

export function notebookLmCourseTitle(result: Pick<NotebookLmImportResult, 'title'>): string {
  return result.title
    .replace(/^Study Guide\s*[—–-]\s*/i, '')
    .replace(/^Εγχειρίδιο\s*[—–-]\s*/i, '')
    .trim() || result.title;
}

export function canCreateCourseFromNotebookLm(result: NotebookLmImportResult): boolean {
  return result.markdown.trim().length >= NOTEBOOKLM_COURSE_MIN_CHARS || result.quizCards.length >= 2;
}

export function buildNotebookLmCourseBundle(
  result: NotebookLmImportResult,
  existingCount: number,
  opts?: { courseId?: string },
): { file: UploadedFile; course: Course | null } {
  const file = buildNotebookLmUploadedFile(result, { courseId: opts?.courseId });
  if (opts?.courseId) {
    return { file: { ...file, courseId: opts.courseId }, course: null };
  }
  if (!canCreateCourseFromNotebookLm(result)) {
    return { file, course: null };
  }

  const title = notebookLmCourseTitle(result);
  const draft = buildCourseFromUpload(
    {
      files: [],
      pastedContent: result.markdown,
      analyzedText: result.markdown,
      title,
      sourceMode: 'notes-only',
      focusTags: [],
    },
    existingCount,
  );
  const course: Course = {
    ...draft,
    status: 'ready',
    sourceFiles: [file.name],
    description:
      result.kind === 'quiz'
        ? `Imported NotebookLM quiz: ${title}`
        : `Imported from NotebookLM: ${title}`,
  };
  return { file: { ...file, courseId: course.id }, course };
}
