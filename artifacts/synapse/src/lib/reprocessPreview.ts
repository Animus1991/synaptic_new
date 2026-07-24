/**
 * Dry-run preview for course reprocess — before/after Reader text, quality score,
 * and lesson-rail step titles without mutating store state.
 */

import type { Course, UploadedFile } from '../types';
import { t, type Lang } from './i18n';
import { buildReaderSegments, readerSegmentsToStepSections } from './readerDocumentLayout';
import { buildReprocessEditorSections, type ReprocessEditorSection } from './reprocessEditorSections';
import { buildWorkspaceStepsFromNotes, fallbackWorkspaceSteps } from './noteContentExtractors';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import { normalizeDocumentText } from './textSegmentation';
import { buildMaterialOutlinePreview } from './uploadOutlinePreview';
import { isGarbageStepTitle } from './workspaceStepTitleQuality';

export type ReprocessPreviewStepTitle = {
  title: string;
  garbage: boolean;
};

export type ReprocessPreview = {
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  beforeSnippet: string;
  afterSnippet: string;
  beforeFullText: string;
  afterFullText: string;
  sections: ReprocessEditorSection[];
  beforeStepTitles: ReprocessPreviewStepTitle[];
  afterStepTitles: ReprocessPreviewStepTitle[];
  topicCountBefore: number;
  topicCountAfter: number;
  sectionCountBefore: number;
  sectionCountAfter: number;
  pipelineVersionAfter: string;
  hasMaterialChanges: boolean;
  warnings: string[];
};

function linkedCourseFiles(course: Course, allFiles: UploadedFile[]): UploadedFile[] {
  return allFiles.filter(
    (f) => f.courseId === course.id && (f.extractedText?.trim().length ?? 0) > 40,
  );
}

function combineFileText(files: UploadedFile[]): string {
  return files.map((f) => f.extractedText!.trim()).join('\n\n');
}

/** Pick a Reader snippet that highlights lecture headings or early body text. */
export function extractReaderPreviewSnippet(text: string, maxLen = 360): string {
  const clean = text.trim();
  if (!clean) return '';

  const markers = [
    /ΔΙΑΛΕΞΗ[^\n]{0,100}/i,
    /Lecture[^\n]{0,100}/i,
    /Chapter[^\n]{0,100}/i,
    /Module[^\n]{0,100}/i,
  ];
  for (const re of markers) {
    const match = clean.match(re);
    if (match?.[0]) {
      const start = clean.indexOf(match[0]);
      return clean.slice(start, start + maxLen).trim();
    }
  }
  return clean.slice(0, maxLen).trim();
}

function resolvePreviewConcept(course: Course, conceptHint?: string): string {
  const hint = conceptHint?.trim();
  if (hint && hint.length > 1) return hint;
  const topic = course.topics[0]?.title?.trim();
  if (topic && topic.length > 1) return topic;
  return course.title.trim() || 'Introduction';
}

function previewRawStepTitles(text: string, lang: Lang): ReprocessPreviewStepTitle[] {
  const sections = readerSegmentsToStepSections(buildReaderSegments(text), lang);
  if (sections.length >= 2) {
    return sections.slice(0, 8).map((section) => {
      const title = (section.heading ?? section.text.split('\n')[0] ?? '').trim().slice(0, 42);
      return { title: title || t('reprocessSectionSingular', lang), garbage: isGarbageStepTitle(title) };
    });
  }
  const fallback = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4);
  return fallback.map((line) => ({
    title: line.slice(0, 42),
    garbage: isGarbageStepTitle(line),
  }));
}

function previewSanitizedStepTitles(
  text: string,
  concept: string,
  lang: 'en' | 'el',
): ReprocessPreviewStepTitle[] {
  const steps = buildWorkspaceStepsFromNotes(text, concept, lang)
    ?? fallbackWorkspaceSteps(concept, lang);
  return steps.slice(0, 8).map((step) => ({
    title: step.title,
    garbage: isGarbageStepTitle(step.title),
  }));
}

function countGarbageTitles(titles: ReprocessPreviewStepTitle[]): number {
  return titles.filter((t) => t.garbage).length;
}

/** Simulate reprocess pipeline output for the reprocess wizard modal. */
export function buildReprocessPreview(
  course: Course,
  allFiles: UploadedFile[],
  lang: 'en' | 'el' = 'el',
  conceptHint?: string,
): ReprocessPreview | null {
  const linked = linkedCourseFiles(course, allFiles);
  if (linked.length === 0) return null;

  const beforeText = combineFileText(linked);
  const afterFiles = linked.map((f) => ({
    ...f,
    extractedText: normalizeDocumentText(f.extractedText!.trim()),
  }));
  const afterText = combineFileText(afterFiles);
  const fileNames = linked.map((f) => f.name);

  const beforeOutline = buildMaterialOutlinePreview(beforeText, fileNames);
  const afterOutline = buildMaterialOutlinePreview(afterText, fileNames);
  if (!afterOutline) return null;

  const beforeScore = course.sourceQuality?.score ?? beforeOutline?.quality.score ?? 0;
  const afterScore = afterOutline.quality.score;
  const concept = resolvePreviewConcept(course, conceptHint);
  const beforeStepTitles = previewRawStepTitles(beforeText, lang);
  const afterStepTitles = previewSanitizedStepTitles(afterText, concept, lang);

  const beforeSnippet = extractReaderPreviewSnippet(beforeText);
  const afterSnippet = extractReaderPreviewSnippet(afterText);
  const sections = buildReprocessEditorSections(beforeText, afterText, lang);
  const garbageBefore = countGarbageTitles(beforeStepTitles);
  const garbageAfter = countGarbageTitles(afterStepTitles);

  return {
    beforeScore,
    afterScore,
    scoreDelta: afterScore - beforeScore,
    beforeSnippet,
    afterSnippet,
    beforeFullText: beforeText,
    afterFullText: afterText,
    sections,
    beforeStepTitles,
    afterStepTitles,
    topicCountBefore: course.topics.length,
    topicCountAfter: afterOutline.outline.topics.length,
    sectionCountBefore: beforeOutline?.structure.sectionCount ?? course.sourceQuality?.metrics.sectionCount ?? 0,
    sectionCountAfter: afterOutline.structure.sectionCount,
    pipelineVersionAfter: CONTENT_PIPELINE_VERSION,
    hasMaterialChanges:
      beforeSnippet !== afterSnippet
      || afterScore !== beforeScore
      || garbageAfter < garbageBefore
      || afterOutline.outline.topics.length !== course.topics.length,
    warnings: afterOutline.warnings.slice(0, 3),
  };
}

/** Resolve a course record for reprocess preview — falls back to file-backed stub. */
export function resolveReprocessCourse(
  courses: Course[],
  courseIdHint: string | undefined,
  uploadedFiles: UploadedFile[],
  courseName?: string,
): Course | null {
  const fileCourseId = uploadedFiles.find(
    (f) => f.courseId && (f.extractedText?.trim().length ?? 0) > 40,
  )?.courseId;
  const id = courseIdHint ?? fileCourseId;
  if (!id) return null;

  const found = courses.find((c) => c.id === id);
  if (found) return found;

  const linked = uploadedFiles.filter(
    (f) => f.courseId === id && (f.extractedText?.trim().length ?? 0) > 40,
  );
  if (linked.length === 0) return null;

  const pipelineVersion = linked[0]?.pipelineVersion;
  return {
    id,
    title: courseName?.trim() || linked[0]?.name || 'Course',
    description: '',
    subject: '',
    color: '#8b7355',
    icon: 'book',
    totalLessons: 0,
    completedLessons: 0,
    mastery: 0,
    difficulty: 'mixed',
    topics: [],
    createdAt: new Date().toISOString(),
    estimatedHours: 0,
    sourceFiles: linked.map((f) => f.name),
    status: 'ready',
    sourceMode: 'strict',
    conceptCount: 0,
    glossaryCount: 0,
    exerciseCount: 0,
    pipelineMeta: pipelineVersion
      ? { version: pipelineVersion, generatedAt: new Date().toISOString(), outlineSource: 'fallback' }
      : undefined,
  };
}
