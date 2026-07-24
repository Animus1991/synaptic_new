/**
 * Ephemeral Postgres helper for integration tests.
 *
 * Creates a fresh database per test run, applies migrations, and drops it on
 * cleanup. Requires a running Postgres server and a base DATABASE_URL pointing to
 * a database that can be used to issue CREATE DATABASE (e.g. postgres or the
 * application database).
 */

import { Client } from 'pg';
import { runMigrations } from '../db/migrate';

function maintenanceUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  // Prefer the default 'postgres' maintenance database, but fall back to the
  // configured database if the URL does not specify a separate maintenance db.
  const dbName = url.pathname.slice(1) || 'postgres';
  url.pathname = dbName === 'postgres' ? '/postgres' : `/${dbName}`;
  return url.toString();
}

export interface TestDb {
  databaseUrl: string;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(baseUrl: string): Promise<TestDb> {
  const suffix = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dbName = `synapse_${suffix}`;
  const maintenance = maintenanceUrl(baseUrl);

  const client = new Client(maintenance);
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${dbName}`);
  } finally {
    await client.end();
  }

  const url = new URL(baseUrl);
  url.pathname = `/${dbName}`;
  const databaseUrl = url.toString();

  await runMigrations(databaseUrl);

  return {
    databaseUrl,
    cleanup: async () => {
      const dropClient = new Client(maintenance);
      await dropClient.connect();
      try {
        // Terminate any open connections to the test database before dropping.
        await dropClient.query(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
          [dbName],
        );
        await dropClient.query(`DROP DATABASE ${dbName}`);
      } finally {
        await dropClient.end();
      }
    },
  };
}
