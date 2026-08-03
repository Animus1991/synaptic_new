import { describe, expect, it } from 'vitest';
import {
  buildCalendarCheckInHint,
  calendarDurationFromCheckIn,
  rankTasksForCalendarHint,
  softCalendarStartIso,
} from './calendarCheckInHint';
import type { Task } from '../types';

function task(p: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    type: 'lesson',
    courseId: 'c1',
    courseName: 'Micro',
    courseColor: '#000',
    courseIcon: 'book',
    priority: 'medium',
    estimatedMinutes: 25,
    status: 'pending',
    xpReward: 10,
    isSpacedRepetition: false,
    tags: [],
    category: 'learn',
    ...p,
  };
}

describe('calendarCheckInHint', () => {
  it('uses availableMinutes for duration (min 15)', () => {
    expect(calendarDurationFromCheckIn({ availableMinutes: 20 })).toBe(20);
    expect(calendarDurationFromCheckIn({ availableMinutes: 10 })).toBe(15);
    expect(calendarDurationFromCheckIn({ energy: 'low' })).toBe(15);
  });

  it('ranks review + focus course first', () => {
    const ranked = rankTasksForCalendarHint(
      [
        task({ id: '1', title: 'Learn', category: 'learn', courseId: 'c2' }),
        task({
          id: '2',
          title: 'Review',
          category: 'review',
          isSpacedRepetition: true,
          courseId: 'c1',
        }),
      ],
      { sessionIntent: 'review', focusCourseId: 'c1' },
    );
    expect(ranked[0]?.id).toBe('2');
  });

  it('builds bilingual summary when signals exist', () => {
    const h = buildCalendarCheckInHint('el', {
      availableMinutes: 20,
      sessionIntent: 'review',
      focusCourseTitle: 'Μικρο',
    });
    expect(h.hasSignals).toBe(true);
    expect(h.durationMinutes).toBe(20);
    expect(h.summary).toMatch(/20′/);
    expect(h.summary).toMatch(/Chat plan/);
  });

  it('soft start is on a future quarter-hour', () => {
    const iso = softCalendarStartIso(new Date('2026-07-31T10:07:00'));
    const d = new Date(iso);
    expect(d.getMinutes() % 15).toBe(0);
    expect(d.getTime()).toBeGreaterThan(new Date('2026-07-31T10:07:00').getTime());
  });
});
