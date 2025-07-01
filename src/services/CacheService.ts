import Redis from 'ioredis';

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

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;
  private config: CacheConfig;
  private isConnected = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'clipscommerce:',
      defaultTTL: 3600, // 1 hour
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.initializeClient();
  }

  static getInstance(config?: Partial<CacheConfig>): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  private async initializeClient(): Promise<void> {
    try {
      // Check if Redis is available in the environment
      if (process.env.NODE_ENV === 'test' || !process.env.REDIS_HOST) {
        console.log('[CACHE] Redis not available, using in-memory cache fallback');
        this.isConnected = false;
        return;
      }

      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetries,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true,
      });

      this.client.on('connect', () => {
        console.log('[CACHE] Redis connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('[CACHE] Redis ready for commands');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        console.error('[CACHE] Redis error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('[CACHE] Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('[CACHE] Redis reconnecting...');
        this.isConnected = false;
      });

      // Attempt to connect
      await this.client.connect();
    } catch (error) {
      console.error('[CACHE] Failed to initialize Redis client:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  private generateKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        console.warn('[CACHE] Redis not available, skipping cache set');
        return;
      }

      const cacheKey = this.generateKey(key);
      const ttl = options.ttl || this.config.defaultTTL;
      const serializedValue = JSON.stringify(value);

      await this.client.setex(cacheKey, ttl, serializedValue);

      // Handle tags if provided
      if (options.tags && options.tags.length > 0) {
        const tagPromises = options.tags.map(tag => 
          this.client!.sadd(`${this.config.keyPrefix}tag:${tag}`, cacheKey)
        );
        await Promise.all(tagPromises);
      }

      console.log(`[CACHE] Set key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
      console.error('[CACHE] Error setting cache:', error);
      // Don't throw error, gracefully degrade
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client || !this.isConnected) {
        console.warn('[CACHE] Redis not available, returning null');
        return null;
      }

      const cacheKey = this.generateKey(key);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        return null;
      }

      const parsed = JSON.parse(value) as T;
      console.log(`[CACHE] Hit for key: ${key}`);
      return parsed;
    } catch (error) {
      console.error('[CACHE] Error getting cache:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        console.warn('[CACHE] Redis not available, skipping cache delete');
        return;
      }

      const cacheKey = this.generateKey(key);
      await this.client.del(cacheKey);
      console.log(`[CACHE] Deleted key: ${key}`);
    } catch (error) {
      console.error('[CACHE] Error deleting cache:', error);
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        console.warn('[CACHE] Redis not available, returning 0');
        return 0;
      }

      const fullPattern = this.generateKey(pattern);
      const keys = await this.client.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.client.del(...keys);
      console.log(`[CACHE] Deleted ${deleted} keys matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      console.error('[CACHE] Error deleting by pattern:', error);
      return 0;
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        console.warn('[CACHE] Redis not available, returning 0');
        return 0;
      }

      let deletedCount = 0;

      for (const tag of tags) {
        const tagKey = `${this.config.keyPrefix}tag:${tag}`;
        const keys = await this.client.smembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await this.client.del(...keys);
          deletedCount += deleted;
          
          // Clean up the tag set
          await this.client.del(tagKey);
        }
      }

      console.log(`[CACHE] Invalidated ${deletedCount} keys by tags: ${tags.join(', ')}`);
      return deletedCount;
    } catch (error) {
      console.error('[CACHE] Error invalidating by tags:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const cacheKey = this.generateKey(key);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('[CACHE] Error checking existence:', error);
      return false;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
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
    } catch (error) {
      console.error('[CACHE] Error in getOrSet:', error);
      // Fallback to factory function
      return await factory();
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not available');
      }

      const cacheKey = this.generateKey(key);
      const result = await this.client.incrby(cacheKey, amount);
      
      // Set expiration if it's a new key
      const ttl = await this.client.ttl(cacheKey);
      if (ttl === -1) {
        await this.client.expire(cacheKey, this.config.defaultTTL);
      }
      
      return result;
    } catch (error) {
      console.error('[CACHE] Error incrementing:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        console.warn('[CACHE] Redis not available, skipping cache clear');
        return;
      }

      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      
      console.log('[CACHE] Cleared all cache');
    } catch (error) {
      console.error('[CACHE] Error clearing cache:', error);
    }
  }

  async size(): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      return keys.length;
    } catch (error) {
      console.error('[CACHE] Error getting cache size:', error);
      return 0;
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      if (!this.client || !this.isConnected) {
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
          size: await this.size(),
          config: {
            host: this.config.host,
            port: this.config.port,
            db: this.config.db
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        console.log('[CACHE] Disconnected from Redis');
      }
    } catch (error) {
      console.error('[CACHE] Error disconnecting:', error);
    }
  }

  // Getter for connection status
  get connected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();