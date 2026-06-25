import { describe, expect, it } from 'vitest';
import type { GlossaryEntry, Task } from '../types';
import { countFilesForCourse, glossaryAfterCourseSourceRemoval, tasksAfterFileRemoval } from './deleteCascade';

const task = (id: string, courseId: string): Task => ({
  id,
  title: 'Study',
  description: '',
  type: 'lesson',
  courseId,
  courseName: 'Eco',
  courseColor: '#000',
  courseIcon: '📚',
  priority: 'medium',
  estimatedMinutes: 15,
  status: 'pending',
  xpReward: 10,
  isSpacedRepetition: false,
  tags: [],
  category: 'learn',
});

describe('deleteCascade', () => {
  it('removes tasks when course has no remaining files', () => {
    const tasks = [task('t1', 'c1'), task('t2', 'c2')];
    const next = tasksAfterFileRemoval(tasks, 'c1', 0);
    expect(next).toHaveLength(1);
    expect(next[0]!.courseId).toBe('c2');
  });

  it('keeps tasks when other files remain', () => {
    const tasks = [task('t1', 'c1')];
    expect(tasksAfterFileRemoval(tasks, 'c1', 1)).toHaveLength(1);
  });

  it('removes glossary when last file removed', () => {
    const entries: GlossaryEntry[] = [
      { term: 'a', definition: 'b', courseId: 'c1', source: 'test', relatedConcepts: [] },
      { term: 'c', definition: 'd', courseId: 'c2', source: 'test', relatedConcepts: [] },
    ];
    const next = glossaryAfterCourseSourceRemoval(entries, 'c1', 0);
    expect(next).toHaveLength(1);
    expect(next[0]!.courseId).toBe('c2');
  });

  it('counts files per course', () => {
    expect(countFilesForCourse([{ courseId: 'c1' }, { courseId: 'c1' }, {}], 'c1')).toBe(2);
  });
});
