export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean; // Add randomness
  onError?: (error: Error, attempt: number) => void;
  onRetry?: (attempt: number, delay: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  monitoringPeriodMs?: number;
  halfOpenRetryMs?: number;
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
  startTime: number;
  traceId?: string;
  operationName?: string;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly circuitState: 'OPEN' | 'HALF_OPEN') {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class RetryPolicy {
  private circuitBreakers = new Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    nextRetryTime: number;
    successCount: number;
  }>();

  constructor(
    private defaultOptions: RetryOptions = {},
    private circuitBreakerOptions: CircuitBreakerOptions = {}
  ) {}

  private getCircuitBreakerKey(operationName?: string): string {
    return operationName || 'default';
  }

  private updateCircuitBreaker(key: string, success: boolean): void {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000,
      halfOpenRetryMs = 5000
    } = this.circuitBreakerOptions;

    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        successCount: 0
      });
    }

    const breaker = this.circuitBreakers.get(key)!;
    const now = Date.now();

    if (success) {
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        breaker.successCount = 0;
      } else if (breaker.state === 'CLOSED') {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = now;

      if (breaker.state === 'CLOSED' && breaker.failureCount >= failureThreshold) {
        breaker.state = 'OPEN';
        breaker.nextRetryTime = now + resetTimeoutMs;
      } else if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'OPEN';
        breaker.nextRetryTime = now + resetTimeoutMs;
      }
    }

    // Transition from OPEN to HALF_OPEN
    if (breaker.state === 'OPEN' && now >= breaker.nextRetryTime) {
      breaker.state = 'HALF_OPEN';
      breaker.nextRetryTime = now + halfOpenRetryMs;
    }
  }

  private checkCircuitBreaker(operationName?: string): void {
    const key = this.getCircuitBreakerKey(operationName);
    const breaker = this.circuitBreakers.get(key);

    if (!breaker) return;

    if (breaker.state === 'OPEN') {
      throw new CircuitBreakerError(
        `Circuit breaker is OPEN for operation: ${operationName || 'default'}`,
        'OPEN'
      );
    }

    if (breaker.state === 'HALF_OPEN' && Date.now() < breaker.nextRetryTime) {
      throw new CircuitBreakerError(
        `Circuit breaker is HALF_OPEN and not ready for retry: ${operationName || 'default'}`,
        'HALF_OPEN'
      );
    }
  }

  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions & { operationName?: string; traceId?: string } = {}
  ): Promise<T> {
    const {
      maxRetries = this.defaultOptions.maxRetries || 3,
      initialDelayMs = this.defaultOptions.initialDelayMs || 1000,
      maxDelayMs = this.defaultOptions.maxDelayMs || 30000,
      backoffFactor = this.defaultOptions.backoffFactor || 2,
      jitter = this.defaultOptions.jitter ?? true,
      onError = this.defaultOptions.onError,
      onRetry = this.defaultOptions.onRetry,
      shouldRetry = this.defaultOptions.shouldRetry || this.defaultShouldRetry,
      operationName,
      traceId
    } = options;

    const context: RetryContext = {
      attempt: 0,
      totalAttempts: maxRetries + 1,
      startTime: Date.now(),
      traceId,
      operationName
    };

    let lastError: Error | undefined = undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      context.attempt = attempt;

      try {
        // Check circuit breaker before attempting
        this.checkCircuitBreaker(operationName);

        const result = await fn();
        
        // Success - update circuit breaker
        this.updateCircuitBreaker(this.getCircuitBreakerKey(operationName), true);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        context.lastError = lastError;

        // Update circuit breaker on failure
        if (!(error instanceof CircuitBreakerError)) {
          this.updateCircuitBreaker(this.getCircuitBreakerKey(operationName), false);
        }

        // Call error handler
        if (onError) {
          try {
            onError(lastError, attempt);
          } catch (errorHandlerError) {
            console.warn('Error handler threw an error:', errorHandlerError);
          }
        }

        // Don't retry on last attempt or if circuit breaker is open
        if (attempt >= maxRetries || error instanceof CircuitBreakerError) {
          break;
        }

        // Check if we should retry this error
        if (!shouldRetry(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt);
        const jitterMultiplier = jitter ? (Math.random() * 0.4 + 0.8) : 1; // 0.8-1.2 range
        const delay = Math.min(maxDelayMs, exponentialDelay * jitterMultiplier);

        // Call retry handler
        if (onRetry) {
          try {
            onRetry(attempt + 1, delay);
          } catch (retryHandlerError) {
            console.warn('Retry handler threw an error:', retryHandlerError);
          }
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (lastError) {
      throw lastError;
    } else {
      throw new Error(`Operation failed after ${maxRetries + 1} attempts, but no specific error was captured.`);
    }
  }

  private defaultShouldRetry(error: Error): boolean {
    // Don't retry on validation errors or bad requests
    if (error.name === 'ValidationError' || error.message.includes('400')) {
      return false;
    }

    // Don't retry on authentication errors
    if (error.message.includes('401') || error.message.includes('403')) {
      return false;
    }

    // Retry on network errors, timeouts, and server errors
    return true;
  }

  getCircuitBreakerStatus(operationName?: string) {
    const key = this.getCircuitBreakerKey(operationName);
    const breaker = this.circuitBreakers.get(key);
    
    if (!breaker) {
      return { state: 'CLOSED', failureCount: 0, successCount: 0 };
    }

    return {
      state: breaker.state,
      failureCount: breaker.failureCount,
      successCount: breaker.successCount,
      lastFailureTime: breaker.lastFailureTime,
      nextRetryTime: breaker.nextRetryTime
    };
  }

  resetCircuitBreaker(operationName?: string): void {
    const key = this.getCircuitBreakerKey(operationName);
    this.circuitBreakers.set(key, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
      successCount: 0
    });
  }
}

/**
 * Legacy compatibility function - delegates to RetryPolicy
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retryPolicy = new RetryPolicy(options);
  return retryPolicy.execute(fn, options);
}

// Export singleton instance for shared usage
export const defaultRetryPolicy = new RetryPolicy(); 