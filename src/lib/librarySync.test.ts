import { describe, expect, it } from 'vitest';
import type { Course, GlossaryEntry, UploadedFile } from '../types';
import {
  countPendingReviewsDue,
  detectLibrarySyncConflicts,
  mergeLibraries,
  mergeLibrariesWithConflicts,
} from './librarySync';
import type { PersistedLibrary } from './libraryStorage';

const mkCourse = (id: string, title: string, mastery = 10): Course => ({
  id,
  title,
  description: '',
  subject: 'Econ',
  color: '#818cf8',
  icon: '📚',
  totalLessons: 4,
  completedLessons: 0,
  mastery,
  difficulty: 'intermediate',
  topics: [{
    id: `${id}-t1`,
    title: 'Topic A',
    description: '',
    lessons: [],
    mastery: 0,
    prerequisites: [],
    order: 0,
    isLocked: false,
    estimatedMinutes: 10,
    conceptCount: 1,
    retentionPrediction: 0.5,
  }],
  createdAt: '2026-01-01',
  estimatedHours: 2,
  sourceFiles: ['a.pdf'],
  status: 'ready',
  sourceMode: 'enriched',
  conceptCount: 1,
  glossaryCount: 0,
  exerciseCount: 0,
});

const mkFile = (id: string, name: string, text = 'hello'): UploadedFile => ({
  id,
  name,
  type: 'pdf',
  size: 100,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId: 'c1',
  extractedText: text,
});

const mkGlossary = (term: string, definition: string): GlossaryEntry => ({
  term,
  definition,
  courseId: 'c1',
  source: 'notes',
  relatedConcepts: [],
});

function lib(
  courses: Course[],
  files: UploadedFile[] = [],
  glossary: GlossaryEntry[] = [],
): PersistedLibrary {
  return { generatedCourses: courses, uploadedFiles: files, glossaryEntries: glossary };
}

describe('librarySync conflicts (OPT-L5)', () => {
  it('detects course/file/glossary overlaps that differ', () => {
    const local = lib(
      [mkCourse('c1', 'Local Title', 40)],
      [mkFile('f1', 'notes.pdf', 'local text')],
      [mkGlossary('Supply', 'local def')],
    );
    const remote = lib(
      [mkCourse('c1', 'Remote Title', 80)],
      [mkFile('f1', 'notes.pdf', 'remote text')],
      [mkGlossary('Supply', 'remote def')],
    );
    const conflicts = detectLibrarySyncConflicts(local, remote);
    expect(conflicts.map((c) => c.kind).sort()).toEqual(['course', 'file', 'glossary']);
  });

  it('mergeLibraries keeps remote-winning values while preserving local-only ids', () => {
    const local = lib([mkCourse('c1', 'Local', 10), mkCourse('c-local', 'Only local')]);
    const remote = lib([mkCourse('c1', 'Remote', 90), mkCourse('c-remote', 'Only remote')]);
    const merged = mergeLibraries(local, remote);
    expect(merged.generatedCourses.find((c) => c.id === 'c1')?.title).toBe('Remote');
    expect(merged.generatedCourses.some((c) => c.id === 'c-local')).toBe(true);
    expect(merged.generatedCourses.some((c) => c.id === 'c-remote')).toBe(true);
  });

  it('mergeLibrariesWithConflicts returns snapshot for restore-local', () => {
    const local = lib([mkCourse('c1', 'Local', 10)]);
    const remote = lib([mkCourse('c1', 'Remote', 90)]);
    const { merged, conflicts, localSnapshot } = mergeLibrariesWithConflicts(local, remote);
    expect(conflicts).toHaveLength(1);
    expect(merged.generatedCourses[0]!.title).toBe('Remote');
    expect(localSnapshot.generatedCourses[0]!.title).toBe('Local');
  });

  it('countPendingReviewsDue tracks spaced pending only', () => {
    expect(
      countPendingReviewsDue([
        { isSpacedRepetition: true, status: 'pending' },
        { isSpacedRepetition: true, status: 'completed' },
        { isSpacedRepetition: false, status: 'pending' },
      ]),
    ).toBe(1);
  });
});
