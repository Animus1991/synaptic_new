import { describe, expect, it, beforeEach } from 'vitest';
import {
  createClassAssignment,
  listClassAssignments,
  removeClassAssignment,
  resetAssignmentStore,
  updateClassAssignment,
} from './assignmentStore';

describe('assignmentStore', () => {
  beforeEach(() => {
    resetAssignmentStore();
  });

  it('creates and lists assignments for a class', () => {
    const row = createClassAssignment('cls_1', { title: 'Read chapter 3', dueAt: '2026-07-01' });
    expect(row.classId).toBe('cls_1');
    expect(listClassAssignments('cls_1')).toHaveLength(1);
  });

  it('updates and removes assignments', () => {
    const row = createClassAssignment('cls_1', { title: 'Quiz 1' });
    const updated = updateClassAssignment('cls_1', row.id, { title: 'Quiz 1 revised' });
    expect(updated?.title).toBe('Quiz 1 revised');
    expect(removeClassAssignment('cls_1', row.id)).toBe(true);
    expect(listClassAssignments('cls_1')).toHaveLength(0);
  });
});
