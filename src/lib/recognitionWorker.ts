/**
 * Web Worker for Synapse content recognition.
 *
 * Runs the heavy course-generation pipeline off the main thread:
 *   - outline generation (LLM or offline content analysis)
 *   - course building from outline
 *   - source quality analysis
 *   - concept span extraction
 *
 * The main thread is responsible for file extraction, UI state, and persistence.
 */

import type { Course, CourseSourceQuality, GlossaryEntry, UploadedFile, UserSettings } from '../types';
import { generateCourseOutline } from './courseGenerator';
import { analyzeContentToOutline, analyzeContentToOutlineAsync } from './contentAnalysis';
import { buildCourseFromOutline } from './uploadPipeline';
import { mergeOutlineIntoCourse } from './courseMerge';
import {
  adaptOutlineToSourceQuality,
  analyzeCourseSourceQuality,
  buildOutlinePreviewFromCourse,
  buildOutlinePreviewFromTitles,
} from './courseSourceQuality';
import { buildConceptSpans } from './conceptProvenance';
import { extractTopicsFromText } from './uploadPipeline';
import { synthesizeOutlineV2 } from './outlineSynthesis';
import type { GeneratedOutline } from './courseGenerator';

export type RecognitionWorkerInput = {
  text: string;
  fileNames: string[];
  payload: {
    files: { name: string; type: string; size: number }[];
    pastedContent?: string;
    youtubeUrl?: string;
    sourceMode: Course['sourceMode'];
    focusTags: string[];
    examDate?: string;
    title?: string;
    targetCourseId?: string;
    uploadMode?: 'new' | 'extend';
  };
  settings: UserSettings;
  existingCount: number;
  extendTarget?: Course;
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
};

export type RecognitionWorkerOutput = {
  course: Course;
  outline: GeneratedOutline | null;
  glossary: GlossaryEntry[];
  courseQuality?: CourseSourceQuality;
  withCourse: UploadedFile[];
  ytFile?: UploadedFile;
};

export type RecognitionWorkerMessage =
  | { type: 'result'; output: RecognitionWorkerOutput }
  | { type: 'error'; error: string };

function buildFallbackCourse(
  text: string,
  payload: RecognitionWorkerInput['payload'],
  existingCount: number,
): Course {
  const previewTitle =
    payload.title ??
    payload.files[0]?.name?.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') ??
    payload.youtubeUrl ??
    'Custom Material';
  const previewOutline = buildOutlinePreviewFromTitles({
    title: previewTitle,
    subject: 'General Studies',
    topics: extractTopicsFromText(text, payload.files.map((f) => f.name)),
  });
  const adapted = adaptOutlineToSourceQuality(
    previewOutline,
    analyzeCourseSourceQuality(text, previewOutline),
  );
  return buildCourseFromOutline(
    adapted.outline,
    {
      files: payload.files as unknown as File[],
      pastedContent: text,
      youtubeUrl: payload.youtubeUrl,
      sourceMode: payload.sourceMode,
      focusTags: payload.focusTags,
      examDate: payload.examDate,
      title: payload.title,
      targetCourseId: payload.targetCourseId,
      uploadMode: payload.uploadMode,
    },
    existingCount,
    adapted.quality,
  ).course;
}

self.onmessage = async (event: MessageEvent<RecognitionWorkerInput>) => {
  const { text, fileNames, payload, settings, existingCount, extendTarget, uploadedFiles, glossaryEntries } = event.data;
  try {
    const combinedCourseText = extendTarget
      ? [
          uploadedFiles
            .filter((file) => file.courseId === extendTarget.id)
            .map((file) => file.extractedText?.trim())
            .filter((value): value is string => Boolean(value))
            .join('\n\n'),
          text,
        ]
          .filter(Boolean)
          .join('\n\n') || text
      : text;

    let outline =
      (await generateCourseOutline(text, fileNames, settings)) ??
      (await analyzeContentToOutlineAsync(text, fileNames, settings)) ??
      analyzeContentToOutline(text, fileNames, settings);
    if (outline && outline.topics.length > 1) {
      outline = await synthesizeOutlineV2(text, outline, { settings });
    }
    let course: Course;
    let courseQuality: CourseSourceQuality | undefined;
    let nextGlossary = [...glossaryEntries];

    if (outline) {
      courseQuality = analyzeCourseSourceQuality(combinedCourseText, outline);
      const adapted = adaptOutlineToSourceQuality(outline, courseQuality);
      outline = adapted.outline;
      courseQuality = adapted.quality;
      const built = buildCourseFromOutline(
        outline,
        {
          files: payload.files as unknown as File[],
          pastedContent: text,
          youtubeUrl: payload.youtubeUrl,
          sourceMode: payload.sourceMode,
          focusTags: payload.focusTags,
          examDate: payload.examDate,
          title: payload.title,
          targetCourseId: payload.targetCourseId,
          uploadMode: payload.uploadMode,
        },
        existingCount,
        courseQuality,
      );
      if (extendTarget) {
        const merged = mergeOutlineIntoCourse(
          extendTarget,
          outline,
          fileNames,
          glossaryEntries,
          built.glossary,
        );
        course = merged.course;
        nextGlossary = [
          ...glossaryEntries.filter((g) => g.courseId !== course.id),
          ...merged.glossary,
        ];
        const mergedPreview = buildOutlinePreviewFromCourse(course, merged.glossary);
        const mergedQuality = analyzeCourseSourceQuality(combinedCourseText, mergedPreview);
        course = { ...course, sourceQuality: mergedQuality };
      } else {
        course = built.course;
        if (built.glossary.length > 0) {
          nextGlossary = [...glossaryEntries, ...built.glossary];
        }
      }
    } else if (extendTarget) {
      const mergedQuality = analyzeCourseSourceQuality(
        combinedCourseText,
        buildOutlinePreviewFromCourse(
          extendTarget,
          glossaryEntries.filter((entry) => entry.courseId === extendTarget.id),
        ),
      );
      course = { ...extendTarget, sourceQuality: mergedQuality };
    } else {
      course = buildFallbackCourse(text, payload, existingCount);
    }

    const topics = course.topics.map((t) => t.title);
    const withCourse: UploadedFile[] = payload.files.length > 0
      ? payload.files.map((f, i) => ({
        id: `file-${Date.now()}-${i}`,
        name: f.name,
        type: f.type as UploadedFile['type'],
        size: f.size,
        uploadedAt: new Date().toISOString(),
        status: 'analyzed',
        progress: 100,
        courseId: course.id,
        extractedTopics: topics,
        extractedText: fileNames[i] ?? (payload.files.length === 1 ? text : undefined),
      }))
      : [{
        id: `file-paste-${Date.now()}`,
        name: payload.title?.trim() || 'Pasted notes',
        type: 'txt',
        size: text.length,
        uploadedAt: new Date().toISOString(),
        status: 'analyzed',
        progress: 100,
        courseId: course.id,
        extractedTopics: topics,
        extractedText: text,
      }];

    let ytFile: UploadedFile | undefined;
    if (payload.youtubeUrl) {
      ytFile = {
        id: `file-yt-${Date.now()}`,
        name: payload.youtubeUrl,
        type: 'txt',
        size: 0,
        uploadedAt: new Date().toISOString(),
        status: 'analyzed',
        progress: 100,
        courseId: course.id,
        extractedTopics: topics,
        extractedText: text,
      };
    }

    if (outline && course.conceptSpans === undefined) {
      const conceptLabels = [...new Set(outline.topics.flatMap((t) => t.concepts))];
      course = {
        ...course,
        conceptSpans: buildConceptSpans(withCourse, conceptLabels, course.id),
      };
    }

    const output: RecognitionWorkerOutput = {
      course,
      outline,
      glossary: nextGlossary,
      courseQuality,
      withCourse,
      ytFile,
    };
    self.postMessage({ type: 'result', output } as RecognitionWorkerMessage);
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message } as RecognitionWorkerMessage);
  }
};

export {};
