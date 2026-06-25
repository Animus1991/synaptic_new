/**
 * Detect courses/files processed with an older recognition pipeline and prompt re-upload.
 */

import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import type { Course, UploadedFile } from '../types';

export function parsePipelineVersion(version?: string): [number, number, number] | null {
  if (!version?.trim()) return null;
  const parts = version.trim().split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** True when `stored` is older than `current` (semver). Missing version = stale. */
export function isPipelineStale(
  stored?: string,
  current: string = CONTENT_PIPELINE_VERSION,
): boolean {
  if (!stored?.trim()) return true;
  if (stored === current) return false;
  const a = parsePipelineVersion(stored);
  const b = parsePipelineVersion(current);
  if (!a || !b) return stored !== current;
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}

export function coursePipelineVersion(course: Course, files: UploadedFile[]): string | undefined {
  if (course.pipelineMeta?.version) return course.pipelineMeta.version;
  const linked = files.filter((f) => f.courseId === course.id);
  const versions = linked.map((f) => f.pipelineVersion).filter(Boolean) as string[];
  return versions[0];
}

export function courseNeedsReupload(course: Course, files: UploadedFile[]): boolean {
  if (isPipelineStale(course.pipelineMeta?.version)) return true;
  const linked = files.filter((f) => f.courseId === course.id);
  if (linked.length === 0) return isPipelineStale(undefined);
  return linked.some((f) => isPipelineStale(f.pipelineVersion));
}

export function reuploadMigrationMessage(
  lang: 'en' | 'el',
  current = CONTENT_PIPELINE_VERSION,
): string {
  if (lang === 'el') {
    return `Το υλικό αναλύθηκε με παλαιότερο pipeline (v${current} τώρα). Ανέβασε ξανά τα αρχεία για αναγνώριση πινάκων, βιβλιογραφίας και μαθηματικών.`;
  }
  return `This material was analyzed with an older recognition pipeline (now v${current}). Re-upload your files to apply table, bibliography, and math detection.`;
}

export function reuploadDismissKey(courseId: string): string {
  return `synapse-reupload-dismissed:${courseId}`;
}

export function isReuploadHintDismissed(courseId: string): boolean {
  try {
    return sessionStorage.getItem(reuploadDismissKey(courseId)) === '1';
  } catch {
    return false;
  }
}

export function dismissReuploadHint(courseId: string): void {
  try {
    sessionStorage.setItem(reuploadDismissKey(courseId), '1');
  } catch {
    /* ignore quota */
  }
}
