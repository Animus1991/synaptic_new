import { describe, expect, it } from 'vitest';
import type { Course, UploadedFile } from '../types';
import { removeUploadedFileFromLibrary } from './removeUploadedFile';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

const course: Course = {
  id: 'c1',
  title: 'Eco',
  description: '',
  subject: 'Econ',
  color: '#818cf8',
  icon: '📚',
  totalLessons: 4,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [],
  createdAt: '2026-01-01',
  estimatedHours: 2,
  sourceFiles: ['a.pdf', 'b.pdf'],
  status: 'ready',
  sourceMode: 'enriched',
  conceptCount: 2,
  glossaryCount: 0,
  exerciseCount: 0,
  pipelineMeta: { version: '2.0.0', generatedAt: '2026-01-01', outlineSource: 'lexical' },
  conceptSpans: [
    {
      conceptId: 'supply',
      concept: 'Supply',
      chunkId: 'ch1',
      fileId: 'f1',
      charStart: 0,
      charEnd: 10,
      fileName: 'a.pdf',
    },
  ],
};

const GREEK_LECTURE = `
ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ
Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.

ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Απόλυτα πλεονεκτήματα και διεθνές εμπόριο.
`.trim();

const mkFile = (id: string, name: string, text: string): UploadedFile => ({
  id,
  name,
  type: 'pdf',
  size: 100,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId: 'c1',
  extractedText: text,
  pipelineVersion: '2.0.0',
});

describe('removeUploadedFileFromLibrary', () => {
  it('removes file and reprocesses remaining sources', () => {
    const files = [
      mkFile('f1', 'a.pdf', 'Supply and demand basics in economics for introductory courses.'),
      mkFile('f2', 'b.pdf', GREEK_LECTURE),
    ];
    const result = removeUploadedFileFromLibrary('f1', files, [course]);
    expect(result.removed).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.id).toBe('f2');
    expect(result.courses[0]!.sourceFiles).toEqual(['b.pdf']);
    expect(result.courses[0]!.conceptSpans?.every((s) => s.fileId !== 'f1')).toBe(true);
    expect(result.reprocessed).toBe(true);
    expect(result.files[0]!.pipelineVersion).toBe(CONTENT_PIPELINE_VERSION);
    expect(result.remainingFilesForCourse).toBe(1);
    expect(result.courseFullyOrphaned).toBeUndefined();
  });

  it('marks course fully orphaned when last file removed', () => {
    const files = [mkFile('f1', 'a.pdf', GREEK_LECTURE)];
    const result = removeUploadedFileFromLibrary('f1', files, [course]);
    expect(result.remainingFilesForCourse).toBe(0);
    expect(result.courseFullyOrphaned).toBe('c1');
  });

  it('returns removed false when file id missing', () => {
    const result = removeUploadedFileFromLibrary('missing', [], [course]);
    expect(result.removed).toBe(false);
  });
});
