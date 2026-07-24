import { describe, expect, it, beforeEach } from 'vitest';
import {
  getGradebook,
  resetGradebookStore,
  upsertGradebookCell,
} from './gradebookStore';

describe('gradebookStore', () => {
  beforeEach(() => {
    resetGradebookStore();
  });

  it('upserts and reads grade cells', () => {
    const cell = upsertGradebookCell('cls_1', {
      enrollmentId: 'enr_1',
      assignmentId: 'asg_1',
      score: 88,
    });
    expect(cell.status).toBe('graded');
    expect(cell.score).toBe(88);
    const book = getGradebook('cls_1');
    expect(book.cells).toHaveLength(1);
  });

  it('clamps scores to 0–100', () => {
    const cell = upsertGradebookCell('cls_1', {
      enrollmentId: 'enr_1',
      assignmentId: 'asg_1',
      score: 140,
    });
    expect(cell.score).toBe(100);
  });
});
