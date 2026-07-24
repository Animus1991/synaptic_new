/**
 * Sprint L1/L3 — teacher class tenant isolation + org RBAC.
 * All class-scoped teacher routes must resolve access via requireTeacherClass().
 */

import type { TeacherClass } from '../store/classStore';
import { getClassByIdAsync } from '../store/classStore';
import { isOrgAdminAsync } from '../store/orgStore';

export type TenantIsolationStatus = {
  /** Class roster/assignments/gradebook gated by teacher_account_id. */
  teacherClassScoped: true;
  /** Postgres library/session rows scoped by account id when DATABASE_URL set. */
  postgresAccountScoped: boolean;
  /** Org-level RBAC (institution → classes → members). */
  orgRbac: true;
};

export function getTenantIsolationStatus(databaseConfigured: boolean): TenantIsolationStatus {
  return {
    teacherClassScoped: true,
    postgresAccountScoped: databaseConfigured,
    orgRbac: true,
  };
}

export type TeacherClassGuard =
  | { ok: true; class: TeacherClass }
  | { ok: false; status: 404; error: 'class not found' };

/** Class owner or org_admin of the class org may access — never leaks cross-tenant ids. */
export async function requireTeacherClass(
  classId: string,
  accountId: string,
): Promise<TeacherClassGuard> {
  const cls = await getClassByIdAsync(classId);
  if (!cls) {
    return { ok: false, status: 404, error: 'class not found' };
  }
  if (cls.teacherAccountId === accountId) {
    return { ok: true, class: cls };
  }
  if (cls.orgId && (await isOrgAdminAsync(cls.orgId, accountId))) {
    return { ok: true, class: cls };
  }
  return { ok: false, status: 404, error: 'class not found' };
}
