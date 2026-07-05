/**
 * Sprint L1 — teacher class tenant isolation.
 * All class-scoped teacher routes must resolve ownership via requireTeacherClass().
 */

import type { TeacherClass } from '../store/classStore';
import { getTeacherClassAsync } from '../store/classStore';

export type TenantIsolationStatus = {
  /** Class roster/assignments/gradebook gated by teacher_account_id. */
  teacherClassScoped: true;
  /** Postgres library/session rows scoped by account id when DATABASE_URL set. */
  postgresAccountScoped: boolean;
  /** Org-level RBAC (institution → classes) — future Sprint L2+. */
  orgRbac: false;
};

export function getTenantIsolationStatus(databaseConfigured: boolean): TenantIsolationStatus {
  return {
    teacherClassScoped: true,
    postgresAccountScoped: databaseConfigured,
    orgRbac: false,
  };
}

export type TeacherClassGuard =
  | { ok: true; class: TeacherClass }
  | { ok: false; status: 404; error: 'class not found' };

/** Returns owned class or a 404 guard result — never leaks another teacher's class id. */
export async function requireTeacherClass(
  classId: string,
  teacherAccountId: string,
): Promise<TeacherClassGuard> {
  const cls = await getTeacherClassAsync(classId, teacherAccountId);
  if (!cls) {
    return { ok: false, status: 404, error: 'class not found' };
  }
  return { ok: true, class: cls };
}
