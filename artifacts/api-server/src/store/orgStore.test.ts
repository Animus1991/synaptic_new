import { describe, it, expect, beforeEach } from 'vitest';
import {
  addOrgMemberAsync,
  createOrganizationAsync,
  getOrgMembershipAsync,
  isOrgAdminAsync,
  listOrgMembersAsync,
  listOrgsForAccountAsync,
  resetOrgStore,
} from './orgStore';

describe('orgStore', () => {
  beforeEach(() => {
    resetOrgStore();
  });

  it('createOrganizationAsync makes creator org_admin', async () => {
    const org = await createOrganizationAsync('East Academy', 'acct_admin');
    expect(org.name).toBe('East Academy');
    const membership = await getOrgMembershipAsync(org.id, 'acct_admin');
    expect(membership?.role).toBe('org_admin');
    expect(await isOrgAdminAsync(org.id, 'acct_admin')).toBe(true);
  });

  it('listOrgsForAccountAsync returns only member orgs', async () => {
    const orgA = await createOrganizationAsync('Org A', 'admin_a');
    await createOrganizationAsync('Org B', 'admin_b');
    await addOrgMemberAsync(orgA.id, 'teacher_x', 'teacher');

    const adminOrgs = await listOrgsForAccountAsync('admin_a');
    expect(adminOrgs).toHaveLength(1);
    expect(adminOrgs[0]?.id).toBe(orgA.id);

    const teacherOrgs = await listOrgsForAccountAsync('teacher_x');
    expect(teacherOrgs).toHaveLength(1);
  });

  it('addOrgMemberAsync upserts role', async () => {
    const org = await createOrganizationAsync('Demo Org', 'admin');
    const first = await addOrgMemberAsync(org.id, 'teacher_1', 'teacher');
    expect(first.role).toBe('teacher');
    const updated = await addOrgMemberAsync(org.id, 'teacher_1', 'org_admin');
    expect(updated.role).toBe('org_admin');
    const members = await listOrgMembersAsync(org.id);
    expect(members.filter((m) => m.accountId === 'teacher_1')).toHaveLength(1);
  });
});
