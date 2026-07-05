import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildLtiAgsScore,
  registerLtiLineItem,
  submitLtiGradePassback,
  listLtiPassbackLog,
  resetLtiPassbackState,
  getLtiLineItemUrl,
} from './ltiGradePassback';

beforeEach(() => {
  resetLtiPassbackState();
});

describe('ltiGradePassback', () => {
  it('builds IMS AGS score payload', () => {
    const score = buildLtiAgsScore(88, 'canvas-user-42');
    expect(score.userId).toBe('canvas-user-42');
    expect(score.scoreGiven).toBe(88);
    expect(score.scoreMaximum).toBe(100);
    expect(score.gradingProgress).toBe('FullyGraded');
  });

  it('queues stub passback when no line item URL', async () => {
    const row = await submitLtiGradePassback({
      classId: 'cls1',
      assignmentId: 'asg1',
      enrollmentId: 'enr1',
      ltiUserId: 'lti-user-1',
      score: 75,
    });
    expect(row.status).toBe('stub_queued');
    expect(listLtiPassbackLog('cls1')).toHaveLength(1);
  });

  it('registers and resolves line item URLs per assignment', () => {
    registerLtiLineItem('cls1', 'asg1', 'https://canvas.example.com/line_items/99');
    expect(getLtiLineItemUrl('cls1', 'asg1')).toContain('line_items/99');
  });
});
