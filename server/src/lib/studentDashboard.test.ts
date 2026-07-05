import { describe, it, expect, beforeEach } from 'vitest';
import { resetClassStore, createTeacherClassAsync, addClassEnrollmentAsync } from '../store/classStore';
import { createOrganizationAsync } from '../store/orgStore';
import { createClassAssignmentAsync, resetAssignmentStore } from '../store/assignmentStore';
import { upsertGradebookCellAsync, resetGradebookStore } from '../store/gradebookStore';
import { computeStudentDashboardAsync } from '../lib/studentDashboard';

describe('computeStudentDashboardAsync', () => {
  beforeEach(() => {
    resetClassStore();
    resetAssignmentStore();
    resetGradebookStore();
  });

  it('aggregates student dashboard with upcoming assignments', async () => {
    const org = await createOrganizationAsync('Uni', 'acct_admin');
    const cls = await createTeacherClassAsync('acct_teacher', {
      name: 'History 101',
      orgId: org.id,
    });
    const enrollment = await addClassEnrollmentAsync(cls.id, {
      email: 'student@uni.edu',
      mastery: 72,
    });
    if (!enrollment) throw new Error('enrollment failed');
    const due = new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString();
    const assignment = await createClassAssignmentAsync(cls.id, {
      title: 'Essay 1',
      dueAt: due,
    });
    await upsertGradebookCellAsync(cls.id, {
      enrollmentId: enrollment.id,
      assignmentId: assignment.id,
      score: 88,
      status: 'graded',
    });

    const dash = await computeStudentDashboardAsync('acct_student', 'student@uni.edu');
    expect(dash.classCount).toBe(1);
    expect(dash.avgScore).toBe(88);
    expect(dash.classes[0]!.gradedCount).toBe(1);
  });
});
