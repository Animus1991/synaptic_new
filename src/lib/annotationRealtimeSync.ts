import type { SharedAnnotationDto } from './authClient';

export const ANNOTATION_SYNC_CHANNEL = 'synapse.annotation.sync';

export type AnnotationSyncPayload = {
  courseId: string;
  fileKey: string;
  version: number;
  at: string;
};

/** Merge remote teacher annotations without duplicates (id-stable). */
export function mergeSharedAnnotations(
  current: SharedAnnotationDto[],
  incoming: SharedAnnotationDto[],
): SharedAnnotationDto[] {
  return mergeSharedAnnotationsWithConflicts(current, incoming).merged;
}

export type AnnotationConflict = {
  id: string;
  local: SharedAnnotationDto;
  remote: SharedAnnotationDto;
};

export type SharedAnnotationMergeResult = {
  merged: SharedAnnotationDto[];
  conflicts: AnnotationConflict[];
};

/** Detect concurrent edits: same id, different text or span (TOOL-AN-02 / COL-02). */
export function mergeSharedAnnotationsWithConflicts(
  current: SharedAnnotationDto[],
  incoming: SharedAnnotationDto[],
): SharedAnnotationMergeResult {
  const byId = new Map<string, SharedAnnotationDto>();
  for (const ann of current) byId.set(ann.id, ann);
  const conflicts: AnnotationConflict[] = [];
  for (const ann of incoming) {
    const prev = byId.get(ann.id);
    if (
      prev
      && (
        prev.text !== ann.text
        || prev.lineStart !== ann.lineStart
        || prev.lineEnd !== ann.lineEnd
        || prev.color !== ann.color
      )
      && prev.createdAt === ann.createdAt
    ) {
      conflicts.push({ id: ann.id, local: prev, remote: ann });
    }
    // Prefer newer createdAt when both exist; otherwise remote wins on update.
    if (!prev) {
      byId.set(ann.id, ann);
    } else if (new Date(ann.createdAt).getTime() >= new Date(prev.createdAt).getTime()) {
      // If content differs and timestamps equal/newer remote — keep remote but flag conflict when text differs
      if (
        prev.text !== ann.text
        || prev.lineStart !== ann.lineStart
        || prev.lineEnd !== ann.lineEnd
      ) {
        if (!conflicts.some((c) => c.id === ann.id)) {
          conflicts.push({ id: ann.id, local: prev, remote: ann });
        }
      }
      byId.set(ann.id, ann);
    }
  }
  return {
    merged: [...byId.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
    conflicts,
  };
}

export function resolveAnnotationConflict(
  conflicts: AnnotationConflict[],
  id: string,
  choice: 'local' | 'remote',
  merged: SharedAnnotationDto[],
): { merged: SharedAnnotationDto[]; conflicts: AnnotationConflict[] } {
  const hit = conflicts.find((c) => c.id === id);
  if (!hit) return { merged, conflicts };
  const pick = choice === 'local' ? hit.local : hit.remote;
  const nextMerged = merged.map((a) => (a.id === id ? pick : a));
  if (!nextMerged.some((a) => a.id === id)) nextMerged.push(pick);
  return {
    merged: nextMerged.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
    conflicts: conflicts.filter((c) => c.id !== id),
  };
}

export function filterAnnotationsSince(
  annotations: SharedAnnotationDto[],
  sinceIso?: string,
): SharedAnnotationDto[] {
  if (!sinceIso) return annotations;
  const since = new Date(sinceIso).getTime();
  return annotations.filter((a) => new Date(a.createdAt).getTime() > since);
}

export function broadcastAnnotationSync(payload: AnnotationSyncPayload): void {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const ch = new BroadcastChannel(ANNOTATION_SYNC_CHANNEL);
    ch.postMessage(payload);
    ch.close();
  } catch { /* ignore */ }
}

export const DEFAULT_ANNOTATION_POLL_MS = 8_000;

export type AnnotationSyncMode = 'stream' | 'poll' | 'off';

export function connectAnnotationStream(
  baseUrl: string,
  courseId: string,
  fileKey: string,
  onUpdate: (payload: { annotations: SharedAnnotationDto[]; version: number; serverTime: string }) => void,
  onMode?: (mode: AnnotationSyncMode) => void,
): () => void {
  if (typeof EventSource === 'undefined' || !baseUrl) {
    onMode?.('poll');
    return () => {};
  }
  const url = `${baseUrl.replace(/\/$/, '')}/v1/annotations/stream?courseId=${encodeURIComponent(courseId)}&fileKey=${encodeURIComponent(fileKey)}`;
  let es: EventSource | null = null;
  try {
    es = new EventSource(url);
    es.onopen = () => onMode?.('stream');
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { annotations: SharedAnnotationDto[]; version: number; serverTime: string };
        onUpdate(data);
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      onMode?.('poll');
      es?.close();
      es = null;
    };
  } catch {
    onMode?.('poll');
  }
  return () => {
    es?.close();
  };
}
