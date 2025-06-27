/**
 * Metrics and monitoring utilities
 * Provides performance tracking, counters, and logging for analysis operations
 */

import { performance } from 'perf_hooks';

/**
 * Performance metrics 
 */
export interface PerformanceMetrics {
  /** Time spent in computation (ms) */
  computationTime: number;
  /** Number of API calls made */
  apiCalls: number;
  /** Number of cache hits */
  cacheHits: number;
  /** Number of cache misses */
  cacheMisses: number;
  /** Execution counts by operation */
  counts: Record<string, number>;
  /** Average operation times (ms) */
  averageTimes: Record<string, number>;
  /** Errors by type */
  errors: Record<string, number>;
}

/**
 * Create default empty performance metrics
 */
export function createEmptyMetrics(): PerformanceMetrics {
  return {
    computationTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    counts: {},
    averageTimes: {},
    errors: {}
  };
}

/**
 * Metrics tracker for monitoring performance
 */
export class MetricsTracker {
  private metrics: PerformanceMetrics;
  private timers: Record<string, number> = {};
  private operationTimes: Record<string, number[]> = {};
  private enabled: boolean;
  
  constructor(enabled = true) {
    this.metrics = createEmptyMetrics();
    this.enabled = enabled;
  }
  
  /**
   * Enable or disable metrics tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Increment a counter
   * @param name Counter name
   * @param value Amount to increment by (default: 1)
   */
  increment(name: 'apiCalls' | 'cacheHits' | 'cacheMisses' | string, value = 1): void {
    if (!this.enabled) return;
    
    if (name === 'apiCalls' || name === 'cacheHits' || name === 'cacheMisses') {
      this.metrics[name] += value;
    } else {
      this.metrics.counts[name] = (this.metrics.counts[name] || 0) + value;
    }
  }
  
  /**
   * Record an error
   * @param error Error to record
   */
  recordError(error: unknown): void {
    if (!this.enabled) return;
    
    const errorName = error instanceof Error 
      ? error.constructor.name 
      : 'UnknownError';
      
    this.metrics.errors[errorName] = (this.metrics.errors[errorName] || 0) + 1;
  }
  
  /**
   * Start timing an operation
   * @param operation Operation name
   */
  startTimer(operation: string): void {
    if (!this.enabled) return;
    this.timers[operation] = performance.now();
  }
  
  /**
   * Stop timing an operation
   * @param operation Operation name
   */
  stopTimer(operation: string): number {
    if (!this.enabled || !this.timers[operation]) return 0;
    
    const duration = performance.now() - this.timers[operation];
    delete this.timers[operation];
    
    // Add to computation time
    this.metrics.computationTime += duration;
    
    // Track for averages
    if (!this.operationTimes[operation]) {
      this.operationTimes[operation] = [];
    }
    this.operationTimes[operation].push(duration);
    
    // Update average
    this.metrics.averageTimes[operation] = this.calculateAverage(operation);
    
    return duration;
  }
  
  /**
   * Calculate average time for an operation
   * @param operation Operation name
   */
  private calculateAverage(operation: string): number {
    const times = this.operationTimes[operation];
    if (!times || times.length === 0) return 0;
    
    const sum = times.reduce((total, time) => total + time, 0);
    return sum / times.length;
  }
  
  /**
   * Run a function and time its execution
   * @param operation Operation name
   * @param fn Function to execute
   */
  async timeAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    
    this.startTimer(operation);
    try {
      return await fn();
    } catch (error) {
      this.recordError(error);
      throw error;
    } finally {
      this.stopTimer(operation);
    }
  }
  
  /**
   * Run a function synchronously and time its execution
   * @param operation Operation name
   * @param fn Function to execute
   */
  time<T>(operation: string, fn: () => T): T {
    if (!this.enabled) return fn();
    
    this.startTimer(operation);
    try {
      return fn();
    } catch (error) {
      this.recordError(error);
      throw error;
    } finally {
      this.stopTimer(operation);
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return {...this.metrics};
  }
  
  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = createEmptyMetrics();
    this.timers = {};
    this.operationTimes = {};
  }
}
