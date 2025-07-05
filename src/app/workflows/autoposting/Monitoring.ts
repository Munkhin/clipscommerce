import { ContentQueue } from './ContentQueue';
import logger from '../../../utils/logger';
import * as Sentry from '@sentry/nextjs';
import { logError, notifyAdmin } from './ErrorHandling';

// Enhanced monitoring data structures
interface MonitoringMetrics {
  successCount: number;
  failureCount: number;
  processingTimes: number[];
  errors: ErrorRecord[];
  healthChecks: HealthCheckRecord[];
  platformMetrics: Record<string, PlatformMetrics>;
  startTime: number;
  lastResetTime: number;
}

interface ErrorRecord {
  timestamp: number;
  errorType: string;
  message: string;
  severity: string;
  platform?: string;
  operationId?: string;
}

interface HealthCheckRecord {
  timestamp: number;
  queueLength: number;
  successRate: number;
  failureRate: number;
  averageProcessingTime: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface PlatformMetrics {
  successes: number;
  failures: number;
  lastSuccess?: number;
  lastFailure?: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  responseTimes: number[];
}

interface AnomalyDetectionConfig {
  maxFailureRate: number;
  maxAverageProcessingTime: number;
  maxQueueLength: number;
  maxConsecutiveFailures: number;
  minSuccessRate: number;
  healthCheckInterval: number;
}

export class MonitoringService {
  private metrics: MonitoringMetrics;
  private anomalyConfig: AnomalyDetectionConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private maxHistorySize = 1000; // Maximum number of records to keep in memory

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.metrics = {
      successCount: 0,
      failureCount: 0,
      processingTimes: [],
      errors: [],
      healthChecks: [],
      platformMetrics: {},
      startTime: Date.now(),
      lastResetTime: Date.now()
    };

    this.anomalyConfig = {
      maxFailureRate: 0.5,
      maxAverageProcessingTime: 10000,
      maxQueueLength: 100,
      maxConsecutiveFailures: 5,
      minSuccessRate: 0.3,
      healthCheckInterval: 60000, // 1 minute
      ...config
    };

    this.startHealthChecking();
    logger.info('MonitoringService initialized', {
      config: this.anomalyConfig,
      timestamp: new Date().toISOString()
    });
  }

  recordSuccess(platform?: string, responseTime?: number) {
    this.metrics.successCount++;
    
    if (platform) {
      if (!this.metrics.platformMetrics[platform]) {
        this.initializePlatformMetrics(platform);
      }
      
      const platformMetrics = this.metrics.platformMetrics[platform];
      platformMetrics.successes++;
      platformMetrics.lastSuccess = Date.now();
      platformMetrics.consecutiveFailures = 0; // Reset consecutive failures
      
      if (responseTime !== undefined) {
        platformMetrics.responseTimes.push(responseTime);
        this.updateAverageResponseTime(platform);
      }
    }

    // Log successful operation for audit trail
    logger.debug('Operation success recorded', {
      platform,
      responseTime,
      totalSuccesses: this.metrics.successCount,
      timestamp: new Date().toISOString()
    });
  }

  recordFailure(platform?: string, error?: any, errorType?: string) {
    this.metrics.failureCount++;
    
    // Record error details
    const errorRecord: ErrorRecord = {
      timestamp: Date.now(),
      errorType: errorType || 'unknown',
      message: error instanceof Error ? error.message : String(error || 'Unknown error'),
      severity: this.determineErrorSeverity(error),
      platform,
      operationId: this.generateOperationId()
    };
    
    this.metrics.errors.push(errorRecord);
    
    if (platform) {
      if (!this.metrics.platformMetrics[platform]) {
        this.initializePlatformMetrics(platform);
      }
      
      const platformMetrics = this.metrics.platformMetrics[platform];
      platformMetrics.failures++;
      platformMetrics.lastFailure = Date.now();
      platformMetrics.consecutiveFailures++;
    }

    // Trim error history if it gets too large
    if (this.metrics.errors.length > this.maxHistorySize) {
      this.metrics.errors = this.metrics.errors.slice(-this.maxHistorySize / 2);
    }

    // Log failure for monitoring
    logger.warn('Operation failure recorded', {
      platform,
      errorType: errorRecord.errorType,
      message: errorRecord.message,
      severity: errorRecord.severity,
      consecutiveFailures: platform ? this.metrics.platformMetrics[platform]?.consecutiveFailures : undefined,
      totalFailures: this.metrics.failureCount,
      timestamp: new Date().toISOString()
    });

    // Check for immediate anomalies that require alert
    this.checkImmediateAnomalies(platform, errorRecord);
  }

  recordProcessingTime(ms: number) {
    this.metrics.processingTimes.push(ms);
    
    // Trim processing times history if it gets too large
    if (this.metrics.processingTimes.length > this.maxHistorySize) {
      this.metrics.processingTimes = this.metrics.processingTimes.slice(-this.maxHistorySize / 2);
    }
  }

  getQueueLength(queue: ContentQueue): number {
    return queue.getNextBatch(Number.MAX_SAFE_INTEGER).length;
  }

  getSuccessRate(): number {
    const total = this.metrics.successCount + this.metrics.failureCount;
    return total === 0 ? 0 : this.metrics.successCount / total;
  }

  getFailureRate(): number {
    const total = this.metrics.successCount + this.metrics.failureCount;
    return total === 0 ? 0 : this.metrics.failureCount / total;
  }

  getAverageProcessingTime(): number {
    if (this.metrics.processingTimes.length === 0) return 0;
    return this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length;
  }

  /**
   * Enhanced queue health check with multiple factors
   */
  checkQueueHealth(queue: ContentQueue): 'healthy' | 'warning' | 'critical' {
    const length = this.getQueueLength(queue);
    const failureRate = this.getFailureRate();
    const avgProcessingTime = this.getAverageProcessingTime();
    
    // Critical conditions
    if (length >= this.anomalyConfig.maxQueueLength ||
        failureRate > this.anomalyConfig.maxFailureRate ||
        avgProcessingTime > this.anomalyConfig.maxAverageProcessingTime) {
      return 'critical';
    }
    
    // Warning conditions
    if (length >= this.anomalyConfig.maxQueueLength * 0.7 ||
        failureRate > this.anomalyConfig.maxFailureRate * 0.7 ||
        avgProcessingTime > this.anomalyConfig.maxAverageProcessingTime * 0.7) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Enhanced anomaly detection with multiple metrics
   */
  detectAnomalies(): {
    hasAnomalies: boolean;
    anomalies: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const anomalies: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check failure rate
    const failureRate = this.getFailureRate();
    if (failureRate > this.anomalyConfig.maxFailureRate) {
      anomalies.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
      maxSeverity = failureRate > 0.8 ? 'critical' : 'high';
    }

    // Check processing time
    const avgProcessingTime = this.getAverageProcessingTime();
    if (avgProcessingTime > this.anomalyConfig.maxAverageProcessingTime) {
      anomalies.push(`Slow processing: ${avgProcessingTime.toFixed(0)}ms average`);
      maxSeverity = avgProcessingTime > 20000 ? 'critical' : 'high';
    }

    // Check platform-specific anomalies
    Object.entries(this.metrics.platformMetrics).forEach(([platform, metrics]) => {
      if (metrics.consecutiveFailures >= this.anomalyConfig.maxConsecutiveFailures) {
        anomalies.push(`${platform}: ${metrics.consecutiveFailures} consecutive failures`);
        maxSeverity = metrics.consecutiveFailures > 10 ? 'critical' : 'high';
      }
    });

    // Check recent error patterns
    const recentErrors = this.getRecentErrors(300000); // Last 5 minutes
    if (recentErrors.length > 10) {
      anomalies.push(`High error frequency: ${recentErrors.length} errors in 5 minutes`);
      maxSeverity = recentErrors.length > 20 ? 'critical' : 'medium';
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      severity: maxSeverity
    };
  }

  /**
   * Enhanced admin alerting with context and severity
   */
  alertAdmin(message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', context?: any) {
    const alertData = {
      message,
      severity,
      timestamp: new Date().toISOString(),
      metrics: this.getMetricsSummary(),
      context: context || {},
      environment: process.env.NODE_ENV
    };

    // Use the enhanced notification system
    notifyAdmin(new Error(message), {
      operation: 'monitoring_alert',
      component: 'MonitoringService',
      additionalData: alertData
    });

    // Log the alert
    logger.warn('Admin alert triggered', alertData);

    // Send to Sentry for tracking
    Sentry.captureMessage(`Monitoring Alert: ${message}`, severity as any);
  }

  /**
   * Start automated health checking
   */
  private startHealthChecking() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.anomalyConfig.healthCheckInterval);
  }

  /**
   * Perform comprehensive health check
   */
  private performHealthCheck() {
    const healthRecord: HealthCheckRecord = {
      timestamp: Date.now(),
      queueLength: 0, // Will be updated by caller
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
      averageProcessingTime: this.getAverageProcessingTime(),
      status: 'healthy' // Will be determined
    };

    // Determine overall health status
    const anomalies = this.detectAnomalies();
    if (anomalies.hasAnomalies) {
      healthRecord.status = anomalies.severity === 'critical' ? 'critical' : 'warning';
      
      // Alert admin if anomalies detected
      this.alertAdmin(
        `Health check detected anomalies: ${anomalies.anomalies.join(', ')}`,
        anomalies.severity,
        { anomalies: anomalies.anomalies }
      );
    }

    this.metrics.healthChecks.push(healthRecord);

    // Trim health check history
    if (this.metrics.healthChecks.length > this.maxHistorySize) {
      this.metrics.healthChecks = this.metrics.healthChecks.slice(-this.maxHistorySize / 2);
    }

    // Log health check
    logger.info('Health check completed', {
      status: healthRecord.status,
      successRate: healthRecord.successRate,
      failureRate: healthRecord.failureRate,
      averageProcessingTime: healthRecord.averageProcessingTime,
      anomalies: anomalies.hasAnomalies ? anomalies.anomalies : undefined
    });
  }

  /**
   * Check for immediate anomalies that require instant alerting
   */
  private checkImmediateAnomalies(platform?: string, errorRecord?: ErrorRecord) {
    if (platform) {
      const platformMetrics = this.metrics.platformMetrics[platform];
      if (platformMetrics && platformMetrics.consecutiveFailures >= this.anomalyConfig.maxConsecutiveFailures) {
        this.alertAdmin(
          `Critical: ${platform} has ${platformMetrics.consecutiveFailures} consecutive failures`,
          'critical',
          { platform, consecutiveFailures: platformMetrics.consecutiveFailures }
        );
      }
    }

    if (errorRecord && errorRecord.severity === 'critical') {
      this.alertAdmin(
        `System alert: ${errorRecord.message}`,
        'critical',
        { errorRecord }
      );
    }
  }

  /**
   * Initialize platform metrics
   */
  private initializePlatformMetrics(platform: string): void {
    this.metrics.platformMetrics[platform] = {
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  /**
   * Update average response time for a platform
   */
  private updateAverageResponseTime(platform: string): void {
    const platformMetrics = this.metrics.platformMetrics[platform];
    if (platformMetrics.responseTimes.length === 0) return;

    // Keep only last 100 response times for moving average
    if (platformMetrics.responseTimes.length > 100) {
      platformMetrics.responseTimes = platformMetrics.responseTimes.slice(-50);
    }

    platformMetrics.averageResponseTime = 
      platformMetrics.responseTimes.reduce((a, b) => a + b, 0) / platformMetrics.responseTimes.length;
  }

  /**
   * Determine error severity based on error content
   */
  private determineErrorSeverity(error: any): string {
    if (!error) return 'low';
    
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal') || error.status === 500) {
      return 'critical';
    }
    
    if (message.includes('unauthorized') || message.includes('authentication') || error.status === 401) {
      return 'high';
    }
    
    if (message.includes('timeout') || message.includes('network') || error.status >= 500) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent errors within specified time window
   */
  private getRecentErrors(timeWindowMs: number): ErrorRecord[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.errors.filter(error => error.timestamp > cutoff);
  }

  /**
   * Get metrics summary for reporting
   */
  getMetricsSummary(): any {
    return {
      uptime: Date.now() - this.metrics.startTime,
      totalOperations: this.metrics.successCount + this.metrics.failureCount,
      successCount: this.metrics.successCount,
      failureCount: this.metrics.failureCount,
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
      averageProcessingTime: this.getAverageProcessingTime(),
      platformMetrics: this.metrics.platformMetrics,
      recentErrors: this.getRecentErrors(3600000), // Last hour
      lastHealthCheck: this.metrics.healthChecks[this.metrics.healthChecks.length - 1]
    };
  }

  /**
   * Reset metrics (useful for testing or periodic cleanup)
   */
  resetMetrics(): void {
    logger.info('Resetting monitoring metrics', {
      previousMetrics: this.getMetricsSummary(),
      timestamp: new Date().toISOString()
    });

    this.metrics = {
      successCount: 0,
      failureCount: 0,
      processingTimes: [],
      errors: [],
      healthChecks: [],
      platformMetrics: {},
      startTime: Date.now(),
      lastResetTime: Date.now()
    };
  }

  /**
   * Get detailed health report
   */
  getHealthReport(): any {
    const anomalies = this.detectAnomalies();
    
    return {
      timestamp: new Date().toISOString(),
      overallStatus: anomalies.hasAnomalies ? 
        (anomalies.severity === 'critical' ? 'critical' : 'warning') : 'healthy',
      metrics: this.getMetricsSummary(),
      anomalies,
      configuration: this.anomalyConfig,
      uptime: Date.now() - this.metrics.startTime,
      platformStatuses: Object.entries(this.metrics.platformMetrics).map(([platform, metrics]) => ({
        platform,
        status: metrics.consecutiveFailures >= this.anomalyConfig.maxConsecutiveFailures ? 'unhealthy' : 'healthy',
        successRate: metrics.successes / (metrics.successes + metrics.failures || 1),
        consecutiveFailures: metrics.consecutiveFailures,
        averageResponseTime: metrics.averageResponseTime,
        lastSuccess: metrics.lastSuccess,
        lastFailure: metrics.lastFailure
      }))
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    logger.info('MonitoringService destroyed', {
      finalMetrics: this.getMetricsSummary(),
      timestamp: new Date().toISOString()
    });
  }
}

// Batch API requests and parallel processing stubs
export async function batchProcess<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize = 5): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
} 