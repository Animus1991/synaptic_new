import { useEffect, useState } from 'react';
import type { SourceThumbnailRef } from '../types';
import { idbLoadThumbnail } from '../lib/indexedDbStorage';

/** Resolve a blob URL for a source cover thumbnail stored in IndexedDB. */
export function useSourceThumbnailUrl(
  fileId: string | undefined,
  thumbnailRef: SourceThumbnailRef | undefined,
  thumbnailStatus?: string,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
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
  }, [fileId, thumbnailRef?.storageKey, thumbnailStatus]);

  return url;
}
