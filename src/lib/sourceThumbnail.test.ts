import { describe, expect, it } from 'vitest';
import { needsSourceThumbnailReprocessHint, resolveSourceThumbnail } from './sourceThumbnail';

describe('needsSourceThumbnailReprocessHint', () => {
  it('shows hint for legacy PDF without thumbnailRef', () => {
    expect(needsSourceThumbnailReprocessHint({
      type: 'pdf',
      thumbnailStatus: 'failed',
    })).toBe(true);
  });

  it('hides hint when preview exists', () => {
    expect(needsSourceThumbnailReprocessHint({
      type: 'pdf',
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

  it('hides hint while backfill is pending', () => {
    expect(needsSourceThumbnailReprocessHint({
      type: 'pdf',
      thumbnailStatus: 'pending',
    })).toBe(false);
  });

  it('hides hint for unsupported imports', () => {
    expect(needsSourceThumbnailReprocessHint({
      type: 'pdf',
      thumbnailStatus: 'unsupported',
    })).toBe(false);
  });

  it('skips non-PDF sources', () => {
    expect(needsSourceThumbnailReprocessHint({ type: 'txt' })).toBe(false);
  });
});

describe('resolveSourceThumbnail', () => {
  it('maps PDF files to pdf kind', () => {
    expect(resolveSourceThumbnail({ name: 'notes.pdf', type: 'pdf' }).kind).toBe('pdf');
  });
});
