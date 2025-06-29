import { ContentQueue, QueuedContent } from './ContentQueue';
import { TikTokPoster, InstagramPoster, YouTubePoster, PlatformPoster, PostScheduleResult, PostStatusResult } from './PlatformPoster';
import { MonitoringService } from './Monitoring';
import { withExponentialBackoff, logError, notifyAdmin } from './ErrorHandling';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { ErrorRecoveryService } from './ErrorRecoveryService';
import logger from '../../../utils/logger';

interface SchedulerConfig {
  batchSize?: number;
  intervalMs?: number;
  maxRetries?: number;
  enableBatchProcessing?: boolean;
  enableRealTimeUpdates?: boolean;
}

interface SchedulerMetrics {
  totalProcessed: number;
  successfulPosts: number;
  failedPosts: number;
  averageProcessingTime: number;
  queueLength: number;
  platformStats: Record<string, {
    posts: number;
    successes: number;
    failures: number;
  }>;
}

export class AutoPostingScheduler {
  private queue: ContentQueue;
  private platformPosters: Record<string, PlatformPoster>;
  private intervalId?: NodeJS.Timeout;
  private monitoring: MonitoringService;
  private performanceOptimizer: PerformanceOptimizer;
  private errorRecovery: ErrorRecoveryService;
  private config: SchedulerConfig;
  private metrics: SchedulerMetrics;
  private isProcessing = false;
  private subscribers: Set<(update: any) => void> = new Set();

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      batchSize: 10,
      intervalMs: 300000, // 5 minutes
      maxRetries: 3,
      enableBatchProcessing: true,
      enableRealTimeUpdates: false,
      ...config
    };
    
    this.queue = new ContentQueue();
    this.platformPosters = {
      tiktok: new TikTokPoster(),
      instagram: new InstagramPoster(),
      youtube: new YouTubePoster(),
    };
    this.monitoring = new MonitoringService();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.errorRecovery = new ErrorRecoveryService(this.monitoring);
    
    this.metrics = {
      totalProcessed: 0,
      successfulPosts: 0,
      failedPosts: 0,
      averageProcessingTime: 0,
      queueLength: 0,
      platformStats: {}
    };
    
    // Initialize platform stats
    Object.keys(this.platformPosters).forEach(platform => {
      this.metrics.platformStats[platform] = {
        posts: 0,
        successes: 0,
        failures: 0
      };
    });
  }

  async processQueue(): Promise<void> {
    const batch = this.queue.getNextBatch();
    for (const item of batch) {
      for (const platform of item.platforms) {
        const poster = this.platformPosters[platform];
        if (!poster) continue;
        try {
          await poster.validateContent(item.content);
          const postId = await poster.schedulePost(item.content, item.metadata.scheduledTime);
          this.queue.updateStatus(item.id, 'scheduled');
        } catch (error) {
          // Use the ErrorRecoveryService for comprehensive error handling
          const recoveryResult = await this.errorRecovery.handleError(error, {
            contentId: item.id,
            platform,
            operation: 'autoposting_schedule',
            retryCount: item.metadata?.retryCount || 0,
            originalFunction: async () => {
              await poster.validateContent(item.content);
              return await poster.schedulePost(item.content, item.metadata.scheduledTime);
            }
          });

          if (recoveryResult.success) {
            // Recovery successful - update status to scheduled
            this.queue.updateStatus(item.id, 'scheduled', {
              postId: recoveryResult.result,
              recoveryStrategy: recoveryResult.strategy,
              timestamp: new Date().toISOString(),
              platform
            });

            // Update success metrics
            this.metrics.successfulPosts++;
            this.metrics.platformStats[platform] = this.metrics.platformStats[platform] || {
              posts: 0,
              successes: 0,
              failures: 0
            };
            this.metrics.platformStats[platform].successes++;

            // Record successful recovery in monitoring
            this.monitoring.recordSuccess(platform);

            logger.info('Post scheduled successfully after recovery', {
              contentId: item.id,
              platform,
              strategy: recoveryResult.strategy,
              postId: recoveryResult.result
            });

          } else {
            // Recovery failed - log comprehensive error details
            const errorId = logError(recoveryResult.finalError || error, {
              operation: 'autoposting_schedule_with_recovery',
              component: 'AutoPostingScheduler',
              platform,
              contentId: item.id,
              userId: item.metadata?.userId,
              sessionId: item.metadata?.sessionId,
              requestId: item.metadata?.requestId,
              additionalData: {
                scheduledTime: item.metadata.scheduledTime,
                contentType: item.content.type,
                platforms: item.platforms,
                queuePosition: batch.indexOf(item),
                recoveryStrategy: recoveryResult.strategy,
                originalError: error instanceof Error ? error.message : String(error),
                finalError: recoveryResult.finalError instanceof Error ? 
                  recoveryResult.finalError.message : String(recoveryResult.finalError)
              }
            });

            // Update queue status with comprehensive error details
            this.queue.updateStatus(item.id, 'failed', {
              error: recoveryResult.finalError instanceof Error ? 
                recoveryResult.finalError.message : String(recoveryResult.finalError),
              originalError: error instanceof Error ? error.message : String(error),
              errorId,
              timestamp: new Date().toISOString(),
              platform,
              recoveryStrategy: recoveryResult.strategy,
              retryable: this.isRetryableError(error),
              recoveryAttempted: true
            });

            // Update failure metrics
            this.metrics.failedPosts++;
            this.metrics.platformStats[platform] = this.metrics.platformStats[platform] || {
              posts: 0,
              successes: 0,
              failures: 0
            };
            this.metrics.platformStats[platform].failures++;

            // Record failure in monitoring (the ErrorRecoveryService already records this,
            // but we record it here too for scheduler-specific metrics)
            this.monitoring.recordFailure(platform, recoveryResult.finalError || error, 'schedule_post');

            // Enhanced admin notification with recovery context
            const shouldNotifyAdmin = this.shouldNotifyAdmin(recoveryResult.finalError || error, {
              platform,
              contentId: item.id,
              consecutiveFailures: this.getConsecutiveFailures(platform)
            });

            if (shouldNotifyAdmin) {
              await notifyAdmin(recoveryResult.finalError || error, {
                operation: 'autoposting_schedule_recovery_failed',
                component: 'AutoPostingScheduler',
                platform,
                contentId: item.id,
                userId: item.metadata?.userId,
                additionalData: {
                  errorId,
                  recoveryStrategy: recoveryResult.strategy,
                  originalError: error instanceof Error ? error.message : String(error),
                  consecutiveFailures: this.getConsecutiveFailures(platform),
                  queueLength: this.getQueueLength(),
                  recentErrors: this.getRecentErrors(platform),
                  recoveryServiceStatus: this.errorRecovery.getStatus()
                }
              });
            }
          }

          // Continue processing other platforms for this item
          // Don't break the loop - we want to try other platforms
          continue;
        }
      }
    }
    const health = this.monitoring.checkQueueHealth(this.queue);
    if (health !== 'healthy') {
      this.monitoring.alertAdmin(`Queue health: ${health}`);
    }
    if (this.monitoring.detectAnomalies()) {
      this.monitoring.alertAdmin('Anomaly detected in autoposting workflow');
    }
  }

  start(intervalMs: number = 300000): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.processQueue(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    
    // Cleanup error recovery service
    if (this.errorRecovery) {
      this.errorRecovery.destroy();
    }
    
    // Cleanup monitoring service
    if (this.monitoring) {
      this.monitoring.destroy();
    }
    
    logger.info('AutoPostingScheduler stopped and cleaned up', {
      timestamp: new Date().toISOString()
    });
  }

  getQueue(): ContentQueue {
    return this.queue;
  }

  /**
   * Check if an error is retryable based on error type and content
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Network/temporary errors are retryable
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('temporary') ||
        error.status === 503 || // Service Unavailable
        error.status === 502 || // Bad Gateway
        error.status === 429    // Rate Limited
    ) {
      return true;
    }
    
    // Authentication and validation errors are not retryable
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('validation') ||
        error.status === 401 ||
        error.status === 403 ||
        error.status === 400
    ) {
      return false;
    }
    
    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Determine if admin should be notified based on error severity and frequency
   */
  private shouldNotifyAdmin(error: any, context: {
    platform: string;
    contentId: string;
    consecutiveFailures: number;
  }): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Always notify for critical errors
    if (errorMessage.includes('critical') ||
        errorMessage.includes('fatal') ||
        error.status === 500
    ) {
      return true;
    }
    
    // Notify for authentication errors
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        error.status === 401
    ) {
      return true;
    }
    
    // Notify if consecutive failures exceed threshold
    if (context.consecutiveFailures >= 5) {
      return true;
    }
    
    // Notify for platform-wide issues
    const platformFailureRate = this.getPlatformFailureRate(context.platform);
    if (platformFailureRate > 0.5) { // More than 50% failure rate
      return true;
    }
    
    return false;
  }

  /**
   * Get consecutive failure count for a platform
   */
  private getConsecutiveFailures(platform: string): number {
    // This would typically be stored in a more persistent way
    // For now, we'll use the current metrics as a simple approximation
    const stats = this.metrics.platformStats[platform];
    if (!stats) return 0;
    
    // If recent posts are all failures, count them as consecutive
    // This is a simplified implementation
    return stats.failures > stats.successes ? stats.failures : 0;
  }

  /**
   * Get current queue length
   */
  private getQueueLength(): number {
    return this.queue.getNextBatch(Number.MAX_SAFE_INTEGER).length;
  }

  /**
   * Get recent errors for a platform
   */
  private getRecentErrors(platform: string): string[] {
    // This would typically be stored in a more persistent way
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get failure rate for a specific platform
   */
  private getPlatformFailureRate(platform: string): number {
    const stats = this.metrics.platformStats[platform];
    if (!stats) return 0;
    
    const total = stats.successes + stats.failures;
    return total === 0 ? 0 : stats.failures / total;
  }

  /**
   * Enhanced processQueue with comprehensive error handling and monitoring
   */
  async processQueueEnhanced(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    const processingStartTime = Date.now();
    const processId = `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('Starting queue processing', {
        processId,
        queueLength: this.getQueueLength(),
        batchSize: this.config.batchSize
      });

      // Update metrics
      this.metrics.queueLength = this.getQueueLength();

      // Process the queue
      await this.processQueue();

      const processingTime = Date.now() - processingStartTime;
      this.monitoring.recordProcessingTime(processingTime);

      // Update average processing time
      this.updateAverageProcessingTime(processingTime);

      logger.info('Queue processing completed', {
        processId,
        processingTime,
        queueLength: this.getQueueLength(),
        metrics: this.metrics
      });

      // Notify subscribers of real-time updates
      if (this.config.enableRealTimeUpdates) {
        this.notifySubscribers({
          type: 'queue_processed',
          processId,
          metrics: this.metrics,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      const processingTime = Date.now() - processingStartTime;
      
      logError(error, {
        operation: 'queue_processing',
        component: 'AutoPostingScheduler',
        processId,
        processingTime,
        queueLength: this.getQueueLength(),
        additionalData: {
          config: this.config,
          metrics: this.metrics
        }
      });

      await notifyAdmin(error, {
        operation: 'queue_processing',
        component: 'AutoPostingScheduler',
        additionalData: {
          processId,
          processingTime,
          queueLength: this.getQueueLength(),
          lastSuccessfulRun: this.getLastSuccessfulRun()
        }
      });

      throw error; // Re-throw to ensure calling code knows about the failure
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Update average processing time with exponential smoothing
   */
  private updateAverageProcessingTime(newTime: number): void {
    if (this.metrics.averageProcessingTime === 0) {
      this.metrics.averageProcessingTime = newTime;
    } else {
      // Exponential smoothing with alpha = 0.1
      this.metrics.averageProcessingTime = 
        0.1 * newTime + 0.9 * this.metrics.averageProcessingTime;
    }
  }

  /**
   * Get timestamp of last successful queue processing run
   */
  private getLastSuccessfulRun(): string {
    // This would typically be stored in persistent storage
    // For now, return a placeholder
    return new Date().toISOString();
  }

  /**
   * Notify subscribers of real-time updates
   */
  private notifySubscribers(update: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        logger.error('Error notifying subscriber', {
          error: error instanceof Error ? error.message : String(error),
          updateType: update.type
        });
      }
    });
  }

  /**
   * Subscribe to real-time updates
   */
  public subscribe(callback: (update: any) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get comprehensive metrics and health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: SchedulerMetrics;
    lastProcessingTime: number;
    queueHealth: string;
    platformStatuses: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      failureRate: number;
      consecutiveFailures: number;
    }>;
    errorRecoveryStatus: any;
    deadLetterQueueSize: number;
    timestamp: string;
  } {
    const queueHealth = this.monitoring.checkQueueHealth(this.queue);
    const platformStatuses: Record<string, any> = {};
    
    // Assess each platform's health
    Object.keys(this.platformPosters).forEach(platform => {
      const failureRate = this.getPlatformFailureRate(platform);
      const consecutiveFailures = this.getConsecutiveFailures(platform);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (failureRate > 0.5 || consecutiveFailures > 10) {
        status = 'unhealthy';
      } else if (failureRate > 0.2 || consecutiveFailures > 5) {
        status = 'degraded';
      }
      
      platformStatuses[platform] = {
        status,
        failureRate,
        consecutiveFailures
      };
    });
    
    // Determine overall status
    const hasUnhealthyPlatforms = Object.values(platformStatuses).some((p: any) => p.status === 'unhealthy');
    const hasDegradedPlatforms = Object.values(platformStatuses).some((p: any) => p.status === 'degraded');
    const queueIsUnhealthy = queueHealth === 'critical';
    const queueIsDegraded = queueHealth === 'warning';
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasUnhealthyPlatforms || queueIsUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegradedPlatforms || queueIsDegraded) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      metrics: this.metrics,
      lastProcessingTime: this.metrics.averageProcessingTime,
      queueHealth,
      platformStatuses,
      errorRecoveryStatus: this.errorRecovery.getStatus(),
      deadLetterQueueSize: this.errorRecovery.getDeadLetterQueue().length,
      timestamp: new Date().toISOString()
    };
  }
} 