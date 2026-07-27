import { describe, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { vi } from 'vitest';

describe('POST /v1/rum (B3)', () => {
  let app: Application;

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    const { createApp } = await import('../index');
    app = createApp();
  });

  it('accepts LCP beacon', async () => {
    await request(app)
      .post('/v1/rum')
      .send({ name: 'LCP', value: 1800, route: 'dashboard', rating: 'good' })
      .expect(204);
  });

  it('rejects missing value', async () => {
    await request(app)
      .post('/v1/rum')
      .send({ name: 'CLS', route: 'landing' })
      .expect(400);
  });
});
