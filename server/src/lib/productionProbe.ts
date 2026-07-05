import pg from 'pg';
import { config } from '../config';
import { getRateLimitStatus } from './rateLimitStore';
import { probeRedis } from './redisClient';

const { Pool } = pg;

export type ProductionProbeStatus = {
  database: boolean;
  pgvector: boolean;
  redis: boolean;
  vectorIndexQueue: boolean;
  /** Sprint L2 — distributed rate limiting across API replicas. */
  rateLimit: {
    backend: 'redis' | 'memory';
    distributed: boolean;
    requireRedis: boolean;
  };
  /** Org-level RBAC (institution → classes → members). */
  tenantIsolation: {
    teacherClassScoped: true;
    postgresAccountScoped: boolean;
    orgRbac: true;
  };
  /** Sprint L4 — enterprise gap closure (LTI, audit, async jobs). */
  l4Enterprise: {
    auditLogs: boolean;
    lti: boolean;
    ltiGradePassback: boolean;
    samlMetadata: boolean;
    transcribeQueue: boolean;
    orgAnalytics: true;
  };
  /** Sprint L6 — production LTI, neural podcast, cohort heatmaps. */
  l6Enterprise: {
    ltiJwtValidation: boolean;
    samlAcs: boolean;
    ltiAgsOAuth: boolean;
    neuralAudioPodcast: boolean;
    cohortHeatmap: boolean;
  };
  /** Sprint L7 — student org UI + SAML crypto. */
  l7Enterprise: {
    samlXmlSignature: boolean;
    studentOrgDashboard: boolean;
    studentOrgUi: boolean;
  };
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
    rateLimit: getRateLimitStatus(redis),
    tenantIsolation: {
      teacherClassScoped: true,
      postgresAccountScoped: database,
      orgRbac: true,
    },
    l4Enterprise: {
      auditLogs: database,
      lti: Boolean(config.ltiClientId || config.ltiPlatformAuthUrl),
      ltiGradePassback: true,
      samlMetadata: Boolean(config.samlEntityId),
      transcribeQueue: redis,
      orgAnalytics: true,
    },
    l6Enterprise: {
      ltiJwtValidation: Boolean(process.env.LTI_PLATFORM_JWKS_URL?.trim()),
      samlAcs: Boolean(config.samlEntityId),
      ltiAgsOAuth: Boolean(config.ltiAgsTokenUrl && config.ltiAgsClientSecret),
      neuralAudioPodcast: Boolean(config.upstreamApiKey),
      cohortHeatmap: true,
    },
    l7Enterprise: {
      samlXmlSignature: Boolean(config.samlIdpCert),
      studentOrgDashboard: true,
      studentOrgUi: true,
    },
  };
}
