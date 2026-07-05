import { config } from '../config';
import { createTeacherRepo } from './teacherPostgres';

export type DiscussionAuthorRole = 'teacher' | 'student';

export type AssignmentDiscussionPost = {
  id: string;
  classId: string;
  assignmentId: string;
  authorAccountId: string;
  authorRole: DiscussionAuthorRole;
  body: string;
  createdAt: string;
};

const postsByThread = new Map<string, AssignmentDiscussionPost[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

function threadKey(classId: string, assignmentId: string): string {
  return `${classId}:${assignmentId}`;
}

export function listAssignmentDiscussion(
  classId: string,
  assignmentId: string,
): AssignmentDiscussionPost[] {
  if (pgRepo) {
    throw new Error('Use listAssignmentDiscussionAsync when DATABASE_URL is configured');
  }
  return [...(postsByThread.get(threadKey(classId, assignmentId)) ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export async function listAssignmentDiscussionAsync(
  classId: string,
  assignmentId: string,
): Promise<AssignmentDiscussionPost[]> {
  if (pgRepo) return pgRepo.listAssignmentDiscussion(classId, assignmentId);
  return listAssignmentDiscussion(classId, assignmentId);
}

export function createAssignmentDiscussionPost(
  classId: string,
  assignmentId: string,
  payload: { authorAccountId: string; authorRole: DiscussionAuthorRole; body: string },
): AssignmentDiscussionPost {
  if (pgRepo) {
    throw new Error('Use createAssignmentDiscussionPostAsync when DATABASE_URL is configured');
  }
  const row: AssignmentDiscussionPost = {
    id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    classId,
    assignmentId,
    authorAccountId: payload.authorAccountId,
    authorRole: payload.authorRole,
    body: payload.body.trim(),
    createdAt: new Date().toISOString(),
  };
  const key = threadKey(classId, assignmentId);
  const list = postsByThread.get(key) ?? [];
  list.push(row);
  postsByThread.set(key, list);
  return row;
}

export async function createAssignmentDiscussionPostAsync(
  classId: string,
  assignmentId: string,
  payload: { authorAccountId: string; authorRole: DiscussionAuthorRole; body: string },
): Promise<AssignmentDiscussionPost> {
  if (pgRepo) return pgRepo.createAssignmentDiscussionPost(classId, assignmentId, payload);
  return createAssignmentDiscussionPost(classId, assignmentId, payload);
}

export function removeAssignmentDiscussionPost(
  classId: string,
  assignmentId: string,
  postId: string,
): boolean {
  if (pgRepo) {
    throw new Error('Use removeAssignmentDiscussionPostAsync when DATABASE_URL is configured');
  }
  const key = threadKey(classId, assignmentId);
  const list = postsByThread.get(key) ?? [];
  const next = list.filter((p) => p.id !== postId);
  if (next.length === list.length) return false;
  postsByThread.set(key, next);
  return true;
}

export async function removeAssignmentDiscussionPostAsync(
  classId: string,
  assignmentId: string,
  postId: string,
): Promise<boolean> {
  if (pgRepo) return pgRepo.removeAssignmentDiscussionPost(classId, assignmentId, postId);
  return removeAssignmentDiscussionPost(classId, assignmentId, postId);
}

/** Test helper */
export function resetDiscussionStore(): void {
  postsByThread.clear();
}
