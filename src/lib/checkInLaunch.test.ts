import { describe, expect, it } from 'vitest';
import { launchAckSuffix, resolveCheckInLaunch } from './checkInLaunch';
import type { Task } from '../types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
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
    ...partial,
  };
}

describe('resolveCheckInLaunch', () => {
  it('picks course + review intent task', () => {
    const tasks = [
      task({ id: '1', title: 'Learn A', category: 'learn', courseId: 'c1' }),
      task({
        id: '2',
        title: 'Review B',
        category: 'review',
        isSpacedRepetition: true,
        courseId: 'c1',
        courseName: 'Micro',
      }),
      task({ id: '3', title: 'Other', category: 'learn', courseId: 'c2', courseName: 'Python' }),
    ];
    const launch = resolveCheckInLaunch(
      { sessionIntent: 'review', focusCourseId: 'c1', focusCourseTitle: 'Micro', energy: 'ok' },
      tasks,
    );
    expect(launch.kind).not.toBe('none');
    if (launch.kind !== 'none') {
      expect(launch.taskId).toBe('2');
      expect(launch.sessionType).toBe('review');
    }
  });

  it('returns none when no pending tasks', () => {
    expect(resolveCheckInLaunch({ energy: 'high' }, []).kind).toBe('none');
  });

  it('builds launch ack suffix', () => {
    expect(launchAckSuffix('el', {
      kind: 'task',
      taskId: '1',
      taskTitle: 'Flashcards',
      sessionType: '10min',
    })).toMatch(/Flashcards/);
  });
});
