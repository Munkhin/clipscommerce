import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }
}
