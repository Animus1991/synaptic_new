import { describe, expect, it } from 'vitest';
import { computeThumbnailScale } from './pdfThumbnail';
import { needsThumbnailBackfill } from './thumbnailBackfill';
import type { UploadedFile } from '../types';

describe('image thumbnail helpers (MD-05)', () => {
  it('scales longest edge to max', () => {
    expect(computeThumbnailScale(800, 600, 144)).toBeCloseTo(144 / 800);
  });

  it('flags analyzed images without thumbnailRef for backfill', () => {
    const file = {
      id: 'img-1',
      name: 'diagram.png',
      type: 'image',
      size: 1200,
      uploadedAt: '2026-01-01',
      status: 'analyzed',
      progress: 100,
    } as UploadedFile;
    expect(needsThumbnailBackfill(file)).toBe(true);
    expect(needsThumbnailBackfill({ ...file, thumbnailRef: {
      storageKey: 'img-1:cover',
      pageIndex: 0,
      width: 100,
      height: 80,
      format: 'webp',
      pipelineVersion: '1.0.0',
      generatedAt: '2026-01-01',
    } })).toBe(false);
  });
});
