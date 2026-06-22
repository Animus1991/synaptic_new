import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createTestDatabase } from './testDb';
import { config } from '../config';

// Integration sweep scaffold for the Synapse Learning server.
// Uses Supertest + ephemeral Postgres databases created via the helper.
// Set DATABASE_URL in the environment to a Postgres server that allows CREATE DATABASE.
// If no DATABASE_URL is provided, the suite runs in in-memory mode and skips DB-specific assertions.

async function createTestApp(): Promise<{ app: Application; cleanup?: () => Promise<void> }> {
  const baseUrl = process.env.DATABASE_URL || config.databaseUrl;
  process.env.NODE_ENV = 'test';
  vi.resetModules();

  if (!baseUrl) {
    const { createApp } = await import('../index');
    return { app: createApp() };
  }

  try {
    const testDb = await createTestDatabase(baseUrl);
    process.env.DATABASE_URL = testDb.databaseUrl;
    const { createApp } = await import('../index');
    return { app: createApp(), cleanup: () => testDb.cleanup() };
  } catch (err) {
    console.warn('[integration test] failed to create ephemeral DB; falling back to in-memory mode:', (err as Error).message);
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { createApp } = await import('../index');
    return { app: createApp() };
  }
}

describe('server integration sweep', () => {
  let app: Application;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const result = await createTestApp();
    app = result.app;
    cleanup = result.cleanup;
  }, 60_000);

  afterAll(async () => {
    await cleanup?.();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('POST /auth/register creates an account', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);
    expect(res.body.account).toBeDefined();
    expect(res.body.account.email).toBe('test@example.com');
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('POST /auth/login returns tokens for a registered account', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.account.email).toBe('login@example.com');
    expect(res.body.token).toBeDefined();
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: 'notfound@example.com', password: 'password123' })
      .expect(401);
  });

  it('POST /auth/register rejects duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' });
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' })
      .expect(409);
  });

  it('PUT /v1/session persists concept bus and step schedules', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'bus@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    const payload = {
      learnerModel: null,
      dashboardStats: null,
      tasks: [],
      xp: 0,
      betaMastery: [],
      firstAttemptKeys: [],
      openMistakes: [],
      activities: [],
      userSettings: null,
      conceptBuses: {
        'workspace:task-1': {
          elasticity: {
            concept: 'Elasticity',
            key: 'elasticity',
            tools: ['quiz'],
            signals: ['quiz-wrong'],
            firstAt: 1,
            lastAt: 2,
            struggleScore: 1,
          },
        },
      },
      stepSchedules: {
        'workspace:task-1': {
          '0': {
            lastVisitedAt: '2020-01-01T00:00:00.000Z',
            visitCount: 1,
            intervalDays: 1,
            easeFactor: 2,
            nextDueAt: '2020-01-01T00:00:00.000Z',
          },
        },
      },
    };

    await request(app)
      .put('/v1/session')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(200);

    const res = await request(app)
      .get('/v1/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.conceptBuses['workspace:task-1'].elasticity.concept).toBe('Elasticity');
    expect(res.body.stepSchedules['workspace:task-1']['0'].visitCount).toBe(1);
  });
});
