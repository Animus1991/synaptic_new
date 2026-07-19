import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildLtiAgsScore,
  registerLtiLineItem,
  submitLtiGradePassback,
  listLtiPassbackLog,
  resetLtiPassbackState,
  getLtiLineItemUrl,
  getLtiLineItemUrlSync,
  retryLtiPassback,
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
    expect(row.attemptCount).toBe(1);
    expect(await listLtiPassbackLog('cls1')).toHaveLength(1);
  });

  it('registers and resolves line item URLs per assignment', async () => {
    await registerLtiLineItem('cls1', 'asg1', 'https://canvas.example.com/line_items/99');
    expect(await getLtiLineItemUrl('cls1', 'asg1')).toContain('line_items/99');
    expect(getLtiLineItemUrlSync('cls1', 'asg1')).toContain('line_items/99');
  });

  it('retry without bearer leaves stub_queued', async () => {
    const row = await submitLtiGradePassback({
      classId: 'cls1',
      assignmentId: 'asg1',
      enrollmentId: 'enr1',
      ltiUserId: 'u1',
      score: 90,
      lineItemUrl: 'https://canvas.example.com/line_items/1',
    });
    expect(row.status).toBe('stub_queued');
    const retried = await retryLtiPassback(row.id);
    expect(retried?.status).toBe('stub_queued');
    expect(retried?.attemptCount).toBe(1);
  });
});
