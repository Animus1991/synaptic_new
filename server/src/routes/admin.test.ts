import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';

describe('GET /v1/admin/cost-abuse (D8)', () => {
  let app: Application;
  const ADMIN_SECRET = 'test-admin-secret';

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_SECRET = ADMIN_SECRET;
    vi.resetModules();
    const { createApp } = await import('../index');
    app = createApp();
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it('denies access without the admin secret header', async () => {
    await request(app).get('/v1/admin/cost-abuse').expect(403);
  });

  it('denies access with a wrong admin secret', async () => {
    await request(app)
      .get('/v1/admin/cost-abuse')
      .set('x-admin-secret', 'nope')
      .expect(403);
  });

  it('returns a cost/abuse summary with the correct admin secret', async () => {
    const res = await request(app)
      .get('/v1/admin/cost-abuse')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);

    expect(typeof res.body.month).toBe('string');
    expect(res.body.totals).toHaveProperty('tokens');
    expect(res.body.byPlan).toHaveProperty('free');
    expect(res.body.byPlan).toHaveProperty('pro');
    expect(res.body.byPlan).toHaveProperty('team');
    expect(Array.isArray(res.body.topConsumers)).toBe(true);
    expect(Array.isArray(res.body.abuse.signals)).toBe(true);
  });

  it('honors the topN query cap', async () => {
    const res = await request(app)
      .get('/v1/admin/cost-abuse?topN=3')
      .set('x-admin-secret', ADMIN_SECRET)
      .expect(200);
    expect(res.body.topConsumers.length).toBeLessThanOrEqual(3);
  });
});
