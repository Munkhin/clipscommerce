/**
 * Generic LRU Cache implementation with TTL support
 * 
 * Features:
 * - Time-based expiration (TTL)
 * - LRU (Least Recently Used) eviction policy
 * - Max size limitation
 * - Optional memory-size tracking
 */
export interface CacheConfig<K, V> {
  maxSize?: number;        // Maximum number of items in cache
  ttl?: number;            // Default TTL in milliseconds
  sizeCalculator?: (key: K, value: V) => number;  // Function to calculate item size
  maxMemorySize?: number;  // Maximum memory size in bytes
}

interface CacheEntry<V> {
  value: V;
  expiry: number;  // Timestamp when this entry expires
  lastAccessed: number;
  size?: number;
}

export class Cache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private config: Required<CacheConfig<K, V>>;
  private memoryUsed: number = 0;
  
  constructor(config: CacheConfig<K, V> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
      sizeCalculator: config.sizeCalculator || (() => 1),
      maxMemorySize: config.maxMemorySize || Infinity
    };
    
    // Setup periodic cleanup to prevent memory leaks
    if (typeof window !== 'undefined') {
      // In browser environment
      setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }
  }
  
  /**
   * Get value from cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  public get(key: K): V | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // Return undefined if entry doesn't exist or is expired
    if (!entry || entry.expiry < now) {
      if (entry) {
        // Remove expired entry
        this.remove(key);
      }
      return undefined;
    }
    
    // Update last accessed timestamp (LRU tracking)
    entry.lastAccessed = now;
    return entry.value;
  }
  
  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Optional TTL override in milliseconds
   * @returns The cache instance for chaining
   */
  public set(key: K, value: V, ttl?: number): Cache<K, V> {
    const now = Date.now();
    const expiry = now + (ttl || this.config.ttl);
    
    // Calculate entry size if sizeCalculator is provided
    const size = this.config.sizeCalculator(key, value);
    
    // Create new entry
    const entry: CacheEntry<V> = {
      value,
      expiry,
      lastAccessed: now,
      size
    };
    
    // If we already have this key, update memory usage delta
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      if (oldEntry.size !== undefined && entry.size !== undefined) {
        this.memoryUsed -= oldEntry.size;
        this.memoryUsed += entry.size;
      }
    } else if (entry.size !== undefined) {
      // New entry - add to memory usage
      this.memoryUsed += entry.size;
    }
    
    // Store in cache
    this.cache.set(key, entry);
    
    // Ensure we don't exceed max size
    this.enforceLimit();
    
    return this;
  }
  
  /**
   * Remove item from cache
   * @param key Cache key
   * @returns true if item was removed, false if not found
   */
  public remove(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Update memory usage if size tracking is enabled
    if (entry.size !== undefined) {
      this.memoryUsed -= entry.size;
    }
    
    return this.cache.delete(key);
  }
  
  /**
   * Clear all items from cache
   */
  public clear(): void {
    this.cache.clear();
    this.memoryUsed = 0;
  }
  
  /**
   * Get number of items in cache
   */
  public size(): number {
    return this.cache.size;
  }
  
  /**
   * Get current memory usage in bytes
   * Only meaningful if sizeCalculator is provided
   */
  public getMemoryUsed(): number {
    return this.memoryUsed;
  }
  
  /**
   * Remove expired entries
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.remove(key);
      }
    }
  }
  
  /**
   * Enforce size and memory limits
   * Uses LRU (Least Recently Used) eviction policy
   */
  private enforceLimit(): void {
    // If we're under limits, do nothing
    if (this.cache.size <= this.config.maxSize && this.memoryUsed <= this.config.maxMemorySize) {
      return;
    }
    
    // Sort entries by last accessed time (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest entries until we're under limits
    for (const [key] of entries) {
      if (this.cache.size <= this.config.maxSize && this.memoryUsed <= this.config.maxMemorySize) {
        break;
      }
      this.remove(key);
    }
  }
}
