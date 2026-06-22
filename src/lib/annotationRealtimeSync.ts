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
  const byId = new Map<string, SharedAnnotationDto>();
  for (const ann of current) byId.set(ann.id, ann);
  for (const ann of incoming) byId.set(ann.id, ann);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
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
