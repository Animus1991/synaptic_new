import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    databaseUrl: undefined as string | undefined,
    redisUrl: undefined as string | undefined,
    rateLimitRequireRedis: false,
  },
}));

vi.mock('./productionProbe', () => ({
  getProductionProbeStatus: vi.fn(async () => ({
    redis: false,
  })),
}));

vi.mock('./redisClient', () => ({
  probeRedis: vi.fn(async () => false),
}));

import { config } from '../config';
import { getReadinessStatus } from './readiness';
import { probeRedis } from './redisClient';

describe('readiness', () => {
  beforeEach(() => {
    config.databaseUrl = undefined;
    config.redisUrl = undefined;
    config.rateLimitRequireRedis = false;
    vi.mocked(probeRedis).mockResolvedValue(false);
  });

  it('returns ready when no external dependencies are configured', async () => {
    const status = await getReadinessStatus();
    expect(status.ready).toBe(true);
    expect(status.checks.process).toBe(true);
    expect(status.reason).toBeUndefined();
  });

  it('returns not ready when Redis is required but unavailable', async () => {
    config.redisUrl = 'redis://localhost:6379';
    config.rateLimitRequireRedis = true;
    const status = await getReadinessStatus();
    expect(status.ready).toBe(false);
    expect(status.checks.rateLimitRedis).toBe(false);
    expect(status.reason).toContain('rateLimitRedis');
  });
});
