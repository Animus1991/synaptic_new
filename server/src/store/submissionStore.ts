/**
 * Student assignment submissions.
 *
 * In-memory when DATABASE_URL is unset (local/dev/unit tests). When Postgres
 * is configured, content is durable via `assignment_submissions` (migration
 * 1740000000016) — matching assignments, gradebook cells, and discussion.
 */

import { config } from '../config';
import { createTeacherRepo } from './teacherPostgres';
import type { SubmissionAttachment } from '../lib/submissionAttachments';

export type AssignmentSubmission = {
  id: string;
  classId: string;
  assignmentId: string;
  enrollmentId: string;
  accountId: string;
  body: string;
  linkUrl?: string;
  attachments: SubmissionAttachment[];
  /** First submission time; resubmissions only bump `updatedAt`. */
  submittedAt: string;
  updatedAt: string;
};

export type UpsertSubmissionPayload = {
  enrollmentId: string;
  accountId: string;
  body: string;
  linkUrl?: string;
  attachments?: SubmissionAttachment[];
};

const submissionsByAssignment = new Map<string, AssignmentSubmission[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

function assignmentKey(classId: string, assignmentId: string): string {
  return `${classId}:${assignmentId}`;
}

export async function getStudentSubmissionAsync(
  classId: string,
  assignmentId: string,
  enrollmentId: string,
): Promise<AssignmentSubmission | null> {
  if (pgRepo) return pgRepo.getStudentSubmission(classId, assignmentId, enrollmentId);
  const list = submissionsByAssignment.get(assignmentKey(classId, assignmentId)) ?? [];
  return list.find((s) => s.enrollmentId === enrollmentId) ?? null;
}

/** All submissions of one enrollment across a class (for the student classes payload). */
export async function listEnrollmentSubmissionsAsync(
  classId: string,
  enrollmentId: string,
): Promise<AssignmentSubmission[]> {
  if (pgRepo) return pgRepo.listEnrollmentSubmissions(classId, enrollmentId);
  const rows: AssignmentSubmission[] = [];
  for (const [key, list] of submissionsByAssignment) {
    if (!key.startsWith(`${classId}:`)) continue;
    for (const s of list) {
      if (s.enrollmentId === enrollmentId) rows.push(s);
    }
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Teacher view: every student submission for one assignment. */
export async function listAssignmentSubmissionsAsync(
  classId: string,
  assignmentId: string,
): Promise<AssignmentSubmission[]> {
  if (pgRepo) return pgRepo.listAssignmentSubmissions(classId, assignmentId);
  return [...(submissionsByAssignment.get(assignmentKey(classId, assignmentId)) ?? [])].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** Create or replace (resubmit) the student's submission for an assignment. */
export async function upsertStudentSubmissionAsync(
  classId: string,
  assignmentId: string,
  payload: UpsertSubmissionPayload,
): Promise<AssignmentSubmission> {
  if (pgRepo) return pgRepo.upsertStudentSubmission(classId, assignmentId, payload);
  const key = assignmentKey(classId, assignmentId);
  const list = submissionsByAssignment.get(key) ?? [];
  const now = new Date().toISOString();
  const existing = list.find((s) => s.enrollmentId === payload.enrollmentId);
  if (existing) {
    existing.body = payload.body.trim();
    existing.linkUrl = payload.linkUrl?.trim() || undefined;
    existing.attachments = payload.attachments ?? existing.attachments;
    existing.updatedAt = now;
    return existing;
  }
  const row: AssignmentSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    classId,
    assignmentId,
    enrollmentId: payload.enrollmentId,
    accountId: payload.accountId,
    body: payload.body.trim(),
    linkUrl: payload.linkUrl?.trim() || undefined,
    attachments: payload.attachments ?? [],
    submittedAt: now,
    updatedAt: now,
  };
  list.push(row);
  submissionsByAssignment.set(key, list);
  return row;
}

/** Test helper — only clears the in-memory fallback. */
export function resetSubmissionStore(): void {
  submissionsByAssignment.clear();
}
