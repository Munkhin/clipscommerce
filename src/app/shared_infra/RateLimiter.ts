interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitEntry {
  requests: number[];
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private rules: Map<string, RateLimitRule> = new Map();
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultRule?: RateLimitRule) {
    if (defaultRule) {
      this.rules.set('default', defaultRule);
    }
    
    // Start cleanup timer to remove expired entries
    this.startCleanup();
  }

  /**
   * Add a rate limiting rule for a specific type
   */
  addRule(type: string, rule: RateLimitRule): void {
    this.rules.set(type, rule);
  }

  /**
   * Check if a request is allowed within rate limits
   */
  checkLimit(
    identifier: string, 
    type: string = 'default'
  ): RateLimitResult {
    const rule = this.rules.get(type);
    if (!rule) {
      throw new Error(`No rate limit rule found for type: ${type}`);
    }

    const key = rule.keyGenerator ? rule.keyGenerator(identifier) : `${type}:${identifier}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    
    // Get or create entry
    let entry = this.storage.get(key);
    if (!entry) {
      entry = { requests: [], resetTime: now + rule.windowMs };
      this.storage.set(key, entry);
    }

    // Remove requests outside the sliding window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    
    // Check if request is allowed
    if (entry.requests.length >= rule.maxRequests) {
      const oldestRequest = entry.requests[0];
      const retryAfter = Math.ceil((oldestRequest + rule.windowMs - now) / 1000);
      
      return {
        success: false,
        remaining: 0,
        resetTime: oldestRequest + rule.windowMs,
        retryAfter
      };
    }

    // Add current request
    entry.requests.push(now);
    entry.resetTime = Math.max(entry.resetTime, now + rule.windowMs);

    return {
      success: true,
      remaining: rule.maxRequests - entry.requests.length,
      resetTime: entry.resetTime
    };
  }

  /**
   * Check multiple rate limit types for an identifier
   */
  checkMultipleTypes(
    identifier: string,
    types: string[]
  ): { [type: string]: RateLimitResult } {
    const results: { [type: string]: RateLimitResult } = {};
    
    for (const type of types) {
      results[type] = this.checkLimit(identifier, type);
    }
    
    return results;
  }

  /**
   * Reset rate limits for an identifier (admin function)
   */
  reset(identifier: string, type?: string): void {
    if (type) {
      const rule = this.rules.get(type);
      if (rule) {
        const key = rule.keyGenerator ? rule.keyGenerator(identifier) : `${type}:${identifier}`;
        this.storage.delete(key);
      }
    } else {
      // Reset all types for this identifier
      const keysToDelete: string[] = [];
      for (const [key] of this.storage) {
        if (key.includes(identifier)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.storage.delete(key));
    }
  }

  /**
   * Get current usage statistics
   */
  getStats(identifier: string, type: string = 'default'): {
    requests: number;
    remaining: number;
    resetTime: number;
  } | null {
    const rule = this.rules.get(type);
    if (!rule) return null;

    const key = rule.keyGenerator ? rule.keyGenerator(identifier) : `${type}:${identifier}`;
    const entry = this.storage.get(key);
    
    if (!entry) {
      return {
        requests: 0,
        remaining: rule.maxRequests,
        resetTime: Date.now() + rule.windowMs
      };
    }

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const validRequests = entry.requests.filter(timestamp => timestamp > windowStart);

    return {
      requests: validRequests.length,
      remaining: rule.maxRequests - validRequests.length,
      resetTime: entry.resetTime
    };
  }

  /**
   * Middleware function for Express-like frameworks
   */
  middleware(type: string = 'default') {
    return (identifier: string, next: (error?: Error) => void) => {
      try {
        const result = this.checkLimit(identifier, type);
        
        if (!result.success) {
          const error = new Error('Rate limit exceeded') as any;
          error.status = 429;
          error.rateLimitInfo = result;
          return next(error);
        }
        
        next();
      } catch (error) {
        next(error as Error);
      }
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.storage) {
        // Remove entries that are completely expired
        if (entry.resetTime < now && entry.requests.every(req => req < now - 300000)) { // 5 minutes buffer
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.storage.delete(key));
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup and clear all data
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
    this.rules.clear();
  }
}

// Pre-configured rate limiters for common use cases
export const createUserRateLimiter = () => {
  const limiter = new RateLimiter();
  
  // API requests per minute
  limiter.addRule('api', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (identifier) => `api:${identifier}`
  });
  
  // Authentication attempts per hour
  limiter.addRule('auth', {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyGenerator: (identifier) => `auth:${identifier}`
  });
  
  // Heavy operations per hour
  limiter.addRule('heavy', {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (identifier) => `heavy:${identifier}`
  });
  
  return limiter;
};

export const createIPRateLimiter = () => {
  const limiter = new RateLimiter();
  
  // General requests per minute per IP
  limiter.addRule('general', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    keyGenerator: (ip) => `ip:${ip}`
  });
  
  return limiter;
};

// Global rate limiter instances
export const userRateLimiter = createUserRateLimiter();
export const ipRateLimiter = createIPRateLimiter(); 