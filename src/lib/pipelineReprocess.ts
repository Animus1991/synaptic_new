/**
 * Re-run recognition artifacts on stored extractedText without re-uploading files.
 * Reader segments are computed live from extractedText; this refreshes course-level
 * provenance, quality signals, and pipeline version stamps.
 */

import { buildConceptSpans } from './conceptProvenance';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import { dismissReuploadHint } from './pipelineMigration';
import { normalizeDocumentText } from './textSegmentation';
import { buildMaterialOutlinePreview } from './uploadOutlinePreview';
import { mergeOutlineIntoCourse, buildGlossaryEntriesFromOutline, replaceCourseGlossary } from './courseMerge';
import { generatedTaskPrefix, isGeneratedCourseTask, mergeCourseTasks } from './taskGenerator';
import type { Lang } from './i18n';
import type { Course, GlossaryEntry, Task, UploadedFile } from '../types';

export type ReprocessTaskDelta = {
  removedGenerated: number;
  addedGenerated: number;
  preservedNonGenerated: number;
  topicCount: number;
};

export function countGeneratedTasksForCourse(tasks: Task[], courseId: string): number {
  return tasks.filter((t) => isGeneratedCourseTask(t, courseId)).length;
}

/** Compare task lists before/after `regenerateTasksAfterReprocess` for UI toasts. */
export function summarizeReprocessTaskDelta(
  tasksBefore: Task[],
  tasksAfter: Task[],
  courseId: string,
  topicCount: number,
): ReprocessTaskDelta {
  const prefix = generatedTaskPrefix(courseId);
  const removedGenerated = tasksBefore.filter((t) => t.id.startsWith(prefix)).length;
  const addedGenerated = tasksAfter.filter((t) => t.id.startsWith(prefix)).length;
  const preservedNonGenerated = tasksAfter.filter(
    (t) => t.courseId === courseId && !t.id.startsWith(prefix),
  ).length;
  return { removedGenerated, addedGenerated, preservedNonGenerated, topicCount };
}

/** Topic ids/titles fingerprint — used to detect outline drift after reprocess. */
export function topicsFingerprint(course: Course): string {
  return course.topics.map((t) => `${t.id}:${t.title}`).join('|');
}

export function topicsChangedAfterReprocess(before: Course, after: Course): boolean {
  return topicsFingerprint(before) !== topicsFingerprint(after);
}

export function regenerateTasksAfterReprocess(tasks: Task[], course: Course, lang: Lang = 'en'): Task[] {
  return mergeCourseTasks(tasks, course, lang);
}

export function regenerateGlossaryAfterReprocess(
  glossaryEntries: GlossaryEntry[],
  courseId: string,
  refreshed: GlossaryEntry[],
): GlossaryEntry[] {
  return replaceCourseGlossary(glossaryEntries, courseId, refreshed);
}

export interface ReprocessResult {
  course: Course;
  files: UploadedFile[];
  tasksRegenerated: boolean;
  glossary: GlossaryEntry[];
}

export function reprocessCourseFromStoredText(
  course: Course,
  allFiles: UploadedFile[],
): ReprocessResult | null {
  const linked = allFiles.filter(
    (f) => f.courseId === course.id && (f.extractedText?.trim().length ?? 0) > 40,
  );
  if (linked.length === 0) return null;

  const linkedIds = new Set(linked.map((f) => f.id));
  const refreshedFiles = allFiles.map((f) => {
    if (!linkedIds.has(f.id)) return f;
    const repaired = normalizeDocumentText(f.extractedText!.trim());
    return { ...f, extractedText: repaired, pipelineVersion: CONTENT_PIPELINE_VERSION };
  });
  const refreshedLinked = refreshedFiles.filter((f) => linkedIds.has(f.id));
  const combinedText = refreshedLinked.map((f) => f.extractedText!.trim()).join('\n\n');
  const fileNames = linked.map((f) => f.name);
  const preview = buildMaterialOutlinePreview(combinedText, fileNames);
  if (!preview) return null;

  const conceptLabels = [
    ...new Set(preview.outline.topics.flatMap((t) => t.concepts.length > 0 ? t.concepts : [t.title])),
  ];
  const conceptSpans = buildConceptSpans(refreshedLinked, conceptLabels, course.id);

  const updatedCourse: Course = {
    ...course,
    sourceQuality: preview.quality,
    conceptSpans,
    pipelineMeta: {
      version: CONTENT_PIPELINE_VERSION,
      generatedAt: new Date().toISOString(),
      outlineSource: course.pipelineMeta?.outlineSource ?? 'lexical',
    },
  };

  const incomingGlossary = buildGlossaryEntriesFromOutline(
    course.id,
    preview.outline,
    fileNames[0] ?? 'Stored material',
  );

  const { course: withTopics, glossary: scopedGlossary } = mergeOutlineIntoCourse(
    updatedCourse,
    preview.outline,
    [],
    [],
    incomingGlossary,
  );

  return {
    course: { ...withTopics, glossaryCount: scopedGlossary.length },
    files: refreshedFiles,
    tasksRegenerated: true,
    glossary: scopedGlossary,
  };
}

export function reprocessCourseRecognition(
  courseId: string,
  courses: Course[],
  files: UploadedFile[],
): ReprocessResult | null {
  const course = courses.find((c) => c.id === courseId);
  if (!course) return null;
  const result = reprocessCourseFromStoredText(course, files);
  if (result) dismissReuploadHint(courseId);
  return result;
}
