import type { StoredLibrary } from '../store/libraryStore';
import { chunkText } from './chunkText';
import { embedTexts } from './embeddings';
import { getVectorChunkStore, type IndexedChunk } from '../store/vectorChunkStore';

type UploadedFileRow = {
  id?: string;
  name?: string;
  courseId?: string;
  extractedText?: string;
  status?: string;
  textOffloaded?: boolean;
};

const indexing = new Map<string, Promise<number>>();

/** Rebuild the per-account vector index from synced library files. */
export async function indexLibraryVectors(accountId: string, library: StoredLibrary): Promise<number> {
  const prev = indexing.get(accountId);
  if (prev) await prev.catch(() => undefined);

  const job = (async () => {
    const files = (library.uploadedFiles ?? []) as UploadedFileRow[];
    const indexed: IndexedChunk[] = [];

    for (const file of files) {
      const text = typeof file.extractedText === 'string' ? file.extractedText.trim() : '';
      if (!text || file.status === 'failed') continue;
      const fileId = String(file.id ?? file.name ?? 'file');
      const fileName = String(file.name ?? fileId);
      for (const chunk of chunkText(text, fileId, fileName)) {
        indexed.push({ ...chunk, courseId: file.courseId });
      }
    }

    if (indexed.length === 0) {
      await getVectorChunkStore().replaceAccountChunks(accountId, []);
      return 0;
    }

    const vectors = await embedTexts(indexed.map((c) => c.text));
    if (vectors) {
      indexed.forEach((chunk, i) => {
        chunk.embedding = vectors[i];
      });
    }

    await getVectorChunkStore().replaceAccountChunks(accountId, indexed);
    return indexed.length;
  })();

  indexing.set(accountId, job);
  try {
    return await job;
  } finally {
    if (indexing.get(accountId) === job) indexing.delete(accountId);
  }
}

export function scheduleLibraryVectorIndex(accountId: string, library: StoredLibrary): void {
  void indexLibraryVectors(accountId, library).catch((err) => {
    console.warn('[vector-index] failed for account', accountId, err);
  });
}
