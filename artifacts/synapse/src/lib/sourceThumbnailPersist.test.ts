import { describe, expect, it } from 'vitest';
import { buildSourceThumbnailRef, thumbnailStorageKey } from './sourceThumbnailPersist';

describe('sourceThumbnailPersist', () => {
  it('builds stable storage keys', () => {
    expect(thumbnailStorageKey('file-abc')).toBe('file-abc:cover');
  });

  it('builds thumbnail ref metadata from cover render', () => {
    const ref = buildSourceThumbnailRef('file-1', {
      blob: new Blob(),
      width: 100,
      height: 140,
      pageIndex: 0,
      format: 'webp',
    });
    expect(ref.storageKey).toBe('file-1:cover');
    expect(ref.pipelineVersion).toBe('1.0.0');
    expect(ref.format).toBe('webp');
  });
});
