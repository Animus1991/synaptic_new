import { describe, expect, it, beforeEach } from 'vitest';
import {
  getStudentSubmissionAsync,
  listAssignmentSubmissionsAsync,
  listEnrollmentSubmissionsAsync,
  resetSubmissionStore,
  upsertStudentSubmissionAsync,
} from './submissionStore';

describe('submissionStore', () => {
  beforeEach(() => {
    resetSubmissionStore();
  });

  it('creates a submission and lists it by enrollment and assignment', async () => {
    const row = await upsertStudentSubmissionAsync('cls_1', 'asg_1', {
      enrollmentId: 'enr_1',
      accountId: 'acc_1',
      body: 'First draft',
      linkUrl: 'https://docs.example.com/essay',
    });
    expect(row.classId).toBe('cls_1');
    expect(row.assignmentId).toBe('asg_1');
    expect(row.body).toBe('First draft');
    expect(row.linkUrl).toBe('https://docs.example.com/essay');
    expect(row.attachments).toEqual([]);

    expect(await getStudentSubmissionAsync('cls_1', 'asg_1', 'enr_1')).toEqual(row);
    expect(await listEnrollmentSubmissionsAsync('cls_1', 'enr_1')).toHaveLength(1);
    expect(await listAssignmentSubmissionsAsync('cls_1', 'asg_1')).toHaveLength(1);
  });

  it('resubmits without changing submittedAt or creating a second row', async () => {
    const first = await upsertStudentSubmissionAsync('cls_1', 'asg_1', {
      enrollmentId: 'enr_1',
      accountId: 'acc_1',
      body: 'Draft 1',
    });
    const second = await upsertStudentSubmissionAsync('cls_1', 'asg_1', {
      enrollmentId: 'enr_1',
      accountId: 'acc_1',
      body: 'Draft 2',
      linkUrl: 'https://example.com/v2',
    });
    expect(second.id).toBe(first.id);
    expect(second.submittedAt).toBe(first.submittedAt);
    expect(second.body).toBe('Draft 2');
    expect(second.linkUrl).toBe('https://example.com/v2');
    expect(second.updatedAt >= first.updatedAt).toBe(true);
    expect(await listAssignmentSubmissionsAsync('cls_1', 'asg_1')).toHaveLength(1);
  });

  it('stores file attachments on create and replace', async () => {
    const first = await upsertStudentSubmissionAsync('cls_1', 'asg_1', {
      enrollmentId: 'enr_1',
      accountId: 'acc_1',
      body: '',
      attachments: [
        {
          id: 'att_1',
          name: 'notes.pdf',
          mime: 'application/pdf',
          size: 12,
          contentBase64: Buffer.from('%PDF').toString('base64'),
        },
      ],
    });
    expect(first.attachments).toHaveLength(1);
    expect(first.attachments[0]!.name).toBe('notes.pdf');

    const second = await upsertStudentSubmissionAsync('cls_1', 'asg_1', {
      enrollmentId: 'enr_1',
      accountId: 'acc_1',
      body: 'Cover note',
      attachments: [
        {
          id: 'att_2',
          name: 'final.pdf',
          mime: 'application/pdf',
          size: 8,
          contentBase64: Buffer.from('%PDF-2').toString('base64'),
        },
      ],
    });
    expect(second.id).toBe(first.id);
    expect(second.attachments.map((a) => a.name)).toEqual(['final.pdf']);
  });
});
