/**
 * A4 — session list / revoke (server integration, in-memory token store).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { vi } from 'vitest';

describe('auth sessions (A4)', () => {
  let app: Application;
  const email = `sess-${Date.now()}@example.com`;
  const password = 'password12345';
  let accessA = '';
  let sessionA = '';
  let accessB = '';
  let sessionB = '';

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    const { createApp } = await import('../index');
    app = createApp();

    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);
    accessA = reg.body.token;
    sessionA = reg.body.sessionId;
    expect(sessionA).toBeTruthy();
    expect(accessA).toBeTruthy();

    const login2 = await request(app).post('/auth/login').send({ email, password });
    expect(login2.status).toBe(200);
    accessB = login2.body.token;
    sessionB = login2.body.sessionId;
    expect(sessionB).toBeTruthy();
    expect(sessionB).not.toBe(sessionA);
  });

  it('lists sessions and marks current', async () => {
    const res = await request(app)
      .get(`/auth/sessions?currentSessionId=${encodeURIComponent(sessionB)}`)
      .set('Authorization', `Bearer ${accessB}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
    const current = res.body.sessions.find((s: { id: string }) => s.id === sessionB);
    expect(current?.current).toBe(true);
  });

  it('revokes other sessions', async () => {
    const revoke = await request(app)
      .post('/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${accessB}`)
      .send({ keepSessionId: sessionB });
    expect(revoke.status).toBe(200);
    expect(revoke.body.revoked).toBeGreaterThanOrEqual(1);

    const list = await request(app)
      .get(`/auth/sessions?currentSessionId=${encodeURIComponent(sessionB)}`)
      .set('Authorization', `Bearer ${accessB}`);
    expect(list.status).toBe(200);
    expect(list.body.sessions.every((s: { id: string }) => s.id === sessionB)).toBe(true);
  });
});
