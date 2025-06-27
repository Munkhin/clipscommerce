// difficult: Implements an in-memory cache with TTL, stale-while-revalidate, and size limits

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items in the cache
  staleWhileRevalidate?: number; // Time in milliseconds to serve stale content while revalidating
  version?: string; // Cache version for invalidation
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
  lastModified: number;
  etag?: string;
  version?: string;
  staleWhileRevalidate?: number;
  isRevalidating?: boolean;
}

export class Cache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private accessTimes: Map<K, number>; // For LRU eviction
  private revalidationCallbacks: Map<K, () => Promise<V | undefined>>;
  private revalidationPromises: Map<K, Promise<V | undefined>>;
  
  private readonly ttl: number;
  private readonly maxSize: number;
  private readonly staleWhileRevalidate: number;
  private readonly version?: string;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.accessTimes = new Map();
    this.revalidationCallbacks = new Map();
    this.revalidationPromises = new Map();
    this.ttl = config.ttl;
    this.maxSize = config.maxSize;
    this.staleWhileRevalidate = config.staleWhileRevalidate || 0;
    this.version = config.version;
  }

  /**
   * Get a value from the cache
   */
  /**
   * Get a value from the cache, with support for stale-while-revalidate
   * @param key Cache key
   * @param revalidateCallback Optional callback to revalidate the data
   * @returns The cached value or undefined if not found
   */
  async get(
    key: K, 
    revalidateCallback?: () => Promise<V | undefined>
  ): Promise<V | undefined> {
    const now = Date.now();
    const entry = this.cache.get(key);
    
    // If no entry exists, return undefined
    if (!entry) {
      return undefined;
    }

    const isExpired = now > entry.expiresAt;
    const isStale = isExpired && now <= (entry.expiresAt + (entry.staleWhileRevalidate || 0));
    
    // If entry is expired and beyond stale period, remove it and return undefined
    if (isExpired && !isStale) {
      this.delete(key);
      return undefined;
    }

    // If we have a revalidation callback and the entry is stale or expired
    if (revalidateCallback && (isExpired || isStale) && !entry.isRevalidating) {
      this.revalidate(key, revalidateCallback).catch(error => {
        console.error(`Cache revalidation failed for key ${key}:`, error);
      });
    }

    // Update last accessed time for LRU
    this.accessTimes.set(key, now);
    
    return entry.value;
  }

  /**
   * Revalidate a cache entry in the background
   * @private
   */
  private async revalidate(key: K, callback: () => Promise<V | undefined>): Promise<void> {
    // Prevent multiple revalidations for the same key
    if (this.revalidationPromises.has(key)) {
      return;
    }

    try {
      const entry = this.cache.get(key);
      if (!entry) return;

      // Mark as revalidating
      entry.isRevalidating = true;
      
      const revalidationPromise = (async () => {
        try {
          const newValue = await callback();
          if (newValue !== undefined) {
            this.set(key, newValue, {
              ttl: this.ttl,
              staleWhileRevalidate: this.staleWhileRevalidate
            });
          }
          return newValue;
        } finally {
          this.revalidationPromises.delete(key);
          
          // Update the entry to no longer be revalidating
          const currentEntry = this.cache.get(key);
          if (currentEntry) {
            currentEntry.isRevalidating = false;
          }
        }
      })();

      this.revalidationPromises.set(key, revalidationPromise);
      await revalidationPromise;
    } catch (error) {
      console.error(`Error during cache revalidation for key ${key}:`, error);
      this.revalidationPromises.delete(key);
      
      // Reset revalidating flag on error
      const entry = this.cache.get(key);
      if (entry) {
        entry.isRevalidating = false;
      }
    }
  }

  /**
   * Set a value in the cache
   */
  /**
   * Set a value in the cache with optional TTL and stale-while-revalidate period
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache options
   */
  set(
    key: K, 
    value: V, 
    options: {
      ttl?: number;
      staleWhileRevalidate?: number;
      etag?: string;
      lastModified?: number;
      version?: string;
    } = {}
  ): void {
    // If we've reached max size, evict the least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    const ttl = options.ttl ?? this.ttl;
    const expiresAt = now + ttl;
    
    this.cache.set(key, {
      value,
      expiresAt,
      lastModified: options.lastModified ?? now,
      etag: options.etag,
      version: options.version ?? this.version,
      staleWhileRevalidate: options.staleWhileRevalidate ?? this.staleWhileRevalidate
    });
    
    this.accessTimes.set(key, now);
  }

  /**
   * Evicts the least recently used item from the cache
   * @private
   */
  private evictLRU(): void {
    if (this.accessTimes.size === 0) return;
    
    // Find the key with the oldest access time
    let lruKey: K | null = null;
    let oldestTime = Date.now();
    
    // Use forEach instead of for...of to be compatible with older targets
    this.accessTimes.forEach((time, key) => {
      if (time < oldestTime) {
        oldestTime = time;
        lruKey = key;
      }
    });
    
    // Remove the least recently used item
    if (lruKey !== null) {
      this.delete(lruKey);
    }
  }

  /**
   * Delete a value from the cache
   */
  /**
   * Delete a value from the cache
   * @param key Cache key
   * @returns True if the key existed and was deleted, false otherwise
   */
  delete(key: K): boolean {
    this.accessTimes.delete(key);
    this.revalidationCallbacks.delete(key);
    this.revalidationPromises.delete(key);
    return this.cache.delete(key);
  }
  
  /**
   * Invalidate all cache entries that match the given predicate
   * @param predicate Function that returns true for entries to invalidate
   */
  invalidateMatching(predicate: (key: K, value: V) => boolean): void {
    for (const [key, entry] of this.cache.entries()) {
      if (predicate(key, entry.value)) {
        this.delete(key);
      }
    }
  }
  
  /**
   * Invalidate all cache entries with a specific version
   * @param version Version to invalidate
   */
  invalidateVersion(version: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.version === version) {
        this.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  /**
   * Clear the entire cache
   * @param options Clear options
   */
  clear(options: { clearRevalidationCallbacks?: boolean } = {}): void {
    this.cache.clear();
    this.accessTimes.clear();
    
    if (options.clearRevalidationCallbacks !== false) {
      this.revalidationCallbacks.clear();
      this.revalidationPromises.clear();
    }
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys in the cache
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    // Convert to array first to avoid iteration issues
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
      }
    });
  }

  /**
   * Evict the least recently used item
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSize) return;
    
    // Sort entries by access time (oldest first)
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);
    
    // Remove the oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, this.cache.size - this.maxSize);
    entriesToRemove.forEach(([key]) => {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    });
  }
}
