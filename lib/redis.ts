import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

function createRedisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  return new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const value = await redis.get(key).catch(() => null);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => null);
}

export async function cacheDel(key: string) {
  if (!redis) return;
  await redis.del(key).catch(() => null);
}

export async function cacheInvalidatePattern(pattern: string) {
  if (!redis) return;

  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length) {
      await redis.del(...keys).catch(() => null);
    }
  } while (cursor !== "0");
}
