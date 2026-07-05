import { describe, it, expect, beforeEach } from 'vitest';
import { mapSamlRoleToOrgRole, provisionSamlUser, resolveSamlOrgId } from './samlAutoProvision';
import { createOrganizationAsync, getOrgMembershipAsync, resetOrgStore } from '../store/orgStore';

describe('samlAutoProvision', () => {
  beforeEach(() => {
    resetOrgStore();
  });

  it('maps SAML role strings to org RBAC roles', () => {
    expect(mapSamlRoleToOrgRole('student')).toBe('student');
    expect(mapSamlRoleToOrgRole('faculty')).toBe('teacher');
    expect(mapSamlRoleToOrgRole('administrator')).toBe('org_admin');
  });

  it('creates account and org membership on first ACS login', async () => {
    const org = await createOrganizationAsync('SAML School', 'admin-seed');
    const result = await provisionSamlUser({
      email: 'new-student@school.edu',
      orgId: org.id,
      role: 'student',
    });
    expect(result.created).toBe(true);
    expect(result.membershipAdded).toBe(true);
    expect(result.orgId).toBe(org.id);
    expect(result.authCode).toBeTruthy();

    const membership = await getOrgMembershipAsync(org.id, result.accountId);
    expect(membership?.role).toBe('student');
  });

  it('adds org membership for existing account without re-creating', async () => {
    const org = await createOrganizationAsync('Existing School', 'admin-seed');
    const first = await provisionSamlUser({
      email: 'returning@school.edu',
      orgId: org.id,
      role: 'student',
    });
    const second = await provisionSamlUser({
      email: 'returning@school.edu',
      orgId: org.id,
      role: 'student',
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.accountId).toBe(first.accountId);
    expect(second.membershipAdded).toBe(false);
  });

  it('resolveSamlOrgId prefers assertion orgId', () => {
    expect(resolveSamlOrgId('org_from_assertion')).toBe('org_from_assertion');
  });
});
