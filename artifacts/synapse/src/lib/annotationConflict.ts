/**
 * Shared-annotation merge with conflict detection (COL-02 / TOOL-AN-02).
 * Same id + divergent content → conflict instead of silent last-write-wins.
 */

import type { SharedAnnotationDto } from './authClient';

export type AnnotationConflict = {
  id: string;
  local: SharedAnnotationDto;
  remote: SharedAnnotationDto;
  reason: 'content_divergence' | 'revision_divergence';
};

export type MergeSharedAnnotationsResult = {
  merged: SharedAnnotationDto[];
  conflicts: AnnotationConflict[];
};

function contentKey(ann: SharedAnnotationDto): string {
  return [
    ann.type,
    ann.text.trim(),
    ann.color,
    String(ann.lineStart),
    String(ann.lineEnd),
    ann.focusTerm ?? '',
  ].join('\u0001');
}

function revisionOf(ann: SharedAnnotationDto): number {
  return typeof ann.revision === 'number' ? ann.revision : 0;
}

/**
 * Merge remote teacher annotations. Divergent same-id rows become conflicts;
 * identical content collapses; higher revision wins when only metadata drifts.
 */
export function mergeSharedAnnotationsWithConflicts(
  current: SharedAnnotationDto[],
  incoming: SharedAnnotationDto[],
): MergeSharedAnnotationsResult {
  const byId = new Map<string, SharedAnnotationDto>();
  const conflicts: AnnotationConflict[] = [];

  for (const ann of current) byId.set(ann.id, ann);

  for (const remote of incoming) {
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remote);
      continue;
    }
    if (contentKey(local) === contentKey(remote)) {
      // Prefer higher revision / newer updatedAt for metadata.
      const localRev = revisionOf(local);
      const remoteRev = revisionOf(remote);
      if (remoteRev > localRev) byId.set(remote.id, remote);
      else if (remoteRev === localRev) {
        const localTs = new Date(local.updatedAt ?? local.createdAt).getTime();
        const remoteTs = new Date(remote.updatedAt ?? remote.createdAt).getTime();
        if (remoteTs >= localTs) byId.set(remote.id, remote);
      }
      continue;
    }
    conflicts.push({
      id: remote.id,
      local,
      remote,
      reason: revisionOf(local) !== revisionOf(remote) ? 'revision_divergence' : 'content_divergence',
    });
    // Keep local until user resolves; do not overwrite.
  }

  const merged = [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return { merged, conflicts };
}

/** Backward-compatible wrapper — drops conflicts (legacy callers). Prefer WithConflicts. */
export function mergeSharedAnnotations(
  current: SharedAnnotationDto[],
  incoming: SharedAnnotationDto[],
): SharedAnnotationDto[] {
  return mergeSharedAnnotationsWithConflicts(current, incoming).merged;
}

export function resolveAnnotationConflict(
  conflicts: AnnotationConflict[],
  id: string,
  choice: 'local' | 'remote',
): { remaining: AnnotationConflict[]; chosen: SharedAnnotationDto | null } {
  const hit = conflicts.find((c) => c.id === id);
  if (!hit) return { remaining: conflicts, chosen: null };
  return {
    remaining: conflicts.filter((c) => c.id !== id),
    chosen: choice === 'local' ? hit.local : hit.remote,
  };
}
