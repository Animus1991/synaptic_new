import { config } from '../config';
import { createOrgRepository } from './orgPostgres';

export type OrgRole = 'org_admin' | 'teacher' | 'student';

export type Organization = {
  id: string;
  name: string;
  createdAt: string;
};

export type OrgMembership = {
  id: string;
  orgId: string;
  accountId: string;
  role: OrgRole;
  createdAt: string;
};

const organizations = new Map<string, Organization>();
const memberships = new Map<string, OrgMembership[]>();

const pgRepo = createOrgRepository(config.databaseUrl);

function membershipKey(orgId: string): string {
  return orgId;
}

export async function createOrganizationAsync(
  name: string,
  creatorAccountId: string,
): Promise<Organization> {
  if (pgRepo) return pgRepo.createOrganization(name, creatorAccountId);
  const id = `org_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  const org: Organization = { id, name: name.trim() || 'Untitled institution', createdAt };
  organizations.set(id, org);
  const member: OrgMembership = {
    id: `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId: id,
    accountId: creatorAccountId,
    role: 'org_admin',
    createdAt,
  };
  memberships.set(membershipKey(id), [member]);
  return org;
}

export async function listOrgsForAccountAsync(accountId: string): Promise<Organization[]> {
  if (pgRepo) return pgRepo.listOrgsForAccount(accountId);
  const orgIds = new Set<string>();
  for (const list of memberships.values()) {
    for (const m of list) {
      if (m.accountId === accountId) orgIds.add(m.orgId);
    }
  }
  return [...orgIds]
    .map((id) => organizations.get(id))
    .filter((o): o is Organization => Boolean(o))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrganizationAsync(orgId: string): Promise<Organization | null> {
  if (pgRepo) return pgRepo.getOrganization(orgId);
  return organizations.get(orgId) ?? null;
}

export async function getOrgMembershipAsync(
  orgId: string,
  accountId: string,
): Promise<OrgMembership | null> {
  if (pgRepo) return pgRepo.getMembership(orgId, accountId);
  const list = memberships.get(membershipKey(orgId)) ?? [];
  return list.find((m) => m.accountId === accountId) ?? null;
}

export async function isOrgAdminAsync(orgId: string, accountId: string): Promise<boolean> {
  const m = await getOrgMembershipAsync(orgId, accountId);
  return m?.role === 'org_admin';
}

export async function addOrgMemberAsync(
  orgId: string,
  accountId: string,
  role: OrgRole,
): Promise<OrgMembership> {
  if (pgRepo) return pgRepo.addMembership(orgId, accountId, role);
  const list = memberships.get(membershipKey(orgId)) ?? [];
  const existing = list.find((m) => m.accountId === accountId);
  if (existing) {
    existing.role = role;
    return existing;
  }
  const member: OrgMembership = {
    id: `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId,
    accountId,
    role,
    createdAt: new Date().toISOString(),
  };
  list.push(member);
  memberships.set(membershipKey(orgId), list);
  return member;
}

export async function listOrgMembersAsync(orgId: string): Promise<OrgMembership[]> {
  if (pgRepo) return pgRepo.listMembers(orgId);
  return memberships.get(membershipKey(orgId)) ?? [];
}

/** Test helper */
export function resetOrgStore(): void {
  organizations.clear();
  memberships.clear();
}
