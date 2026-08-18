import { describe, expect, it } from 'vitest';
import { mergeCourseTasks } from './taskGenerator';
import type { Course } from '../types';
import {
  createManualTask,
  isManualTask,
  MANUAL_TASK_PREFIX,
  PERSONAL_COURSE,
  updateManualTask,
} from './personalTask';

const course: Course = {
  id: 'c-real',
  title: 'Biology',
  description: '',
  subject: 'science',
  color: '#22c55e',
  icon: '🧬',
  totalLessons: 1,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'beginner',
  topics: [],
  createdAt: '2026-01-01',
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'notes-only',
  conceptCount: 0,
  glossaryCount: 0,
  exerciseCount: 0,
};

describe('personalTask', () => {
  it('creates a manual task that is not treated as generated or demo', () => {
    const task = createManualTask({
      title: 'Read chapter 4',
      description: 'Notes from lecture',
      course: { id: course.id, title: course.title, color: course.color, icon: course.icon },
      category: 'learn',
      priority: 'high',
      estimatedMinutes: 20,
    });
    expect(task.id.startsWith(MANUAL_TASK_PREFIX)).toBe(true);
    expect(isManualTask(task)).toBe(true);
    expect(task.tags).toContain('manual');
    expect(task.xpReward).toBe(40);
    expect(task.type).toBe('lesson');
  });

  it('rejects generated and demo ids as manual', () => {
    expect(isManualTask({ id: 'gen-c-real-lesson-t1', tags: ['manual'] })).toBe(false);
    expect(isManualTask({ id: 'task1', tags: ['manual'] })).toBe(false);
  });

  it('survives course task regeneration', () => {
    const manual = createManualTask({
      title: 'Office hours',
      course: PERSONAL_COURSE,
      category: 'practice',
      priority: 'medium',
      estimatedMinutes: 15,
    });
    const merged = mergeCourseTasks([manual], { ...course, status: 'generating' }, 'en');
    expect(merged.some((t) => t.id === manual.id)).toBe(true);
  });

  it('updates fields without changing id or status', () => {
    const created = createManualTask({
      title: 'Draft',
      course: PERSONAL_COURSE,
      category: 'learn',
      priority: 'low',
      estimatedMinutes: 10,
    });
    const updated = updateManualTask(created, {
      title: 'Revised',
      description: 'More detail',
      course: PERSONAL_COURSE,
      category: 'exam',
      priority: 'critical',
      estimatedMinutes: 30,
      dueAt: '2026-09-01T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.status).toBe('pending');
    expect(updated.title).toBe('Revised');
    expect(updated.type).toBe('exam-prep');
    expect(updated.dueAt).toBe('2026-09-01T12:00:00.000Z');
  });
});
