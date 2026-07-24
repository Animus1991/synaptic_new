import { Router } from 'express';
import { authenticate, authenticateBearerOrQuery } from '../middleware/auth';
import {
  computeThumbnailEtag,
  deleteThumbnail,
  getThumbnail,
  putThumbnail,
} from '../store/thumbnailStore';

export const thumbnailsRouter = Router();

const MAX_BYTES = 256 * 1024;

function contentTypeForFormat(format: string | undefined): string {
  return format === 'png' ? 'image/png' : 'image/webp';
}

/** PUT /v1/library/thumbnails/:fileId — upload cover thumbnail for cross-device CDN. */
thumbnailsRouter.put('/library/thumbnails/:fileId', authenticate, async (req, res) => {
  const accountId = req.account!.id;
  const fileId = String(req.params.fileId ?? '').trim();
  if (!fileId) {
    res.status(400).json({ error: 'fileId required' });
    return;
  }

  const body = req.body as {
    imageBase64?: string;
    format?: 'webp' | 'png';
    width?: number;
    height?: number;
    pageIndex?: number;
  };
  const raw = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  if (!raw) {
    res.status(400).json({ error: 'imageBase64 required' });
    return;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw, 'base64');
  } catch {
    res.status(400).json({ error: 'invalid base64' });
    return;
  }
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    res.status(400).json({ error: 'thumbnail too large' });
    return;
  }

  const width = typeof body.width === 'number' ? Math.max(1, Math.round(body.width)) : 1;
  const height = typeof body.height === 'number' ? Math.max(1, Math.round(body.height)) : 1;
  const pageIndex = typeof body.pageIndex === 'number' ? Math.max(0, Math.round(body.pageIndex)) : 0;
  const etag = computeThumbnailEtag(bytes);

  try {
    await putThumbnail({
      accountId,
      fileId,
      contentType: contentTypeForFormat(body.format),
      width,
      height,
      pageIndex,
      etag,
      bytes,
    });
    res.json({
      fileId,
      cdnKey: fileId,
      etag,
      width,
      height,
      pageIndex,
      format: body.format === 'png' ? 'png' : 'webp',
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'thumbnail save failed' });
  }
});

/** GET /v1/library/thumbnails/:fileId — CDN-friendly immutable thumbnail bytes. */
thumbnailsRouter.get('/library/thumbnails/:fileId', authenticateBearerOrQuery, async (req, res) => {
  const accountId = req.account!.id;
  const fileId = String(req.params.fileId ?? '').trim();
  if (!fileId) {
    res.status(400).json({ error: 'fileId required' });
    return;
  }

  try {
    const record = await getThumbnail(accountId, fileId);
    if (!record) {
      res.status(404).json({ error: 'thumbnail not found' });
      return;
    }
    if (req.headers['if-none-match'] === record.etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', record.contentType);
    res.setHeader('ETag', record.etag);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.send(record.bytes);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'thumbnail fetch failed' });
  }
});

/** DELETE /v1/library/thumbnails/:fileId */
thumbnailsRouter.delete('/library/thumbnails/:fileId', authenticate, async (req, res) => {
  const accountId = req.account!.id;
  const fileId = String(req.params.fileId ?? '').trim();
  if (!fileId) {
    res.status(400).json({ error: 'fileId required' });
    return;
  }
  try {
    await deleteThumbnail(accountId, fileId);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'thumbnail delete failed' });
  }
});
