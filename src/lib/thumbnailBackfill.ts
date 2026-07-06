import type { UploadedFile } from '../types';
import { idbLoadSourceBlob } from './indexedDbStorage';
import { renderPdfCoverFromBytes } from './pdfThumbnailWorkerClient';
import { persistCoverThumbnailOnFile } from './sourceThumbnailPersist';

const SESSION_BACKFILL_LIMIT = 3;
let sessionBackfillCount = 0;

export function needsThumbnailBackfill(file: UploadedFile): boolean {
  return file.type === 'pdf'
    && file.status === 'analyzed'
    && !file.thumbnailRef
    && file.thumbnailStatus !== 'unsupported';
}

export async function backfillFileThumbnailFromCache(
  file: UploadedFile,
): Promise<UploadedFile | null> {
  const blob = await idbLoadSourceBlob(file.id);
  if (!blob) return null;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const cover = await renderPdfCoverFromBytes(bytes, {
      pageCount: file.pageCount ?? 1,
      fileSize: file.size,
    });
    return persistCoverThumbnailOnFile(file, cover);
  } catch {
    return { ...file, thumbnailStatus: 'failed' };
  }
}

function deferOnIdle(fn: () => void): void {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(fn, { timeout: 4000 });
  } else {
    window.setTimeout(fn, 250);
  }
}

/**
 * Idle backfill for legacy PDFs that have a cached blob but no cover thumbnail.
 * Re-upload / reprocess also regenerates thumbnails on fresh ingest.
 */
export function scheduleThumbnailBackfill(
  files: UploadedFile[],
  onPatched: (patched: UploadedFile[]) => void,
): void {
  if (typeof window === 'undefined') return;
  const candidates = files.filter(needsThumbnailBackfill);
  if (candidates.length === 0) return;

  deferOnIdle(() => {
    void (async () => {
      const patched: UploadedFile[] = [];
      for (const file of candidates) {
        if (sessionBackfillCount >= SESSION_BACKFILL_LIMIT) break;
        sessionBackfillCount += 1;
        const next = await backfillFileThumbnailFromCache(file);
        if (next?.thumbnailRef) patched.push(next);
      }
      if (patched.length > 0) onPatched(patched);
    })();
  });
}

/** Reset session cap for unit tests. */
export function resetThumbnailBackfillSessionForTests(): void {
  sessionBackfillCount = 0;
}
