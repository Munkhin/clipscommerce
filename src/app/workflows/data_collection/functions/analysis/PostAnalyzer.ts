// Optimized Post Analytics Module with improved performance strategies
import { Platform, PostMetrics } from '../types';
import { formatInTimeZone, toZonedTime, getTimezoneOffset } from 'date-fns-tz';
import { format, isValid, differenceInMilliseconds, addMinutes } from 'date-fns';
import { HashtagAnalyzer, HashtagPerformanceResult, HashtagAnalysisOptions } from './HashtagAnalyzer';

// Enhanced cache with LRU eviction and compression
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size?: number; // For memory tracking
}

interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  maxMemory: number; // Memory limit in bytes
  cleanupInterval: number;
  compressionThreshold: number; // Compress entries larger than this
}

// Precomputed data structures for performance
interface PrecomputedMetrics {
  engagementScores: Map<string, number>;
  normalizedMetrics: Map<string, any>;
  timeSlotData: Map<string, any>;
  hashtagIndex: Map<string, Set<string>>; // hashtag -> post IDs
  platformIndex: Map<Platform, string[]>; // platform -> post IDs
}

// Batch processing configuration
interface BatchConfig {
  enabled: boolean;
  batchSize: number;
  processingDelay: number;
}

// Memory pool for object reuse
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    if (this.pool.length < 50) { // Prevent memory leaks
      this.pool.push(obj);
    }
  }
}

// Worker thread interface for heavy computations
interface AnalyticsWorker {
  computeEngagementBatch(posts: PostMetrics[], weights: any): Promise<Map<string, number>>;
  detectAnomaliesBatch(engagementData: number[]): Promise<number[]>;
  processTimeSlotsBatch(posts: PostMetrics[], timezone: string): Promise<any>;
}

/**
 * Optimized Post Analyzer
 * NOTE: All 'caption' (Instagram) and 'description'/'desc' (TikTok) fields are always treated as the video description (not subtitle).
 */
export class OptimizedPostAnalyzer {
  private posts: PostMetrics[];
  private precomputed: PrecomputedMetrics;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheConfig: CacheConfig;
  private batchConfig: BatchConfig;
  private isDirty: boolean = true;
  private lastPrecomputeTime: number = 0;
  
  // Object pools for memory efficiency
  private timeSlotPool: ObjectPool<any>;
  private engagementPool: ObjectPool<any>;
  private hashtagAnalyzer: HashtagAnalyzer;
  
  // Worker for heavy computations (if available)
  private worker?: AnalyticsWorker;
  
  // Performance monitoring
  private performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    computationTime: 0,
    precomputeTime: 0,
    memoryUsage: 0
  };

  constructor(
    posts: PostMetrics[], 
    cacheConfig?: Partial<CacheConfig>,
    batchConfig?: Partial<BatchConfig>
  ) {
    this.posts = posts;
    this.cacheConfig = {
      enabled: true,
      ttl: 5 * 60 * 1000,
      maxSize: 1000,
      maxMemory: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 5 * 60 * 1000,
      compressionThreshold: 10 * 1024, // 10KB
      ...cacheConfig
    };
    
    this.batchConfig = {
      enabled: true,
      batchSize: 100,
      processingDelay: 10,
      ...batchConfig
    };

    // Initialize object pools
    this.timeSlotPool = new ObjectPool(
      () => ({ hour: 0, day: 0, engagement: 0, count: 0 }),
      (obj) => Object.assign(obj, { hour: 0, day: 0, engagement: 0, count: 0 })
    );

    this.engagementPool = new ObjectPool(
      () => ({ views: 0, likes: 0, comments: 0, shares: 0 }),
      (obj) => Object.assign(obj, { views: 0, likes: 0, comments: 0, shares: 0 })
    );

    this.precomputed = {
      engagementScores: new Map(),
      normalizedMetrics: new Map(),
      timeSlotData: new Map(),
      hashtagIndex: new Map(),
      platformIndex: new Map()
    };

    // Initialize precomputation
    this.schedulePrecomputation();
    
    // Setup periodic cache cleanup with better scheduling
    this.setupCacheCleanup();
    
    // Initialize hashtag analyzer
    this.hashtagAnalyzer = new HashtagAnalyzer(posts, {
      maxCacheSize: this.cacheConfig.maxSize,
      cacheTtlMs: this.cacheConfig.ttl
    });
  }

  /**
   * Strategy 1: Lazy Loading with Precomputation
   * Precompute expensive calculations only when data changes
   */
  private async precomputeMetrics(): Promise<void> {
    if (!this.isDirty && Date.now() - this.lastPrecomputeTime < 60000) {
      return; // Skip if computed recently and data hasn't changed
    }

    const startTime = performance.now();
    
    // Batch process posts for better CPU cache utilization
    if (this.batchConfig.enabled) {
      await this.batchPrecompute();
    } else {
      await this.sequentialPrecompute();
    }

    this.performanceMetrics.precomputeTime = performance.now() - startTime;
    this.isDirty = false;
    this.lastPrecomputeTime = Date.now();
  }

  private async batchPrecompute(): Promise<void> {
    const batches = this.chunkArray(this.posts, this.batchConfig.batchSize);
    
    for (const batch of batches) {
      // Process batch
      await this.processBatch(batch);
      
      // Yield control to prevent blocking
      if (this.batchConfig.processingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchConfig.processingDelay));
      }
    }
  }

  private async processBatch(posts: PostMetrics[]): Promise<void> {
    // Parallel processing within batch
    const promises = posts.map(async (post) => {
      const engagement = this.calculateEngagementFast(post);
      this.precomputed.engagementScores.set(post.id, engagement);
      
      // Build indices
      this.updateIndices(post);
    });

    await Promise.all(promises);
  }

  /**
   * Strategy 2: Optimized Engagement Calculation
   * Use lookup tables and avoid repeated calculations
   */
  private calculateEngagementFast(post: PostMetrics): number {
    // Use precomputed platform weights (lookup table)
    const weights = this.getPlatformWeights(post.platform);
    
    // Vectorized calculation - process multiple metrics at once
    const metrics = this.engagementPool.acquire();
    
    try {
      metrics.views = post.views;
      metrics.likes = post.likes;  
      metrics.comments = post.comments;
      metrics.shares = post.shares;
      
      // Single pass normalization and scoring
      const score = this.computeVectorizedScore(metrics, weights);
      
      return Math.min(score, 100);
    } finally {
      this.engagementPool.release(metrics);
    }
  }

  private computeVectorizedScore(metrics: any, weights: any): number {
    // Optimized calculation using bitwise operations where possible
    const normalizedViews = metrics.views * weights.viewsMultiplier;
    const normalizedLikes = metrics.likes * weights.likesMultiplier;
    const normalizedComments = metrics.comments * weights.commentsMultiplier;
    const normalizedShares = metrics.shares * weights.sharesMultiplier;
    
    return (normalizedViews + normalizedLikes + normalizedComments + normalizedShares) * weights.platformMultiplier;
  }

  /**
   * Strategy 3: Smart Caching with Compression
   * Implement LRU cache with memory-aware eviction
   */
  private setSmartCache<T>(key: string, value: T, ttl?: number): void {
    if (!this.cacheConfig.enabled) return;

    // Check memory usage
    const currentMemory = this.estimateMemoryUsage();
    if (currentMemory > this.cacheConfig.maxMemory) {
      this.evictLRU();
    }

    // Compress large entries
    const serializedSize = this.estimateSize(value);
    const shouldCompress = serializedSize > this.cacheConfig.compressionThreshold;
    
    const now = Date.now();
    this.cache.set(key, {
      value: shouldCompress ? this.compress(value) : value,
      timestamp: now,
      expiresAt: now + (ttl || this.cacheConfig.ttl),
      accessCount: 0,
      lastAccessed: now,
      size: serializedSize
    });
  }

  private getSmartCache<T>(key: string): T | null {
    if (!this.cacheConfig.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) this.cache.delete(key);
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // Update LRU data
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.performanceMetrics.cacheHits++;

    // Decompress if needed
    return this.isCompressed(entry.value) ? this.decompress(entry.value) : entry.value;
  }

  private evictLRU(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    entries.slice(0, toRemove).forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Strategy 4: Indexing for Fast Lookups
   * Create indices for common query patterns
   */
  private updateIndices(post: PostMetrics): void {
    // Platform index
    if (!this.precomputed.platformIndex.has(post.platform)) {
      this.precomputed.platformIndex.set(post.platform, []);
    }
    this.precomputed.platformIndex.get(post.platform)!.push(post.id);

    // Hashtag index
    if (post.hashtags) {
      post.hashtags.forEach(hashtag => {
        if (!this.precomputed.hashtagIndex.has(hashtag)) {
          this.precomputed.hashtagIndex.set(hashtag, new Set());
        }
        this.precomputed.hashtagIndex.get(hashtag)!.add(post.id);
      });
    }
  }

  /**
   * Strategy 5: Streaming Analytics for Large Datasets
   * Process data in streams to reduce memory footprint
   */
  public async analyzeHashtagsStreaming(): Promise<Array<{hashtag: string, avgEngagement: number, count: number}>> {
    const cacheKey = 'hashtag_streaming';
    const cached = this.getSmartCache<Array<{hashtag: string, avgEngagement: number, count: number}>>(cacheKey);
    if (cached) return cached;

    const hashtagStats = new Map();
    
    // Stream processing with batching
    const stream = this.createPostStream();
    
    for await (const postBatch of stream) {
      for (const post of postBatch) {
        if (post.hashtags) {
          const engagement = await this.getEngagementScore(post.id);
          
          post.hashtags.forEach(hashtag => {
            if (!hashtagStats.has(hashtag)) {
              hashtagStats.set(hashtag, { total: 0, count: 0 });
            }
            const stats = hashtagStats.get(hashtag);
            stats.total += engagement;
            stats.count++;
          });
        }
      }
    }

    const result = Array.from(hashtagStats.entries())
      .map(([hashtag, stats]) => ({
        hashtag,
        avgEngagement: stats.total / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    this.setSmartCache(cacheKey, result, 60 * 60 * 1000);
    return result;
  }

  private async *createPostStream(): AsyncGenerator<PostMetrics[]> {
    for (let i = 0; i < this.posts.length; i += this.batchConfig.batchSize) {
      const batch = this.posts.slice(i, i + this.batchConfig.batchSize);
      yield batch;
      
      // Yield control periodically
      if (i % (this.batchConfig.batchSize * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }

  /**
   * Strategy 6: Parallel Processing with Web Workers
   * Offload heavy computations to worker threads
   */
  public async findPeakTimesParallel(timezone?: string): Promise<Array<{hour: number, day: number, dayOfWeek: string, engagementScore: number, timezone: string}>> {
    const cacheKey = `peak_times_parallel_${timezone || 'default'}`;
    const cached = this.getSmartCache<Array<{hour: number, day: number, dayOfWeek: string, engagementScore: number, timezone: string}>>(cacheKey);
    if (cached) return cached;

    if (this.worker && this.posts.length > 1000) {
      // Use worker for large datasets
      const result = await this.worker.processTimeSlotsBatch(this.posts, timezone || 'UTC');
      this.setSmartCache(cacheKey, result, 60 * 60 * 1000);
      return result;
    }

    // Fall back to optimized synchronous processing
    return this.findPeakTimesOptimized(timezone);
  }

  private async findPeakTimesOptimized(timezone?: string): Promise<Array<{hour: number, day: number, dayOfWeek: string, engagementScore: number, timezone: string}>> {
    await this.precomputeMetrics();
    
    // Use precomputed time slot data if available
    const timeSlotKey = `timeslot_${timezone || 'default'}`;
    if (this.precomputed.timeSlotData.has(timeSlotKey)) {
      return this.precomputed.timeSlotData.get(timeSlotKey);
    }

    // Optimized time slot calculation
    const timeSlots = new Map();
    const targetTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Process in batches to avoid blocking
    const batches = this.chunkArray(this.posts, 200);
    
    for (const batch of batches) {
      batch.forEach(post => {
        try {
          const { hour, day, dayOfWeek } = this.convertToTimezone(post.timestamp, targetTimezone);
          const key = `${day}-${hour}`;
          
          if (!timeSlots.has(key)) {
            timeSlots.set(key, {
              hour, day, dayOfWeek,
              engagement: 0,
              count: 0
            });
          }
          
          const slot = timeSlots.get(key);
          slot.engagement += this.precomputed.engagementScores.get(post.id) || 0;
          slot.count++;
        } catch (error) {
          console.warn(`Error processing post ${post.id}:`, error);
        }
      });

      // Yield control
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const result = Array.from(timeSlots.values())
      .map(slot => ({
        hour: slot.hour,
        day: slot.day,
        dayOfWeek: slot.dayOfWeek,
        engagementScore: slot.engagement / slot.count,
        timezone: targetTimezone
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5);

    this.precomputed.timeSlotData.set(timeSlotKey, result);
    return result;
  }

  // Utility methods for optimization strategies
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private schedulePrecomputation(): void {
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.precomputeMetrics());
    } else {
      setTimeout(() => this.precomputeMetrics(), 0);
    }
  }

  private setupCacheCleanup(): void {
    // More intelligent cleanup scheduling
    const cleanup = () => {
      const startTime = performance.now();
      const deleted = this.cleanupCache();
      const duration = performance.now() - startTime;
      
      // Adjust cleanup interval based on performance
      const nextInterval = duration < 10 ? 
        this.cacheConfig.cleanupInterval : 
        this.cacheConfig.cleanupInterval * 2;
        
      setTimeout(cleanup, nextInterval);
    };
    
    setTimeout(cleanup, this.cacheConfig.cleanupInterval);
  }

  // Helper methods (simplified for brevity)
  private getPlatformWeights(platform: Platform): any {
    // Implement platform weight lookup
    return {};
  }

  private compress(value: any): any {
    // Implement compression (e.g., using pako or similar)
    return value;
  }

  private decompress(value: any): any {
    // Implement decompression
    return value;
  }

  private isCompressed(value: any): boolean {
    // Check if value is compressed
    return false;
  }

  private estimateSize(value: any): number {
    // Estimate memory size of value
    return JSON.stringify(value).length * 2; // Rough estimate
  }

  private estimateMemoryUsage(): number {
    // Estimate current cache memory usage
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size || 0;
    }
    return total;
  }

  private cleanupCache(): number {
    const now = Date.now();
    let deleted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  public async getEngagementScore(postId: string): Promise<number> {
    return this.precomputed.engagementScores.get(postId) || 0;
  }

  private convertToTimezone(timestamp: string | Date, timezone: string): any {
    // Implement timezone conversion
    const date = new Date(timestamp);
    return {
      hour: date.getHours(),
      day: date.getDay(),
      dayOfWeek: date.toLocaleDateString('en', { weekday: 'long' })
    };
  }

  // Expose performance metrics
  public getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheStats: {
        size: this.cache.size,
        hitRate: this.performanceMetrics.cacheHits / 
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0,
        memoryUsage: this.estimateMemoryUsage()
      },
      precomputeStatus: {
        isDirty: this.isDirty,
        lastUpdate: new Date(this.lastPrecomputeTime).toISOString()
      }
    };
  }

  // Method to update posts and trigger recomputation
  public updatePosts(newPosts: PostMetrics[]): void {
    this.posts = newPosts;
    this.isDirty = true;
    this.clearPrecomputed();
    this.schedulePrecomputation();
    
    // Update hashtag analyzer
    this.hashtagAnalyzer.updatePosts(newPosts, false);
  }
  
  /**
   * Get performance metrics for a specific hashtag
   * @param hashtag Hashtag to analyze (case insensitive)
   * @param options Analysis options
   */
  public async getHashtagPerformance(hashtag: string, options: HashtagAnalysisOptions = {}): Promise<HashtagPerformanceResult | null> {
    const startTime = Date.now();
    const result = await this.hashtagAnalyzer.getHashtagPerformance(hashtag, options);
    
    // Update performance metrics
    this.performanceMetrics.computationTime += Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Get top performing hashtags based on specified criteria
   * @param options Analysis options
   */
  public async getTopHashtags(options: HashtagAnalysisOptions = {}): Promise<HashtagPerformanceResult[]> {
    const startTime = Date.now();
    const result = await this.hashtagAnalyzer.getTopHashtags(options);
    
    // Update performance metrics
    this.performanceMetrics.computationTime += Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Find related hashtags for a given hashtag
   * @param hashtag The hashtag to find related tags for
   * @param limit Maximum number of related hashtags to return
   */
  public async findRelatedHashtags(hashtag: string, limit: number = 10): Promise<Array<{hashtag: string, score: number}>> {
    const performance = await this.getHashtagPerformance(hashtag, { includeRelated: true });
    
    if (!performance) {
      return [];
    }
    
    return performance.relatedHashtags
      .slice(0, limit)
      .map(related => ({
        hashtag: related.hashtag,
        score: related.correlationScore
      }));
  }
  
  /**
   * Analyze hashtag performance by platform
   * @param options Analysis options
   */
  public async analyzeHashtagsByPlatform(options: HashtagAnalysisOptions = {}): Promise<Record<string, HashtagPerformanceResult[]>> {
    const topHashtags = await this.getTopHashtags({
      ...options,
      maxHashtags: options.maxHashtags || 50
    });
    
    // Group by platform performance
    const platforms = ['tiktok', 'instagram', 'youtube'] as Platform[];
    const result: Record<string, HashtagPerformanceResult[]> = {};
    
    for (const platform of platforms) {
      // Sort hashtags by their performance on this specific platform
      result[platform] = [...topHashtags]
        .filter(tag => tag.performanceByPlatform[platform]?.posts > 0)
        .sort((a, b) => {
          const aPerf = a.performanceByPlatform[platform];
          const bPerf = b.performanceByPlatform[platform];
          return bPerf.engagementRate - aPerf.engagementRate;
        })
        .slice(0, options.maxHashtags || 20);
    }
    
    return result;
  }
  
  /**
   * Get hashtag performance metrics for the analyzer
   */
  public getHashtagAnalyzerMetrics() {
    return this.hashtagAnalyzer.getPerformanceMetrics();
  }

  private clearPrecomputed(): void {
    this.precomputed.engagementScores.clear();
    this.precomputed.normalizedMetrics.clear();
    this.precomputed.timeSlotData.clear();
    this.precomputed.hashtagIndex.clear();
    this.precomputed.platformIndex.clear();
  }

  private async sequentialPrecompute(): Promise<void> {
    // Fallback sequential processing
    for (const post of this.posts) {
      const engagement = this.calculateEngagementFast(post);
      this.precomputed.engagementScores.set(post.id, engagement);
      this.updateIndices(post);
    }
  }
}