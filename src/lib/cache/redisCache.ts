/**
 * Redis Caching System
 * Provides caching for client lists, payment histories, and other frequently accessed data
 */

import { extractErrorMessage, logError, safeCacheKey } from '@/lib/errors/errorHandling';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelay: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

export class RedisCache {
  private static instance: RedisCache;
  private config: CacheConfig;
  private client: Map<string, string> | null = null; // Redis client simulation
  private isConnected = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0
  };
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'team_dashboard:',
      defaultTTL: 3600, // 1 hour
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.initializeClient();
  }

  static getInstance(config?: Partial<CacheConfig>): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache(config);
    }
    return RedisCache.instance;
  }

  /**
   * Initialize Redis client
   */
  private async initializeClient(): Promise<void> {
    try {
      // In production, you would use a real Redis client like ioredis
      // For now, we'll simulate with a Map-based cache
      this.client = new Map();
      this.isConnected = true;
      
      console.log('[CACHE] Redis cache initialized');
    } catch (error) {
      const cacheError = createCacheError(error, 'set', 'init');
      logError(cacheError);
      console.error('[CACHE] Failed to initialize Redis client:', cacheError.message);
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Set cache entry
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<void> {
    const tags = options.tags || [];
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const cacheKey = this.generateKey(key);
      const ttl = options.ttl || this.config.defaultTTL;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        tags
      };

      // Store in cache
      if (this.client) {
        this.client.set(cacheKey, JSON.stringify(entry));

        // Update tag index
        tags.forEach(tag => {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(cacheKey);
        });

        // Set expiration (simulated)
        setTimeout(() => {
          if (this.client) {
            this.client.delete(cacheKey);
            this.removeFromTagIndex(cacheKey, tags);
          }
        }, ttl * 1000);
      }

      this.stats.sets++;
      console.log(`[CACHE] Set key: ${key} with TTL: ${ttl}s`);
    } catch (error: unknown) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'set', key, tags);
      logError(cacheError);
      console.error('[CACHE] Error setting cache:', cacheError.message);
      throw cacheError;
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const cacheKey = this.generateKey(key);
      const cached = this.client?.get(cacheKey);

      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = safeCacheValue<CacheEntry<T>>(JSON.parse(cached)) || { data: null as T, timestamp: 0, ttl: 0, tags: [] };

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      
      console.log(`[CACHE] Hit for key: ${key}`);
      return entry.data;
    } catch (error: unknown) {
      this.stats.errors++;
      this.stats.misses++;
      const cacheError = createCacheError(error, 'get', key);
      logError(cacheError);
      console.error('[CACHE] Error getting cache:', cacheError.message);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const cacheKey = this.generateKey(key);
      const cached = this.client?.get(cacheKey);

      if (cached) {
        const entry: CacheEntry = safeCacheValue<CacheEntry>(JSON.parse(cached)) || { data: null, timestamp: 0, ttl: 0, tags: [] };
        this.removeFromTagIndex(cacheKey, entry.tags);
      }

      this.client?.delete(cacheKey);
      this.stats.deletes++;
      
      console.log(`[CACHE] Deleted key: ${key}`);
    } catch (error: unknown) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'delete', key);
      logError(cacheError);
      console.error('[CACHE] Error deleting cache:', cacheError.message);
      throw cacheError;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const regex = new RegExp(pattern.replace('*', '.*'));
      let deletedCount = 0;

      if (this.client) {
        for (const key of this.client.keys()) {
          if (regex.test(key)) {
            this.client.delete(key);
            deletedCount++;
          }
        }
      }

      this.stats.deletes += deletedCount;
      console.log(`[CACHE] Deleted ${deletedCount} keys matching pattern: ${pattern}`);
      
      return deletedCount;
    } catch (error: unknown) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'pattern', pattern);
      logError(cacheError);
      console.error('[CACHE] Error deleting by pattern:', cacheError.message);
      throw cacheError;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const keysToDelete = new Set<string>();

      tags.forEach(tag => {
        const taggedKeys = this.tagIndex.get(tag);
        if (taggedKeys) {
          taggedKeys.forEach(key => keysToDelete.add(key));
        }
      });

      let deletedCount = 0;
      for (const key of keysToDelete) {
        this.client?.delete(key);
        deletedCount++;
      }

      // Clean up tag index
      tags.forEach(tag => {
        this.tagIndex.delete(tag);
      });

      this.stats.deletes += deletedCount;
      console.log(`[CACHE] Invalidated ${deletedCount} keys by tags: ${tags.join(', ')}`);
      
      return deletedCount;
    } catch (error: unknown) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'tags', undefined, tags);
      logError(cacheError);
      console.error('[CACHE] Error invalidating by tags:', cacheError.message);
      throw cacheError;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const cacheKey = this.generateKey(key);
      return this.client?.has(cacheKey) || false;
    } catch (error) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'get', key);
      logError(cacheError);
      console.error('[CACHE] Error checking existence:', cacheError.message);
      return false;
    }
  }

  /**
   * Get or set cache entry
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Generate data and cache it
      const data = await factory();
      await this.set(key, data, options);
      
      return data;
    } catch (error: unknown) {
      const cacheError = createCacheError(error, 'get', key);
      logError(cacheError);
      console.error('[CACHE] Error in getOrSet:', cacheError.message);
      // Fallback to factory function
      return await factory();
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const cacheKey = this.generateKey(key);
      const current = await this.get<number>(key) || 0;
      const newValue = current + amount;
      
      await this.set(key, newValue, { ttl: this.config.defaultTTL });
      
      return newValue;
    } catch (error: unknown) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'set', key);
      logError(cacheError);
      console.error('[CACHE] Error incrementing:', cacheError.message);
      throw cacheError;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateHitRate();
    return { ...this.stats };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      this.client?.clear();
      this.tagIndex.clear();
      
      console.log('[CACHE] Cleared all cache');
    } catch (error: unknown) {
      this.stats.errors++;
      const cacheError = createCacheError(error, 'clear');
      logError(cacheError);
      console.error('[CACHE] Error clearing cache:', cacheError.message);
      throw cacheError;
    }
  }

  /**
   * Get cache size
   */
  async size(): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      return this.client?.size || 0;
    } catch (error: unknown) {
      const cacheError = createCacheError(error, 'get', 'size');
      logError(cacheError);
      console.error('[CACHE] Error getting cache size:', cacheError.message);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: { error: 'Not connected to Redis' }
        };
      }

      // Test basic operations
      const testKey = 'health_check_test';
      await this.set(testKey, 'test_value', { ttl: 10 });
      const value = await this.get(testKey);
      await this.delete(testKey);

      if (value !== 'test_value') {
        return {
          status: 'unhealthy',
          details: { error: 'Cache operations failed' }
        };
      }

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          stats: this.getStats(),
          size: await this.size()
        }
      };
    } catch (error: unknown) {
      const cacheError = createCacheError(error, 'get', 'health_check');
      logError(cacheError);
      return {
        status: 'unhealthy',
        details: { error: cacheError.message }
      };
    }
  }

  /**
   * Remove key from tag index
   */
  private removeFromTagIndex(key: string, tags: string[]): void {
    tags.forEach(tag => {
      const taggedKeys = this.tagIndex.get(tag);
      if (taggedKeys) {
        taggedKeys.delete(key);
        if (taggedKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        // In production, you would call client.disconnect()
        this.client.clear();
        this.client = null;
        this.isConnected = false;
        console.log('[CACHE] Disconnected from Redis');
      }
    } catch (error: unknown) {
      const cacheError = createCacheError(error, 'clear', 'disconnect');
      logError(cacheError);
      console.error('[CACHE] Error disconnecting:', cacheError.message);
    }
  }
}

// Cache helper functions for specific use cases
export class CacheHelpers {
  private static cache = RedisCache.getInstance();

  /**
   * Cache client list
   */
  static async cacheClientList(
    teamId: string,
    userId: string,
    clients: unknown[],
    ttl: number = 300 // 5 minutes
  ): Promise<void> {
    const key = `clients:${teamId}:${userId}`;
    await this.cache.set(key, clients, {
      ttl,
      tags: ['clients', `team:${teamId}`, `user:${userId}`]
    });
  }

  /**
   * Get cached client list
   */
  static async getCachedClientList(
    teamId: string,
    userId: string
  ): Promise<unknown[] | null> {
    const key = `clients:${teamId}:${userId}`;
    return await this.cache.get(key);
  }

  /**
   * Cache payment history
   */
  static async cachePaymentHistory(
    teamId: string,
    payments: unknown[],
    ttl: number = 1800 // 30 minutes
  ): Promise<void> {
    const key = `payments:${teamId}`;
    await this.cache.set(key, payments, {
      ttl,
      tags: ['payments', `team:${teamId}`]
    });
  }

  /**
   * Get cached payment history
   */
  static async getCachedPaymentHistory(teamId: string): Promise<unknown[] | null> {
    const key = `payments:${teamId}`;
    return await this.cache.get(key);
  }

  /**
   * Cache user session
   */
  static async cacheUserSession(
    userId: string,
    sessionData: Record<string, unknown>,
    ttl: number = 3600 // 1 hour
  ): Promise<void> {
    const key = `session:${userId}`;
    await this.cache.set(key, sessionData, {
      ttl,
      tags: ['sessions', `user:${userId}`]
    });
  }

  /**
   * Get cached user session
   */
  static async getCachedUserSession(userId: string): Promise<Record<string, unknown> | null> {
    const key = `session:${userId}`;
    return await this.cache.get(key);
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.invalidateByTags([`user:${userId}`]);
  }

  /**
   * Invalidate team-related cache
   */
  static async invalidateTeamCache(teamId: string): Promise<void> {
    await this.cache.invalidateByTags([`team:${teamId}`]);
  }

  /**
   * Cache analytics data
   */
  static async cacheAnalytics(
    teamId: string,
    period: string,
    data: Record<string, unknown>,
    ttl: number = 900 // 15 minutes
  ): Promise<void> {
    const key = `analytics:${teamId}:${period}`;
    await this.cache.set(key, data, {
      ttl,
      tags: ['analytics', `team:${teamId}`]
    });
  }

  /**
   * Get cached analytics
   */
  static async getCachedAnalytics(
    teamId: string,
    period: string
  ): Promise<Record<string, unknown> | null> {
    const key = `analytics:${teamId}:${period}`;
    return await this.cache.get(key);
  }
}

// Export singleton instance
export const redisCache = RedisCache.getInstance();

// Error type guard and handling utilities
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

function createCacheError(error: unknown, operation: string, key?: string, tags?: string[]): Error {
  const message = getErrorMessage(error);
  const errorMsg = `Cache ${operation} failed${key ? ` for key: ${key}` : ''}${tags ? ` with tags: ${tags.join(', ')}` : ''}: ${message}`;
  
  if (isError(error)) {
    const cacheError = new Error(errorMsg);
    cacheError.stack = error.stack;
    return cacheError;
  }
  
  return new Error(errorMsg);
}

function safeCacheValue<T>(value: unknown): T | null {
  try {
    return value as T;
  } catch (error: unknown) {
    console.warn('[CACHE] Failed to parse cache value:', getErrorMessage(error));
    return null;
  }
} 