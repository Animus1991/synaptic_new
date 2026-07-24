import type { SourceThumbnailRef, UserSettings } from '../types';
import { configuredProxyBase } from './authClient';

export type ThumbnailUploadMeta = {
  width: number;
  height: number;
  pageIndex: number;
  format: 'webp' | 'png';
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function proxyBase(settings: UserSettings): string {
  return (configuredProxyBase(settings) ?? 'http://localhost:8787').replace(/\/$/, '');
}

export async function pushThumbnailToServer(
  token: string,
  settings: UserSettings,
  fileId: string,
  blob: Blob,
  meta: ThumbnailUploadMeta,
): Promise<Pick<SourceThumbnailRef, 'cdnKey' | 'etag'> | null> {
  if (!token.trim() || !configuredProxyBase(settings)) return null;
  const imageBase64 = await blobToBase64(blob);
  const res = await fetch(`${proxyBase(settings)}/v1/library/thumbnails/${encodeURIComponent(fileId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify({
      imageBase64,
      format: meta.format,
      width: meta.width,
      height: meta.height,
      pageIndex: meta.pageIndex,
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { cdnKey?: string; etag?: string };
  if (!body.cdnKey) return null;
  return { cdnKey: body.cdnKey, etag: body.etag };
}

export async function deleteRemoteThumbnail(
  token: string,
  settings: UserSettings,
  fileId: string,
): Promise<void> {
  if (!token.trim() || !configuredProxyBase(settings)) return;
  await fetch(`${proxyBase(settings)}/v1/library/thumbnails/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token.trim()}` },
  }).catch(() => undefined);
}

const pending = new Map<string, ReturnType<typeof pushThumbnailToServer>>();

/** Best-effort upload after local IDB persist; dedupes concurrent pushes per file. */
export function scheduleThumbnailRemoteSync(
  settings: UserSettings | undefined,
  fileId: string,
  blob: Blob,
  meta: ThumbnailUploadMeta,
  onSynced?: (patch: Pick<SourceThumbnailRef, 'cdnKey' | 'etag'>) => void,
): void {
  const token = settings?.authToken?.trim();
  if (!token || !settings || !configuredProxyBase(settings)) return;

  const prev = pending.get(fileId);
  const job = (async () => {
    if (prev) await prev.catch(() => undefined);
    return pushThumbnailToServer(token, settings, fileId, blob, meta);
  })();
  pending.set(fileId, job);
  void job
    .then((patch) => {
      if (patch) onSynced?.(patch);
    })
    .catch(() => undefined)
    .finally(() => {
      if (pending.get(fileId) === job) pending.delete(fileId);
    });
}
