import { config } from '../config';
import { createTeacherRepo } from './teacherPostgres';

export type GradebookCellStatus = 'pending' | 'submitted' | 'graded';

export type GradebookCell = {
  enrollmentId: string;
  assignmentId: string;
  status: GradebookCellStatus;
  score?: number;
  updatedAt: string;
};

export type GradebookSnapshot = {
  classId: string;
  cells: GradebookCell[];
};

const cellsByClass = new Map<string, GradebookCell[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

function cellKey(enrollmentId: string, assignmentId: string): string {
  return `${enrollmentId}:${assignmentId}`;
}

export function getGradebook(classId: string): GradebookSnapshot {
  if (pgRepo) {
    throw new Error('Use getGradebookAsync when DATABASE_URL is configured');
  }
  return { classId, cells: [...(cellsByClass.get(classId) ?? [])] };
}

export async function getGradebookAsync(classId: string): Promise<GradebookSnapshot> {
  if (pgRepo) return pgRepo.getGradebook(classId);
  return getGradebook(classId);
}

export function upsertGradebookCell(
  classId: string,
  payload: {
    enrollmentId: string;
    assignmentId: string;
    status?: GradebookCellStatus;
    score?: number;
  },
): GradebookCell {
  if (pgRepo) {
    throw new Error('Use upsertGradebookCellAsync when DATABASE_URL is configured');
  }
  const list = cellsByClass.get(classId) ?? [];
  const key = cellKey(payload.enrollmentId, payload.assignmentId);
  const existing = list.find((c) => cellKey(c.enrollmentId, c.assignmentId) === key);
  const status = payload.status ?? existing?.status ?? (payload.score != null ? 'graded' : 'pending');
  const score =
    payload.score !== undefined
      ? Math.max(0, Math.min(100, Math.round(payload.score)))
      : existing?.score;
  const next: GradebookCell = {
    enrollmentId: payload.enrollmentId,
    assignmentId: payload.assignmentId,
    status,
    score,
    updatedAt: new Date().toISOString(),
  };
  if (existing) {
    Object.assign(existing, next);
  } else {
    list.push(next);
    cellsByClass.set(classId, list);
  }
  return next;
}

export async function upsertGradebookCellAsync(
  classId: string,
  payload: {
    enrollmentId: string;
    assignmentId: string;
    status?: GradebookCellStatus;
    score?: number;
  },
): Promise<GradebookCell> {
  if (pgRepo) return pgRepo.upsertGradebookCell(classId, payload);
  return upsertGradebookCell(classId, payload);
}

export function removeGradebookCellsForEnrollment(classId: string, enrollmentId: string): void {
  if (pgRepo) {
    throw new Error('Use removeGradebookCellsForEnrollmentAsync when DATABASE_URL is configured');
  }
  const list = cellsByClass.get(classId) ?? [];
  cellsByClass.set(
    classId,
    list.filter((c) => c.enrollmentId !== enrollmentId),
  );
}

export async function removeGradebookCellsForEnrollmentAsync(
  classId: string,
  enrollmentId: string,
): Promise<void> {
  if (pgRepo) return pgRepo.removeGradebookCellsForEnrollment(classId, enrollmentId);
  removeGradebookCellsForEnrollment(classId, enrollmentId);
}

export function removeGradebookCellsForAssignment(classId: string, assignmentId: string): void {
  if (pgRepo) {
    throw new Error('Use removeGradebookCellsForAssignmentAsync when DATABASE_URL is configured');
  }
  const list = cellsByClass.get(classId) ?? [];
  cellsByClass.set(
    classId,
    list.filter((c) => c.assignmentId !== assignmentId),
  );
}

export async function removeGradebookCellsForAssignmentAsync(
  classId: string,
  assignmentId: string,
): Promise<void> {
  if (pgRepo) return pgRepo.removeGradebookCellsForAssignment(classId, assignmentId);
  removeGradebookCellsForAssignment(classId, assignmentId);
}

/** Test helper */
export function resetGradebookStore(): void {
  cellsByClass.clear();
}
