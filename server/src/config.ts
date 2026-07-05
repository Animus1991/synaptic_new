import 'dotenv/config';

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  port: num(process.env.PORT, 8787),
  upstreamBaseUrl: (process.env.UPSTREAM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
  upstreamApiKey: process.env.OPENAI_API_KEY ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean),
  allowAnonymous: (process.env.ALLOW_ANONYMOUS ?? 'true') !== 'false',
  databaseUrl: process.env.DATABASE_URL?.trim() || undefined,
  /** Optional Redis URL for distributed rate limiting + BullMQ vector indexing. */
  redisUrl: process.env.REDIS_URL?.trim() || undefined,
  /**
   * When true and REDIS_URL is set, rate limiting fails closed (503) if Redis is unavailable.
   * Defaults to true when REDIS_URL is configured (multi-replica production).
   */
  rateLimitRequireRedis:
    (process.env.RATE_LIMIT_REQUIRE_REDIS
      ?? (process.env.REDIS_URL?.trim() ? 'true' : 'false')) !== 'false',
  /** Run node-pg-migrate on server boot when DATABASE_URL is set. Set false in multi-instance prod. */
  runMigrationsOnStart: (process.env.RUN_MIGRATIONS_ON_START ?? 'true') !== 'false',
  clientAppUrl: (process.env.CLIENT_APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim() || undefined,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
  stripePricePro: process.env.STRIPE_PRICE_PRO?.trim() || undefined,
  stripePriceTeam: process.env.STRIPE_PRICE_TEAM?.trim() || undefined,
  quotas: {
    free: num(process.env.FREE_MONTHLY_TOKEN_QUOTA, 100_000),
    pro: num(process.env.PRO_MONTHLY_TOKEN_QUOTA, 5_000_000),
    team: num(process.env.TEAM_MONTHLY_TOKEN_QUOTA, 25_000_000),
  } as Record<Plan, number>,
  rateLimitRpm: num(process.env.RATE_LIMIT_RPM, 120),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtlDays: num(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  ocrMaxPages: num(process.env.OCR_MAX_PAGES, 15),
  /** Optional spaCy/Stanza NER microservice base URL (no trailing slash). */
  nerServiceUrl: process.env.NER_SERVICE_URL?.trim() || undefined,
  /** Google OAuth (G-1) — Tasks + Meet + sign-in */
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || undefined,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined,
  googleRedirectUri: (
    process.env.GOOGLE_REDIRECT_URI
    ?? `http://localhost:${num(process.env.PORT, 8787)}/auth/google/callback`
  ).replace(/\/$/, ''),
  /** WebSocket port for Yjs/Hocuspocus study-room collab (defaults to HTTP port + 1). */
  collabPort: num(process.env.COLLAB_PORT, num(process.env.PORT, 8787) + 1),
  /** LTI 1.3 pilot — institutional LMS integration (Canvas, Moodle, etc.). */
  ltiClientId: process.env.LTI_CLIENT_ID?.trim() || undefined,
  ltiPlatformAuthUrl: process.env.LTI_PLATFORM_AUTH_URL?.trim() || undefined,
  ltiPlatformIssuer: process.env.LTI_PLATFORM_ISSUER?.trim() || undefined,
  ltiPrivateKey: process.env.LTI_PRIVATE_KEY?.replace(/\\n/g, '\n').trim() || undefined,
  ltiPublicKey: process.env.LTI_PUBLIC_KEY?.replace(/\\n/g, '\n').trim() || undefined,
  /** OAuth2 bearer for LTI AGS grade passback to platform line items. */
  ltiAgsToken: process.env.LTI_AGS_TOKEN?.trim() || undefined,
  /** SAML SP entity ID for enterprise SSO metadata (/v1/auth/saml/metadata). */
  samlEntityId: process.env.SAML_ENTITY_ID?.trim() || undefined,
};

export type Plan = 'free' | 'pro' | 'team';

if (!config.upstreamApiKey) {
  console.warn('[config] OPENAI_API_KEY is not set — upstream calls will fail until it is configured.');
}
