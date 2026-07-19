import { config } from '../config';

export type SharedAnnotation = {
  id: string;
  courseId: string;
  fileKey: string;
  type: 'highlight' | 'comment' | 'pin';
  text: string;
  color: string;
  lineStart: number;
  lineEnd: number;
  focusTerm?: string;
  teacherEmail: string;
  createdAt: string;
  revision: number;
  updatedAt: string;
};

const memory = new Map<string, SharedAnnotation[]>();
const versions = new Map<string, number>();

function key(courseId: string, fileKey: string): string {
  return `${courseId}::${fileKey}`;
}

export function listSharedAnnotations(courseId: string, fileKey: string): SharedAnnotation[] {
  return memory.get(key(courseId, fileKey)) ?? [];
}

export function getSharedAnnotationVersion(courseId: string, fileKey: string): number {
  return versions.get(key(courseId, fileKey)) ?? 0;
}

export type SharedAnnotationListResult = {
  annotations: SharedAnnotation[];
  version: number;
  serverTime: string;
};

export function listSharedAnnotationsWithMeta(
  courseId: string,
  fileKey: string,
  since?: string,
): SharedAnnotationListResult {
  const k = key(courseId, fileKey);
  const all = memory.get(k) ?? [];
  const version = versions.get(k) ?? 0;
  const serverTime = new Date().toISOString();
  if (!since) {
    return { annotations: all, version, serverTime };
  }
  const sinceMs = new Date(since).getTime();
  const delta = all.filter((a) => {
    const ts = new Date(a.updatedAt || a.createdAt).getTime();
    return ts > sinceMs;
  });
  return { annotations: delta, version, serverTime };
}

export function summarizeTeacherPublishing(teacherEmail: string): {
  annotationCount: number;
  fileCount: number;
  courseCount: number;
  recent: SharedAnnotation[];
} {
  const normalized = teacherEmail.trim().toLowerCase();
  let annotationCount = 0;
  const fileKeys = new Set<string>();
  const courseIds = new Set<string>();
  const recent: SharedAnnotation[] = [];
  for (const [, list] of memory) {
    for (const ann of list) {
      if (ann.teacherEmail.trim().toLowerCase() !== normalized) continue;
      annotationCount += 1;
      fileKeys.add(`${ann.courseId}::${ann.fileKey}`);
      courseIds.add(ann.courseId);
      recent.push(ann);
    }
  }
  recent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    annotationCount,
    fileCount: fileKeys.size,
    courseCount: courseIds.size,
    recent: recent.slice(0, 8),
  };
}

export function addSharedAnnotation(
  courseId: string,
  fileKey: string,
  teacherEmail: string,
  payload: Omit<SharedAnnotation, 'id' | 'courseId' | 'fileKey' | 'teacherEmail' | 'createdAt' | 'revision' | 'updatedAt'>,
): SharedAnnotation {
  const now = new Date().toISOString();
  const ann: SharedAnnotation = {
    ...payload,
    id: `tann-${Date.now()}`,
    courseId,
    fileKey,
    teacherEmail,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  const k = key(courseId, fileKey);
  const list = memory.get(k) ?? [];
  list.push(ann);
  memory.set(k, list.slice(-200));
  versions.set(k, (versions.get(k) ?? 0) + 1);
  return ann;
}

/**
 * W2 — update existing shared annotation with optimistic revision check.
 * Returns null when id missing; throws ConflictError when baseRevision is stale.
 */
export class SharedAnnotationConflictError extends Error {
  current: SharedAnnotation;
  constructor(current: SharedAnnotation) {
    super('Annotation revision conflict');
    this.name = 'SharedAnnotationConflictError';
    this.current = current;
  }
}

export function updateSharedAnnotation(
  courseId: string,
  fileKey: string,
  annotationId: string,
  patch: Partial<Pick<SharedAnnotation, 'text' | 'color' | 'lineStart' | 'lineEnd' | 'focusTerm' | 'type'>>,
  baseRevision?: number,
): SharedAnnotation | null {
  const k = key(courseId, fileKey);
  const list = memory.get(k) ?? [];
  const idx = list.findIndex((a) => a.id === annotationId);
  if (idx < 0) return null;
  const current = list[idx]!;
  if (typeof baseRevision === 'number' && current.revision !== baseRevision) {
    throw new SharedAnnotationConflictError(current);
  }
  const next: SharedAnnotation = {
    ...current,
    ...patch,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = next;
  memory.set(k, list);
  versions.set(k, (versions.get(k) ?? 0) + 1);
  return next;
}

export function sharedAnnotationsEnabled(): boolean {
  return Boolean(config.databaseUrl) || true;
}

/** Test helper */
export function __resetSharedAnnotationStore(): void {
  memory.clear();
  versions.clear();
}
