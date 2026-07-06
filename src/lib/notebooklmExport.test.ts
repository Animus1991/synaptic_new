import { describe, it, expect } from 'vitest';
import {
  buildFsrsDueChecklistMarkdown,
  buildNotebookLmExportPayload,
  buildWeakAreaReviewPackMarkdown,
} from './notebooklmExport';
import type { Course, LearnerModel, SpacingData } from '../types';

const course = {
  id: 'c1',
  title: 'Economics 101',
  description: 'Intro course',
  topics: [
    { id: 't1', title: 'Elasticity', description: 'Price sensitivity', mastery: 42, lessons: [], keyConcepts: ['elasticity'] },
  ],
  completedLessons: 0,
  totalLessons: 4,
  mastery: 55,
  sourceFiles: [],
} as unknown as Course;

describe('notebooklmExport', () => {
  it('builds study guide export payload', () => {
    const payload = buildNotebookLmExportPayload('study-guide', { course, lang: 'en' });
    expect(payload.kind).toBe('study-guide');
    expect(payload.markdown).toContain('Study guide');
    expect(payload.markdown).toContain('Elasticity');
    expect(payload.filename).toContain('.md');
  });

  it('builds weak-area review pack', () => {
    const md = buildWeakAreaReviewPackMarkdown(
      course,
      [{ concept: 'Elasticity', mastery: 42 }],
      'en',
    );
    expect(md).toContain('Review pack');
    expect(md).toContain('Elasticity');
    expect(md).toContain('- [ ]');
  });

  it('builds FSRS due checklist from spacing rows', () => {
    const spacing: SpacingData[] = [{
      concept: 'Elasticity',
      interval: 1,
      nextReview: new Date(Date.now() - 86_400_000).toISOString(),
      stability: 1,
      difficulty: 0.5,
      reviewCount: 2,
    }];
    const md = buildFsrsDueChecklistMarkdown(spacing, 'en', course.title, 'Elasticity');
    expect(md).toContain('FSRS due');
    expect(md).toContain('- [ ]');
  });

  it('builds review-pack payload from learner model', () => {
    const learnerModel = {
      weakAreas: [{ concept: 'Supply', courseId: 'c1', mastery: 35 }],
      spacingIntervals: [],
    } as unknown as LearnerModel;
    const payload = buildNotebookLmExportPayload('review-pack', { course, learnerModel, lang: 'en' });
    expect(payload.markdown).toContain('Supply');
  });
});
