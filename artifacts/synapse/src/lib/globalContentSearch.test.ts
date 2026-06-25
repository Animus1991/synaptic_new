import { describe, expect, it } from 'vitest';
import { buildCourseFromUpload } from './uploadPipeline';
import { searchUploadedContent } from './globalContentSearch';
import type { GlossaryEntry, UploadedFile } from '../types';

const course = buildCourseFromUpload(
  {
    files: [],
    pastedContent: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ. Θεματική: εμπορική πολιτική.',
    sourceMode: 'enriched',
    focusTags: [],
    title: 'Διεθνής Οικονομική',
  },
  0,
);

const file: UploadedFile = {
  id: 'f1',
  name: 'syllabus.pdf',
  type: 'pdf',
  size: 1024,
  uploadedAt: new Date().toISOString(),
  status: 'analyzed',
  courseId: course.id,
  extractedText: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ. Θεματική: εμπορική πολιτική.',
};

const glossary: GlossaryEntry = {
  courseId: course.id,
  term: 'δασμός',
  definition: 'Tax on imports',
  source: 'notes',
  relatedConcepts: [],
};

describe('globalContentSearch', () => {
  it('finds courses and topics by Greek query', () => {
    const hits = searchUploadedContent('οικονομ', [course], [file], [glossary]);
    expect(hits.some((h) => h.kind === 'course')).toBe(true);
    expect(hits.some((h) => h.kind === 'topic')).toBe(true);
  });

  it('finds note excerpts and glossary terms', () => {
    const hits = searchUploadedContent('δασμ', [course], [file], [glossary]);
    expect(hits.some((h) => h.kind === 'glossary')).toBe(true);
    const noteHits = searchUploadedContent('διεθν', [course], [file], []);
    expect(noteHits.some((h) => h.kind === 'note')).toBe(true);
  });

  it('returns empty for short queries', () => {
    expect(searchUploadedContent('a', [course], [file], [])).toEqual([]);
  });
});
