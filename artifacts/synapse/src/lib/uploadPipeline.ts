import type { Course, CourseSourceQuality, GlossaryEntry, UploadedFile, UserSettings } from '../types';
import { extractTextFromFile, type FileExtractResult } from './pdfExtract';
import { inferSubject, rankKeyphrases, titleCasePhrase } from './contentAnalysis';
import type { GeneratedOutline } from './courseGenerator';
import { buildGlossaryEntriesFromOutline } from './courseMerge';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import { DEFAULT_COURSE_ICON_ID } from './uiIconRegistry';
import { buildDocumentModelInWorker } from './documentModelWorkerClient';
import {
  mergeRecognitionSummaries,
  recognitionSummaryFromSnapshot,
  toDocumentModelSnapshot,
  type DocumentModelSnapshot,
  type RecognitionSummary,
} from './documentModelSnapshot';
import { applyQualityGatesToCourse } from './courseQualityGates';
import { buildOutlinePreviewFromCourse } from './courseSourceQuality';

/**
 * Derive candidate topic titles from the material itself — subject-agnostic.
 * Uses content keyphrases (RAKE+TextRank blend) plus filename-derived names;
 * no hardcoded domain vocabulary (see PRODUCT_SCALE_PLAN.md §4.A0 / D9).
 */
export function extractTopicsFromText(text: string, fileNames: string[] = []): string[] {
  const fromContent = rankKeyphrases(text ?? '', 8)
    .map((k) => titleCasePhrase(k.phrase))
    .filter((t) => t.length >= 4);
  const fromNames = fileNames
    .map((n) => titleCasePhrase(n.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')))
    .filter((n) => n.length > 3);
  return [...new Set([...fromNames, ...fromContent])].slice(0, 12);
}

export type UploadPayload = {
  files: File[];
  pastedContent?: string;
  youtubeUrl?: string;
  sourceMode: Course['sourceMode'];
  focusTags: string[];
  examDate?: string;
  title?: string;
  /** When set, merge new material into this course instead of creating a new one. */
  targetCourseId?: string;
  uploadMode?: 'new' | 'extend';
  /** Full extracted/analyzed text for subject-agnostic fallback (D9). */
  analyzedText?: string;
  /** User-edited outline from the upload preview step — skips outline regeneration. */
  editedOutline?: GeneratedOutline;
};

function qualityAwareDescription(
  base: string,
  sourceQuality?: CourseSourceQuality,
): string {
  if (!sourceQuality) return base;
  if (sourceQuality.needsMoreMaterial) {
    return `${base} Source signal is still sparse, so upload more material for deeper grounding.`;
  }
  if (sourceQuality.outlineAdjusted) {
    return `${base} The outline was compacted to match the density of the current material.`;
  }
  return base;
}

export function buildCourseFromUpload(
  payload: UploadPayload,
  existingCount: number,
  sourceQuality?: CourseSourceQuality,
): Course {
  const primaryName = payload.files[0]?.name ?? payload.youtubeUrl ?? 'Custom Material';
  const title = payload.title ?? primaryName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const sourceText = payload.analyzedText ?? payload.pastedContent ?? '';
  const rawTopics = extractTopicsFromText(sourceText, payload.files.map((f) => f.name));
  const topicLimit = sourceQuality ? Math.min(6, Math.max(1, sourceQuality.finalTopicCount)) : 6;
  const topics = (rawTopics.length > 0 ? rawTopics : [title]).slice(0, topicLimit);

  const draft: Course = {
    id: `c-upload-${Date.now()}`,
    title,
    description: qualityAwareDescription(
      `Generated from ${payload.files.length} file(s)${payload.youtubeUrl ? ' + video' : ''}. Focus: ${payload.focusTags.join(', ') || 'General'}.`,
      sourceQuality,
    ),
    subject: inferSubject(sourceText),
    color: ['#818cf8', '#22d3ee', '#2dd4bf', '#fb923c'][existingCount % 4]!,
    icon: DEFAULT_COURSE_ICON_ID,
    totalLessons: Math.max(6, topics.length * 2),
    completedLessons: 0,
    mastery: 0,
    difficulty: payload.focusTags.includes('Beginner-friendly') ? 'beginner' : 'intermediate',
    topics: topics.slice(0, 6).map((t, i) => ({
      id: `ut-${Date.now()}-${i}`,
      title: t,
      description: `Extracted topic: ${t}`,
      lessons: [],
      mastery: 0,
      prerequisites: i > 0 ? [`ut-${Date.now()}-${i - 1}`] : [],
      order: i + 1,
      isLocked: false,
      estimatedMinutes: 20,
      conceptCount: 4,
      retentionPrediction: 0,
    })),
    createdAt: new Date().toISOString().slice(0, 10),
    estimatedHours: Math.max(4, topics.length),
    sourceFiles: [
      ...payload.files.map((f) => f.name),
      ...(payload.youtubeUrl ? [payload.youtubeUrl] : []),
    ],
    status: 'generating',
    sourceMode: payload.sourceMode,
    conceptCount: topics.length * 4,
    glossaryCount: topics.length * 2,
    exerciseCount: topics.length * 3,
    examDate: payload.examDate,
    ...(sourceQuality ? { sourceQuality } : {}),
  };
  const outlinePreview = buildOutlinePreviewFromCourse(draft);
  return applyQualityGatesToCourse(draft, outlinePreview, sourceText);
}

const COURSE_COLORS = ['#818cf8', '#22d3ee', '#2dd4bf', '#fb923c', '#f472b6', '#a78bfa'];

/**
 * Build a rich Course from an AI-generated outline. Preserves the same Course
 * shape used everywhere else, but populated from the real material: ordered
 * topics, prerequisite edges (by topic title), per-topic concepts, and a real
 * glossary count. Falls back gracefully — callers use `buildCourseFromUpload`
 * when no outline is available.
 */
export function buildCourseFromOutline(
  outline: GeneratedOutline,
  payload: UploadPayload,
  existingCount: number,
  sourceQuality?: CourseSourceQuality,
): { course: Course; glossary: GlossaryEntry[] } {
  const now = Date.now();
  const courseId = `c-upload-${now}`;
  const titleToId = new Map<string, string>();
  outline.topics.forEach((t, i) => titleToId.set(t.title.toLowerCase(), `ut-${now}-${i}`));

  const totalConcepts = outline.topics.reduce((sum, t) => sum + t.concepts.length, 0);

  const topics = outline.topics.map((t, i) => {
    const prerequisites = t.prerequisites
      .map((p) => titleToId.get(p.toLowerCase()))
      .filter((id): id is string => Boolean(id));
    return {
      id: `ut-${now}-${i}`,
      title: t.title,
      description: t.description,
      lessons: [],
      mastery: 0,
      prerequisites,
      order: i + 1,
      isLocked: false,
      estimatedMinutes: t.estimatedMinutes,
      conceptCount: t.concepts.length,
      retentionPrediction: 0,
      keyConcepts: t.concepts.slice(0, 8),
      ...(t.objectives && t.objectives.length > 0 ? { objectives: t.objectives } : {}),
    };
  });

  // Relate each glossary term to the topic concepts that mention it, so the
  // concept graph and glossary cross-link instead of being isolated entries.
  const glossary: GlossaryEntry[] = buildGlossaryEntriesFromOutline(courseId, outline, payload.files[0]?.name ?? payload.youtubeUrl ?? 'Uploaded material');

  const course: Course = {
    id: courseId,
    title: outline.title,
    description: qualityAwareDescription(
      outline.summary || `Generated from ${payload.files.length} file(s). Focus: ${payload.focusTags.join(', ') || 'General'}.`,
      sourceQuality,
    ),
    subject: outline.subject,
    color: COURSE_COLORS[existingCount % COURSE_COLORS.length]!,
    icon: DEFAULT_COURSE_ICON_ID,
    totalLessons: Math.max(6, outline.topics.length * 2),
    completedLessons: 0,
    mastery: 0,
    difficulty: outline.difficulty,
    topics,
    createdAt: new Date().toISOString().slice(0, 10),
    estimatedHours: Math.max(2, Math.round(outline.topics.reduce((s, t) => s + t.estimatedMinutes, 0) / 60)),
    sourceFiles: [
      ...payload.files.map((f) => f.name),
      ...(payload.youtubeUrl ? [payload.youtubeUrl] : []),
    ],
    status: 'generating',
    sourceMode: payload.sourceMode,
    conceptCount: totalConcepts,
    glossaryCount: glossary.length,
    exerciseCount: outline.topics.length * 3,
    examDate: payload.examDate,
    ...(sourceQuality ? { sourceQuality } : {}),
  };

  const sourceText = payload.analyzedText ?? payload.pastedContent ?? '';
  return {
    course: applyQualityGatesToCourse(course, outline, sourceText),
    glossary,
  };
}

export async function readTextFromFiles(files: File[], settings?: UserSettings): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    try {
      const { text } = await extractTextFromFile(f, settings);
      if (text.trim()) parts.push(text);
    } catch {
      /* ignore unreadable files */
    }
  }
  return parts.join('\n\n');
}

export async function extractFileContent(
  file: File,
  settings?: UserSettings,
): Promise<FileExtractResult> {
  return extractTextFromFile(file, settings);
}

export function uploadedFileMeta(
  file: File,
  courseId?: string,
  topics?: string[],
  extractedText?: string,
  pageCount?: number,
  ingest?: Pick<UploadedFile, 'ocrUsed' | 'ingestMethod' | 'ocrRegions' | 'pdfLayoutBlocks' | 'ocrModelsUsed' | 'thumbnailRef' | 'thumbnailStatus'>,
): UploadedFile {
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    type: inferFileType(file.name),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
    progress: 100,
    courseId,
    extractedTopics: topics,
    extractedText,
    pageCount,
    detectedLanguage: 'en',
    pipelineVersion: CONTENT_PIPELINE_VERSION,
    ...(ingest?.ocrUsed !== undefined ? { ocrUsed: ingest.ocrUsed } : {}),
    ...(ingest?.ingestMethod ? { ingestMethod: ingest.ingestMethod } : {}),
    ...(ingest?.ocrRegions?.length ? { ocrRegions: ingest.ocrRegions } : {}),
    ...(ingest?.ocrModelsUsed?.length ? { ocrModelsUsed: ingest.ocrModelsUsed } : {}),
    ...(ingest?.pdfLayoutBlocks?.length ? { pdfLayoutBlocks: ingest.pdfLayoutBlocks } : {}),
    ...(ingest?.thumbnailRef ? { thumbnailRef: ingest.thumbnailRef } : {}),
    ...(ingest?.thumbnailStatus ? { thumbnailStatus: ingest.thumbnailStatus } : {}),
  };
}

function inferFileType(name: string): UploadedFile['type'] {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'docx': case 'doc': return 'docx';
    case 'pptx': case 'ppt': return 'pptx';
    case 'txt': return 'txt';
    case 'md': return 'md';
    case 'json': case 'zip': return 'txt';
    case 'csv': return 'csv';
    case 'py': case 'js': case 'ts': return 'code';
    case 'mp3': case 'wav': case 'm4a': case 'ogg': case 'flac': case 'aac': return 'audio';
    case 'mp4': case 'webm': case 'mov': case 'mkv': case 'ogv': return 'video';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'bmp': case 'svg': return 'image';
    default: return 'pdf';
  }
}

export type DocumentRecognitionResult = {
  byFileId: Map<string, DocumentModelSnapshot>;
  courseSummary?: RecognitionSummary;
};

/**
 * Build DocumentModel snapshots for each uploaded file (off-thread when available)
 * plus an optional combined-course summary from merged source text.
 */
export async function recognizeDocumentModelsForUpload(
  files: UploadedFile[],
  combinedText: string,
  language: 'en' | 'el' = 'en',
): Promise<DocumentRecognitionResult> {
  const byFileId = new Map<string, DocumentModelSnapshot>();
  const summaries: RecognitionSummary[] = [];

  const buildOne = async (file: UploadedFile, text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 40) return;
    const model = await buildDocumentModelInWorker({
      text: trimmed,
      file: {
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        detectedLanguage: file.detectedLanguage ?? language,
      },
      options: {
        language: file.detectedLanguage ?? language,
        ...(file.pdfLayoutBlocks?.length ? { pdfLayoutBlocks: file.pdfLayoutBlocks } : {}),
      },
    });
    const snapshot = toDocumentModelSnapshot(model);
    byFileId.set(file.id, snapshot);
    summaries.push(recognitionSummaryFromSnapshot(snapshot));
  };

  await Promise.all(
    files.map((file) => buildOne(file, file.extractedText?.trim() ? file.extractedText : combinedText)),
  );

  if (combinedText.trim().length >= 80 && files.length > 1) {
    const combinedModel = await buildDocumentModelInWorker({
      text: combinedText,
      file: {
        id: `combined-${files[0]?.id ?? 'upload'}`,
        name: files.map((f) => f.name).join(' + '),
        type: 'txt',
        size: combinedText.length,
        detectedLanguage: language,
      },
      options: { language },
    });
    summaries.push(recognitionSummaryFromSnapshot(toDocumentModelSnapshot(combinedModel)));
  }

  return {
    byFileId,
    courseSummary: mergeRecognitionSummaries(summaries),
  };
}

export function attachDocumentSnapshots(
  files: UploadedFile[],
  recognition: DocumentRecognitionResult,
): UploadedFile[] {
  return files.map((file) => {
    const snapshot = recognition.byFileId.get(file.id);
    return snapshot ? { ...file, documentModelSnapshot: snapshot } : file;
  });
}
