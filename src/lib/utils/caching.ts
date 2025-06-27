/**
 * Advanced caching utilities
 * Provides tiered and time-based caching with stats collection
 */

export interface CacheOptions {
  /** Time to live in ms (default: 60000) */
  ttl?: number;
  /** Whether to use global shared cache (default: false) */
  useSharedCache?: boolean;
  /** Cache namespace for partitioning */
  namespace?: string;
  /** Maximum cache size (number of items) */
  max?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRatio: number;
}

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Shared global cache */
const SHARED_CACHE = new Map<string, any>();

/**
 * Enhanced cache implementation with TTL and statistics
 */
export class EnhancedCache<K, V> {
  private cache = new Map<string, CacheEntry<V>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };
  private readonly namespace: string;
  private readonly defaultTtl: number;
  private readonly useSharedCache: boolean;

  /**
   * Create a new enhanced cache
   * @param options Cache options
   */
  constructor(options: CacheOptions = {}) {
    this.namespace = options.namespace || 'default';
    this.defaultTtl = options.ttl || 60000; // 60 seconds default
    this.useSharedCache = options.useSharedCache || false;
  }

  /**
   * Get a stringified key
   * @param key Original key
   */
  private getKeyString(key: K): string {
    if (typeof key === 'string') {
      return `${this.namespace}:${key}`;
    }
    return `${this.namespace}:${JSON.stringify(key)}`;
  }

  /**
   * Get value from cache, or compute and store if not found
   * @param key Cache key
   * @param compute Function to compute value if not in cache
   * @param options Per-operation cache options
   */
  async getOrCompute(
    key: K,
    compute: () => Promise<V>,
    options: CacheOptions = {}
  ): Promise<V> {
    const ttl = options.ttl || this.defaultTtl;
    const keyString = this.getKeyString(key);
    
    // Try to get from cache (either local or shared)
    if (this.useSharedCache) {
      const cached = SHARED_CACHE.get(keyString) as CacheEntry<V> | undefined;
      if (cached && cached.expiresAt > Date.now()) {
        this.stats.hits++;
        return cached.value;
      }
    } else {
      const cached = this.cache.get(keyString);
      if (cached && cached.expiresAt > Date.now()) {
        this.stats.hits++;
        return cached.value;
      }
    }
    
    // Cache miss - compute and store
    this.stats.misses++;
    const value = await compute();
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + ttl,
    };
    
    if (this.useSharedCache) {
      SHARED_CACHE.set(keyString, entry);
    } else {
      this.cache.set(keyString, entry);
      this.stats.size = this.cache.size;
    }
    
    return value;
  }

  /**
   * Check if a key is in the cache
   * @param key Cache key
   */
  has(key: K): boolean {
    const keyString = this.getKeyString(key);
    
    if (this.useSharedCache) {
      const cached = SHARED_CACHE.get(keyString) as CacheEntry<V> | undefined;
      return Boolean(cached && cached.expiresAt > Date.now());
    }
    
    const cached = this.cache.get(keyString);
    return Boolean(cached && cached.expiresAt > Date.now());
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: K): V | undefined {
    const keyString = this.getKeyString(key);
    
    let entry: CacheEntry<V> | undefined;
    if (this.useSharedCache) {
      entry = SHARED_CACHE.get(keyString) as CacheEntry<V> | undefined;
    } else {
      entry = this.cache.get(keyString);
    }
    
    // Return the value if it exists and hasn't expired
    if (entry && entry.expiresAt > Date.now()) {
      this.stats.hits++;
      return entry.value;
    }
    
    // Count as a miss if it's expired or doesn't exist
    this.stats.misses++;
    return undefined;
  }

  /**
   * Explicitly set a cache value
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in ms (optional)
   */
  set(key: K, value: V, ttl?: number): void {
    const actualTtl = ttl || this.defaultTtl;
    const keyString = this.getKeyString(key);
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + actualTtl,
    };
    
    if (this.useSharedCache) {
      SHARED_CACHE.set(keyString, entry);
    } else {
      this.cache.set(keyString, entry);
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Remove a value from the cache
   * @param key Cache key
   */
  invalidate(key: K): boolean {
    const keyString = this.getKeyString(key);
    
    if (this.useSharedCache) {
      return SHARED_CACHE.delete(keyString);
    }
    
    const result = this.cache.delete(keyString);
    this.stats.size = this.cache.size;
    return result;
  }

  /**
   * Clear all expired entries and return number of entries evicted
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    
    if (this.useSharedCache) {
      // Evict from shared cache (only those in our namespace)
      for (const [key, entry] of SHARED_CACHE.entries()) {
        if (key.startsWith(`${this.namespace}:`) && entry.expiresAt <= now) {
          SHARED_CACHE.delete(key);
          evicted++;
        }
      }
    } else {
      // Evict from local cache
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt <= now) {
          this.cache.delete(key);
          evicted++;
        }
      }
      this.stats.size = this.cache.size;
    }
    
    this.stats.evictions += evicted;
    return evicted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    if (this.useSharedCache) {
      // Only clear entries in our namespace
      for (const key of SHARED_CACHE.keys()) {
        if (key.startsWith(`${this.namespace}:`)) {
          SHARED_CACHE.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.stats.size = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio = total > 0 ? this.stats.hits / total : 0;
    
    return {
      ...this.stats,
      hitRatio,
    };
  }
}
