import { config } from '../config';

const DEV_JWT_PLACEHOLDER = 'dev-insecure-secret-change-me';

export interface ProductionConfigIssue {
  code: string;
  message: string;
}

/**
 * W0 — fail-closed production boot checks.
 * Returns issues instead of throwing so callers/tests can assert cleanly.
 */
export function collectProductionConfigIssues(
  env: NodeJS.ProcessEnv = process.env,
): ProductionConfigIssue[] {
  if ((env.NODE_ENV ?? 'development') !== 'production') return [];

  const issues: ProductionConfigIssue[] = [];
  const jwt = env.JWT_SECRET?.trim() || config.jwtSecret;
  if (!jwt || jwt === DEV_JWT_PLACEHOLDER || jwt.length < 32) {
    issues.push({
      code: 'JWT_SECRET',
      message: 'JWT_SECRET must be set to ≥32 random bytes (not the dev placeholder)',
    });
  }

  const origins = (env.ALLOWED_ORIGINS ?? config.allowedOrigins.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) {
    issues.push({
      code: 'ALLOWED_ORIGINS',
      message: 'ALLOWED_ORIGINS must list explicit frontend origins (no *)',
    });
  }

  if ((env.ALLOW_ANONYMOUS ?? String(config.allowAnonymous)) !== 'false') {
    issues.push({
      code: 'ALLOW_ANONYMOUS',
      message: 'ALLOW_ANONYMOUS must be false in production',
    });
  }

  if (!(env.OPENAI_API_KEY ?? config.upstreamApiKey)?.trim()) {
    issues.push({
      code: 'OPENAI_API_KEY',
      message: 'OPENAI_API_KEY is required in production',
    });
  }

  if (!env.ADMIN_SECRET?.trim()) {
    issues.push({
      code: 'ADMIN_SECRET',
      message: 'ADMIN_SECRET is required in production',
    });
  }

  if (!(env.DATABASE_URL ?? config.databaseUrl)?.trim()) {
    issues.push({
      code: 'DATABASE_URL',
      message: 'DATABASE_URL is required in production',
    });
  }

  const stripeKey = (env.STRIPE_SECRET_KEY ?? config.stripeSecretKey)?.trim();
  const stripeWh = (env.STRIPE_WEBHOOK_SECRET ?? config.stripeWebhookSecret)?.trim();
  if (stripeKey && !stripeWh) {
    issues.push({
      code: 'STRIPE_WEBHOOK_SECRET',
      message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set',
    });
  }

  return issues;
}

/** Throws with a multi-line message when production config is unsafe. */
export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  const issues = collectProductionConfigIssues(env);
  if (issues.length === 0) return;
  const detail = issues.map((i) => `  - [${i.code}] ${i.message}`).join('\n');
  throw new Error(`[synapse-proxy] Refusing to start: production config unsafe\n${detail}`);
}
