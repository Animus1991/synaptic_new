import { configuredProxyBase, ragIndexLibrary } from './authClient';
import { fetchRagStatus } from './orgClient';
import type { UserSettings } from '../types';

type IndexableFile = { extractedText?: string; status?: string };
type IndexableLibrary = {
  uploadedFiles: IndexableFile[];
  glossaryEntries: unknown[];
  generatedCourses: unknown[];
};

export function countIndexableFiles(library: IndexableLibrary): number {
  return library.uploadedFiles.filter((f) => {
    const text = f.extractedText?.trim();
    return !!text && f.status !== 'error';
  }).length;
}

export type EnsureServerRagResult = {
  triggered: boolean;
  indexedChunks: number;
};

/**
 * After login or library pull, rebuild the server RAG index when the account has
 * indexable text but no (or incomplete) server-side chunks yet.
 */
export async function ensureServerRagIndex(
  token: string,
  settings: UserSettings,
  library: IndexableLibrary,
): Promise<EnsureServerRagResult> {
  if (!configuredProxyBase(settings) || !token.trim()) {
    return { triggered: false, indexedChunks: 0 };
  }

  const status = await fetchRagStatus(token, settings);
  if (status.indexing.status === 'queued' || status.indexing.status === 'processing') {
    return { triggered: false, indexedChunks: status.indexedChunks };
  }
  if (status.ready && status.indexedChunks > 0) {
    return { triggered: false, indexedChunks: status.indexedChunks };
  }

  if (countIndexableFiles(library) === 0) {
    return { triggered: false, indexedChunks: status.indexedChunks };
  }

  const stats = await ragIndexLibrary(token, settings, library);
  return { triggered: true, indexedChunks: stats.indexedChunks };
}
