export type ConceptMapCursor = {
  clientId: string;
  nodeId: string;
  x: number;
  y: number;
  label: string;
  at: string;
};

type CursorListener = (cursors: ConceptMapCursor[]) => void;

let localCursors: ConceptMapCursor[] = [];
const listeners = new Set<CursorListener>();
let eventSource: EventSource | null = null;

export function publishLocalCursor(cursor: Omit<ConceptMapCursor, 'at'>): void {
  const entry: ConceptMapCursor = { ...cursor, at: new Date().toISOString() };
  localCursors = [
    ...localCursors.filter((c) => c.clientId !== cursor.clientId),
    entry,
  ].slice(-12);
  listeners.forEach((fn) => fn(localCursors));
}

export function connectConceptMapCursors(
  courseId: string,
  conceptKey: string,
  baseUrl: string,
  onRemote: (cursors: ConceptMapCursor[]) => void,
): () => void {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/concept-map/cursors/stream?courseId=${encodeURIComponent(courseId)}&conceptKey=${encodeURIComponent(conceptKey)}`;
  try {
    eventSource = new EventSource(url);
    eventSource.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { cursors?: ConceptMapCursor[] };
        if (data.cursors) onRemote(data.cursors);
      } catch { /* ignore */ }
    };
    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;
    };
  } catch { /* offline */ }

  const sub = (c: ConceptMapCursor[]) => onRemote(c);
  listeners.add(sub);
  return () => {
    listeners.delete(sub);
    eventSource?.close();
    eventSource = null;
  };
}

export function notifyCursorStream(
  fetchImpl: typeof fetch,
  baseUrl: string,
  courseId: string,
  conceptKey: string,
  cursor: ConceptMapCursor,
): void {
  fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/concept-map/cursors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, conceptKey, cursor }),
  }).catch(() => {});
}
