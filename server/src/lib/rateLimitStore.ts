/**
 * Sprint L2 — distributed rate limit store (Redis) with dev memory fallback.
 */

import { config } from '../config';
import { getRedisClient } from './redisClient';

export type RateLimitResult = {
  allowed: boolean;
  retrySec: number;
  backend: 'redis' | 'memory' | 'unavailable';
};

export type RateLimitStatus = {
  backend: 'redis' | 'memory';
  /** True when counters are shared across API replicas (Redis). */
  distributed: boolean;
  requireRedis: boolean;
};

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

/** Atomic INCR + EXPIRE on first hit — safe across concurrent replicas. */
const REDIS_INCR_EXPIRE = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retrySec: Math.ceil((bucket.resetAt - now) / 1000),
      backend: 'memory',
    };
  }
  return { allowed: true, retrySec: 0, backend: 'memory' };
}

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const windowKey = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${windowKey}`;
  const ttlSec = Math.ceil(windowMs / 1000);
  try {
    const count = await redis.eval(REDIS_INCR_EXPIRE, 1, redisKey, String(ttlSec));
    if (count > limit) {
      return { allowed: false, retrySec: ttlSec, backend: 'redis' };
    }
    return { allowed: true, retrySec: 0, backend: 'redis' };
  } catch {
    return null;
  }
}

/** Resolve health/readiness metadata for /health and production probes. */
export function getRateLimitStatus(redisAvailable: boolean): RateLimitStatus {
  const requireRedis = config.rateLimitRequireRedis;
  if (redisAvailable) {
    return { backend: 'redis', distributed: true, requireRedis };
  }
  return { backend: 'memory', distributed: false, requireRedis };
}

/**
 * Check sliding-window RPM cap. Uses Redis when available; memory for single-node dev.
 * When REDIS_URL is set and requireRedis is true, returns unavailable if Redis is down.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisResult = await redisRateLimit(key, limit, windowMs);
  if (redisResult) return redisResult;

  if (config.redisUrl && config.rateLimitRequireRedis) {
    return { allowed: false, retrySec: 60, backend: 'unavailable' };
  }

  return memoryRateLimit(key, limit, windowMs);
}

/** Test helper */
export function resetRateLimitStoreForTests(): void {
  memoryBuckets.clear();
}
