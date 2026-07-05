import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';

describe('rate limit integration', () => {
  let app: Application;
  let savedRpm: string | undefined;

  beforeAll(async () => {
    savedRpm = process.env.RATE_LIMIT_RPM;
    process.env.RATE_LIMIT_RPM = '3';
    process.env.NODE_ENV = 'test';
    delete process.env.REDIS_URL;
    vi.resetModules();
    const { createApp } = await import('../index');
    const { resetRateLimitBucketsForTests } = await import('../middleware/rateLimit');
    resetRateLimitBucketsForTests();
    app = createApp();
  }, 30_000);

  afterAll(() => {
    if (savedRpm === undefined) delete process.env.RATE_LIMIT_RPM;
    else process.env.RATE_LIMIT_RPM = savedRpm;
  });

  it('GET /health exposes rateLimitDistributed=false without Redis', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.production.rateLimit.backend).toBe('memory');
    expect(res.body.production.rateLimit.distributed).toBe(false);
    expect(res.body.features.rateLimitDistributed).toBe(false);
  });

  it('returns 429 after exceeding RPM cap on /v1 routes', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'ratelimit@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    await request(app)
      .get('/v1/usage')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .get('/v1/usage')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .get('/v1/usage')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const blocked = await request(app)
      .get('/v1/usage')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);
    expect(blocked.body.error).toBe('Rate limit exceeded');
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-backend']).toBe('memory');
  });
});
