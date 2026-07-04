import { describe, it, expect } from 'vitest';
import {
  buildSyllabusCoverageSnapshot,
  daysUntilExam,
  pickPrimaryCourseForCoverage,
} from './syllabusCoverageTracker';
import type { Course } from '../../types';

const baseCourse = {
  id: 'c1',
  title: 'Test Course',
  topics: [
    {
      id: 't1',
      title: 'Topic A',
      lessons: [
        { id: 'l1', title: 'L1', status: 'completed', mastery: 90 },
        { id: 'l2', title: 'L2', status: 'available', mastery: 0 },
      ],
    },
    {
      id: 't2',
      title: 'Topic B',
      lessons: [{ id: 'l3', title: 'L3', status: 'available', mastery: 0 }],
    },
  ],
  examDate: '2026-06-15',
  status: 'ready',
} as unknown as Course;

describe('syllabusCoverageTracker', () => {
  it('computes coverage snapshot', () => {
    const snap = buildSyllabusCoverageSnapshot(baseCourse, undefined, new Date('2026-06-01').getTime());
    expect(snap.completedLessons).toBe(1);
    expect(snap.totalLessons).toBe(3);
    expect(snap.remainingTopics).toBe(2);
    expect(snap.coveragePct).toBe(33);
    expect(snap.daysToExam).toBeGreaterThan(0);
  });

  it('picks course with nearest exam date', () => {
    const c2 = { ...baseCourse, id: 'c2', examDate: '2026-05-01' } as Course;
    const picked = pickPrimaryCourseForCoverage([baseCourse, c2]);
    expect(picked?.id).toBe('c2');
  });

  it('daysUntilExam returns null for invalid date', () => {
    expect(daysUntilExam(undefined)).toBeNull();
    expect(daysUntilExam('invalid')).toBeNull();
  });
});
