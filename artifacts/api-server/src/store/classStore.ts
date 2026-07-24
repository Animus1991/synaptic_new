import { config } from '../config';
import { createTeacherRepo } from './teacherPostgres';

export type TeacherClass = {
  id: string;
  teacherAccountId: string;
  orgId?: string;
  name: string;
  courseId?: string;
  createdAt: string;
};

export type ClassEnrollment = {
  id: string;
  classId: string;
  studentEmail: string;
  displayName?: string;
  mastery?: number;
  lastActive?: string;
  enrolledAt: string;
};

const classes = new Map<string, TeacherClass>();
const enrollments = new Map<string, ClassEnrollment[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

function rosterKey(classId: string): string {
  return classId;
}

export function listTeacherClasses(teacherAccountId: string): TeacherClass[] {
  if (pgRepo) {
    throw new Error('Use listTeacherClassesAsync when DATABASE_URL is configured');
  }
  return [...classes.values()]
    .filter((c) => c.teacherAccountId === teacherAccountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listTeacherClassesAsync(teacherAccountId: string): Promise<TeacherClass[]> {
  if (pgRepo) return pgRepo.listTeacherClasses(teacherAccountId);
  return listTeacherClasses(teacherAccountId);
}

export function createTeacherClass(
  teacherAccountId: string,
  payload: { name: string; courseId?: string; orgId?: string },
): TeacherClass {
  if (pgRepo) {
    throw new Error('Use createTeacherClassAsync when DATABASE_URL is configured');
  }
  const id = `cls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: TeacherClass = {
    id,
    teacherAccountId,
    orgId: payload.orgId?.trim() || undefined,
    name: payload.name.trim() || 'Untitled class',
    courseId: payload.courseId?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  classes.set(id, row);
  enrollments.set(rosterKey(id), []);
  return row;
}

export async function createTeacherClassAsync(
  teacherAccountId: string,
  payload: { name: string; courseId?: string; orgId?: string },
): Promise<TeacherClass> {
  if (pgRepo) return pgRepo.createTeacherClass(teacherAccountId, payload);
  return createTeacherClass(teacherAccountId, payload);
}

export function getClassById(classId: string): TeacherClass | null {
  if (pgRepo) {
    throw new Error('Use getClassByIdAsync when DATABASE_URL is configured');
  }
  return classes.get(classId) ?? null;
}

export async function getClassByIdAsync(classId: string): Promise<TeacherClass | null> {
  if (pgRepo) return pgRepo.getClassById(classId);
  return getClassById(classId);
}

export async function listOrgClassesAsync(orgId: string): Promise<TeacherClass[]> {
  if (pgRepo) return pgRepo.listOrgClasses(orgId);
  return [...classes.values()]
    .filter((c) => c.orgId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTeacherClass(classId: string, teacherAccountId: string): TeacherClass | null {
  if (pgRepo) {
    throw new Error('Use getTeacherClassAsync when DATABASE_URL is configured');
  }
  const row = classes.get(classId);
  if (!row || row.teacherAccountId !== teacherAccountId) return null;
  return row;
}

export async function getTeacherClassAsync(
  classId: string,
  teacherAccountId: string,
): Promise<TeacherClass | null> {
  if (pgRepo) return pgRepo.getTeacherClass(classId, teacherAccountId);
  return getTeacherClass(classId, teacherAccountId);
}

export function listClassRoster(classId: string): ClassEnrollment[] {
  if (pgRepo) {
    throw new Error('Use listClassRosterAsync when DATABASE_URL is configured');
  }
  return enrollments.get(rosterKey(classId)) ?? [];
}

export async function listClassRosterAsync(classId: string): Promise<ClassEnrollment[]> {
  if (pgRepo) return pgRepo.listClassRoster(classId);
  return listClassRoster(classId);
}

export async function rosterCountAsync(classId: string): Promise<number> {
  if (pgRepo) return pgRepo.rosterCount(classId);
  return listClassRoster(classId).length;
}

export function addClassEnrollment(
  classId: string,
  payload: { email: string; displayName?: string; mastery?: number },
): ClassEnrollment | null {
  if (pgRepo) {
    throw new Error('Use addClassEnrollmentAsync when DATABASE_URL is configured');
  }
  const email = payload.email.trim().toLowerCase();
  if (!email) return null;
  const roster = enrollments.get(rosterKey(classId)) ?? [];
  if (roster.some((e) => e.studentEmail === email)) {
    return roster.find((e) => e.studentEmail === email) ?? null;
  }
  const row: ClassEnrollment = {
    id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    classId,
    studentEmail: email,
    displayName: payload.displayName?.trim() || undefined,
    mastery: payload.mastery,
    lastActive: new Date().toISOString(),
    enrolledAt: new Date().toISOString(),
  };
  roster.push(row);
  enrollments.set(rosterKey(classId), roster);
  return row;
}

export async function addClassEnrollmentAsync(
  classId: string,
  payload: { email: string; displayName?: string; mastery?: number },
): Promise<ClassEnrollment | null> {
  if (pgRepo) return pgRepo.addClassEnrollment(classId, payload);
  return addClassEnrollment(classId, payload);
}

export function removeClassEnrollment(classId: string, enrollmentId: string): boolean {
  if (pgRepo) {
    throw new Error('Use removeClassEnrollmentAsync when DATABASE_URL is configured');
  }
  const roster = enrollments.get(rosterKey(classId)) ?? [];
  const next = roster.filter((e) => e.id !== enrollmentId);
  if (next.length === roster.length) return false;
  enrollments.set(rosterKey(classId), next);
  return true;
}

export async function removeClassEnrollmentAsync(
  classId: string,
  enrollmentId: string,
): Promise<boolean> {
  if (pgRepo) return pgRepo.removeClassEnrollment(classId, enrollmentId);
  return removeClassEnrollment(classId, enrollmentId);
}

export type StudentClassRow = {
  enrollment: ClassEnrollment;
  class: TeacherClass;
};

export async function listStudentClassesAsync(studentEmail: string): Promise<StudentClassRow[]> {
  const email = studentEmail.trim().toLowerCase();
  if (!email) return [];
  if (pgRepo) return pgRepo.listStudentEnrollments(email);
  const rows: StudentClassRow[] = [];
  for (const cls of classes.values()) {
    const roster = enrollments.get(rosterKey(cls.id)) ?? [];
    const enr = roster.find((e) => e.studentEmail === email);
    if (enr) rows.push({ enrollment: enr, class: cls });
  }
  return rows.sort((a, b) => b.enrollment.enrolledAt.localeCompare(a.enrollment.enrolledAt));
}

export async function getStudentEnrollmentAsync(
  classId: string,
  studentEmail: string,
): Promise<ClassEnrollment | null> {
  const rows = await listStudentClassesAsync(studentEmail);
  return rows.find((r) => r.class.id === classId)?.enrollment ?? null;
}

/** Test helper */
export function resetClassStore(): void {
  classes.clear();
  enrollments.clear();
}
