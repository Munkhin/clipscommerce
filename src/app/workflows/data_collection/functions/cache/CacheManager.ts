/**
 * Advanced cache management system with multi-level caching, tagging, and adaptive TTL
 */
import { Redis } from 'ioredis';
import EventEmitter from 'events';

// Cache entry type definition
export interface CacheEntry<T> {
  value: T;
  expiry: number;
  tags: string[];
  volatility: number;
  lastAccessed: number;
  accessCount: number;
}

// Cache provider interface
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// Cache options
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  staleWhileRevalidate?: number;
  version?: string;
  namespace?: string;
  environment?: 'development' | 'test' | 'production';
}

// Cache set options
export interface CacheSetOptions {
  ttl?: number;
  tags?: string[];
  volatility?: number;
}

// Memory cache provider
class MemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    // Evict LRU items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiry = Date.now() + (options?.ttl || 60 * 60 * 1000);
    
    this.cache.set(key, {
      value,
      expiry,
      tags: options?.tags || [],
      volatility: options?.volatility || 0.5,
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key) && Date.now() <= (this.cache.get(key)?.expiry || 0);
  }

  private evictLRU(): void {
    let oldest: { key: string; timestamp: number } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.lastAccessed < oldest.timestamp) {
        oldest = { key, timestamp: entry.lastAccessed };
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest.key);
    }
  }
}

// Redis cache provider
class RedisCacheProvider implements CacheProvider {
  private redis: Redis;
  private namespace: string;

  constructor(redisUrl: string, namespace: string = 'cache') {
    this.redis = new Redis(redisUrl);
    this.namespace = namespace;
  }

  private getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.getNamespacedKey(key));
    if (!data) return null;
    
    try {
      const entry = JSON.parse(data) as CacheEntry<T>;
      
      if (Date.now() > entry.expiry) {
        await this.delete(key);
        return null;
      }
      
      // Update access statistics
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      await this.redis.set(
        this.getNamespacedKey(key),
        JSON.stringify(entry),
        'PX',
        entry.expiry - Date.now()
      );
      
      return entry.value;
    } catch (error) {
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const expiry = Date.now() + (options?.ttl || 60 * 60 * 1000);
    
    const entry: CacheEntry<T> = {
      value,
      expiry,
      tags: options?.tags || [],
      volatility: options?.volatility || 0.5,
      lastAccessed: Date.now(),
      accessCount: 0
    };
    
    await this.redis.set(
      this.getNamespacedKey(key),
      JSON.stringify(entry),
      'PX',
      expiry - Date.now()
    );
    
    // Store tag mappings
    for (const tag of entry.tags) {
      await this.redis.sadd(`${this.namespace}:tag:${tag}`, key);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(this.getNamespacedKey(key));
    return result > 0;
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.namespace}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async has(key: string): Promise<boolean> {
    return await this.redis.exists(this.getNamespacedKey(key)) > 0;
  }
}

// Multi-level cache manager
export class CacheManager {
  private levels: Array<{ provider: CacheProvider; weight: number }> = [];
  private cacheTags = new Map<string, Set<string>>();
  private namespace: string;
  private defaultTTL: number;
  private volatilityTracker = new Map<string, number[]>();
  private metricEmitter: EventEmitter | null = null;
  
  constructor(config: CacheConfig) {
    this.namespace = config.namespace || 'default';
    this.defaultTTL = config.ttl || 60 * 60 * 1000; // 1 hour default
    
    // Initialize default levels
    this.addLevel(new MemoryCacheProvider(config.maxSize), 1); // L1 - Memory (highest priority)
  }

  setMetricEmitter(emitter: EventEmitter): void {
    this.metricEmitter = emitter;
  }

  addLevel(provider: CacheProvider, weight: number): void {
    this.levels.push({ provider, weight });
    // Sort levels by weight (highest first)
    this.levels.sort((a, b) => b.weight - a.weight);
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.namespace}:${key}`;
    let value: T | null = null;
    let found = false;
    let level = 0;
    
    // Try to get from each level
    for (const { provider } of this.levels) {
      const result = await provider.get<T>(fullKey);
      
      if (result !== null) {
        value = result;
        found = true;
        
        // Propagate to higher levels if found in a lower level
        if (level > 0) {
          for (let i = 0; i < level; i++) {
            await this.levels[i].provider.set(fullKey, value);
          }
        }
        
        this.emitMetric('cache_hit', { key, level });
        break;
      }
      
      level++;
    }
    
    if (!found) {
      this.emitMetric('cache_miss', { key });
    }
    
    return value;
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const fullKey = `${this.namespace}:${key}`;
    const ttl = options?.ttl || this.defaultTTL;
    
    // Set in all levels
    for (const { provider } of this.levels) {
      await provider.set(fullKey, value, { 
        ttl,
        tags: options?.tags,
        volatility: options?.volatility
      });
    }
    
    // Track tags for invalidation
    if (options?.tags) {
      for (const tag of options.tags) {
        if (!this.cacheTags.has(tag)) {
          this.cacheTags.set(tag, new Set());
        }
        this.cacheTags.get(tag)?.add(key);
      }
    }
    
    // Track volatility for adaptive TTL
    if (options?.volatility !== undefined) {
      if (!this.volatilityTracker.has(key)) {
        this.volatilityTracker.set(key, []);
      }
      const history = this.volatilityTracker.get(key) || [];
      history.push(options.volatility);
      if (history.length > 10) history.shift();
      this.volatilityTracker.set(key, history);
    }
    
    this.emitMetric('cache_set', { key, ttl });
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = `${this.namespace}:${key}`;
    let success = true;
    
    // Delete from all levels
    for (const { provider } of this.levels) {
      const result = await provider.delete(fullKey);
      success = success && result;
    }
    
    // Clean up tag references
    for (const [tag, keys] of this.cacheTags.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.cacheTags.delete(tag);
        }
      }
    }
    
    this.emitMetric('cache_delete', { key });
    
    return success;
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.cacheTags.get(tag);
    if (!keys) return;
    
    const promises: Promise<boolean>[] = [];
    for (const key of keys) {
      promises.push(this.delete(key));
    }
    
    await Promise.all(promises);
    this.cacheTags.delete(tag);
    
    this.emitMetric('cache_invalidate_tag', { tag, keysAffected: keys.size });
  }

  async clear(): Promise<void> {
    // Clear all levels
    for (const { provider } of this.levels) {
      await provider.clear();
    }
    
    // Reset tags and volatility tracking
    this.cacheTags.clear();
    this.volatilityTracker.clear();
    
    this.emitMetric('cache_clear', {});
  }

  calculateAdaptiveTTL(key: string, baseTTL: number): number {
    const volatilityHistory = this.volatilityTracker.get(key);
    if (!volatilityHistory || volatilityHistory.length === 0) {
      return baseTTL;
    }
    
    // Calculate average volatility
    const avgVolatility = volatilityHistory.reduce((sum, v) => sum + v, 0) / volatilityHistory.length;
    
    // High volatility = shorter TTL, low volatility = longer TTL
    if (avgVolatility > 0.8) {
      return baseTTL / 2; // Highly volatile - half TTL
    } else if (avgVolatility < 0.2) {
      return baseTTL * 2; // Stable - double TTL
    }
    
    return baseTTL;
  }

  private emitMetric(name: string, data: Record<string, any>): void {
    if (this.metricEmitter) {
      this.metricEmitter.emit('metric', {
        name: `cache_${name}`,
        timestamp: Date.now(),
        ...data
      });
    }
  }
}

// Export provider implementations
export const createMemoryCacheProvider = (maxSize?: number) => new MemoryCacheProvider(maxSize);
export const createRedisCacheProvider = (redisUrl: string, namespace?: string) => 
  new RedisCacheProvider(redisUrl, namespace);
