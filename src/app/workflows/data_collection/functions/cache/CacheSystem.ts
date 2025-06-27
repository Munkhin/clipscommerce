/**
 * Integrated cache system that provides a unified interface for all caching needs
 */
import { CacheManager, CacheConfig, CacheSetOptions, createMemoryCacheProvider, createRedisCacheProvider } from './CacheManager';
import EventEmitter from 'events';

// Cache system configuration
export interface CacheSystemConfig {
  namespace: string;
  environment: 'development' | 'test' | 'production';
  redis?: {
    url: string;
  };
  ttl?: number;
  maxSize?: number;
  staleWhileRevalidate?: number;
  version?: string;
}

// Cache segment for different types of data
export type CacheSegment = 'posts' | 'profiles' | 'scans' | 'analytics' | 'metrics';

// Cache system implementation
export class CacheSystem {
  private readonly cacheManagers: Map<CacheSegment, CacheManager> = new Map();
  private readonly eventEmitter = new EventEmitter();
  private readonly environment: string;
  private readonly config: CacheSystemConfig;
  
  constructor(config: CacheSystemConfig) {
    this.config = config;
    this.environment = config.environment;
    
    // Initialize cache managers for each segment with appropriate TTLs
    this.initializeCacheManagers();
    
    // Forward events
    this.setupEventForwarding();
  }

  private initializeCacheManagers(): void {
    // Posts cache - shorter TTL for frequently changing data
    this.cacheManagers.set('posts', this.createCacheManager({
      namespace: `${this.config.namespace}:posts`,
      ttl: this.config.ttl || 60 * 60 * 1000, // 1 hour default
      maxSize: this.config.maxSize || 5000,
      staleWhileRevalidate: this.config.staleWhileRevalidate || 30 * 60 * 1000, // 30 minutes
      version: this.config.version,
      environment: this.config.environment
    }));
    
    // Profiles cache - longer TTL for more stable data
    this.cacheManagers.set('profiles', this.createCacheManager({
      namespace: `${this.config.namespace}:profiles`,
      ttl: (this.config.ttl || 60 * 60 * 1000) * 2, // 2x default TTL
      maxSize: this.config.maxSize || 1000,
      staleWhileRevalidate: this.config.staleWhileRevalidate || 60 * 60 * 1000, // 1 hour
      version: this.config.version,
      environment: this.config.environment
    }));
    
    // Scans cache - medium TTL
    this.cacheManagers.set('scans', this.createCacheManager({
      namespace: `${this.config.namespace}:scans`,
      ttl: this.config.ttl || 60 * 60 * 1000, // 1 hour default
      maxSize: this.config.maxSize || 1000,
      staleWhileRevalidate: this.config.staleWhileRevalidate || 2 * 60 * 60 * 1000, // 2 hours
      version: this.config.version,
      environment: this.config.environment
    }));
    
    // Analytics cache - longer TTL for processed data
    this.cacheManagers.set('analytics', this.createCacheManager({
      namespace: `${this.config.namespace}:analytics`,
      ttl: (this.config.ttl || 60 * 60 * 1000) * 3, // 3x default TTL
      maxSize: this.config.maxSize || 2000,
      staleWhileRevalidate: this.config.staleWhileRevalidate || 4 * 60 * 60 * 1000, // 4 hours
      version: this.config.version,
      environment: this.config.environment
    }));
    
    // Metrics cache - shorter TTL for rapidly changing data
    this.cacheManagers.set('metrics', this.createCacheManager({
      namespace: `${this.config.namespace}:metrics`,
      ttl: (this.config.ttl || 60 * 60 * 1000) / 2, // Half default TTL
      maxSize: this.config.maxSize || 10000,
      staleWhileRevalidate: this.config.staleWhileRevalidate || 10 * 60 * 1000, // 10 minutes
      version: this.config.version,
      environment: this.config.environment
    }));
  }

  private createCacheManager(config: CacheConfig): CacheManager {
    const cacheManager = new CacheManager(config);
    
    // Set up metric emitter
    cacheManager.setMetricEmitter(this.eventEmitter);
    
    // Add Redis provider if configured
    if (this.config.redis?.url && this.environment !== 'development') {
      cacheManager.addLevel(
        createRedisCacheProvider(this.config.redis.url, config.namespace),
        0.5 // Lower priority than memory cache
      );
    }
    
    return cacheManager;
  }

  private setupEventForwarding(): void {
    this.eventEmitter.on('metric', (metric) => {
      // Forward the metric event with additional context
      this.eventEmitter.emit('cache.metric', {
        ...metric,
        source: 'cache_system',
        environment: this.environment
      });
    });
  }

  getCacheManager(segment: CacheSegment): CacheManager {
    const manager = this.cacheManagers.get(segment);
    if (!manager) {
      throw new Error(`No cache manager found for segment: ${segment}`);
    }
    return manager;
  }

  async get<T>(segment: CacheSegment, key: string): Promise<T | null> {
    return this.getCacheManager(segment).get<T>(key);
  }

  async set<T>(segment: CacheSegment, key: string, value: T, options?: CacheSetOptions): Promise<void> {
    await this.getCacheManager(segment).set(key, value, options);
  }

  async delete(segment: CacheSegment, key: string): Promise<boolean> {
    return this.getCacheManager(segment).delete(key);
  }

  async invalidateByTag(segment: CacheSegment, tag: string): Promise<void> {
    await this.getCacheManager(segment).invalidateByTag(tag);
  }

  async clear(segment: CacheSegment): Promise<void> {
    await this.getCacheManager(segment).clear();
  }

  async clearAll(): Promise<void> {
    const promises = Array.from(this.cacheManagers.values()).map(manager => manager.clear());
    await Promise.all(promises);
  }

  calculateAdaptiveTTL(segment: CacheSegment, key: string, baseTTL: number): number {
    return this.getCacheManager(segment).calculateAdaptiveTTL(key, baseTTL);
  }

  on(event: 'cache.metric', handler: (metric: any) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: 'cache.metric', handler: (metric: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
}

// Create a default cache system for development
export const createDevCacheSystem = (namespace: string = 'socialschedule') => 
  new CacheSystem({
    namespace,
    environment: 'development',
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 1000,
    staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
    version: 'v1'
  });
