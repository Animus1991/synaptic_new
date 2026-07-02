import { config } from '../config';
import { createTeacherRepo } from './teacherPostgres';

export type ClassAssignment = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  dueAt?: string;
  courseId?: string;
  createdAt: string;
};

const assignmentsByClass = new Map<string, ClassAssignment[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

export function listClassAssignments(classId: string): ClassAssignment[] {
  if (pgRepo) {
    throw new Error('Use listClassAssignmentsAsync when DATABASE_URL is configured');
  }
  return [...(assignmentsByClass.get(classId) ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listClassAssignmentsAsync(classId: string): Promise<ClassAssignment[]> {
  if (pgRepo) return pgRepo.listClassAssignments(classId);
  return listClassAssignments(classId);
}

export function createClassAssignment(
  classId: string,
  payload: { title: string; description?: string; dueAt?: string; courseId?: string },
): ClassAssignment {
  if (pgRepo) {
    throw new Error('Use createClassAssignmentAsync when DATABASE_URL is configured');
  }
  const row: ClassAssignment = {
    id: `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    classId,
    title: payload.title.trim() || 'Untitled assignment',
    description: payload.description?.trim() || undefined,
    dueAt: payload.dueAt?.trim() || undefined,
    courseId: payload.courseId?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const list = assignmentsByClass.get(classId) ?? [];
  list.unshift(row);
  assignmentsByClass.set(classId, list);
  return row;
}

export async function createClassAssignmentAsync(
  classId: string,
  payload: { title: string; description?: string; dueAt?: string; courseId?: string },
): Promise<ClassAssignment> {
  if (pgRepo) return pgRepo.createClassAssignment(classId, payload);
  return createClassAssignment(classId, payload);
}

export function updateClassAssignment(
  classId: string,
  assignmentId: string,
  patch: Partial<Pick<ClassAssignment, 'title' | 'description' | 'dueAt' | 'courseId'>>,
): ClassAssignment | null {
  if (pgRepo) {
    throw new Error('Use updateClassAssignmentAsync when DATABASE_URL is configured');
  }
  const list = assignmentsByClass.get(classId) ?? [];
  const idx = list.findIndex((a) => a.id === assignmentId);
  if (idx < 0) return null;
  const current = list[idx]!;
  const next: ClassAssignment = {
    ...current,
    title: patch.title?.trim() ? patch.title.trim() : current.title,
    description: patch.description !== undefined ? (patch.description.trim() || undefined) : current.description,
    dueAt: patch.dueAt !== undefined ? (patch.dueAt.trim() || undefined) : current.dueAt,
    courseId: patch.courseId !== undefined ? (patch.courseId.trim() || undefined) : current.courseId,
  };
  list[idx] = next;
  assignmentsByClass.set(classId, list);
  return next;
}

export async function updateClassAssignmentAsync(
  classId: string,
  assignmentId: string,
  patch: Partial<Pick<ClassAssignment, 'title' | 'description' | 'dueAt' | 'courseId'>>,
): Promise<ClassAssignment | null> {
  if (pgRepo) return pgRepo.updateClassAssignment(classId, assignmentId, patch);
  return updateClassAssignment(classId, assignmentId, patch);
}

export function removeClassAssignment(classId: string, assignmentId: string): boolean {
  if (pgRepo) {
    throw new Error('Use removeClassAssignmentAsync when DATABASE_URL is configured');
  }
  const list = assignmentsByClass.get(classId) ?? [];
  const next = list.filter((a) => a.id !== assignmentId);
  if (next.length === list.length) return false;
  assignmentsByClass.set(classId, next);
  return true;
}

export async function removeClassAssignmentAsync(
  classId: string,
  assignmentId: string,
): Promise<boolean> {
  if (pgRepo) return pgRepo.removeClassAssignment(classId, assignmentId);
  return removeClassAssignment(classId, assignmentId);
}

/** Test helper */
export function resetAssignmentStore(): void {
  assignmentsByClass.clear();
}
