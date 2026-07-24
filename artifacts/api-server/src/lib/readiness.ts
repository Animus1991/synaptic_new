import pg from 'pg';
import { config } from '../config';
import { probeRedis } from './redisClient';
import { getProductionProbeStatus } from './productionProbe';

const { Pool } = pg;

export type ReadinessCheck = {
  ready: boolean;
  checks: Record<string, boolean>;
  reason?: string;
};

async function probeDatabaseConnection(): Promise<boolean> {
  if (!config.databaseUrl?.trim()) return true;
  const pool = new Pool({
    connectionString: config.databaseUrl.trim(),
    connectionTimeoutMillis: 2500,
    max: 1,
  });
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

/** Kubernetes readiness — verifies required dependencies before receiving traffic. */
export async function getReadinessStatus(): Promise<ReadinessCheck> {
  const production = await getProductionProbeStatus();
  const checks: Record<string, boolean> = {
    process: true,
  };

  if (config.databaseUrl?.trim()) {
    checks.database = await probeDatabaseConnection();
  }
  if (config.redisUrl?.trim()) {
    checks.redis = await probeRedis();
  }
  if (config.rateLimitRequireRedis && config.redisUrl?.trim()) {
    checks.rateLimitRedis = production.redis;
  }

  const ready = Object.values(checks).every(Boolean);
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  return {
    ready,
    checks,
    reason: ready ? undefined : `unavailable: ${failed.join(', ')}`,
  };
}
