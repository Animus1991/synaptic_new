import { embedTexts, cosine } from './embeddings';
import { getVectorChunkStore, type VectorSearchHit } from '../store/vectorChunkStore';

export type RagChunk = { id: string; text: string };

export async function retrieveTopK(
  query: string,
  chunks: RagChunk[],
  k: number,
): Promise<Array<{ id: string; text: string; score: number }>> {
  if (chunks.length === 0 || !query.trim()) return [];

  const vectors = await embedTexts([query, ...chunks.map((c) => c.text)]);
  if (!vectors || vectors.length !== chunks.length + 1) {
    return chunks.slice(0, k).map((c, i) => ({ ...c, score: 1 - i * 0.01 }));
  }

  const qVec = vectors[0]!;
  const scored = chunks.map((c, i) => ({
    id: c.id,
    text: c.text,
    score: cosine(qVec, vectors[i + 1]!),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** Global semantic search over persisted library chunks for an account. */
export async function searchGlobalLibrary(
  accountId: string,
  query: string,
  opts: { topK?: number; courseId?: string } = {},
): Promise<{ hits: VectorSearchHit[]; indexedChunks: number }> {
  const topK = Math.min(20, Math.max(1, opts.topK ?? 5));
  const trimmed = query.trim();
  if (!trimmed) return { hits: [], indexedChunks: 0 };

  const store = getVectorChunkStore();
  const indexedChunks = await store.count(accountId);
  if (indexedChunks === 0) return { hits: [], indexedChunks: 0 };

  const vectors = await embedTexts([trimmed]);
  if (!vectors?.[0]) return { hits: [], indexedChunks };

  const hits = await store.search(accountId, vectors[0], {
    topK,
    courseId: opts.courseId,
    queryText: trimmed,
  });
  return { hits, indexedChunks };
}
