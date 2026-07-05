import { describe, it, expect } from 'vitest';
import { buildAudioStudyGuideSections } from './audioStudyGuide';
import type { Course } from '../types';

const sampleCourse: Course = {
  id: 'c1',
  title: 'Physics',
  description: '',
  subject: 'science',
  color: '#6366f1',
  icon: 'book',
  topics: [
    {
      id: 't1',
      title: 'Forces',
      description: 'Newton laws apply.',
      lessons: [],
      mastery: 0,
      prerequisites: [],
      order: 0,
      isLocked: false,
      estimatedMinutes: 30,
      conceptCount: 1,
      retentionPrediction: 0.5,
    },
  ],
  totalLessons: 1,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'beginner',
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: 1,
  glossaryCount: 0,
  exerciseCount: 0,
  createdAt: new Date().toISOString(),
};

describe('buildAudioStudyGuideSections', () => {
  it('includes intro, topics, and outro', () => {
    const sections = buildAudioStudyGuideSections(sampleCourse, 'en');
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections[0]!.title).toBe('Introduction');
    expect(sections.some((s) => s.title === 'Forces')).toBe(true);
    expect(sections[sections.length - 1]!.title).toBe('Next steps');
  });

  it('localizes for Greek', () => {
    const sections = buildAudioStudyGuideSections(sampleCourse, 'el');
    expect(sections[0]!.title).toBe('Εισαγωγή');
  });
});
