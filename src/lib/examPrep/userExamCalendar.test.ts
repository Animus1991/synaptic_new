import { describe, expect, it } from 'vitest';
import { buildUserExamCalendar } from './userExamCalendar';
import type { Course, Task } from '../../types';

const course = {
  id: 'c1',
  title: 'Micro',
  examDate: '2026-06-20',
} as Course;

const examTask = {
  id: 't1',
  title: 'Mock exam',
  category: 'exam',
  type: 'exam-prep',
  dueAt: '2026-06-18',
  courseName: 'Micro',
  status: 'pending',
} as Task;

describe('buildUserExamCalendar', () => {
  it('merges settings, course, and exam tasks and drops old dates', () => {
    const rows = buildUserExamCalendar({
      settingsExamDate: '2026-06-22',
      courses: [course, { ...course, id: 'old', examDate: '2020-01-01' }],
      tasks: [examTask, { ...examTask, id: 'learn', category: 'learn', type: 'lesson' } as Task],
      lang: 'en',
      now: Date.parse('2026-06-01'),
    });
    expect(rows.map((r) => r.source)).toEqual(['task', 'course', 'settings']);
    expect(rows.some((r) => r.id.includes('old'))).toBe(false);
  });

  it('includes org assignments that look like exams', () => {
    const rows = buildUserExamCalendar({
      orgAssignments: [
        {
          assignmentId: 'a1',
          classId: 'cls',
          className: 'Bio',
          title: 'Final exam',
          dueAt: '2026-07-01',
          status: 'pending',
        },
        {
          assignmentId: 'a2',
          classId: 'cls',
          className: 'Bio',
          title: 'Homework 3',
          dueAt: '2026-07-02',
          status: 'pending',
        },
      ],
      now: Date.parse('2026-06-01'),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Final exam');
    expect(rows[0]?.source).toBe('org');
  });
});
