import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { vi } from 'vitest';

describe('W1 email verification + sync etags', () => {
  let app: Application;
  let savedVerify: string | undefined;

  beforeEach(async () => {
    savedVerify = process.env.EMAIL_VERIFICATION_REQUIRED;
    process.env.EMAIL_VERIFICATION_REQUIRED = 'true';
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    vi.resetModules();
    const { createApp } = await import('../index');
    app = createApp();
  });

  afterEach(() => {
    if (savedVerify === undefined) delete process.env.EMAIL_VERIFICATION_REQUIRED;
    else process.env.EMAIL_VERIFICATION_REQUIRED = savedVerify;
  });

  it('issues verify token and unlocks library PUT after verify', async () => {
    const email = `w1-${Date.now()}@example.com`;
    const reg = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);
    expect(reg.body.account.emailVerified).toBe(false);
    const token = reg.body.token as string;

    await request(app)
      .put('/v1/library')
      .set('Authorization', `Bearer ${token}`)
      .send({ uploadedFiles: [], glossaryEntries: [], generatedCourses: [] })
      .expect(403);

    const reqVerify = await request(app)
      .post('/auth/verify-email/request')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(reqVerify.body.verifyToken).toBeTruthy();

    await request(app)
      .post('/auth/verify-email')
      .send({ verifyToken: reqVerify.body.verifyToken })
      .expect(200);

    const put = await request(app)
      .put('/v1/library')
      .set('Authorization', `Bearer ${token}`)
      .send({ uploadedFiles: [], glossaryEntries: [], generatedCourses: [] })
      .expect(200);
    expect(put.headers.etag).toMatch(/^W\//);

    const get = await request(app)
      .get('/v1/library')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const etag = get.headers.etag as string;

    await request(app)
      .put('/v1/library')
      .set('Authorization', `Bearer ${token}`)
      .set('If-Match', 'W/"stale"')
      .send({ uploadedFiles: [], glossaryEntries: [], generatedCourses: [] })
      .expect(412);

    await request(app)
      .put('/v1/library')
      .set('Authorization', `Bearer ${token}`)
      .set('If-Match', etag)
      .send({ uploadedFiles: [{ id: 'f1' }], glossaryEntries: [], generatedCourses: [] })
      .expect(200);
  });
});
