/**
 * Prompt pack — Reprocess → task regeneration (canonical suite name).
 * Core implementation: pipelineReprocess.ts
 */

import { describe, expect, it } from 'vitest';
import {
  reprocessCourseFromStoredText,
  regenerateTasksAfterReprocess,
  summarizeReprocessTaskDelta,
  topicsChangedAfterReprocess,
} from './pipelineReprocess';
import { buildQuizFromNotes } from './noteContentExtractors';
import { buildQuizSession } from './quizSession';
import { extractComparisons, buildDebateTreeFromNotes } from './noteContentExtractors';
import type { Course, UploadedFile } from '../types';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

const course: Course = {
  id: 'c-reprocess',
  title: 'International Economics',
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
  sourceFiles: ['lecture.pdf'],
  status: 'ready',
  sourceMode: 'enriched',
  conceptCount: 4,
  glossaryCount: 2,
  exerciseCount: 3,
  pipelineMeta: { version: '2.0.0', generatedAt: '2026-01-01', outlineSource: 'lexical' },
};

const RICARDO_TEXT = `
ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ
Η χώρα εξάγει φασόλια με 100 μονάδες εργασίας. Εισάγει μπανάνες.

ΔΙΑΛΕΞΗ 2 RICARDO
Συγκριτικά πλεονεκτήματα. Η Αγγλία παράγει ύφασμα ενώ η Πορτογαλία παράγει κρασί.
`.trim();

const file: UploadedFile = {
  id: 'f-r',
  name: 'lecture.pdf',
  type: 'pdf',
  size: 1200,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId: 'c-reprocess',
  extractedText: RICARDO_TEXT,
  pipelineVersion: '2.0.0',
};

describe.sequential('Reprocess', () => {
  it('regenerates topics and tasks from stored text', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    expect(result!.course.topics.length).toBeGreaterThan(0);
    expect(result!.tasksRegenerated).toBe(true);
    expect(result!.files[0]!.pipelineVersion).toBe(CONTENT_PIPELINE_VERSION);

    const tasks = regenerateTasksAfterReprocess([], result!.course);
    expect(tasks.some((t) => t.courseId === course.id)).toBe(true);
  });

  it('enables workspace tools after reprocess on generic Introduction step', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    const text = result!.files[0]!.extractedText ?? '';

    const quiz = buildQuizFromNotes(text, 'Introduction', result!.glossary, 'el');
    expect(quiz).not.toBeNull();

    const session = buildQuizSession(text, 'Introduction', result!.glossary, 'el', 0, 50, 3);
    expect(session.length).toBeGreaterThan(0);

    const comparisons = extractComparisons(text, 'Introduction', result!.glossary);
    expect(comparisons.length).toBeGreaterThan(0);

    const debate = buildDebateTreeFromNotes(text, 'Introduction');
    expect(debate).not.toBeNull();
  });

  it('replaces stale generated tasks instead of silently keeping old ones', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    const stale = [{
      id: `gen-${course.id}-stale-lesson`,
      title: 'Stale: Old outline',
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
    const merged = regenerateTasksAfterReprocess(stale, result!.course);
    expect(merged.some((t) => t.id.includes('stale'))).toBe(false);
    expect(merged.some((t) => t.courseId === course.id)).toBe(true);

    const delta = summarizeReprocessTaskDelta(stale, merged, course.id, result!.course.topics.length);
    expect(delta.removedGenerated).toBe(1);
    expect(delta.addedGenerated).toBeGreaterThan(0);
  });

  it('preserves non-generated course tasks while refreshing generated ones', { timeout: 30_000 }, () => {
    const result = reprocessCourseFromStoredText(course, [file]);
    expect(result).not.toBeNull();
    const manual = [{
      id: 'manual-user-task',
      title: 'My custom review',
      description: 'user task',
      type: 'lesson' as const,
      courseId: course.id,
      courseName: course.title,
      courseColor: course.color,
      courseIcon: course.icon,
      status: 'pending' as const,
      priority: 'low' as const,
      category: 'review' as const,
      estimatedMinutes: 10,
      xpReward: 15,
      isSpacedRepetition: false,
      tags: ['manual'],
    }];
    const merged = regenerateTasksAfterReprocess(manual, result!.course);
    expect(merged.some((t) => t.id === 'manual-user-task')).toBe(true);
    expect(merged.some((t) => t.id.startsWith(`gen-${course.id}-`))).toBe(true);
  });

  it('regenerates tasks even when re-running on equivalent stored text (idempotent regen)', { timeout: 30_000 }, () => {
    const first = reprocessCourseFromStoredText(course, [file]);
    const second = reprocessCourseFromStoredText(first!.course, first!.files);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(topicsChangedAfterReprocess(first!.course, second!.course)).toBe(false);

    const once = regenerateTasksAfterReprocess([], first!.course);
    const twice = regenerateTasksAfterReprocess(once, second!.course);
    expect(twice.length).toBe(once.length);
    expect(twice.map((t) => t.id).sort()).toEqual(once.map((t) => t.id).sort());
  });
});
