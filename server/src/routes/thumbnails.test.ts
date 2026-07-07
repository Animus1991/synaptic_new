import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../index';
import { resetThumbnailStoreForTests } from '../store/thumbnailStore';

const TINY_WEBP_BASE64 = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=';

describe('thumbnail CDN routes', () => {
  const app = createApp();

  beforeEach(() => {
    resetThumbnailStoreForTests();
  });

  it('PUT then GET serves immutable thumbnail bytes with query token auth', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'thumb@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    const put = await request(app)
      .put('/v1/library/thumbnails/file-1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        imageBase64: TINY_WEBP_BASE64,
        format: 'webp',
        width: 120,
        height: 160,
        pageIndex: 0,
      })
      .expect(200);

    expect(put.body.cdnKey).toBe('file-1');
    expect(typeof put.body.etag).toBe('string');

    const get = await request(app)
      .get(`/v1/library/thumbnails/file-1?token=${encodeURIComponent(token)}`)
      .expect(200);

    expect(get.headers['content-type']).toMatch(/image\/webp/);
    expect(get.headers['cache-control']).toMatch(/immutable/);
    expect(get.headers.etag).toBeTruthy();
    expect(get.body.length).toBeGreaterThan(0);
  });
});
