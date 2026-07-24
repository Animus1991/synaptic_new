import { listSharedAnnotationsWithMeta } from '../store/sharedAnnotationStore';

const STREAM_INTERVAL_MS = 5_000;

type StreamClient = {
  courseId: string;
  fileKey: string;
  res: import('express').Response;
};

const clients = new Set<StreamClient>();

function streamKey(courseId: string, fileKey: string): string {
  return `${courseId}::${fileKey}`;
}

/** Push version bump to all SSE clients watching this course/file. */
export function notifyAnnotationStream(courseId: string, fileKey: string): void {
  const payload = listSharedAnnotationsWithMeta(courseId, fileKey);
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    if (c.courseId === courseId && c.fileKey === fileKey) {
      c.res.write(line);
    }
  }
}

let pumpStarted = false;

function ensurePump(): void {
  if (pumpStarted) return;
  pumpStarted = true;
  setInterval(() => {
    if (clients.size === 0) return;
    const seen = new Set<string>();
    for (const c of clients) {
      const k = streamKey(c.courseId, c.fileKey);
      if (seen.has(k)) continue;
      seen.add(k);
      const payload = listSharedAnnotationsWithMeta(c.courseId, c.fileKey);
      const line = `data: ${JSON.stringify(payload)}\n\n`;
      for (const sub of clients) {
        if (sub.courseId === c.courseId && sub.fileKey === c.fileKey) {
          sub.res.write(line);
        }
      }
    }
  }, STREAM_INTERVAL_MS);
}

export function registerAnnotationStream(router: import('express').Router): void {
  router.get('/annotations/stream', (req, res) => {
    const courseId = String(req.query.courseId ?? '');
    const fileKey = String(req.query.fileKey ?? '');
    if (!courseId || !fileKey) {
      res.status(400).json({ error: 'courseId and fileKey required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const client: StreamClient = { courseId, fileKey, res };
    clients.add(client);
    ensurePump();

    const initial = listSharedAnnotationsWithMeta(courseId, fileKey);
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    req.on('close', () => {
      clients.delete(client);
    });
  });
}
