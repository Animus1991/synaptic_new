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
  parentPostId?: string;
  createdAt: string;
};

export type CreateDiscussionPostPayload = {
  authorAccountId: string;
  authorRole: DiscussionAuthorRole;
  body: string;
  parentPostId?: string;
};

const postsByThread = new Map<string, AssignmentDiscussionPost[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

function threadKey(classId: string, assignmentId: string): string {
  return `${classId}:${assignmentId}`;
}

/** One-level threading: replies attach only to root posts. */
export function validateDiscussionParentPostId(
  posts: AssignmentDiscussionPost[],
  parentPostId: string,
): string | null {
  const parent = posts.find((p) => p.id === parentPostId);
  if (!parent) return 'parent post not found';
  if (parent.parentPostId) return 'cannot reply to a reply';
  return null;
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
  payload: CreateDiscussionPostPayload,
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
    parentPostId: payload.parentPostId,
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
  payload: CreateDiscussionPostPayload,
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
  const toRemove = new Set<string>([postId]);
  for (const post of list) {
    if (post.parentPostId === postId) toRemove.add(post.id);
  }
  const next = list.filter((p) => !toRemove.has(p.id));
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
