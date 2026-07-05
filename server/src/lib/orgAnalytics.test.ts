import { describe, it, expect, beforeEach } from 'vitest';
import { resetClassStore, createTeacherClassAsync, addClassEnrollmentAsync } from '../store/classStore';
import { createOrganizationAsync } from '../store/orgStore';
import { computeOrgAnalyticsAsync } from '../lib/orgAnalytics';

describe('computeOrgAnalyticsAsync', () => {
  beforeEach(() => {
    resetClassStore();
  });

  it('aggregates student counts across org classes', async () => {
    const org = await createOrganizationAsync('Test Org', 'acct_admin');
    const cls = await createTeacherClassAsync('acct_teacher', {
      name: 'Math',
      orgId: org.id,
    });
    await addClassEnrollmentAsync(cls.id, { email: 'a@test.edu', mastery: 80 });
    await addClassEnrollmentAsync(cls.id, { email: 'b@test.edu', mastery: 60 });

    const snap = await computeOrgAnalyticsAsync(org.id);
    expect(snap.classCount).toBe(1);
    expect(snap.totalStudents).toBe(2);
    expect(snap.avgMastery).toBe(70);
    expect(snap.cohortHeatmap).toHaveLength(1);
    expect(snap.cohortHeatmap[0]!.days).toHaveLength(14);
    expect(snap.topicMasteryHeatmap).toHaveLength(1);
  });
});
