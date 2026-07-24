import { describe, it, expect, beforeEach } from 'vitest';
import { getTenantIsolationStatus, requireTeacherClass } from './tenantGuard';
import {
  createTeacherClass,
  getTeacherClass,
  resetClassStore,
} from '../store/classStore';
import { addOrgMemberAsync, createOrganizationAsync, resetOrgStore } from '../store/orgStore';

describe('tenantGuard', () => {
  beforeEach(() => {
    resetClassStore();
    resetOrgStore();
  });

  it('getTenantIsolationStatus reflects database flag and org RBAC', () => {
    expect(getTenantIsolationStatus(false).postgresAccountScoped).toBe(false);
    expect(getTenantIsolationStatus(true).postgresAccountScoped).toBe(true);
    expect(getTenantIsolationStatus(true).teacherClassScoped).toBe(true);
    expect(getTenantIsolationStatus(true).orgRbac).toBe(true);
  });

  it('requireTeacherClass returns class for owner', async () => {
    const cls = createTeacherClass('acct_a', { name: 'Econ 101' });
    const guard = await requireTeacherClass(cls.id, 'acct_a');
    expect(guard.ok).toBe(true);
    if (guard.ok) expect(guard.class.name).toBe('Econ 101');
  });

  it('requireTeacherClass rejects non-owner (404, no leak)', async () => {
    const cls = createTeacherClass('acct_a', { name: 'Private' });
    const guard = await requireTeacherClass(cls.id, 'acct_b');
    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.status).toBe(404);
      expect(guard.error).toBe('class not found');
    }
    expect(getTeacherClass(cls.id, 'acct_b')).toBeNull();
  });

  it('requireTeacherClass allows org_admin access to org class they do not own', async () => {
    const org = await createOrganizationAsync('West High', 'admin_acct');
    await addOrgMemberAsync(org.id, 'teacher_acct', 'teacher');
    const cls = createTeacherClass('teacher_acct', { name: 'Bio 101', orgId: org.id });

    const teacherGuard = await requireTeacherClass(cls.id, 'teacher_acct');
    expect(teacherGuard.ok).toBe(true);

    const adminGuard = await requireTeacherClass(cls.id, 'admin_acct');
    expect(adminGuard.ok).toBe(true);
    if (adminGuard.ok) expect(adminGuard.class.orgId).toBe(org.id);

    const outsiderGuard = await requireTeacherClass(cls.id, 'random_acct');
    expect(outsiderGuard.ok).toBe(false);
  });
});
