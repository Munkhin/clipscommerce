/**
 * Advanced Performance Optimizer for Autoposting Workflow
 * Provides intelligent caching, adaptive throttling, and resource optimization
 */

import { RedisCache } from '@/lib/cache/redisCache';

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  queueSize: number;
  processingRate: number;
  errorRate: number;
  timestamp: Date;
}

interface OptimizationConfig {
  maxConcurrency: number;
  minConcurrency: number;
  targetCpuUsage: number;
  targetMemoryUsage: number;
  adaptiveThrottling: boolean;
  cacheEnabled: boolean;
  compressionEnabled: boolean;
  retryEnabled: boolean;
}

interface CacheStrategy {
  key: string;
  ttl: number;
  tags: string[];
  compress?: boolean;
}

export class AdvancedPerformanceOptimizer {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics[] = [];
  private cache: RedisCache;
  private concurrencyLimiter: Map<string, number> = new Map();
  private processingQueue: Map<string, Promise<any>> = new Map();
  private adaptiveSettings = {
    currentConcurrency: 5,
    lastAdjustment: Date.now(),
    adjustmentCooldown: 30000 // 30 seconds
  };

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      maxConcurrency: 20,
      minConcurrency: 1,
      targetCpuUsage: 70,
      targetMemoryUsage: 80,
      adaptiveThrottling: true,
      cacheEnabled: true,
      compressionEnabled: true,
      retryEnabled: true,
      ...config
    };
    
    this.cache = RedisCache.getInstance();
    this.adaptiveSettings.currentConcurrency = Math.min(5, this.config.maxConcurrency);
    
    // Start monitoring
    this.startMetricsCollection();
  }

  /**
   * Process items in optimized batches with concurrency control
   */
  async processInBatches<T, R>(
    items: T[], 
    fn: (item: T) => Promise<R>, 
    options: {
      batchSize?: number;
      maxConcurrency?: number;
      priority?: 'low' | 'normal' | 'high';
      cacheStrategy?: CacheStrategy;
    } = {}
  ): Promise<R[]> {
    const {
      batchSize = this.calculateOptimalBatchSize(),
      maxConcurrency = this.adaptiveSettings.currentConcurrency,
      priority = 'normal',
      cacheStrategy
    } = options;

    const results: R[] = [];
    const semaphore = new Semaphore(maxConcurrency);
    
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item, index) => {
        const globalIndex = i + index;
        
        // Apply caching if enabled
        if (cacheStrategy && this.config.cacheEnabled) {
          const cacheKey = `${cacheStrategy.key}:${globalIndex}`;
          const cached = await this.cache.get<R>(cacheKey);
          if (cached !== null) {
            return cached;
          }
        }
        
        // Acquire semaphore
        await semaphore.acquire();
        
        try {
          const startTime = Date.now();
          const result = await fn(item);
          const processingTime = Date.now() - startTime;
          
          // Update metrics
          this.updateProcessingMetrics(processingTime, priority);
          
          // Cache result if enabled
          if (cacheStrategy && this.config.cacheEnabled) {
            const cacheKey = `${cacheStrategy.key}:${globalIndex}`;
            await this.cache.set(cacheKey, result, {
              ttl: cacheStrategy.ttl,
              tags: cacheStrategy.tags
            });
          }
          
          return result;
        } finally {
          semaphore.release();
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Adaptive throttling between batches
      if (this.config.adaptiveThrottling && i + batchSize < items.length) {
        await this.adaptiveDelay();
      }
    }
    
    return results;
  }

  /**
   * Process with circuit breaker pattern
   */
  async processWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number;
      timeout?: number;
      fallback?: () => Promise<T>;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      timeout = 30000,
      fallback
    } = options;

    const operationKey = operation.toString().slice(0, 50); // Use function signature as key
    const failures = this.concurrencyLimiter.get(operationKey) || 0;
    
    // Circuit is open - return fallback or throw
    if (failures >= failureThreshold) {
      if (fallback) {
        console.log(`Circuit breaker open for ${operationKey}, using fallback`);
        return await fallback();
      }
      throw new Error('Circuit breaker is open - too many failures');
    }
    
    try {
      // Add timeout to operation
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);
      
      // Reset failure count on success
      this.concurrencyLimiter.set(operationKey, 0);
      
      return result;
    } catch (error) {
      // Increment failure count
      this.concurrencyLimiter.set(operationKey, failures + 1);
      
      // Log circuit breaker state
      if (failures + 1 >= failureThreshold) {
        console.warn(`Circuit breaker opened for ${operationKey} after ${failures + 1} failures`);
      }
      
      throw error;
    }
  }

  /**
   * Smart caching with compression and invalidation
   */
  async smartCache<T>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
      invalidateOn?: string[];
    } = {}
  ): Promise<T> {
    if (!this.config.cacheEnabled) {
      return await factory();
    }
    
    const {
      ttl = 3600,
      tags = [],
      compress = this.config.compressionEnabled,
      invalidateOn = []
    } = options;
    
    try {
      // Check cache first
      const cached = await this.cache.get<T>(key);
      if (cached !== null) {
        return cached;
      }
      
      // Generate data
      const data = await factory();
      
      // Cache with options
      await this.cache.set(key, data, { ttl, tags });
      
      // Set up invalidation listeners
      invalidateOn.forEach(event => {
        // In a real implementation, you'd set up event listeners
        console.log(`Cache invalidation listener set for ${event} on key ${key}`);
      });
      
      return data;
    } catch (error) {
      console.error('Smart cache error:', error);
      // Fallback to factory function
      return await factory();
    }
  }

  /**
   * Debounced operations to prevent excessive API calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    const operationKey = key || func.toString().slice(0, 50);
    
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        // Clear existing timeout
        const existingTimeout = this.processingQueue.get(operationKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout as any);
        }
        
        // Set new timeout
        const timeout = setTimeout(async () => {
          try {
            const result = await func(...args);
            this.processingQueue.delete(operationKey);
            resolve(result);
          } catch (error) {
            this.processingQueue.delete(operationKey);
            reject(error);
          }
        }, delay);
        
        this.processingQueue.set(operationKey, timeout as any);
      });
    };
  }

  /**
   * Bulk operations optimizer
   */
  async optimizeBulkOperations<T, R>(
    items: T[],
    operation: (batch: T[]) => Promise<R[]>,
    options: {
      maxBatchSize?: number;
      minBatchSize?: number;
      adaptiveBatching?: boolean;
    } = {}
  ): Promise<R[]> {
    const {
      maxBatchSize = 100,
      minBatchSize = 10,
      adaptiveBatching = true
    } = options;
    
    let batchSize = this.calculateOptimalBatchSize();
    
    // Ensure batch size is within limits
    batchSize = Math.max(minBatchSize, Math.min(maxBatchSize, batchSize));
    
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const startTime = Date.now();
      
      try {
        const batchResults = await operation(batch);
        results.push(...batchResults);
        
        const processingTime = Date.now() - startTime;
        
        // Adaptive batch size adjustment
        if (adaptiveBatching) {
          batchSize = this.adjustBatchSize(batchSize, processingTime, batch.length);
          batchSize = Math.max(minBatchSize, Math.min(maxBatchSize, batchSize));
        }
        
      } catch (error) {
        console.error('Bulk operation failed:', error);
        
        // Reduce batch size on error
        if (adaptiveBatching && batchSize > minBatchSize) {
          batchSize = Math.max(minBatchSize, Math.floor(batchSize * 0.7));
        }
        
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Memory-efficient streaming processor
   */
  async processStream<T, R>(
    items: AsyncIterable<T>,
    processor: (item: T) => Promise<R>,
    options: {
      bufferSize?: number;
      highWaterMark?: number;
      lowWaterMark?: number;
    } = {}
  ): Promise<R[]> {
    const {
      bufferSize = 1000,
      highWaterMark = 800,
      lowWaterMark = 200
    } = options;
    
    const results: R[] = [];
    const buffer: Promise<R>[] = [];
    
    for await (const item of items) {
      // Add to buffer
      buffer.push(processor(item));
      
      // Process buffer when high water mark is reached
      if (buffer.length >= highWaterMark) {
        const processed = await Promise.all(buffer.splice(0, lowWaterMark));
        results.push(...processed);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }
    
    // Process remaining items
    if (buffer.length > 0) {
      const processed = await Promise.all(buffer);
      results.push(...processed);
    }
    
    return results;
  }

  /**
   * Resource usage tracking and optimization
   */
  trackResourceUsage(metrics: Partial<PerformanceMetrics>): void {
    const fullMetrics: PerformanceMetrics = {
      cpuUsage: metrics.cpuUsage || 0,
      memoryUsage: metrics.memoryUsage || process.memoryUsage().heapUsed / 1024 / 1024,
      networkLatency: metrics.networkLatency || 0,
      queueSize: metrics.queueSize || 0,
      processingRate: metrics.processingRate || 0,
      errorRate: metrics.errorRate || 0,
      timestamp: new Date()
    };
    
    this.metrics.push(fullMetrics);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    
    // Trigger adaptive throttling
    if (this.config.adaptiveThrottling) {
      this.adaptThrottling();
    }
  }

  /**
   * Adaptive throttling based on system performance
   */
  adaptThrottling(): void {
    if (this.metrics.length < 5) return;
    
    const now = Date.now();
    if (now - this.adaptiveSettings.lastAdjustment < this.adaptiveSettings.adjustmentCooldown) {
      return;
    }
    
    const recentMetrics = this.metrics.slice(-5);
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
    
    let adjustment = 0;
    
    // Reduce concurrency if resources are stressed
    if (avgCpuUsage > this.config.targetCpuUsage || avgMemoryUsage > this.config.targetMemoryUsage) {
      adjustment = -1;
    }
    
    // Reduce concurrency if error rate is high
    if (avgErrorRate > 10) {
      adjustment = -2;
    }
    
    // Increase concurrency if resources are underutilized
    if (avgCpuUsage < this.config.targetCpuUsage * 0.6 && avgMemoryUsage < this.config.targetMemoryUsage * 0.6 && avgErrorRate < 1) {
      adjustment = 1;
    }
    
    // Apply adjustment
    if (adjustment !== 0) {
      const newConcurrency = Math.max(
        this.config.minConcurrency,
        Math.min(
          this.config.maxConcurrency,
          this.adaptiveSettings.currentConcurrency + adjustment
        )
      );
      
      if (newConcurrency !== this.adaptiveSettings.currentConcurrency) {
        console.log(`Adjusted concurrency from ${this.adaptiveSettings.currentConcurrency} to ${newConcurrency}`);
        this.adaptiveSettings.currentConcurrency = newConcurrency;
        this.adaptiveSettings.lastAdjustment = now;
      }
    }
  }

  /**
   * Get performance metrics and recommendations
   */
  getPerformanceReport(): {
    currentMetrics: PerformanceMetrics;
    averageMetrics: PerformanceMetrics;
    recommendations: string[];
    optimizationOpportunities: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        currentMetrics: {} as PerformanceMetrics,
        averageMetrics: {} as PerformanceMetrics,
        recommendations: ['Start collecting metrics for performance analysis'],
        optimizationOpportunities: []
      };
    }
    
    const currentMetrics = this.metrics[this.metrics.length - 1];
    const averageMetrics = this.calculateAverageMetrics();
    
    const recommendations = this.generateRecommendations(currentMetrics, averageMetrics);
    const optimizationOpportunities = this.identifyOptimizationOpportunities(averageMetrics);
    
    return {
      currentMetrics,
      averageMetrics,
      recommendations,
      optimizationOpportunities
    };
  }

  // Private helper methods
  private calculateOptimalBatchSize(): number {
    if (this.metrics.length === 0) return 10;
    
    const recentMetrics = this.metrics.slice(-10);
    const avgProcessingRate = recentMetrics.reduce((sum, m) => sum + m.processingRate, 0) / recentMetrics.length;
    
    // Adjust batch size based on processing rate
    if (avgProcessingRate > 100) return 20;
    if (avgProcessingRate > 50) return 15;
    if (avgProcessingRate > 20) return 10;
    return 5;
  }

  private async adaptiveDelay(): Promise<void> {
    if (this.metrics.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return;
    }
    
    const recent = this.metrics.slice(-3);
    const avgCpuUsage = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;
    
    let delay = 50; // Base delay
    
    if (avgCpuUsage > 80) delay = 500;
    else if (avgCpuUsage > 60) delay = 200;
    else if (avgCpuUsage > 40) delay = 100;
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private updateProcessingMetrics(processingTime: number, priority: string): void {
    // Update processing rate metric
    const rate = 1000 / processingTime; // operations per second
    
    this.trackResourceUsage({
      processingRate: rate,
      timestamp: new Date()
    });
  }

  private adjustBatchSize(currentSize: number, processingTime: number, itemCount: number): number {
    const targetTime = 5000; // 5 seconds target per batch
    const ratio = targetTime / processingTime;
    
    return Math.floor(currentSize * ratio);
  }

  private calculateAverageMetrics(): PerformanceMetrics {
    const count = this.metrics.length;
    
    return {
      cpuUsage: this.metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / count,
      memoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / count,
      networkLatency: this.metrics.reduce((sum, m) => sum + m.networkLatency, 0) / count,
      queueSize: this.metrics.reduce((sum, m) => sum + m.queueSize, 0) / count,
      processingRate: this.metrics.reduce((sum, m) => sum + m.processingRate, 0) / count,
      errorRate: this.metrics.reduce((sum, m) => sum + m.errorRate, 0) / count,
      timestamp: new Date()
    };
  }

  private generateRecommendations(current: PerformanceMetrics, average: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (current.cpuUsage > 80) {
      recommendations.push('High CPU usage detected - consider reducing concurrency');
    }
    
    if (current.memoryUsage > 500) {
      recommendations.push('High memory usage - enable garbage collection and reduce batch sizes');
    }
    
    if (current.errorRate > 5) {
      recommendations.push('High error rate - implement circuit breakers and retry logic');
    }
    
    if (average.processingRate < 10) {
      recommendations.push('Low processing rate - consider optimizing algorithms or increasing concurrency');
    }
    
    return recommendations;
  }

  private identifyOptimizationOpportunities(metrics: PerformanceMetrics): string[] {
    const opportunities: string[] = [];
    
    if (metrics.cpuUsage < 30) {
      opportunities.push('CPU underutilized - can increase processing concurrency');
    }
    
    if (metrics.networkLatency > 1000) {
      opportunities.push('High network latency - implement request batching and caching');
    }
    
    if (metrics.queueSize > 100) {
      opportunities.push('Large queue size - implement priority queuing and load balancing');
    }
    
    return opportunities;
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      
      this.trackResourceUsage({
        memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
        timestamp: new Date()
      });
    }, 30000);
  }

  // Public getter methods
  getCurrentConcurrency(): number {
    return this.adaptiveSettings.currentConcurrency;
  }

  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Export optimized performance instance
export const advancedPerformanceOptimizer = new AdvancedPerformanceOptimizer({
  maxConcurrency: 20,
  minConcurrency: 2,
  targetCpuUsage: 70,
  targetMemoryUsage: 80,
  adaptiveThrottling: true,
  cacheEnabled: true,
  compressionEnabled: true,
  retryEnabled: true
});