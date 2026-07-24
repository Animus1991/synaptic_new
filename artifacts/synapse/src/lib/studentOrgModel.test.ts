import { describe, it, expect } from 'vitest';
import { assignmentStatusLabel, assignmentStatusTone } from './studentOrgModel';

describe('studentOrgModel', () => {
  it('labels assignment statuses', () => {
    expect(assignmentStatusLabel('overdue', 'en')).toBe('Overdue');
    expect(assignmentStatusLabel('graded', 'el')).toBe('Βαθμολογήθηκε');
  });

  it('maps status tones', () => {
    expect(assignmentStatusTone('overdue')).toBe('negative');
    expect(assignmentStatusTone('graded')).toBe('positive');
  });
});
