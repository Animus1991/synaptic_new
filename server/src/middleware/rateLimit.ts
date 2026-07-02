import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { getRedisClient } from '../lib/redisClient';

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

function bucketKey(req: Request): string {
  const account = req.account?.id ?? 'anon';
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `${account}:${ip}`;
}

function memoryRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retrySec: number } {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retrySec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retrySec: 0 };
}

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retrySec: number } | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const windowKey = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${windowKey}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, Math.ceil(windowMs / 1000));
    }
    if (count > limit) {
      return { allowed: false, retrySec: Math.ceil(windowMs / 1000) };
    }
    return { allowed: true, retrySec: 0 };
  } catch {
    return null;
  }
}

/**
 * Sliding-window rate limiter (requests per minute).
 * Uses Redis when REDIS_URL is configured; falls back to in-process buckets.
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const limit = config.rateLimitRpm;
  const windowMs = 60_000;
  const key = bucketKey(req);

  void (async () => {
    const redisResult = await redisRateLimit(key, limit, windowMs);
    const result = redisResult ?? memoryRateLimit(key, limit, windowMs);
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retrySec));
      res.status(429).json({ error: 'Rate limit exceeded', retryAfterSeconds: result.retrySec });
      return;
    }
    next();
  })().catch(next);
}

/** Test helper */
export function resetRateLimitBucketsForTests(): void {
  memoryBuckets.clear();
}
