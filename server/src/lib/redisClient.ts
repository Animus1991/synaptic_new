import { config } from '../config';

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ping(): Promise<string>;
  quit(): Promise<string>;
};

let client: RedisLike | null = null;
let connectFailed = false;

/** Lazy Redis client for rate limiting and BullMQ (shared REDIS_URL). */
export async function getRedisClient(): Promise<RedisLike | null> {
  if (!config.redisUrl || connectFailed) return null;
  if (client) return client;
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    await redis.ping();
    client = redis;
    return client;
  } catch {
    connectFailed = true;
    return null;
  }
}

export async function probeRedis(): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}

/** Test helper */
export async function resetRedisClientForTests(): Promise<void> {
  if (client) await client.quit().catch(() => undefined);
  client = null;
  connectFailed = false;
}
