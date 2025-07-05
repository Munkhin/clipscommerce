import { createClient } from '@/lib/supabase/client';

export enum VideoErrorType {
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  EDIT_FAILED = 'EDIT_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CORRUPTED_FILE = 'CORRUPTED_FILE'
}

export interface VideoError {
  type: VideoErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  timestamp: Date;
  correlationId?: string;
}

export interface ErrorRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  onRetry?: (attempt: number, error: VideoError) => void;
  onMaxRetriesReached?: (error: VideoError) => void;
}

export class VideoErrorHandler {
  private supabase;
  private errorLog: VideoError[] = [];

  constructor() {
    this.supabase = createClient();
  }

  createError(
    type: VideoErrorType,
    technicalMessage: string,
    details?: any,
    correlationId?: string
  ): VideoError {
    const error: VideoError = {
      type,
      message: technicalMessage,
      details,
      retryable: this.isRetryable(type),
      userMessage: this.getUserMessage(type),
      technicalMessage,
      timestamp: new Date(),
      correlationId
    };

    this.errorLog.push(error);
    this.logError(error);

    return error;
  }

  async handleError(
    error: VideoError,
    context: {
      videoId?: string;
      userId?: string;
      operation?: string;
      stage?: string;
    }
  ): Promise<void> {
    try {
      // Log to database
      await this.supabase
        .from('video_error_logs')
        .insert({
          error_type: error.type,
          error_message: error.message,
          technical_message: error.technicalMessage,
          user_message: error.userMessage,
          details: error.details,
          retryable: error.retryable,
          video_id: context.videoId,
          user_id: context.userId,
          operation: context.operation,
          stage: context.stage,
          correlation_id: error.correlationId,
          created_at: error.timestamp.toISOString()
        });

      // Send to monitoring service (in production)
      if (process.env.NODE_ENV === 'production') {
        await this.sendToMonitoring(error, context);
      }

      // Handle critical errors
      if (this.isCriticalError(error.type)) {
        await this.handleCriticalError(error, context);
      }
    } catch (loggingError) {
      console.error('Failed to log video error:', loggingError);
    }
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions,
    context: { videoId?: string; userId?: string; operationName: string }
  ): Promise<T> {
    let lastError: VideoError;
    
    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.createError(
          VideoErrorType.PROCESSING_FAILED,
          error instanceof Error ? error.message : 'Unknown error occurred',
          { attempt, maxRetries: options.maxRetries },
          `retry_${context.operationName}_${Date.now()}`
        );

        await this.handleError(lastError, {
          ...context,
          operation: context.operationName,
          stage: `attempt_${attempt}`
        });

        if (options.onRetry) {
          options.onRetry(attempt, lastError);
        }

        if (attempt < options.maxRetries && lastError.retryable) {
          const delay = options.retryDelay * Math.pow(options.backoffMultiplier, attempt - 1);
          await this.delay(delay);
        } else {
          break;
        }
      }
    }

    if (options.onMaxRetriesReached) {
      options.onMaxRetriesReached(lastError!);
    }

    throw lastError!;
  }

  getRecoveryStrategy(errorType: VideoErrorType): {
    shouldRetry: boolean;
    maxRetries: number;
    retryDelay: number;
    userAction?: string;
  } {
    const strategies = {
      [VideoErrorType.UPLOAD_FAILED]: {
        shouldRetry: true,
        maxRetries: 3,
        retryDelay: 5000,
        userAction: 'Check your internet connection and try uploading again'
      },
      [VideoErrorType.PROCESSING_FAILED]: {
        shouldRetry: true,
        maxRetries: 2,
        retryDelay: 10000,
        userAction: 'Wait a few minutes and try processing again'
      },
      [VideoErrorType.ANALYSIS_FAILED]: {
        shouldRetry: true,
        maxRetries: 2,
        retryDelay: 5000,
        userAction: 'Try analyzing the video again'
      },
      [VideoErrorType.EDIT_FAILED]: {
        shouldRetry: true,
        maxRetries: 2,
        retryDelay: 3000,
        userAction: 'Review your edit settings and try again'
      },
      [VideoErrorType.INVALID_FORMAT]: {
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        userAction: 'Please upload a video in MP4, MOV, or AVI format'
      },
      [VideoErrorType.FILE_TOO_LARGE]: {
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        userAction: 'Please reduce the file size or upload a smaller video'
      },
      [VideoErrorType.INSUFFICIENT_PERMISSIONS]: {
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        userAction: 'Please log in again or contact support'
      },
      [VideoErrorType.NETWORK_ERROR]: {
        shouldRetry: true,
        maxRetries: 5,
        retryDelay: 2000,
        userAction: 'Check your internet connection'
      },
      [VideoErrorType.SERVER_ERROR]: {
        shouldRetry: true,
        maxRetries: 3,
        retryDelay: 10000,
        userAction: 'Please try again in a few minutes'
      },
      [VideoErrorType.TIMEOUT_ERROR]: {
        shouldRetry: true,
        maxRetries: 2,
        retryDelay: 15000,
        userAction: 'The operation timed out. Please try again'
      },
      [VideoErrorType.QUOTA_EXCEEDED]: {
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        userAction: 'You have reached your usage limit. Please upgrade your plan'
      },
      [VideoErrorType.CORRUPTED_FILE]: {
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        userAction: 'The video file appears to be corrupted. Please try a different file'
      }
    };

    return strategies[errorType] || {
      shouldRetry: false,
      maxRetries: 0,
      retryDelay: 0,
      userAction: 'An unexpected error occurred. Please try again'
    };
  }

  async getErrorStatistics(userId?: string, timeRange?: '1h' | '24h' | '7d' | '30d'): Promise<{
    totalErrors: number;
    errorsByType: Record<VideoErrorType, number>;
    retryableErrors: number;
    criticalErrors: number;
    recentErrors: VideoError[];
  }> {
    try {
      let query = this.supabase
        .from('video_error_logs')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (timeRange) {
        const timeRangeMap = {
          '1h': 1,
          '24h': 24,
          '7d': 24 * 7,
          '30d': 24 * 30
        };
        const hoursAgo = timeRangeMap[timeRange];
        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
        query = query.gte('created_at', cutoffTime.toISOString());
      }

      const { data: errors, error } = await query.order('created_at', { ascending: false });

      if (error || !errors) {
        return {
          totalErrors: 0,
          errorsByType: {} as Record<VideoErrorType, number>,
          retryableErrors: 0,
          criticalErrors: 0,
          recentErrors: []
        };
      }

      const errorsByType = errors.reduce((acc, error) => {
        acc[error.error_type as VideoErrorType] = (acc[error.error_type as VideoErrorType] || 0) + 1;
        return acc;
      }, {} as Record<VideoErrorType, number>);

      const retryableErrors = errors.filter(e => e.retryable).length;
      const criticalErrors = errors.filter(e => this.isCriticalError(e.error_type)).length;

      const recentErrors = errors.slice(0, 10).map(e => ({
        type: e.error_type,
        message: e.error_message,
        details: e.details,
        retryable: e.retryable,
        userMessage: e.user_message,
        technicalMessage: e.technical_message,
        timestamp: new Date(e.created_at),
        correlationId: e.correlation_id
      }));

      return {
        totalErrors: errors.length,
        errorsByType,
        retryableErrors,
        criticalErrors,
        recentErrors
      };
    } catch (error) {
      console.error('Error fetching error statistics:', error);
      return {
        totalErrors: 0,
        errorsByType: {} as Record<VideoErrorType, number>,
        retryableErrors: 0,
        criticalErrors: 0,
        recentErrors: []
      };
    }
  }

  private isRetryable(type: VideoErrorType): boolean {
    const retryableTypes = [
      VideoErrorType.UPLOAD_FAILED,
      VideoErrorType.PROCESSING_FAILED,
      VideoErrorType.ANALYSIS_FAILED,
      VideoErrorType.EDIT_FAILED,
      VideoErrorType.NETWORK_ERROR,
      VideoErrorType.SERVER_ERROR,
      VideoErrorType.TIMEOUT_ERROR
    ];
    return retryableTypes.includes(type);
  }

  private isCriticalError(type: VideoErrorType): boolean {
    const criticalTypes = [
      VideoErrorType.SERVER_ERROR,
      VideoErrorType.CORRUPTED_FILE,
      VideoErrorType.QUOTA_EXCEEDED
    ];
    return criticalTypes.includes(type);
  }

  private getUserMessage(type: VideoErrorType): string {
    const messages = {
      [VideoErrorType.UPLOAD_FAILED]: 'Failed to upload your video. Please try again.',
      [VideoErrorType.PROCESSING_FAILED]: 'Video processing failed. Please try again.',
      [VideoErrorType.ANALYSIS_FAILED]: 'Video analysis failed. Please try again.',
      [VideoErrorType.EDIT_FAILED]: 'Video editing failed. Please try again.',
      [VideoErrorType.INVALID_FORMAT]: 'Invalid video format. Please upload MP4, MOV, or AVI files.',
      [VideoErrorType.FILE_TOO_LARGE]: 'File is too large. Please upload a smaller video.',
      [VideoErrorType.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
      [VideoErrorType.NETWORK_ERROR]: 'Network connection error. Please check your internet.',
      [VideoErrorType.SERVER_ERROR]: 'Server error. Please try again later.',
      [VideoErrorType.TIMEOUT_ERROR]: 'The operation timed out. Please try again.',
      [VideoErrorType.QUOTA_EXCEEDED]: 'You have exceeded your usage limit. Please upgrade your plan.',
      [VideoErrorType.CORRUPTED_FILE]: 'The video file appears to be corrupted.'
    };
    return messages[type] || 'An unexpected error occurred.';
  }

  private logError(error: VideoError): void {
    const logLevel = this.isCriticalError(error.type) ? 'error' : 'warn';
    console[logLevel]('Video Error:', {
      type: error.type,
      message: error.message,
      retryable: error.retryable,
      timestamp: error.timestamp,
      correlationId: error.correlationId,
      details: error.details
    });
  }

  private async sendToMonitoring(error: VideoError, context: any): Promise<void> {
    // In production, send to monitoring service like Sentry, DataDog, etc.
    console.log('Sending error to monitoring service:', error, context);
  }

  private async handleCriticalError(error: VideoError, context: any): Promise<void> {
    // Handle critical errors - send alerts, etc.
    console.error('Critical video error detected:', error, context);
    
    // In production, this might:
    // 1. Send alert to operations team
    // 2. Create incident ticket
    // 3. Trigger automated recovery procedures
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get recent errors for UI display
  getRecentErrors(limit: number = 10): VideoError[] {
    return this.errorLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Clear error log (for testing)
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Singleton instance
export const videoErrorHandler = new VideoErrorHandler();