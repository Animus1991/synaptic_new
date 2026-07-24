import { randomBytes } from 'node:crypto';
import { config } from '../config';
import { signAccessToken, signRefreshToken } from '../middleware/auth';
import { issueAuthCompletion } from '../store/googleTokenStore';
import { createAccountAsync, findByEmailAsync } from '../store/accounts';
import {
  addOrgMemberAsync,
  getOrgMembershipAsync,
  getOrganizationAsync,
  type OrgRole,
} from '../store/orgStore';
import type { SamlAcsSuccess } from './samlAcs';

export type SamlProvisionResult = {
  accountId: string;
  email: string;
  created: boolean;
  orgId?: string;
  orgRole?: OrgRole;
  membershipAdded: boolean;
  authCode: string;
};

const TEACHER_ROLE_MARKERS = ['teacher', 'instructor', 'faculty', 'staff', 'professor'];
const ADMIN_ROLE_MARKERS = ['admin', 'administrator', 'org_admin'];

/** Map SAML role / eduPersonAffiliation values to org RBAC role. */
export function mapSamlRoleToOrgRole(raw?: string): OrgRole {
  const fallback = (config.samlDefaultRole ?? 'student') as OrgRole;
  if (!raw?.trim()) return fallback;
  const value = raw.trim().toLowerCase();
  if (ADMIN_ROLE_MARKERS.some((marker) => value.includes(marker))) return 'org_admin';
  if (TEACHER_ROLE_MARKERS.some((marker) => value.includes(marker))) return 'teacher';
  return 'student';
}

/** Resolve target org from assertion attribute or SAML_ORG_ID env. */
export function resolveSamlOrgId(assertionOrgId?: string): string | undefined {
  const candidate = assertionOrgId?.trim() || config.samlOrgId?.trim();
  return candidate || undefined;
}

/**
 * JIT account + org membership on SAML ACS.
 * Creates account when missing; adds or updates org membership when org resolves.
 */
export async function provisionSamlUser(claims: SamlAcsSuccess): Promise<SamlProvisionResult> {
  const email = claims.email.trim().toLowerCase();
  let account = await findByEmailAsync(email);
  let created = false;
  if (!account) {
    const randomPassword = randomBytes(32).toString('hex');
    account = await createAccountAsync(email, randomPassword);
    created = true;
  }

  const orgId = resolveSamlOrgId(claims.orgId);
  let orgRole: OrgRole | undefined;
  let membershipAdded = false;

  if (orgId) {
    const org = await getOrganizationAsync(orgId);
    if (org) {
      orgRole = mapSamlRoleToOrgRole(claims.role);
      const existing = await getOrgMembershipAsync(orgId, account.id);
      await addOrgMemberAsync(orgId, account.id, orgRole);
      membershipAdded = !existing || existing.role !== orgRole;
    }
  }

  const accessToken = signAccessToken(account.id);
  const refreshToken = await signRefreshToken(account.id);
  const authCode = issueAuthCompletion({
    token: accessToken,
    refreshToken,
    email: account.email,
    plan: account.plan,
  });

  return {
    accountId: account.id,
    email: account.email,
    created,
    orgId: orgId && (await getOrganizationAsync(orgId)) ? orgId : undefined,
    orgRole,
    membershipAdded,
    authCode,
  };
}
