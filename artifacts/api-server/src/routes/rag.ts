import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { enforceQuota } from '../middleware/usage';
import { addUsageAsync } from '../store/accounts';
import { retrieveTopK, searchGlobalLibrary, searchGlobalLibraryGraph } from '../lib/ragServer';
import { indexLibraryVectors } from '../lib/libraryVectorIndex';
import { synthesizeFromLibraryAsync } from '../lib/ragSynthesize';
import { getVectorChunkStore } from '../store/vectorChunkStore';
import { getVectorIndexProgress } from '../lib/vectorIndexProgress';
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

/** GET /v1/rag/status — indexed chunk count, pgvector readiness, and indexing progress. */
ragRouter.get('/rag/status', async (req, res) => {
  const account = req.account!;
  const store = getVectorChunkStore();
  const indexedChunks = await store.count(account.id);
  const indexing = getVectorIndexProgress(account.id);
  res.json({
    indexedChunks,
    global: true,
    ready: indexedChunks > 0,
    indexing: {
      status: indexing.status,
      progress: indexing.progress,
      targetChunks: indexing.targetChunks,
      embedded: indexing.embedded,
      reused: indexing.reused,
      error: indexing.error,
    },
    checkedAt: new Date().toISOString(),
  });
});

/** POST /v1/rag/synthesize — cross-library multi-doc synthesis (NotebookLM parity). */
ragRouter.post('/rag/synthesize', async (req, res) => {
  const account = req.account!;
  const body = req.body as {
    query?: string;
    topK?: number;
    courseIds?: string[];
    lang?: 'en' | 'el';
  };
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    res.status(400).json({ error: 'query required' });
    return;
  }
  try {
    const result = await synthesizeFromLibraryAsync(account.id, query, {
      topK: body.topK,
      courseIds: body.courseIds,
      lang: body.lang,
    });
    const estTokens = Math.ceil((query.length + result.synthesis.length) / 4);
    await addUsageAsync(account, estTokens, estTokens);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'RAG synthesis failed' });
  }
});
