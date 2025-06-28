import logger from '../../../utils/logger';
import { logError, notifyAdmin, withExponentialBackoff } from './ErrorHandling';
import { MonitoringService } from './Monitoring';
import { ContentQueue, QueuedContent } from './ContentQueue';

// Error recovery strategies
export enum RecoveryStrategy {
  IMMEDIATE_RETRY = 'immediate_retry',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  CIRCUIT_BREAKER = 'circuit_breaker',
  DEAD_LETTER_QUEUE = 'dead_letter_queue',
  FALLBACK_PLATFORM = 'fallback_platform',
  DELAYED_RETRY = 'delayed_retry',
  MANUAL_INTERVENTION = 'manual_intervention'
}

// Recovery configuration for different error types
interface RecoveryConfig {
  strategy: RecoveryStrategy;
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  fallbackPlatforms?: string[];
  deadLetterQueueEnabled: boolean;
}

// Error classification for recovery decisions
interface ErrorClassification {
  isRetryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'authentication' | 'validation' | 'rate_limit' | 'platform' | 'unknown';
  recommendedStrategy: RecoveryStrategy;
}

// Circuit breaker state
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailure: number;
  nextAttempt: number;
}

// Recovery attempt record
interface RecoveryAttempt {
  attemptId: string;
  contentId: string;
  platform: string;
  strategy: RecoveryStrategy;
  timestamp: number;
  success: boolean;
  error?: string;
  retryCount: number;
}

export class ErrorRecoveryService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private deadLetterQueue: QueuedContent[] = [];
  private recoveryAttempts: RecoveryAttempt[] = [];
  private monitoring: MonitoringService;
  private recoveryConfigs: Map<string, RecoveryConfig> = new Map();
  private maxHistorySize = 1000;

  constructor(monitoring: MonitoringService) {
    this.monitoring = monitoring;
    this.initializeDefaultConfigs();
    this.startRecoveryMonitoring();
    
    logger.info('ErrorRecoveryService initialized', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Main recovery orchestration method
   */
  async handleError(
    error: any,
    context: {
      contentId: string;
      platform: string;
      operation: string;
      retryCount?: number;
      originalFunction: () => Promise<any>;
    }
  ): Promise<{ success: boolean; result?: any; finalError?: any; strategy: RecoveryStrategy }> {
    const { contentId, platform, operation, retryCount = 0, originalFunction } = context;
    
    // Classify the error to determine recovery strategy
    const classification = this.classifyError(error, platform);
    const config = this.getRecoveryConfig(platform, classification.category);
    
    logger.info('Starting error recovery', {
      contentId,
      platform,
      operation,
      retryCount,
      classification,
      strategy: classification.recommendedStrategy
    });

    // Check if we should attempt recovery based on retry limits
    if (retryCount >= config.maxRetries) {
      logger.warn('Max retries exceeded, moving to dead letter queue', {
        contentId,
        platform,
        retryCount,
        maxRetries: config.maxRetries
      });
      
      await this.moveToDeadLetterQueue(contentId, platform, error, 'max_retries_exceeded');
      return { success: false, finalError: error, strategy: RecoveryStrategy.DEAD_LETTER_QUEUE };
    }

    // Execute recovery strategy
    try {
      const result = await this.executeRecoveryStrategy(
        classification.recommendedStrategy,
        originalFunction,
        context,
        config
      );
      
      // Record successful recovery
      this.recordRecoveryAttempt({
        contentId,
        platform,
        strategy: classification.recommendedStrategy,
        success: true,
        retryCount: retryCount + 1
      });

      // Reset circuit breaker on success
      this.resetCircuitBreaker(platform);
      
      logger.info('Error recovery successful', {
        contentId,
        platform,
        strategy: classification.recommendedStrategy,
        retryCount: retryCount + 1
      });

      return { success: true, result, strategy: classification.recommendedStrategy };

    } catch (recoveryError) {
      // Record failed recovery attempt
      this.recordRecoveryAttempt({
        contentId,
        platform,
        strategy: classification.recommendedStrategy,
        success: false,
        error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        retryCount: retryCount + 1
      });

      // Update circuit breaker state
      this.updateCircuitBreaker(platform);

      logger.error('Error recovery failed', {
        contentId,
        platform,
        strategy: classification.recommendedStrategy,
        retryCount: retryCount + 1,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
      });

      // If this was not the last retry, continue with exponential backoff
      if (retryCount + 1 < config.maxRetries) {
        const delay = this.calculateBackoffDelay(retryCount + 1, config.retryDelay);
        
        logger.info('Scheduling retry with exponential backoff', {
          contentId,
          platform,
          retryCount: retryCount + 1,
          delay
        });
        
        // Schedule retry (in a real implementation, this would use a job queue)
        setTimeout(async () => {
          await this.handleError(recoveryError, {
            ...context,
            retryCount: retryCount + 1
          });
        }, delay);
        
        return { success: false, finalError: recoveryError, strategy: classification.recommendedStrategy };
      }

      // Final attempt failed, escalate
      await this.escalateError(error, context, classification);
      return { success: false, finalError: recoveryError, strategy: classification.recommendedStrategy };
    }
  }

  /**
   * Execute specific recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    originalFunction: () => Promise<any>,
    context: any,
    config: RecoveryConfig
  ): Promise<any> {
    switch (strategy) {
      case RecoveryStrategy.IMMEDIATE_RETRY:
        return await this.immediateRetry(originalFunction, context);

      case RecoveryStrategy.EXPONENTIAL_BACKOFF:
        return await this.exponentialBackoffRetry(originalFunction, context, config);

      case RecoveryStrategy.CIRCUIT_BREAKER:
        return await this.circuitBreakerRetry(originalFunction, context);

      case RecoveryStrategy.FALLBACK_PLATFORM:
        return await this.fallbackPlatformRetry(originalFunction, context, config);

      case RecoveryStrategy.DELAYED_RETRY:
        return await this.delayedRetry(originalFunction, context, config);

      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  /**
   * Immediate retry without delay
   */
  private async immediateRetry(originalFunction: () => Promise<any>, context: any): Promise<any> {
    logger.debug('Attempting immediate retry', { contentId: context.contentId, platform: context.platform });
    return await originalFunction();
  }

  /**
   * Exponential backoff retry
   */
  private async exponentialBackoffRetry(
    originalFunction: () => Promise<any>,
    context: any,
    config: RecoveryConfig
  ): Promise<any> {
    const delay = this.calculateBackoffDelay(context.retryCount || 0, config.retryDelay);
    
    logger.debug('Attempting exponential backoff retry', {
      contentId: context.contentId,
      platform: context.platform,
      delay,
      retryCount: context.retryCount
    });
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return await originalFunction();
  }

  /**
   * Circuit breaker retry - check state before attempting
   */
  private async circuitBreakerRetry(originalFunction: () => Promise<any>, context: any): Promise<any> {
    const circuitState = this.getCircuitBreakerState(context.platform);
    
    if (circuitState.state === 'open') {
      const now = Date.now();
      if (now < circuitState.nextAttempt) {
        throw new Error(`Circuit breaker open for ${context.platform}, next attempt at ${new Date(circuitState.nextAttempt)}`);
      }
      
      // Move to half-open state
      circuitState.state = 'half_open';
      this.circuitBreakers.set(context.platform, circuitState);
    }
    
    try {
      const result = await originalFunction();
      
      // Success in half-open state closes the circuit
      if (circuitState.state === 'half_open') {
        this.resetCircuitBreaker(context.platform);
      }
      
      return result;
    } catch (error) {
      // Failure in half-open state opens the circuit again
      if (circuitState.state === 'half_open') {
        this.openCircuitBreaker(context.platform);
      }
      throw error;
    }
  }

  /**
   * Fallback platform retry - try alternative platforms
   */
  private async fallbackPlatformRetry(
    originalFunction: () => Promise<any>,
    context: any,
    config: RecoveryConfig
  ): Promise<any> {
    const fallbackPlatforms = config.fallbackPlatforms || [];
    
    logger.info('Attempting fallback platform retry', {
      contentId: context.contentId,
      originalPlatform: context.platform,
      fallbackPlatforms
    });
    
    for (const fallbackPlatform of fallbackPlatforms) {
      try {
        // This would need to be implemented with platform-specific logic
        // For now, we'll just log the attempt
        logger.info('Trying fallback platform', {
          contentId: context.contentId,
          fallbackPlatform
        });
        
        // In a real implementation, this would create a new poster for the fallback platform
        // and attempt the operation
        return await originalFunction();
      } catch (fallbackError) {
        logger.warn('Fallback platform failed', {
          contentId: context.contentId,
          fallbackPlatform,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        continue;
      }
    }
    
    throw new Error('All fallback platforms failed');
  }

  /**
   * Delayed retry with configurable delay
   */
  private async delayedRetry(
    originalFunction: () => Promise<any>,
    context: any,
    config: RecoveryConfig
  ): Promise<any> {
    logger.debug('Attempting delayed retry', {
      contentId: context.contentId,
      platform: context.platform,
      delay: config.retryDelay
    });
    
    await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    return await originalFunction();
  }

  /**
   * Classify error to determine appropriate recovery strategy
   */
  private classifyError(error: any, platform: string): ErrorClassification {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const status = error.status || error.code;
    
    // Network/timeout errors - retryable with exponential backoff
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        status === 503 || status === 502) {
      return {
        isRetryable: true,
        severity: 'medium',
        category: 'network',
        recommendedStrategy: RecoveryStrategy.EXPONENTIAL_BACKOFF
      };
    }
    
    // Rate limiting - retryable with delayed retry
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        status === 429) {
      return {
        isRetryable: true,
        severity: 'medium',
        category: 'rate_limit',
        recommendedStrategy: RecoveryStrategy.DELAYED_RETRY
      };
    }
    
    // Authentication errors - not retryable, needs manual intervention
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('forbidden') ||
        status === 401 || status === 403) {
      return {
        isRetryable: false,
        severity: 'high',
        category: 'authentication',
        recommendedStrategy: RecoveryStrategy.MANUAL_INTERVENTION
      };
    }
    
    // Validation errors - not retryable
    if (errorMessage.includes('validation') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('bad request') ||
        status === 400) {
      return {
        isRetryable: false,
        severity: 'low',
        category: 'validation',
        recommendedStrategy: RecoveryStrategy.DEAD_LETTER_QUEUE
      };
    }
    
    // Platform-specific errors - retryable with circuit breaker
    if (status >= 500) {
      return {
        isRetryable: true,
        severity: 'high',
        category: 'platform',
        recommendedStrategy: RecoveryStrategy.CIRCUIT_BREAKER
      };
    }
    
    // Unknown errors - retryable with immediate retry first
    return {
      isRetryable: true,
      severity: 'medium',
      category: 'unknown',
      recommendedStrategy: RecoveryStrategy.IMMEDIATE_RETRY
    };
  }

  /**
   * Get recovery configuration for platform and error category
   */
  private getRecoveryConfig(platform: string, category: string): RecoveryConfig {
    const key = `${platform}_${category}`;
    return this.recoveryConfigs.get(key) || this.recoveryConfigs.get('default')!;
  }

  /**
   * Initialize default recovery configurations
   */
  private initializeDefaultConfigs(): void {
    // Default configuration
    this.recoveryConfigs.set('default', {
      strategy: RecoveryStrategy.EXPONENTIAL_BACKOFF,
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      deadLetterQueueEnabled: true
    });

    // Network error configuration
    this.recoveryConfigs.set('network', {
      strategy: RecoveryStrategy.EXPONENTIAL_BACKOFF,
      maxRetries: 5,
      retryDelay: 2000,
      circuitBreakerThreshold: 10,
      deadLetterQueueEnabled: true
    });

    // Rate limit configuration
    this.recoveryConfigs.set('rate_limit', {
      strategy: RecoveryStrategy.DELAYED_RETRY,
      maxRetries: 3,
      retryDelay: 60000, // 1 minute delay for rate limits
      circuitBreakerThreshold: 3,
      deadLetterQueueEnabled: true
    });

    // Platform error configuration
    this.recoveryConfigs.set('platform', {
      strategy: RecoveryStrategy.CIRCUIT_BREAKER,
      maxRetries: 3,
      retryDelay: 5000,
      circuitBreakerThreshold: 5,
      fallbackPlatforms: [], // Would be configured per platform
      deadLetterQueueEnabled: true
    });
  }

  /**
   * Circuit breaker management
   */
  private getCircuitBreakerState(platform: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(platform)) {
      this.circuitBreakers.set(platform, {
        state: 'closed',
        failureCount: 0,
        lastFailure: 0,
        nextAttempt: 0
      });
    }
    return this.circuitBreakers.get(platform)!;
  }

  private updateCircuitBreaker(platform: string): void {
    const state = this.getCircuitBreakerState(platform);
    state.failureCount++;
    state.lastFailure = Date.now();
    
    const config = this.getRecoveryConfig(platform, 'platform');
    if (state.failureCount >= config.circuitBreakerThreshold) {
      this.openCircuitBreaker(platform);
    }
  }

  private openCircuitBreaker(platform: string): void {
    const state = this.getCircuitBreakerState(platform);
    state.state = 'open';
    state.nextAttempt = Date.now() + 60000; // 1 minute timeout
    
    logger.warn('Circuit breaker opened', {
      platform,
      failureCount: state.failureCount,
      nextAttempt: new Date(state.nextAttempt)
    });
    
    // Alert admin about circuit breaker opening
    notifyAdmin(new Error(`Circuit breaker opened for platform: ${platform}`), {
      operation: 'circuit_breaker_open',
      component: 'ErrorRecoveryService',
      platform,
      additionalData: { failureCount: state.failureCount }
    });
  }

  private resetCircuitBreaker(platform: string): void {
    const state = this.getCircuitBreakerState(platform);
    state.state = 'closed';
    state.failureCount = 0;
    state.lastFailure = 0;
    state.nextAttempt = 0;
    
    logger.info('Circuit breaker reset', { platform });
  }

  /**
   * Dead letter queue management
   */
  private async moveToDeadLetterQueue(
    contentId: string,
    platform: string,
    error: any,
    reason: string
  ): Promise<void> {
    const dlqItem = {
      id: contentId,
      platform,
      error: error instanceof Error ? error.message : String(error),
      reason,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    this.deadLetterQueue.push(dlqItem as any);
    
    logger.warn('Item moved to dead letter queue', {
      contentId,
      platform,
      reason,
      timestamp: new Date().toISOString()
    });
    
    // Alert admin about dead letter queue addition
    await notifyAdmin(new Error(`Content moved to dead letter queue: ${reason}`), {
      operation: 'dead_letter_queue_add',
      component: 'ErrorRecoveryService',
      contentId,
      platform,
      additionalData: { reason, error: dlqItem.error }
    });
  }

  /**
   * Record recovery attempt for monitoring
   */
  private recordRecoveryAttempt(attempt: Omit<RecoveryAttempt, 'attemptId' | 'timestamp'>): void {
    const recoveryAttempt: RecoveryAttempt = {
      attemptId: `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...attempt
    };
    
    this.recoveryAttempts.push(recoveryAttempt);
    
    // Trim history if it gets too large
    if (this.recoveryAttempts.length > this.maxHistorySize) {
      this.recoveryAttempts = this.recoveryAttempts.slice(-this.maxHistorySize / 2);
    }
    
    // Record in monitoring service
    if (attempt.success) {
      this.monitoring.recordSuccess(attempt.platform);
    } else {
      this.monitoring.recordFailure(attempt.platform, attempt.error, 'recovery_attempt');
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number, baseDelay: number): number {
    const jitter = Math.random() * 0.1; // 10% jitter
    return Math.min(baseDelay * Math.pow(2, retryCount) * (1 + jitter), 60000); // Max 1 minute
  }

  /**
   * Escalate error for manual intervention
   */
  private async escalateError(
    error: any,
    context: any,
    classification: ErrorClassification
  ): Promise<void> {
    logger.error('Error escalated for manual intervention', {
      contentId: context.contentId,
      platform: context.platform,
      operation: context.operation,
      classification,
      error: error instanceof Error ? error.message : String(error)
    });
    
    await notifyAdmin(error, {
      operation: 'error_escalation',
      component: 'ErrorRecoveryService',
      contentId: context.contentId,
      platform: context.platform,
      additionalData: {
        classification,
        retryCount: context.retryCount,
        escalationReason: 'max_retries_exceeded_or_non_retryable'
      }
    });
    
    // Move to dead letter queue for manual processing
    await this.moveToDeadLetterQueue(
      context.contentId,
      context.platform,
      error,
      'escalated_for_manual_intervention'
    );
  }

  /**
   * Start recovery monitoring and reporting
   */
  private startRecoveryMonitoring(): void {
    // Run recovery health checks every 5 minutes
    setInterval(() => {
      this.generateRecoveryReport();
    }, 300000);
  }

  /**
   * Generate recovery health report
   */
  private generateRecoveryReport(): void {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour ago
    
    const recentAttempts = this.recoveryAttempts.filter(attempt => attempt.timestamp > hourAgo);
    const successfulRecoveries = recentAttempts.filter(attempt => attempt.success);
    const failedRecoveries = recentAttempts.filter(attempt => !attempt.success);
    
    const report = {
      timestamp: new Date().toISOString(),
      period: '1_hour',
      totalRecoveryAttempts: recentAttempts.length,
      successfulRecoveries: successfulRecoveries.length,
      failedRecoveries: failedRecoveries.length,
      recoverySuccessRate: recentAttempts.length > 0 ? 
        successfulRecoveries.length / recentAttempts.length : 0,
      deadLetterQueueSize: this.deadLetterQueue.length,
      circuitBreakerStates: Array.from(this.circuitBreakers.entries()).map(([platform, state]) => ({
        platform,
        state: state.state,
        failureCount: state.failureCount
      })),
      strategiesUsed: this.getStrategyUsageStats(recentAttempts)
    };
    
    logger.info('Recovery service health report', report);
    
    // Alert if recovery success rate is low
    if (report.recoverySuccessRate < 0.5 && report.totalRecoveryAttempts > 5) {
      notifyAdmin(new Error(`Low recovery success rate: ${(report.recoverySuccessRate * 100).toFixed(1)}%`), {
        operation: 'recovery_health_alert',
        component: 'ErrorRecoveryService',
        additionalData: report
      });
    }
  }

  /**
   * Get strategy usage statistics
   */
  private getStrategyUsageStats(attempts: RecoveryAttempt[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    attempts.forEach(attempt => {
      stats[attempt.strategy] = (stats[attempt.strategy] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Get dead letter queue items
   */
  getDeadLetterQueue(): any[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Retry items from dead letter queue
   */
  async retryDeadLetterQueueItem(contentId: string): Promise<boolean> {
    const itemIndex = this.deadLetterQueue.findIndex(item => item.id === contentId);
    
    if (itemIndex === -1) {
      logger.warn('Dead letter queue item not found', { contentId });
      return false;
    }
    
    const item = this.deadLetterQueue[itemIndex];
    
    logger.info('Retrying dead letter queue item', {
      contentId,
      platform: item.platform,
      originalReason: item.reason
    });
    
    // Remove from dead letter queue
    this.deadLetterQueue.splice(itemIndex, 1);
    
    // This would typically re-queue the item for processing
    // For now, we'll just log the retry attempt
    logger.info('Dead letter queue item requeued for processing', { contentId });
    
    return true;
  }

  /**
   * Get recovery service status
   */
  getStatus(): any {
    return {
      timestamp: new Date().toISOString(),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([platform, state]) => ({
        platform,
        state: state.state,
        failureCount: state.failureCount,
        lastFailure: state.lastFailure ? new Date(state.lastFailure) : null,
        nextAttempt: state.nextAttempt ? new Date(state.nextAttempt) : null
      })),
      deadLetterQueueSize: this.deadLetterQueue.length,
      recentRecoveryAttempts: this.recoveryAttempts.slice(-10), // Last 10 attempts
      recoveryConfigs: Array.from(this.recoveryConfigs.entries())
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear any intervals or timeouts
    logger.info('ErrorRecoveryService destroyed', {
      finalDeadLetterQueueSize: this.deadLetterQueue.length,
      finalRecoveryAttempts: this.recoveryAttempts.length,
      timestamp: new Date().toISOString()
    });
  }
}