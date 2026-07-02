import { describe, expect, it } from 'vitest';
import { generateTasksFromCourse } from './taskGenerator';
import type { Course } from '../types';

const sampleCourse = {
  id: 'user-1',
  title: 'Test Course',
  description: 'Test',
  subject: 'Test',
  color: '#6366f1',
  icon: 'book',
  totalLessons: 0,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'beginner' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready' as const,
  sourceMode: 'strict' as const,
  conceptCount: 1,
  glossaryCount: 0,
  exerciseCount: 0,
  topics: [
    {
      id: 't1',
      title: 'Supply & Demand',
      description: 'Core micro theory',
      lessons: [],
      mastery: 0,
      order: 0,
      isLocked: false,
      estimatedMinutes: 15,
      conceptCount: 1,
      retentionPrediction: 0,
      keyConcepts: ['Equilibrium'],
      objectives: ['Explain equilibrium'],
      prerequisites: [],
    },
  ],
  examDate: '2026-06-01',
} satisfies Course;

describe('generateTasksFromCourse', () => {
  it('uses English title prefixes by default', () => {
    const tasks = generateTasksFromCourse(sampleCourse);
    expect(tasks.some((t) => t.title === 'Lesson: Supply & Demand')).toBe(true);
    expect(tasks.some((t) => t.title === 'Exam prep: Test Course')).toBe(true);
  });

  it('localizes generated titles for Greek', () => {
    const tasks = generateTasksFromCourse(sampleCourse, 'el');
    expect(tasks.some((t) => t.title === 'Μάθημα: Supply & Demand')).toBe(true);
    expect(tasks.some((t) => t.title === 'Προετοιμασία εξέτασης: Test Course')).toBe(true);
  });
});
