import { describe, it, expect, beforeEach } from 'vitest';
import { resetClassStore, createTeacherClassAsync, addClassEnrollmentAsync } from '../store/classStore';
import { createOrganizationAsync } from '../store/orgStore';
import { createAccountAsync } from '../store/accounts';
import { saveLibraryAsync } from '../store/libraryStore';
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
    expect(snap.notebooklmBridgeHeatmap).toHaveLength(1);
  });

  it('counts notebooklm imports from synced student libraries', async () => {
    const org = await createOrganizationAsync('NLM Org', 'acct_admin');
    const cls = await createTeacherClassAsync('acct_teacher', {
      name: 'Bio',
      orgId: org.id,
    });
    const student = await createAccountAsync('nlmstudent@test.edu', 'password123');
    await addClassEnrollmentAsync(cls.id, { email: 'nlmstudent@test.edu', displayName: 'NLM Student' });
    await saveLibraryAsync(student.id, {
      uploadedFiles: [
        { ingestMethod: 'notebooklm-import' },
        { ingestMethod: 'notebooklm-chat' },
      ],
      glossaryEntries: [],
      generatedCourses: [],
    });

    const snap = await computeOrgAnalyticsAsync(org.id);
    const hm = snap.notebooklmBridgeHeatmap[0]!;
    expect(hm.studentsWithImports).toBe(1);
    expect(hm.totalImports).toBe(2);
    expect(hm.artifactTotals.import).toBe(1);
    expect(hm.artifactTotals.chat).toBe(1);
  });
});
