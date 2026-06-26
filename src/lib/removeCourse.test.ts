import { describe, expect, it } from 'vitest';
import { removeCourseFromLibrary } from './removeCourse';
import type { Course } from '../types';

const course = (id: string): Course => ({
  id,
  title: id,
  subject: 'Test',
  description: '',
  icon: '📘',
  color: '#000',
  difficulty: 'beginner',
  status: 'in-progress',
  topics: [],
  totalLessons: 1,
  completedLessons: 0,
  estimatedHours: 1,
  mastery: 0,
  conceptCount: 0,
  glossaryCount: 0,
  exerciseCount: 0,
  sourceFiles: [],
  sourceMode: 'notes-only',
});

describe('removeCourseFromLibrary', () => {
  it('removes user course and attached artifacts', () => {
    const result = removeCourseFromLibrary(
      'user-1',
      [course('user-1'), course('c1')],
      [{ id: 'f1', name: 'a.pdf', type: 'pdf', size: 1, uploadedAt: '', status: 'analyzed', courseId: 'user-1' }],
      [{ term: 'x', definition: 'y', courseId: 'user-1' }],
      [{ id: 't1', title: 'Task', courseId: 'user-1', courseName: 'user-1', status: 'pending', priority: 'medium', estimatedMinutes: 10, xpReward: 5, type: 'study' }],
    );
    expect(result.removed).toBe(true);
    expect(result.courses.map((c) => c.id)).toEqual(['c1']);
    expect(result.files).toHaveLength(0);
    expect(result.glossary).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
  });

  it('blocks demo course deletion', () => {
    const result = removeCourseFromLibrary('c1', [course('c1')], [], [], []);
    expect(result.removed).toBe(false);
    expect(result.reason).toBe('demo');
  });
});
