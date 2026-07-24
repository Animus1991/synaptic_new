import { useEffect, useState } from 'react';
import type { SourceThumbnailRef, UserSettings } from '../types';
import { idbLoadThumbnail } from '../lib/indexedDbStorage';
import { thumbnailCdnUrl, hasServerThumbnailCdn } from '../lib/thumbnailCdn';

/** Resolve preview URL: server CDN when synced, else local IndexedDB blob. */
export function useSourceThumbnailUrl(
  fileId: string | undefined,
  thumbnailRef: SourceThumbnailRef | undefined,
  thumbnailStatus?: string,
  settings?: UserSettings,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  const cdnUrl =
    fileId && thumbnailRef && hasServerThumbnailCdn(thumbnailRef)
      ? thumbnailCdnUrl(settings, fileId, thumbnailRef)
      : null;

  useEffect(() => {
    if (cdnUrl) {
      setUrl(cdnUrl);
      return undefined;
    }

    if (!fileId || !thumbnailRef?.storageKey || thumbnailStatus === 'failed') {
      setUrl(null);
      return undefined;
    }

    let revoked = false;
    let objectUrl: string | null = null;

    void idbLoadThumbnail(thumbnailRef.storageKey).then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [cdnUrl, fileId, thumbnailRef?.storageKey, thumbnailRef?.cdnKey, thumbnailRef?.etag, thumbnailStatus]);

  return url;
}
