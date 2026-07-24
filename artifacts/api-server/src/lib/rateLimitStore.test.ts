import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    redisUrl: undefined as string | undefined,
    rateLimitRequireRedis: false,
  },
}));

vi.mock('./redisClient', () => ({
  getRedisClient: vi.fn(),
}));

import { getRedisClient } from './redisClient';
import {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimitStoreForTests,
} from './rateLimitStore';
import { config } from '../config';

const mockedGetRedis = vi.mocked(getRedisClient);

describe('rateLimitStore', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
    vi.clearAllMocks();
    config.redisUrl = undefined;
    config.rateLimitRequireRedis = false;
  });

  it('getRateLimitStatus reports memory backend when Redis is down', () => {
    expect(getRateLimitStatus(false)).toEqual({
      backend: 'memory',
      distributed: false,
      requireRedis: false,
    });
  });

  it('getRateLimitStatus reports redis backend when Redis is up', () => {
    config.rateLimitRequireRedis = true;
    expect(getRateLimitStatus(true)).toEqual({
      backend: 'redis',
      distributed: true,
      requireRedis: true,
    });
  });

  it('memory backend allows requests under limit then blocks', async () => {
    const key = 'acct:127.0.0.1';
    const r1 = await checkRateLimit(key, 2, 60_000);
    const r2 = await checkRateLimit(key, 2, 60_000);
    const r3 = await checkRateLimit(key, 2, 60_000);
    expect(r1).toMatchObject({ allowed: true, backend: 'memory' });
    expect(r2).toMatchObject({ allowed: true, backend: 'memory' });
    expect(r3).toMatchObject({ allowed: false, backend: 'memory' });
    expect(r3.retrySec).toBeGreaterThan(0);
  });

  it('redis backend uses atomic eval and blocks over limit', async () => {
    let count = 0;
    mockedGetRedis.mockResolvedValue({
      eval: vi.fn(async () => {
        count += 1;
        return count;
      }),
      ping: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      quit: vi.fn(),
    });

    const key = 'acct:10.0.0.1';
    const r1 = await checkRateLimit(key, 2, 60_000);
    const r2 = await checkRateLimit(key, 2, 60_000);
    const r3 = await checkRateLimit(key, 2, 60_000);
    expect(r1).toMatchObject({ allowed: true, backend: 'redis' });
    expect(r2).toMatchObject({ allowed: true, backend: 'redis' });
    expect(r3).toMatchObject({ allowed: false, backend: 'redis' });
  });

  it('fails closed when Redis required but unavailable', async () => {
    config.redisUrl = 'redis://localhost:6379';
    config.rateLimitRequireRedis = true;
    mockedGetRedis.mockResolvedValue(null);

    const result = await checkRateLimit('anon:1.2.3.4', 120, 60_000);
    expect(result).toEqual({ allowed: false, retrySec: 60, backend: 'unavailable' });
  });

  it('falls back to memory when Redis optional and unavailable', async () => {
    config.redisUrl = 'redis://localhost:6379';
    config.rateLimitRequireRedis = false;
    mockedGetRedis.mockResolvedValue(null);

    const result = await checkRateLimit('anon:1.2.3.4', 120, 60_000);
    expect(result).toMatchObject({ allowed: true, backend: 'memory' });
  });
});
