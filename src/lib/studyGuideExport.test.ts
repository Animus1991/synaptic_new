import { describe, it, expect } from 'vitest';
import { buildStudyGuideMarkdown } from './studyGuideExport';
import type { Course } from '../types';

const course: Course = {
  id: 'c1',
  title: 'Biology Basics',
  description: 'Intro course',
  subject: 'bio',
  color: '#000',
  icon: 'book',
  totalLessons: 1,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'beginner',
  topics: [
    {
      id: 't1',
      title: 'Cells',
      description: 'Cell structure overview.',
      keyConcepts: ['membrane', 'nucleus'],
      lessons: [{
        id: 'l1', title: 'Prokaryotes', type: 'theoretical', format: 'explanation',
        duration: 10, mastery: 0, status: 'available', xpReward: 10, concepts: [],
        difficulty: 1, attempts: 0, bestScore: 0,
      }],
      mastery: 0,
      prerequisites: [],
      order: 0,
      isLocked: false,
      estimatedMinutes: 20,
      conceptCount: 2,
      retentionPrediction: 0,
    },
  ],
  createdAt: '2026-01-01',
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: 2,
  glossaryCount: 0,
  exerciseCount: 0,
};

describe('buildStudyGuideMarkdown', () => {
  it('includes title, overview, topics, and glossary', () => {
    const md = buildStudyGuideMarkdown(course, [
      { term: 'ATP', definition: 'Energy currency', source: 'notes', relatedConcepts: [], courseId: 'c1' },
    ], 'en');
    expect(md).toContain('# Study guide: Biology Basics');
    expect(md).toContain('## Overview');
    expect(md).toContain('### Cells');
    expect(md).toContain('**ATP**');
    expect(md).toContain('- membrane');
  });

  it('renders Greek headings when lang is el', () => {
    const md = buildStudyGuideMarkdown(course, [], 'el');
    expect(md).toContain('# Οδηγός μελέτης');
    expect(md).toContain('## Θέματα');
  });
});
