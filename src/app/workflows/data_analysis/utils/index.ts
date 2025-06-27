// Common utilities for the Accelerate module

import { retryWithBackoff } from '../../../shared_infra';

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate a unique cache key based on input parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(':');
  
  return `${prefix}:${sortedParams}`;
}

/**
 * Simple rate limiter implementation
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a request is allowed
   * @returns true if allowed, false if rate limited
   */
  isAllowed(): boolean {
    const now = Date.now();
    
    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter(ts => now - ts < this.windowMs);
    
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the number of milliseconds until the next allowed request
   */
  getNextAvailableIn(): number {
    const now = Date.now();
    if (this.timestamps.length < this.maxRequests) return 0;
    
    const oldest = this.timestamps[0];
    return Math.max(0, (oldest + this.windowMs) - now);
  }
}

/**
 * Simple in-memory cache with TTL
 */
export class MemoryCache<T> {
  private cache: Map<string, { data: T; expires: number }> = new Map();
  private defaultTtl: number;

  constructor(defaultTtl: number = 60 * 60 * 1000) {
    this.defaultTtl = defaultTtl;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, { data: value, expires });
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear expired items from the cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, { expires }] of this.cache.entries()) {
      if (expires < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onError,
  } = options;
  return retryWithBackoff(fn, {
    maxRetries,
    initialDelayMs: initialDelay,
    maxDelayMs: maxDelay,
    backoffFactor,
    onError,
  });
}

export * from './cacheService';
