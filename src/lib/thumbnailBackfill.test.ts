import { describe, expect, it } from 'vitest';
import type { UploadedFile } from '../types';
import { needsThumbnailBackfill } from './thumbnailBackfill';
import {
  shouldRenderThumbnailInWorker,
  WORKER_THUMBNAIL_BYTES_THRESHOLD,
  WORKER_THUMBNAIL_PAGE_THRESHOLD,
} from './pdfThumbnailWorkerClient';
import { isPdfUpload, MAX_SOURCE_BLOB_BYTES } from './sourceBlobCache';

describe('needsThumbnailBackfill', () => {
  const base: UploadedFile = {
    id: 'f1',
    name: 'notes.pdf',
    type: 'pdf',
    size: 1000,
    uploadedAt: '2026-01-01',
    status: 'analyzed',
  };

  it('targets analyzed PDFs without thumbnailRef', () => {
    expect(needsThumbnailBackfill(base)).toBe(true);
  });

  it('skips when thumbnail exists', () => {
    expect(needsThumbnailBackfill({
      ...base,
      thumbnailRef: {
        storageKey: 'f1:cover',
        pageIndex: 0,
        width: 100,
        height: 140,
        format: 'webp',
        pipelineVersion: '1.0.0',
        generatedAt: '2026-01-01',
      },
    })).toBe(false);
  });

  it('skips unsupported types', () => {
    expect(needsThumbnailBackfill({ ...base, thumbnailStatus: 'unsupported' })).toBe(false);
  });
});

describe('shouldRenderThumbnailInWorker', () => {
  it('uses worker for large page counts', () => {
    expect(shouldRenderThumbnailInWorker(WORKER_THUMBNAIL_PAGE_THRESHOLD + 1, 1000)).toBe(true);
  });

  it('uses worker for large file sizes', () => {
    expect(shouldRenderThumbnailInWorker(1, WORKER_THUMBNAIL_BYTES_THRESHOLD + 1)).toBe(true);
  });

  it('stays on main thread for small PDFs', () => {
    expect(shouldRenderThumbnailInWorker(10, 500_000)).toBe(false);
  });
});

describe('sourceBlobCache', () => {
  it('detects pdf uploads', () => {
    expect(isPdfUpload(new File(['x'], 'lecture.pdf', { type: 'application/pdf' }))).toBe(true);
  });

  it('enforces blob size cap', () => {
    expect(MAX_SOURCE_BLOB_BYTES).toBeGreaterThan(1_000_000);
  });
});
