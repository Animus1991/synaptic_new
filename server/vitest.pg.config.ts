import { defineConfig } from 'vitest/config';

/** B6 — only the Testcontainers Postgres suite (not part of default `npm test`). */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/test/pg.testcontainers.test.ts'],
    pool: 'forks',
    fileParallelism: false,
    hookTimeout: 180_000,
    testTimeout: 120_000,
  },
});
