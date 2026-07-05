import { createHash } from 'node:crypto';
import type { StoredLibrary } from '../store/libraryStore';
import { chunkText } from './chunkText';
import { embedTexts } from './embeddings';
import { getVectorChunkStore, type IndexedChunk } from '../store/vectorChunkStore';
import {
  markVectorIndexBatchProgress,
  markVectorIndexComplete,
  markVectorIndexFailed,
  markVectorIndexProcessing,
} from './vectorIndexProgress';

export type UploadedFileRow = {
  id?: string;
  name?: string;
  courseId?: string;
  extractedText?: string;
  status?: string;
  textOffloaded?: boolean;
  ingestMethod?: string;
  type?: string;
};

export type IndexStats = {
  indexedChunks: number;
  embedded: number;
  reused: number;
  removed: number;
};

const indexing = new Map<string, Promise<IndexStats>>();
const EMBED_BATCH = 16;

async function embedChunksInBatches(
  accountId: string,
  toEmbed: IndexedChunk[],
  reused: number,
  targetChunks: number,
): Promise<IndexedChunk[]> {
  const merged: IndexedChunk[] = [];
  let embedded = 0;
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch.map((c) => c.text));
    if (vectors) {
      batch.forEach((chunk, j) => {
        merged.push({ ...chunk, embedding: vectors[j] });
      });
    } else {
      merged.push(...batch);
    }
    embedded += batch.length;
    markVectorIndexBatchProgress(accountId, { embedded, reused, targetChunks });
  }
  return merged;
}

function fileTextHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function buildDesiredChunks(library: StoredLibrary): {
  chunks: IndexedChunk[];
  activeFileIds: string[];
} {
  const files = (library.uploadedFiles ?? []) as UploadedFileRow[];
  const chunks: IndexedChunk[] = [];
  const activeFileIds: string[] = [];

  for (const file of files) {
    const text = typeof file.extractedText === 'string' ? file.extractedText.trim() : '';
    if (!text || file.status === 'failed') continue;
    const fileId = String(file.id ?? file.name ?? 'file');
    const fileName = String(file.name ?? fileId);
    activeFileIds.push(fileId);
    for (const chunk of chunkText(text, fileId, fileName)) {
      chunks.push({ ...chunk, courseId: file.courseId });
    }
  }

  return { chunks, activeFileIds };
}

/** Incremental vector index: embed only changed chunks (content_hash diff). */
export async function indexLibraryVectors(accountId: string, library: StoredLibrary): Promise<IndexStats> {
  const prev = indexing.get(accountId);
  if (prev) await prev.catch(() => undefined);

  const job = (async (): Promise<IndexStats> => {
    const store = getVectorChunkStore();
    const { chunks: desired, activeFileIds } = buildDesiredChunks(library);
    markVectorIndexProcessing(accountId, desired.length);

    if (desired.length === 0) {
      const removed = await store.syncAccountChunks(accountId, [], { activeFileIds: [] });
      const stats = { indexedChunks: 0, embedded: 0, reused: 0, removed: removed.removed };
      markVectorIndexComplete(accountId, stats);
      return stats;
    }

    const existing = await store.getChunkMeta(accountId);
    const toEmbed: IndexedChunk[] = [];
    const merged: IndexedChunk[] = [];
    let reused = 0;

    for (const chunk of desired) {
      const prevMeta = existing.get(chunk.id);
      if (prevMeta && prevMeta.contentHash === chunk.contentHash && prevMeta.embedding?.length) {
        merged.push({ ...chunk, embedding: prevMeta.embedding });
        reused += 1;
      } else {
        toEmbed.push(chunk);
      }
    }

    markVectorIndexBatchProgress(accountId, { embedded: 0, reused, targetChunks: desired.length });

    if (toEmbed.length > 0) {
      merged.push(...(await embedChunksInBatches(accountId, toEmbed, reused, desired.length)));
    }

    const { removed } = await store.syncAccountChunks(accountId, merged, { activeFileIds });
    const stats = {
      indexedChunks: merged.length,
      embedded: toEmbed.length,
      reused,
      removed,
    };
    markVectorIndexComplete(accountId, stats);
    return stats;
  })();

  indexing.set(accountId, job);
  try {
    return await job;
  } catch (e) {
    markVectorIndexFailed(accountId, e instanceof Error ? e.message : 'Vector index failed');
    throw e;
  } finally {
    if (indexing.get(accountId) === job) indexing.delete(accountId);
  }
}

export function scheduleLibraryVectorIndex(accountId: string, library: StoredLibrary): void {
  void indexLibraryVectors(accountId, library).catch((err) => {
    console.warn('[vector-index] failed for account', accountId, err);
  });
}

/** Re-index a single audio/transcript file without touching other indexed files. */
export async function indexTranscriptText(
  accountId: string,
  file: { id: string; name: string; courseId?: string; extractedText: string },
): Promise<IndexStats> {
  const store = getVectorChunkStore();
  const text = file.extractedText.trim();
  if (!text) return { indexedChunks: 0, embedded: 0, reused: 0, removed: 0 };

  const desired = chunkText(text, file.id, file.name).map((c) => ({ ...c, courseId: file.courseId }));
  const existing = await store.getChunkMeta(accountId);
  const toEmbed: IndexedChunk[] = [];
  const merged: IndexedChunk[] = [];
  let reused = 0;

  for (const chunk of desired) {
    const prevMeta = existing.get(chunk.id);
    if (prevMeta && prevMeta.contentHash === chunk.contentHash && prevMeta.embedding?.length) {
      merged.push({ ...chunk, embedding: prevMeta.embedding });
      reused += 1;
    } else {
      toEmbed.push(chunk);
    }
  }

  if (toEmbed.length > 0) {
    const vectors = await embedTexts(toEmbed.map((c) => c.text));
    if (vectors) {
      toEmbed.forEach((chunk, i) => {
        merged.push({ ...chunk, embedding: vectors[i] });
      });
    } else {
      merged.push(...toEmbed);
    }
  }

  const { removed } = await store.syncFileChunks(accountId, file.id, merged);
  return { indexedChunks: merged.length, embedded: toEmbed.length, reused, removed };
}

export { fileTextHash };
