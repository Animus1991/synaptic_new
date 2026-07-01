import { describe, expect, it } from 'vitest';
import { buildGroundedQuizFeedback } from './quizGroundedFeedback';
import type { Course } from '../types';

const course: Course = {
  id: 'c1',
  title: 'Econ',
  description: '',
  subject: 'Economics',
  color: '#000',
  icon: 'book',
  totalLessons: 1,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [],
  createdAt: '2026-01-01',
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: 1,
  glossaryCount: 0,
  exerciseCount: 0,
  conceptSpans: [
    {
      conceptId: 'x',
      concept: 'Elasticity',
      chunkId: 'ch1',
      fileId: 'f1',
      charStart: 10,
      charEnd: 80,
      sentence: 'Elasticity measures price sensitivity.',
    },
  ],
};

describe('buildGroundedQuizFeedback', () => {
  it('returns source excerpt when span exists', () => {
    const fb = buildGroundedQuizFeedback(course, 'Elasticity', 'Elasticity', 'en');
    expect(fb?.sourceExcerpt).toContain('price sensitivity');
  });

  it('returns generic message without course', () => {
    const fb = buildGroundedQuizFeedback(null, 'Elasticity', 'Elasticity', 'en');
    expect(fb?.message).toContain('correct answer');
  });
});
