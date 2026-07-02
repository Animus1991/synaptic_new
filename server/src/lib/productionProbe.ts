import pg from 'pg';
import { config } from '../config';
import { probeRedis } from './redisClient';

const { Pool } = pg;

export type ProductionProbeStatus = {
  database: boolean;
  pgvector: boolean;
  redis: boolean;
  vectorIndexQueue: boolean;
};

let cachedPgvector: boolean | null = null;

/** True when pgvector extension and library_chunks table are available. */
export async function probePgvector(databaseUrl = config.databaseUrl): Promise<boolean> {
  if (!databaseUrl?.trim()) return false;
  if (cachedPgvector !== null) return cachedPgvector;
  const pool = new Pool({ connectionString: databaseUrl.trim() });
  try {
    const ext = await pool.query<{ ok: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok`,
    );
    const table = await pool.query<{ ok: boolean }>(
      `SELECT to_regclass('public.library_chunks') IS NOT NULL AS ok`,
    );
    cachedPgvector = Boolean(ext.rows[0]?.ok) && Boolean(table.rows[0]?.ok);
    return cachedPgvector;
  } catch {
    cachedPgvector = false;
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export function resetPgvectorProbeCache(): void {
  cachedPgvector = null;
}

export async function getProductionProbeStatus(): Promise<ProductionProbeStatus> {
  const database = Boolean(config.databaseUrl?.trim());
  const [pgvector, redis] = await Promise.all([
    database ? probePgvector() : Promise.resolve(false),
    probeRedis(),
  ]);
  return {
    database,
    pgvector,
    redis,
    vectorIndexQueue: redis,
  };
}
