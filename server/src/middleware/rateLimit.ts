import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { checkRateLimit, resetRateLimitStoreForTests } from '../lib/rateLimitStore';

function bucketKey(req: Request): string {
  const account = req.account?.id ?? 'anon';
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `${account}:${ip}`;
}

/**
 * Sliding-window rate limiter (requests per minute).
 * Uses Redis when REDIS_URL is configured; in-process buckets for single-node dev.
 * Skipped in NODE_ENV=test unless ENABLE_RATE_LIMIT_IN_TEST=1 (see rateLimit.integration.test.ts).
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_IN_TEST !== '1') {
    next();
    return;
  }

  const limit = config.rateLimitRpm;
  const windowMs = 60_000;
  const key = bucketKey(req);

  void (async () => {
    const result = await checkRateLimit(key, limit, windowMs);
    if (result.backend === 'unavailable') {
      res.status(503).json({
        error: 'Rate limit store unavailable',
        hint: 'Configure REDIS_URL or set RATE_LIMIT_REQUIRE_REDIS=false for single-node dev',
      });
      return;
    }
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retrySec));
      res.setHeader('X-RateLimit-Backend', result.backend);
      res.status(429).json({ error: 'Rate limit exceeded', retryAfterSeconds: result.retrySec });
      return;
    }
    next();
  })().catch(next);
}

/** Test helper — re-export for existing integration tests. */
export function resetRateLimitBucketsForTests(): void {
  resetRateLimitStoreForTests();
}
