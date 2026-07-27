/**
 * B6 — Postgres (+ pgvector) integration via Testcontainers.
 * Skips when SKIP_TESTCONTAINERS=1 or Docker is unavailable (local).
 * Fails hard in CI if the container cannot start.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { Application } from 'express';

const SKIP = process.env.SKIP_TESTCONTAINERS === '1' || process.env.SKIP_TESTCONTAINERS === 'true';
const IN_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

describe.skipIf(SKIP)('B6 Postgres testcontainers', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let app: Application | undefined;
  let available = false;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('pgvector/pgvector:pg16').withDatabase('synapse').start();
      const databaseUrl = container.getConnectionUri();
      process.env.DATABASE_URL = databaseUrl;
      process.env.JWT_SECRET = 'testcontainers-jwt-secret-min-32-chars!!';
      process.env.NODE_ENV = 'test';
      process.env.EMAIL_VERIFICATION_REQUIRED = 'false';
      process.env.RATE_LIMIT_DISABLED = 'true';
      process.env.RUN_MIGRATIONS_ON_START = 'false';
      delete process.env.REDIS_URL;

      const { runMigrations } = await import('../db/migrate');
      await runMigrations(databaseUrl);

      vi.resetModules();
      const { createApp } = await import('../index');
      app = createApp();
      available = true;
    } catch (err) {
      if (IN_CI) throw err;
      console.warn('[B6] Docker/testcontainers unavailable — skipping:', err instanceof Error ? err.message : err);
      available = false;
    }
  }, 180_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('migrates and serves auth + library against real Postgres', async () => {
    if (!available || !app) return;

    const email = `pg-${Date.now()}@example.com`;
    const password = 'TestcontainersPass1!';

    const reg = await request(app).post('/auth/register').send({ email, password, name: 'Pg User' });
    expect(reg.status).toBe(201);
    const access = (reg.body.accessToken ?? reg.body.token) as string;
    expect(access).toBeTruthy();

    const sessions = await request(app).get('/auth/sessions').set('Authorization', `Bearer ${access}`);
    expect(sessions.status).toBe(200);
    expect(Array.isArray(sessions.body.sessions)).toBe(true);
    expect(sessions.body.sessions.length).toBeGreaterThanOrEqual(1);

    const lib = await request(app).get('/library').set('Authorization', `Bearer ${access}`);
    expect(lib.status).toBe(200);
    expect(lib.headers.etag).toBeTruthy();

    const put = await request(app)
      .put('/library')
      .set('Authorization', `Bearer ${access}`)
      .set('If-Match', lib.headers.etag as string)
      .send({
        uploadedFiles: [],
        glossaryEntries: [{ id: 'g1', term: 'pg', definition: 'postgres', createdAt: new Date().toISOString() }],
        generatedCourses: [],
      });
    expect(put.status).toBe(200);
    expect(put.body.glossaryEntries).toHaveLength(1);
  });
});
