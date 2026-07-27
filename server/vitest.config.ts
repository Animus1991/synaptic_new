import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/pg.testcontainers.test.ts'],
    // Avoid hanging after integration suites that open DB / Redis / queues.
    pool: 'forks',
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
