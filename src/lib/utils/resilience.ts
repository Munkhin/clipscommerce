/**
 * Resilience utilities for API calls and async operations
 * Provides retry logic, circuit breakers, and other resilience patterns
 */

import { performance } from 'perf_hooks';

/**
 * Circuit breaker states
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Configuration for the retry mechanism
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in ms */
  baseDelay: number;
  /** Maximum delay between retries in ms */
  maxDelay: number;
  /** Should non-retryable errors be re-thrown immediately */
  failFast: boolean;
  /** Custom function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Default configuration for the retry mechanism
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  failFast: true,
};

/**
 * Configuration for the circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Reset timeout in milliseconds */
  resetTimeout: number;
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Number of successful calls to close the circuit */
  successThreshold: number;
}

/**
 * Default configuration for the circuit breaker
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  resetTimeout: 30000,
  failureThreshold: 5,
  successThreshold: 2,
};

/**
 * A simple async delay function
 * @param ms delay in milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 * @param fn Function to execute
 * @param config Retry configuration
 * @returns Result of the function execution
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Merge default config with provided config
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: Error | null = null;
  
  // Default retry eligibility check
  const isRetryable = retryConfig.isRetryable || ((error: unknown) => {
    // By default, retry all errors except 4xx HTTP errors (except 429)
    const status = (error as any)?.status;
    if (status) {
      return status === 429 || status >= 500;
    }
    // Network errors and timeouts are retryable
    return true;
  });
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (!isRetryable(error)) {
        if (retryConfig.failFast) {
          throw lastError;
        }
        break;
      }
      
      if (attempt < retryConfig.maxRetries) {
        // Calculate delay with exponential backoff and jitter
        const backoffTime = Math.min(
          retryConfig.baseDelay * Math.pow(2, attempt) + (Math.random() * 1000),
          retryConfig.maxDelay
        );
        
        await delay(backoffTime);
      }
    }
  }
  
  throw lastError || new Error('Unknown error in retry mechanism');
}

/**
 * Circuit breaker implementation to prevent cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }
  
  /**
   * Execute a function with circuit breaker pattern
   * @param fn Function to execute
   * @returns Result of the function execution
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if it's time to try again
      if ((Date.now() - this.lastFailureTime) > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker is OPEN. Failing fast.`);
      }
    }
    
    try {
      const startTime = performance.now();
      const result = await fn();
      const duration = performance.now() - startTime;
      
      // If we were in HALF_OPEN state, successful call means we can reset to CLOSED
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        
        if (this.successCount >= this.config.successThreshold) {
          this.reset();
        }
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  /**
   * Record a failure and potentially open the circuit
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;
    
    if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }
  
  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.state = 'CLOSED';
  }
  
  /**
   * Get the current state of the circuit breaker
   */
  getState(): CircuitState {
    return this.state;
  }
}
