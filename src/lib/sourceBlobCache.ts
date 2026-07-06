import { idbSaveSourceBlob } from './indexedDbStorage';

/** Max PDF bytes cached locally for thumbnail backfill (25 MB). */
export const MAX_SOURCE_BLOB_BYTES = 25_000_000;

export function isPdfUpload(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/** Cache original PDF bytes during ingest for idle thumbnail backfill. */
export async function cacheSourceBlobOnIngest(file: File, fileId: string): Promise<void> {
  if (!isPdfUpload(file) || file.size > MAX_SOURCE_BLOB_BYTES) return;
  try {
    await idbSaveSourceBlob(fileId, file);
  } catch {
    // Non-fatal — backfill will require re-upload
  }
}
