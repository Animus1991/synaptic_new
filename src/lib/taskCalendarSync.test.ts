import { describe, expect, it } from 'vitest';
import { taskCalendarWindow } from './taskCalendarSync';
import type { Task } from '../types';

const base: Task = {
  id: 't1',
  title: 'Review elasticity',
  description: '',
  type: 'review',
  courseId: 'c1',
  courseName: 'Micro',
  courseColor: '#000',
  courseIcon: 'book',
  priority: 'high',
  estimatedMinutes: 40,
  status: 'pending',
  xpReward: 10,
  isSpacedRepetition: true,
  tags: [],
  category: 'review',
  scheduledFor: '2026-07-31T12:00:00.000Z',
};

describe('taskCalendarWindow', () => {
  it('keeps legacy behavior from scheduledFor + estimatedMinutes', () => {
    const w = taskCalendarWindow(base);
    expect(w?.startIso).toBe('2026-07-31T12:00:00.000Z');
    expect(new Date(w!.endIso).getTime() - new Date(w!.startIso).getTime()).toBe(40 * 60_000);
  });

  it('applies check-in duration override without changing start', () => {
    const w = taskCalendarWindow(base, { durationMinutes: 20 });
    expect(w?.startIso).toBe('2026-07-31T12:00:00.000Z');
    expect(new Date(w!.endIso).getTime() - new Date(w!.startIso).getTime()).toBe(20 * 60_000);
  });

  it('allows soft start when task has no schedule', () => {
    const unscheduled = { ...base, scheduledFor: undefined, dueAt: undefined };
    expect(taskCalendarWindow(unscheduled)).toBeNull();
    const w = taskCalendarWindow(unscheduled, {
      softStartIso: '2026-07-31T14:00:00.000Z',
      durationMinutes: 25,
    });
    expect(w?.startIso).toBe('2026-07-31T14:00:00.000Z');
  });
});
