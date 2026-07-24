import { embedTexts, cosine } from './embeddings';
import { getVectorChunkStore, type VectorSearchHit } from '../store/vectorChunkStore';
import { getLibraryAsync } from '../store/libraryStore';
import {
  mergeConceptGraphFromLibrary,
  collectSeedConceptsFromHits,
  buildGraphExpandedQuery,
  graphRerankHits,
  type GraphRagHit,
} from './graphRag';

export type { GraphRagHit };

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

async function vectorSearchHits(
  accountId: string,
  query: string,
  opts: { topK: number; courseId?: string },
): Promise<VectorSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const store = getVectorChunkStore();
  const vectors = await embedTexts([trimmed]);
  if (!vectors?.[0]) return [];
  return store.search(accountId, vectors[0], {
    topK: opts.topK,
    courseId: opts.courseId,
    queryText: trimmed,
  });
}

/** Graph RAG v1: vector top-K → 1-hop concept expansion → merge → graph rerank. */
export async function searchGlobalLibraryGraph(
  accountId: string,
  query: string,
  opts: { topK?: number; courseId?: string } = {},
): Promise<{ hits: GraphRagHit[]; indexedChunks: number; graphExpanded: boolean }> {
  const topK = Math.min(20, Math.max(1, opts.topK ?? 5));
  const trimmed = query.trim();
  if (!trimmed) return { hits: [], indexedChunks: 0, graphExpanded: false };

  const store = getVectorChunkStore();
  const indexedChunks = await store.count(accountId);
  if (indexedChunks === 0) return { hits: [], indexedChunks: 0, graphExpanded: false };

  const library = await getLibraryAsync(accountId);
  const graph = mergeConceptGraphFromLibrary(library, opts.courseId);
  const seedTopK = Math.min(20, topK * 3);
  const initialHits = await vectorSearchHits(accountId, trimmed, {
    topK: seedTopK,
    courseId: opts.courseId,
  });

  if (graph.nodes.length === 0 || initialHits.length === 0) {
    return {
      hits: initialHits.slice(0, topK).map((h) => ({ ...h })),
      indexedChunks,
      graphExpanded: false,
    };
  }

  const { expandedLabels } = collectSeedConceptsFromHits(initialHits, graph);
  const byId = new Map<string, VectorSearchHit>();
  for (const hit of initialHits) byId.set(hit.id, hit);

  if (expandedLabels.length > 0) {
    const expandedQuery = buildGraphExpandedQuery(trimmed, expandedLabels);
    const extraHits = await vectorSearchHits(accountId, expandedQuery, {
      topK: Math.min(20, topK * 2),
      courseId: opts.courseId,
    });
    for (const hit of extraHits) {
      const prev = byId.get(hit.id);
      if (!prev || hit.score > prev.score) byId.set(hit.id, hit);
    }
  }

  const merged = [...byId.values()];
  const hits = graphRerankHits(trimmed, merged, graph, expandedLabels, topK);
  return { hits, indexedChunks, graphExpanded: expandedLabels.length > 0 };
}
