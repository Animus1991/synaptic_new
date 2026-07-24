import type { SourceThumbnailRef, UserSettings } from '../types';
import { configuredProxyBase } from './authClient';

/** Build an authenticated CDN URL usable in `<img src>` (token query param). */
export function thumbnailCdnUrl(
  settings: UserSettings | undefined,
  fileId: string,
  ref?: Pick<SourceThumbnailRef, 'cdnKey' | 'etag'>,
): string | null {
  const token = settings?.authToken?.trim();
  const base = configuredProxyBase(settings);
  const cdnKey = ref?.cdnKey ?? fileId;
  if (!token || !base || !cdnKey) return null;
  const params = new URLSearchParams({ token });
  const etag = ref?.etag?.replace(/^"|"$/g, '');
  if (etag) params.set('v', etag);
  return `${base}/v1/library/thumbnails/${encodeURIComponent(cdnKey)}?${params.toString()}`;
}

export function hasServerThumbnailCdn(ref?: SourceThumbnailRef): boolean {
  return !!ref?.cdnKey?.trim();
}
