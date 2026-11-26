import { createClient } from 'redis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Cache-aside caching for expensive read endpoints (the dashboard aggregation).
 *
 *   1. look in the cache  -> hit: return it
 *   2. miss: compute the value, store it with a TTL (time to live), return it
 *   3. when the data changes, delete ("invalidate") the cached keys
 *
 * With REDIS_URL set, Redis is used (shared by all server instances, survives restarts).
 * Without it, a small in-memory Map is used, so the app also runs without Redis.
 */

/* ---------------------------------------------------------------- in-memory store */
const memory = new Map();

const memoryStore = {
  name: 'memory',
  async get(key) {
    const entry = memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, ttlSeconds) {
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },
  async delByPrefix(prefix) {
    for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
  },
  async quit() {
    memory.clear();
  },
};

/* ---------------------------------------------------------------- Redis store */
function createRedisStore(url) {
  const client = createClient({ url, socket: { reconnectStrategy: (retries) => Math.min(retries * 500, 5000) } });
  client.on('error', (error) => logger.warn(`Redis error: ${error.message}`));

  return {
    name: 'redis',
    client,
    async get(key) {
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) : null;
    },
    async set(key, value, ttlSeconds) {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    },
    async delByPrefix(prefix) {
      // SCAN walks the keys in small batches instead of blocking Redis like KEYS would
      for await (const keys of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        if (keys.length) await client.del(keys);
      }
    },
    async quit() {
      await client.quit();
    },
  };
}

let store = memoryStore;

/** Called once at start-up. Falls back to memory if Redis cannot be reached. */
export async function initCache() {
  if (!config.redisUrl) {
    logger.info('Cache: in-memory (set REDIS_URL to use Redis)');
    return;
  }
  const redisStore = createRedisStore(config.redisUrl);
  try {
    await redisStore.client.connect();
    store = redisStore;
    logger.info('Cache: Redis connected');
  } catch (error) {
    logger.warn(`Cache: Redis unavailable (${error.message}), using in-memory cache`);
  }
}

export const cacheBackend = () => store.name;

/** Returns the cached value or computes, stores and returns it. Cache errors never break a request. */
export async function remember(key, ttlSeconds, compute) {
  try {
    const cached = await store.get(key);
    if (cached !== null) return { value: cached, hit: true };
  } catch (error) {
    logger.warn(`Cache read failed for ${key}: ${error.message}`);
  }

  const value = await compute();
  try {
    await store.set(key, value, ttlSeconds);
  } catch (error) {
    logger.warn(`Cache write failed for ${key}: ${error.message}`);
  }
  return { value, hit: false };
}

export async function invalidate(prefix) {
  try {
    await store.delByPrefix(prefix);
  } catch (error) {
    logger.warn(`Cache invalidation failed for ${prefix}: ${error.message}`);
  }
}

export async function closeCache() {
  await store.quit();
}

/** Cache keys are namespaced per user, so one user's changes clear only their own entries. */
export const userKey = (userId, name) => `crm:user:${userId}:${name}`;
export const userPrefix = (userId) => `crm:user:${userId}:`;

