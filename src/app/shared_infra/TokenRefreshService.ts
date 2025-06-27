import { EventEmitter } from 'events';
import { RetryPolicy } from './RetryPolicy';
import { Platform } from '../workflows/data_collection/functions/types';

export interface TokenRefreshRequest {
  id: string;
  platform: Platform;
  userId?: string;
  priority: number;
  scheduledTime: number;
  retryCount: number;
  maxRetries: number;
  jitterMs?: number;
  traceId?: string;
  correlationId?: string;
}

export interface TokenRefreshResult {
  id: string;
  success: boolean;
  error?: Error;
  duration: number;
  timestamp: number;
  traceId?: string;
}

export interface TokenRefreshMetrics {
  totalRequests: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  averageResponseTime: number;
  currentQueueSize: number;
  circuitBreakerStatus: Record<string, any>;
}

export interface ITokenRefresher {
  refreshToken(platform: Platform, userId?: string, traceId?: string): Promise<boolean>;
}

export class TokenRefreshService extends EventEmitter {
  private refreshQueue: TokenRefreshRequest[] = [];
  private processing = false;
  private retryPolicy: RetryPolicy;
  private refreshers = new Map<Platform, ITokenRefresher>();
  private metrics: TokenRefreshMetrics = {
    totalRequests: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageResponseTime: 0,
    currentQueueSize: 0,
    circuitBreakerStatus: {}
  };
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 100;

  constructor(
    private options: {
      maxQueueSize?: number;
      processingIntervalMs?: number;
      defaultJitterMs?: number;
      defaultMaxRetries?: number;
      telemetryEnabled?: boolean;
    } = {}
  ) {
    super();
    
    this.retryPolicy = new RetryPolicy({
      maxRetries: this.options.defaultMaxRetries || 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffFactor: 2,
      jitter: true,
      onError: (error, attempt) => {
        this.emit('retryError', { error, attempt });
        this.emitTelemetry('token_refresh_retry_error', {
          error: error.message,
          attempt,
          timestamp: Date.now()
        });
      },
      onRetry: (attempt, delay) => {
        this.emit('retryAttempt', { attempt, delay });
        this.emitTelemetry('token_refresh_retry_attempt', {
          attempt,
          delay,
          timestamp: Date.now()
        });
      }
    });

    // Start processing queue
    this.startProcessing();
  }

  registerRefresher(platform: Platform, refresher: ITokenRefresher): void {
    this.refreshers.set(platform, refresher);
    this.emit('refresherRegistered', { platform });
  }

  scheduleRefresh(request: Omit<TokenRefreshRequest, 'id' | 'retryCount'>): string {
    const id = this.generateRequestId();
    const jitterMs = request.jitterMs || this.options.defaultJitterMs || 0;
    const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
    
    const refreshRequest: TokenRefreshRequest = {
      ...request,
      id,
      retryCount: 0,
      scheduledTime: request.scheduledTime + jitter,
      maxRetries: request.maxRetries || this.options.defaultMaxRetries || 3
    };

    // Check queue size limit
    const maxQueueSize = this.options.maxQueueSize || 1000;
    if (this.refreshQueue.length >= maxQueueSize) {
      // Remove oldest low-priority requests
      this.refreshQueue.sort((a, b) => b.priority - a.priority || a.scheduledTime - b.scheduledTime);
      this.refreshQueue = this.refreshQueue.slice(0, maxQueueSize - 1);
    }

    this.refreshQueue.push(refreshRequest);
    this.updateMetrics();
    
    this.emit('refreshScheduled', { requestId: id, platform: request.platform, userId: request.userId });
    this.emitTelemetry('token_refresh_scheduled', {
      requestId: id,
      platform: request.platform,
      userId: request.userId || 'default',
      scheduledTime: refreshRequest.scheduledTime,
      priority: refreshRequest.priority,
      jitter,
      timestamp: Date.now()
    });

    return id;
  }

  cancelRefresh(requestId: string): boolean {
    const initialLength = this.refreshQueue.length;
    this.refreshQueue = this.refreshQueue.filter(req => req.id !== requestId);
    const cancelled = this.refreshQueue.length < initialLength;
    
    if (cancelled) {
      this.updateMetrics();
      this.emit('refreshCancelled', { requestId });
      this.emitTelemetry('token_refresh_cancelled', {
        requestId,
        timestamp: Date.now()
      });
    }
    
    return cancelled;
  }

  getQueueStatus(): {
    totalQueued: number;
    readyToProcess: number;
    byPlatform: Record<string, number>;
    processing: boolean;
  } {
    const now = Date.now();
    const readyToProcess = this.refreshQueue.filter(req => req.scheduledTime <= now).length;
    const byPlatform: Record<string, number> = {};
    
    this.refreshQueue.forEach(req => {
      byPlatform[req.platform] = (byPlatform[req.platform] || 0) + 1;
    });

    return {
      totalQueued: this.refreshQueue.length,
      readyToProcess,
      byPlatform,
      processing: this.processing
    };
  }

  getMetrics(): TokenRefreshMetrics {
    return {
      ...this.metrics,
      circuitBreakerStatus: this.getCircuitBreakerStatuses()
    };
  }

  private async startProcessing(): Promise<void> {
    const intervalMs = this.options.processingIntervalMs || 5000;
    
    setInterval(async () => {
      if (!this.processing) {
        await this.processQueue();
      }
    }, intervalMs);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.refreshQueue.length === 0) {
      return;
    }

    this.processing = true;
    const now = Date.now();
    
    try {
      // Sort by priority (higher first) then by scheduled time
      this.refreshQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.scheduledTime - b.scheduledTime;
      });

      // Process ready requests
      const readyRequests = this.refreshQueue.filter(req => req.scheduledTime <= now);
      const processingPromises = readyRequests.slice(0, 10).map(req => this.processRequest(req)); // Process up to 10 at once
      
      await Promise.allSettled(processingPromises);
      
      // Remove processed requests
      this.refreshQueue = this.refreshQueue.filter(req => req.scheduledTime > now || req.retryCount > req.maxRetries);
      this.updateMetrics();
      
    } catch (error) {
      this.emit('processingError', { error });
      this.emitTelemetry('token_refresh_processing_error', {
        error: (error as Error).message,
        timestamp: Date.now()
      });
    } finally {
      this.processing = false;
    }
  }

  private async processRequest(request: TokenRefreshRequest): Promise<void> {
    const startTime = Date.now();
    
    try {
      const refresher = this.refreshers.get(request.platform);
      if (!refresher) {
        throw new Error(`No refresher registered for platform: ${request.platform}`);
      }

      const success = await this.retryPolicy.execute(
        () => refresher.refreshToken(request.platform, request.userId, request.traceId),
        {
          operationName: `token_refresh_${request.platform}`,
          traceId: request.traceId,
          maxRetries: request.maxRetries
        }
      );

      const duration = Date.now() - startTime;
      this.recordResponse(duration, true);

      const result: TokenRefreshResult = {
        id: request.id,
        success,
        duration,
        timestamp: Date.now(),
        traceId: request.traceId
      };

      this.emit('refreshCompleted', result);
      this.emitTelemetry('token_refresh_completed', {
        requestId: request.id,
        platform: request.platform,
        userId: request.userId || 'default',
        success,
        duration,
        retryCount: request.retryCount,
        traceId: request.traceId,
        timestamp: Date.now()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordResponse(duration, false);

      // Retry logic
      if (request.retryCount < request.maxRetries) {
        request.retryCount++;
        request.scheduledTime = Date.now() + (1000 * Math.pow(2, request.retryCount)); // Exponential backoff
        // Request will be reprocessed in next cycle
      } else {
        const result: TokenRefreshResult = {
          id: request.id,
          success: false,
          error: error as Error,
          duration,
          timestamp: Date.now(),
          traceId: request.traceId
        };

        this.emit('refreshFailed', result);
        this.emitTelemetry('token_refresh_failed', {
          requestId: request.id,
          platform: request.platform,
          userId: request.userId || 'default',
          error: (error as Error).message,
          duration,
          retryCount: request.retryCount,
          traceId: request.traceId,
          timestamp: Date.now()
        });
      }
    }
  }

  private recordResponse(duration: number, success: boolean): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRefreshes++;
    } else {
      this.metrics.failedRefreshes++;
    }

    this.responseTimes.push(duration);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    this.metrics.averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  private updateMetrics(): void {
    this.metrics.currentQueueSize = this.refreshQueue.length;
  }

  private getCircuitBreakerStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    // Get circuit breaker status for each platform
    this.refreshers.forEach((_, platform) => {
      statuses[`token_refresh_${platform}`] = this.retryPolicy.getCircuitBreakerStatus(`token_refresh_${platform}`);
    });

    return statuses;
  }

  private generateRequestId(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitTelemetry(eventName: string, data: any): void {
    if (this.options.telemetryEnabled !== false) {
      this.emit('telemetry', { eventName, data });
      
      // Emit to global telemetry system if available
      if (global && (global as any).telemetry) {
        (global as any).telemetry.emit(eventName, data);
      }
    }
  }

  // Cleanup method
  destroy(): void {
    this.processing = false;
    this.refreshQueue = [];
    this.refreshers.clear();
    this.removeAllListeners();
  }
} 