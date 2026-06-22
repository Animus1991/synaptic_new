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
  const delta = all.filter((a) => new Date(a.createdAt).getTime() > sinceMs);
  return { annotations: delta, version, serverTime };
}

export function addSharedAnnotation(
  courseId: string,
  fileKey: string,
  teacherEmail: string,
  payload: Omit<SharedAnnotation, 'id' | 'courseId' | 'fileKey' | 'teacherEmail' | 'createdAt'>,
): SharedAnnotation {
  const ann: SharedAnnotation = {
    ...payload,
    id: `tann-${Date.now()}`,
    courseId,
    fileKey,
    teacherEmail,
    createdAt: new Date().toISOString(),
  };
  const k = key(courseId, fileKey);
  const list = memory.get(k) ?? [];
  list.push(ann);
  memory.set(k, list.slice(-200));
  versions.set(k, (versions.get(k) ?? 0) + 1);
  return ann;
}

export function sharedAnnotationsEnabled(): boolean {
  return Boolean(config.databaseUrl) || true;
}
