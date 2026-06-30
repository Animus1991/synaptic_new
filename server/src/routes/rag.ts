import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { enforceQuota } from '../middleware/usage';
import { addUsageAsync } from '../store/accounts';
import { retrieveTopK, searchGlobalLibrary, searchGlobalLibraryGraph } from '../lib/ragServer';
import { indexLibraryVectors } from '../lib/libraryVectorIndex';
import type { StoredLibrary } from '../store/libraryStore';

export const ragRouter = Router();
ragRouter.use(authenticate, enforceQuota);

/** POST /v1/rag/search — global semantic search over indexed library chunks. */
ragRouter.post('/rag/search', async (req, res) => {
  const account = req.account!;
  const body = req.body as { query?: string; topK?: number; courseId?: string; graph?: boolean };
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const topK = typeof body.topK === 'number' ? Math.min(20, Math.max(1, body.topK)) : 5;
  const useGraph = body.graph !== false;

  if (!query) {
    res.status(400).json({ error: 'query required' });
    return;
  }

  try {
    const courseId = typeof body.courseId === 'string' ? body.courseId : undefined;
    const result = useGraph
      ? await searchGlobalLibraryGraph(account.id, query, { topK, courseId })
      : await searchGlobalLibrary(account.id, query, { topK, courseId });
    const { hits, indexedChunks } = result;
    const estTokens = Math.ceil(query.length / 4);
    await addUsageAsync(account, estTokens, 0);
    res.json({
      results: hits,
      indexedChunks,
      global: true,
      graphRag: useGraph && 'graphExpanded' in result ? result.graphExpanded : false,
    });
  } catch {
    res.status(502).json({ error: 'Global RAG search failed' });
  }
});

/** POST /v1/rag/index — rebuild vector index from synced library payload. */
ragRouter.post('/rag/index', async (req, res) => {
  const account = req.account!;
  const body = req.body as Partial<StoredLibrary>;
  try {
    const stats = await indexLibraryVectors(account.id, {
      uploadedFiles: body.uploadedFiles ?? [],
      glossaryEntries: body.glossaryEntries ?? [],
      generatedCourses: body.generatedCourses ?? [],
      updatedAt: new Date().toISOString(),
    });
    res.json(stats);
  } catch {
    res.status(502).json({ error: 'Vector index rebuild failed' });
  }
});

/** POST /v1/rag/query — semantic retrieval over client-supplied chunks. */
ragRouter.post('/rag/query', async (req, res) => {
  const account = req.account!;
  const body = req.body as {
    query?: string;
    chunks?: { id?: string; text?: string }[];
    topK?: number;
  };
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const topK = typeof body.topK === 'number' ? Math.min(20, Math.max(1, body.topK)) : 5;
  const chunks = (body.chunks ?? [])
    .filter((c) => typeof c.text === 'string' && c.text.trim().length > 0)
    .slice(0, 64)
    .map((c, i) => ({
      id: typeof c.id === 'string' ? c.id : `chunk-${i}`,
      text: c.text!.trim(),
    }));

  if (!query || chunks.length === 0) {
    res.status(400).json({ error: 'query and chunks required' });
    return;
  }

  try {
    const results = await retrieveTopK(query, chunks, topK);
    // Rough embedding cost estimate for metering.
    const estTokens = Math.ceil((query.length + chunks.reduce((s, c) => s + c.text.length, 0)) / 4);
    await addUsageAsync(account, estTokens, 0);
    res.json({ results });
  } catch {
    res.status(502).json({ error: 'RAG retrieval failed' });
  }
});
