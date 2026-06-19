import type { Course, UploadedFile } from '../types';
import { extractTextFromFile } from './pdfExtract';

const TOPIC_KEYWORDS = [
  'supply', 'demand', 'elasticity', 'consumer', 'utility', 'monopoly', 'oligopoly',
  'cournot', 'bertrand', 'welfare', 'game theory', 'pandas', 'numpy', 'regression',
  'probability', 'statistics', 'philosophy', 'ethics', 'epistemology',
];

export function extractTopicsFromText(text: string, fileNames: string[] = []): string[] {
  const blob = `${text} ${fileNames.join(' ')}`.toLowerCase();
  const found = TOPIC_KEYWORDS.filter((k) => blob.includes(k));
  const fromNames = fileNames
    .map((n) => n.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '))
    .filter((n) => n.length > 3);
  return [...new Set([...found.map(capitalize), ...fromNames])].slice(0, 12);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type UploadPayload = {
  files: File[];
  pastedContent?: string;
  youtubeUrl?: string;
  sourceMode: Course['sourceMode'];
  focusTags: string[];
  examDate?: string;
  title?: string;
};

export function buildCourseFromUpload(payload: UploadPayload, existingCount: number): Course {
  const primaryName = payload.files[0]?.name ?? payload.youtubeUrl ?? 'Custom Material';
  const title = payload.title ?? primaryName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const topics = extractTopicsFromText(payload.pastedContent ?? '', payload.files.map((f) => f.name));

  return {
    id: `c-upload-${Date.now()}`,
    title,
    description: `Generated from ${payload.files.length} file(s)${payload.youtubeUrl ? ' + video' : ''}. Focus: ${payload.focusTags.join(', ') || 'General'}.`,
    subject: inferSubject(topics),
    color: ['#818cf8', '#22d3ee', '#2dd4bf', '#fb923c'][existingCount % 4]!,
    icon: '📚',
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
    status: 'ready',
    sourceMode: payload.sourceMode,
    conceptCount: topics.length * 4,
    glossaryCount: topics.length * 2,
    exerciseCount: topics.length * 3,
    examDate: payload.examDate,
  };
}

function inferSubject(topics: string[]): string {
  const blob = topics.join(' ').toLowerCase();
  if (blob.match(/pandas|numpy|python|code/)) return 'Programming';
  if (blob.match(/philosophy|ethics|epistemology/)) return 'Philosophy';
  if (blob.match(/probability|statistics/)) return 'Mathematics';
  return 'Economics';
}

export async function readTextFromFiles(files: File[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    try {
      const { text } = await extractTextFromFile(f);
      if (text.trim()) parts.push(text);
    } catch {
      /* ignore unreadable files */
    }
  }
  return parts.join('\n\n');
}

export async function extractFileContent(file: File): Promise<{ text: string; pageCount?: number }> {
  return extractTextFromFile(file);
}

export function uploadedFileMeta(
  file: File,
  courseId?: string,
  topics?: string[],
  extractedText?: string,
  pageCount?: number,
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
    case 'csv': return 'csv';
    case 'py': case 'js': case 'ts': return 'code';
    default: return 'pdf';
  }
}
