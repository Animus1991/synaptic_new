import { describe, expect, it } from 'vitest';
import { hasServerThumbnailCdn, thumbnailCdnUrl } from './thumbnailCdn';
import type { UserSettings } from '../types';

const settings = {
  llmProxyUrl: 'http://localhost:8787/v1',
  authToken: 'tok',
} as UserSettings;

describe('thumbnailCdn', () => {
  it('builds authenticated CDN URL with etag cache-bust', () => {
    const url = thumbnailCdnUrl(settings, 'file-1', { cdnKey: 'file-1', etag: '"abc123"' });
    expect(url).toContain('/v1/library/thumbnails/file-1');
    expect(url).toContain('token=tok');
    expect(url).toContain('v=abc123');
  });

  it('detects server-synced thumbnail refs', () => {
    expect(hasServerThumbnailCdn({ cdnKey: 'file-1' } as never)).toBe(true);
    expect(hasServerThumbnailCdn(undefined)).toBe(false);
  });
});
