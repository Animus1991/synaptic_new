import { describe, expect, it } from 'vitest';
import {
  reprocessCourseFromStoredText,
  regenerateTasksAfterReprocess,
  regenerateGlossaryAfterReprocess,
  summarizeReprocessTaskDelta,
} from './pipelineReprocess';
import type { Course, UploadedFile } from '../types';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

const course: Course = {
  id: 'c-test',
  title: 'Greek Syllabus',
  description: 'Test',
  subject: 'Economics',
  color: '#818cf8',
  icon: '📚',
  totalLessons: 6,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [],
  createdAt: '2026-01-01',
  estimatedHours: 4,
  sourceFiles: ['syllabus.pdf'],
  status: 'ready',
  sourceMode: 'enriched',
  conceptCount: 4,
  glossaryCount: 2,
  exerciseCount: 3,
  pipelineMeta: { version: '2.0.0', generatedAt: '2026-01-01', outlineSource: 'lexical' },
};

const GREEK_TEXT = `
ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ
Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.

ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Απόλυτα πλεονεκτήματα και διεθνές εμπόριο.

Βιβλιογραφία
[1] Krugman, P. (2018). International Economics. Pearson.
`.trim();

const file: UploadedFile = {
  id: 'f-1',
  name: 'syllabus.pdf',
  type: 'pdf',
  size: 1200,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId: 'c-test',
  extractedText: GREEK_TEXT,
  pipelineVersion: '2.0.0',
};

describe.sequential('pipelineReprocess', () => {
  it('bumps pipeline version and refreshes concept spans from stored text', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    expect(result!.files[0]!.pipelineVersion).toBe(CONTENT_PIPELINE_VERSION);
    expect(result!.course.pipelineMeta?.version).toBe(CONTENT_PIPELINE_VERSION);
    expect(result!.course.conceptSpans?.length).toBeGreaterThan(0);
    expect(result!.course.sourceQuality?.metrics.wordCount).toBeGreaterThan(20);
  });

  it('returns null when no stored extracted text exists', () => {
    expect(reprocessCourseFromStoredText(course, [{ ...file, extractedText: '' }])).toBeNull();
  });

  it('repairs OCR-glued Greek in stored text on reprocess', { timeout: 30_000 }, () => {
    const gluedFile: UploadedFile = {
      ...file,
      extractedText: `${GREEK_TEXT}\n\n6.Δύοχώρες;ΗημεδαπήκαιΑλλοδαπή`,
      pipelineVersion: '2.0.0',
    };
    const result = reprocessCourseFromStoredText(course, [gluedFile]);
    expect(result).not.toBeNull();
    const text = result!.files[0]!.extractedText ?? '';
    expect(text).toContain('Δύο χώρες');
    expect(text).toContain('Η ημεδαπή');
    expect(result!.files[0]!.pipelineVersion).toBe(CONTENT_PIPELINE_VERSION);
  });

  it('merges outline topics and regenerates course tasks after reprocess', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    expect(result!.tasksRegenerated).toBe(true);
    expect(result!.course.topics.length).toBeGreaterThan(0);

    const tasks = regenerateTasksAfterReprocess([], result!.course);
    expect(tasks.some((t) => t.courseId === course.id)).toBe(true);
    expect(tasks.some((t) => t.id.startsWith(`gen-${course.id}-`))).toBe(true);
  });

  it('summarizeReprocessTaskDelta reports stale generated task replacement', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    const before = [{
      id: `gen-${course.id}-stale-lesson`,
      title: 'Stale',
      description: 'stale',
      type: 'lesson' as const,
      courseId: course.id,
      courseName: course.title,
      courseColor: course.color,
      courseIcon: course.icon,
      status: 'pending' as const,
      priority: 'medium' as const,
      category: 'learn' as const,
      estimatedMinutes: 20,
      xpReward: 30,
      isSpacedRepetition: false,
      tags: [],
    }];
    const after = regenerateTasksAfterReprocess(before, result!.course);
    const delta = summarizeReprocessTaskDelta(before, after, course.id, result!.course.topics.length);
    expect(delta.removedGenerated).toBe(1);
    expect(delta.addedGenerated).toBeGreaterThan(0);
  });

  it('refreshes glossary entries for the course on reprocess', { timeout: 30_000 }, () => {
    const stale: import('../types').GlossaryEntry[] = [
      { term: 'StaleTerm', definition: 'old', source: 'x', relatedConcepts: [], courseId: course.id },
      { term: 'OtherCourse', definition: 'keep', source: 'y', relatedConcepts: [], courseId: 'other' },
    ];
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    expect(result!.glossary.length).toBeGreaterThan(0);
    expect(result!.glossary.every((g) => g.courseId === course.id)).toBe(true);
    expect(result!.glossary.some((g) => g.term === 'StaleTerm')).toBe(false);

    const merged = regenerateGlossaryAfterReprocess(stale, course.id, result!.glossary);
    expect(merged.some((g) => g.term === 'OtherCourse')).toBe(true);
    expect(merged.filter((g) => g.courseId === course.id).length).toBe(result!.glossary.length);
  });
});
