export type TeacherClass = {
  id: string;
  teacherAccountId: string;
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

function rosterKey(classId: string): string {
  return classId;
}

export function listTeacherClasses(teacherAccountId: string): TeacherClass[] {
  return [...classes.values()]
    .filter((c) => c.teacherAccountId === teacherAccountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createTeacherClass(
  teacherAccountId: string,
  payload: { name: string; courseId?: string },
): TeacherClass {
  const id = `cls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: TeacherClass = {
    id,
    teacherAccountId,
    name: payload.name.trim() || 'Untitled class',
    courseId: payload.courseId?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  classes.set(id, row);
  enrollments.set(rosterKey(id), []);
  return row;
}

export function getTeacherClass(classId: string, teacherAccountId: string): TeacherClass | null {
  const row = classes.get(classId);
  if (!row || row.teacherAccountId !== teacherAccountId) return null;
  return row;
}

export function listClassRoster(classId: string): ClassEnrollment[] {
  return enrollments.get(rosterKey(classId)) ?? [];
}

export function addClassEnrollment(
  classId: string,
  payload: { email: string; displayName?: string; mastery?: number },
): ClassEnrollment | null {
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

export function removeClassEnrollment(classId: string, enrollmentId: string): boolean {
  const roster = enrollments.get(rosterKey(classId)) ?? [];
  const next = roster.filter((e) => e.id !== enrollmentId);
  if (next.length === roster.length) return false;
  enrollments.set(rosterKey(classId), next);
  return true;
}

/** Test helper */
export function resetClassStore(): void {
  classes.clear();
  enrollments.clear();
}
