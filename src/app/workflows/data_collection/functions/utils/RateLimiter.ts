// difficult: Implements a token bucket rate limiter for API requests

import EventEmitter from 'events';

interface RateLimiterOptions {
  requestsPerMinute: number;
  burstCapacity?: number;
}

export class RateLimiter extends EventEmitter {
  private tokens: number;
  private lastRefillTime: number;
  private _tokensPerSecond: number;
  private _maxTokens: number;
  private queue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor(options: RateLimiterOptions) {
    super();
    this._tokensPerSecond = options.requestsPerMinute / 60;
    this._maxTokens = options.burstCapacity || options.requestsPerMinute;
    this.tokens = this._maxTokens;
    this.lastRefillTime = Date.now();
  }

  get tokensPerSecond(): number {
    return this._tokensPerSecond;
  }

  get maxTokens(): number {
    return this._maxTokens;
  }

  /**
   * Refill tokens based on the time elapsed since the last refill
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeElapsed = (now - this.lastRefillTime) / 1000; // in seconds
    
    if (timeElapsed > 0) {
      const newTokens = timeElapsed * this._tokensPerSecond;
      this.tokens = Math.min(this.tokens + newTokens, this._maxTokens);
      this.lastRefillTime = now;
    }
  }

  /**
   * Update rate limits based on API response headers
   */
  updateLimits(rateLimit: { limit: number; remaining: number; resetAt: Date }): void {
    const now = Date.now();
    const resetTime = rateLimit.resetAt.getTime();
    const timeUntilReset = Math.max(0, (resetTime - now) / 1000); // in seconds
    
    // Update the token bucket with current state
    this.tokens = rateLimit.remaining;
    this._maxTokens = rateLimit.limit;
    
    // If we're close to rate limiting, adjust tokens per second to slow down
    if (this.tokens < this._maxTokens * 0.2) {
      this._tokensPerSecond = Math.max(
        this.tokens / (timeUntilReset || 60), // Ensure we don't divide by zero
        this._maxTokens / 600 // At least 10% of max per minute as a safety
      );
    } else {
      this._tokensPerSecond = this._maxTokens / 60; // Reset to default
    }
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process the queue of waiting requests
   */
  private processQueue(): void {
    if (this.isProcessingQueue) {
      return;
    }
    this.isProcessingQueue = true;
    const processNext = () => {
      if (this.queue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }
      this.refillTokens();
      if (this.tokens >= 1) {
        this.tokens--;
        const next = this.queue.shift();
        next?.();
        this.emit('tokenUsed', { tokens: this.tokens, maxTokens: this._maxTokens });
        processNext();
      } else {
        if (this.tokens < 1) {
          this.emit('rateLimitDepleted', { tokens: this.tokens, maxTokens: this._maxTokens });
        }
        const timeToNextToken = Math.ceil((1 / this.tokensPerSecond) * 1000);
        setTimeout(() => {
          this.refillTokens();
          processNext();
        }, timeToNextToken);
      }
    };
    processNext();
  }

  /**
   * Get the current wait time in milliseconds
   */
  getWaitTime(): number {
    this.refillTokens();
    if (this.tokens >= 1) {
      return 0;
    }
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil((tokensNeeded / this.tokensPerSecond) * 1000);
  }

  updateOptions(options: Partial<RateLimiterOptions>) {
    if (options.requestsPerMinute !== undefined) {
      this._tokensPerSecond = options.requestsPerMinute / 60;
      this._maxTokens = options.burstCapacity || options.requestsPerMinute;
      this.tokens = Math.min(this.tokens, this._maxTokens);
    }
    if (options.burstCapacity !== undefined) {
      this._maxTokens = options.burstCapacity;
      this.tokens = Math.min(this.tokens, this._maxTokens);
    }
    this.emit('rateLimitUpdated', { ...options });
  }
}
