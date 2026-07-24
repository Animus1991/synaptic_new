import { describe, expect, it } from 'vitest';
import { enrichCourseWithCrossLinks } from './crossDocumentLink';
import type { Course, UploadedFile } from '../types';

const baseCourse = (id: string, title: string, concepts: string[]): Course => ({
  id,
  title,
  subject: 'test',
  color: '#000',
  icon: 'book',
  description: '',
  mastery: 0,
  difficulty: 'mixed',
  topics: [{
    id: 't1',
    title: concepts[0] ?? 'Topic',
    description: '',
    lessons: [],
    mastery: 0,
    prerequisites: [],
    order: 0,
    isLocked: false,
    estimatedMinutes: 10,
    conceptCount: concepts.length,
    retentionPrediction: 50,
    keyConcepts: concepts,
  }],
  createdAt: new Date().toISOString(),
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: concepts.length,
  glossaryCount: 0,
  exerciseCount: 0,
  totalLessons: 0,
  completedLessons: 0,
});

describe('crossDocumentLink', () => {
  it('links courses sharing concept labels', async () => {
    const existing = baseCourse('c-old', 'Microeconomics', ['elasticity', 'demand']);
    const fresh = baseCourse('c-new', 'Macro', ['elasticity', 'gdp']);
    const text = 'Elasticity measures responsiveness of demand to price changes across markets and time horizons for policy analysis.';

    const enriched = await enrichCourseWithCrossLinks(
      fresh,
      text,
      [existing],
      [],
    );

    expect(enriched.linkedCourseIds).toContain('c-old');
    expect(enriched.conceptGraph?.edges.some((e) => e.evidence?.includes('Microeconomics'))).toBe(true);
  });

  it('adds file cross-edges when term appears in another upload', async () => {
    const course = baseCourse('c1', 'Course', ['inflation']);
    const otherFile: UploadedFile = {
      id: 'f2',
      name: 'notes.pdf',
      courseId: 'other',
      extractedText: 'Inflation erodes purchasing power over time in open economies.',
      size: 100,
      type: 'pdf',
      uploadedAt: new Date().toISOString(),
      status: 'analyzed',
    };

    const enriched = await enrichCourseWithCrossLinks(
      course,
      'Inflation is the rate of increase in prices.',
      [],
      [otherFile],
    );

    expect(enriched.conceptGraph?.edges.some((e) => e.evidence?.includes('notes.pdf'))).toBe(true);
  });
});
