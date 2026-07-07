import { enqueueLibraryVectorIndex } from '../jobs/vectorIndexQueue';
import { getVectorChunkStore } from '../store/vectorChunkStore';
import type { StoredLibrary } from '../store/libraryStore';
import { buildDesiredChunks } from './libraryVectorIndex';
import { getVectorIndexProgress } from './vectorIndexProgress';

export type EnsureVectorIndexResult = {
  enqueued: boolean;
  desiredChunks: number;
  indexedChunks: number;
};

/** Enqueue a vector rebuild when the server library has text but the index is missing or partial. */
export async function ensureLibraryVectorIndexIfNeeded(
  accountId: string,
  library: StoredLibrary,
): Promise<EnsureVectorIndexResult> {
  const store = getVectorChunkStore();
  const progress = getVectorIndexProgress(accountId);
  if (progress.status === 'queued' || progress.status === 'processing') {
    return {
      enqueued: false,
      desiredChunks: progress.targetChunks,
      indexedChunks: await store.count(accountId),
    };
  }

  const { chunks } = buildDesiredChunks(library);
  if (chunks.length === 0) {
    return { enqueued: false, desiredChunks: 0, indexedChunks: await store.count(accountId) };
  }

  const indexedChunks = await store.count(accountId);
  if (indexedChunks >= chunks.length) {
    return { enqueued: false, desiredChunks: chunks.length, indexedChunks };
  }

  enqueueLibraryVectorIndex(accountId, library);
  return { enqueued: true, desiredChunks: chunks.length, indexedChunks };
}
