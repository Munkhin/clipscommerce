import Redis from 'ioredis';
import { DEFAULT_CONFIG } from '../config'; // Assuming config is in the parent directory

const redisClient = new Redis(DEFAULT_CONFIG.REDIS_URL, {
  // Add any ioredis specific options here if needed, e.g., lazyConnect: true
  maxRetriesPerRequest: 3, // Example option
});

redisClient.on('error', (err) => {
  console.error('Redis Cache Service Error:', err);
  // Potentially implement a circuit breaker or fallback mechanism here
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis for caching.');
});

/**
 * Generates a cache key based on a prefix and arguments.
 * Arguments are stringified and joined to ensure uniqueness.
 * @param prefix A string prefix for the cache key (e.g., function name).
 * @param args An array of arguments passed to the function.
 * @returns A unique string cache key.
 */
const generateCacheKey = (prefix: string, args: any[]): string => {
  const stringifiedArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        // Fallback for non-serializable objects or circular references
        return String(arg);
      }
    }
    return String(arg);
  }).join(':');
  return `${prefix}:${stringifiedArgs}`;
};

/**
 * Retrieves an item from the cache.
 * @param key The cache key.
 * @returns The cached item, or null if not found or an error occurs.
 */
const get = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Sets an item in the cache with an optional TTL.
 * @param key The cache key.
 * @param value The value to cache.
 * @param ttlSeconds Optional Time-To-Live in seconds. Uses a default if not provided.
 */
const set = async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
  try {
    const stringifiedValue = JSON.stringify(value);
    const effectiveTtl = ttlSeconds || (DEFAULT_CONFIG.CACHE_TTL.KEYWORDS / 1000); // Example: Default to KEYWORDS TTL in seconds
    if (effectiveTtl > 0) {
      await redisClient.set(key, stringifiedValue, 'EX', effectiveTtl);
    } else {
      await redisClient.set(key, stringifiedValue);
    }
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
};

/**
 * Deletes an item from the cache.
 * @param key The cache key.
 */
const del = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
};

/**
 * A higher-order function to wrap an async function with caching logic.
 * @param fn The async function to cache. Takes arguments of type TArgs and returns Promise<TResult>.
 * @param keyPrefix A prefix for the cache key (typically the function name or a unique identifier).
 * @param ttlSeconds Optional TTL for the cache entry in seconds.
 * @returns A new function with the same signature as fn, which when called, will attempt to serve from cache or execute fn and cache its result.
 */
const withCache = <TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyPrefix: string,
  ttlSeconds?: number
): ((...args: TArgs) => Promise<TResult>) => {
  const cachedFunction = async (...args: TArgs): Promise<TResult> => {
    const cacheKey = generateCacheKey(keyPrefix, args);
    const cachedResult = await get<TResult>(cacheKey);

    if (cachedResult !== null) {
      console.log(`Cache hit for ${cacheKey} - serving from cache.`);
      return cachedResult; // This is TResult, async function wraps it in Promise<TResult>
    }

    console.log(`Cache miss for ${cacheKey}. Executing function ${keyPrefix}.`);
    // fn returns Promise<TResult>, so awaiting it gives TResult.
    const result = await fn(...args);
    
    // Cache the result only if it's not null or undefined to avoid caching errors/empty states
    if (result !== null && result !== undefined) {
      await set(cacheKey, result, ttlSeconds);
    }
    
    // result is of type TResult. The async function wraps it in Promise<TResult>.
    return result;
  };
  return cachedFunction;
};

export const CacheService = {
  get,
  set,
  del,
  generateCacheKey,
  withCache,
  // Expose client directly if advanced usage is needed, though generally not recommended
  // getRedisClient: () => redisClient 
};

// Optional: Graceful shutdown for Redis client
process.on('SIGINT', () => {
  redisClient.quit();
});
process.on('SIGTERM', () => {
  redisClient.quit();
});
