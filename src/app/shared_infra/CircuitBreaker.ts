export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange = Date.now();

  constructor(private readonly opts: CircuitBreakerOptions) {}

  canExecute(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastStateChange > this.opts.resetTimeoutMs) {
        this.state = 'half-open';
        this.lastStateChange = Date.now();
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount += 1;
      if (this.successCount >= this.opts.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    if (this.state === 'half-open') {
      this.trip();
      return;
    }
    this.failureCount += 1;
    if (this.failureCount >= this.opts.failureThreshold) {
      this.trip();
    }
  }

  private trip() {
    this.state = 'open';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
  }

  private reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
} 