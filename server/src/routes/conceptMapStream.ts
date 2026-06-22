type ConceptMapCursor = {
  clientId: string;
  nodeId: string;
  x: number;
  y: number;
  label: string;
  at: string;
};

type CursorClient = {
  courseId: string;
  conceptKey: string;
  res: import('express').Response;
};

const clients = new Set<CursorClient>();
const cursorsByKey = new Map<string, ConceptMapCursor[]>();

function key(courseId: string, conceptKey: string): string {
  return `${courseId}::${conceptKey}`;
}

export function registerConceptMapCursorStream(router: import('express').Router): void {
  router.get('/concept-map/cursors/stream', (req, res) => {
    const courseId = String(req.query.courseId ?? '');
    const conceptKey = String(req.query.conceptKey ?? '');
    if (!courseId || !conceptKey) {
      res.status(400).json({ error: 'courseId and conceptKey required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const client: CursorClient = { courseId, conceptKey, res };
    clients.add(client);

    const initial = cursorsByKey.get(key(courseId, conceptKey)) ?? [];
    res.write(`data: ${JSON.stringify({ cursors: initial })}\n\n`);

    req.on('close', () => clients.delete(client));
  });

  router.post('/concept-map/cursors', (req, res) => {
    const { courseId, conceptKey, cursor } = req.body ?? {};
    if (!courseId || !conceptKey || !cursor) {
      res.status(400).json({ error: 'courseId, conceptKey, cursor required' });
      return;
    }
    const k = key(String(courseId), String(conceptKey));
    const prev = cursorsByKey.get(k) ?? [];
    const next = [...prev.filter((c) => c.clientId !== cursor.clientId), cursor].slice(-16);
    cursorsByKey.set(k, next);
    const line = `data: ${JSON.stringify({ cursors: next })}\n\n`;
    for (const c of clients) {
      if (c.courseId === courseId && c.conceptKey === conceptKey) {
        c.res.write(line);
      }
    }
    res.json({ ok: true });
  });
}
