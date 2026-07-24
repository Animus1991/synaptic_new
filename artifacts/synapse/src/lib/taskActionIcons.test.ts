import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { getTaskAction, type TaskAction } from './taskFlows';
import { getTaskActionVisual, TASK_ACTION_VISUAL, TASK_TYPE_VISUAL } from './taskActionIcons';

const mkTask = (type: Task['type'], overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Review: Supply',
  description: 'Review concept',
  courseId: 'c1',
  courseName: 'Econ',
  courseIcon: 'books',
  courseColor: '#22d3ee',
  type,
  status: 'pending',
  priority: 'medium',
  estimatedMinutes: 15,
  xpReward: 20,
  isSpacedRepetition: type === 'review',
  tags: [],
  category: 'review',
  ...overrides,
});

describe('taskActionIcons', () => {
  it('covers every TaskAction with an icon', () => {
    const actions: TaskAction[] = [
      'lesson', 'practical', 'workspace', 'agent',
      'tasks-review', 'tasks-fix', 'tasks-prereq', 'exam-prep',
    ];
    for (const action of actions) {
      expect(TASK_ACTION_VISUAL[action].icon).toBeTruthy();
      expect(TASK_ACTION_VISUAL[action].colorClass).toMatch(/^text-/);
    }
  });

  it('maps task types used in UI', () => {
    expect(Object.keys(TASK_TYPE_VISUAL).length).toBeGreaterThan(10);
    expect(getTaskActionVisual(mkTask('comparison')).icon).toBe(TASK_ACTION_VISUAL.workspace.icon);
    expect(getTaskAction(mkTask('oral-exam'))).toBe('agent');
  });
});
