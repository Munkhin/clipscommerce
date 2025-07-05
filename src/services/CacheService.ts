import Redis from 'ioredis';

export class CacheService {
  private redis: Redis | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Check if Redis URL is configured
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
        this.isEnabled = true;
      } catch (error) {
        console.warn('[CACHE] Failed to initialize Redis client:', error);
        this.isEnabled = false;
      }
    } else {
      console.warn('[CACHE] Redis URL not configured. Caching will be disabled.');
      this.isEnabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }
    
    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      console.warn('[CACHE] Failed to get cache value:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }
    
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.warn('[CACHE] Failed to set cache value:', error);
    }
  }
}
