import * as Sentry from '@sentry/nextjs';
import logger from '../../../utils/logger';
import { getLoggingConfig, maskSensitiveData } from '../../../config/logging';
import { NotificationService } from './NotificationService';
import { errorNotificationService, NotificationType, NotificationPriority } from '../../../lib/errors/errorNotification';
import { ErrorCategory, ErrorSeverity } from '../../../lib/errors/errorReporting';

// Enhanced error context interface
interface ErrorContext {
  operation?: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  platform?: string;
  contentId?: string;
  retryAttempt?: number;
  processId?: string;
  processingTime?: number;
  queueLength?: number;
  operationId?: string;
  attempt?: number;
  maxRetries?: number;
  isLastAttempt?: boolean;
  nextDelay?: number;
  additionalData?: Record<string, any>;
}

// Error severity levels for different handling
export enum AutopostingErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error types specific to autoposting
export enum AutopostingErrorType {
  PLATFORM_API_ERROR = 'platform_api_error',
  CONTENT_VALIDATION_ERROR = 'content_validation_error',
  SCHEDULING_ERROR = 'scheduling_error',
  QUEUE_ERROR = 'queue_error',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Initialize notification service
const notificationService = new NotificationService();
const loggingConfig = getLoggingConfig();

// Enhanced exponential backoff with comprehensive logging
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 500,
  context?: ErrorContext
): Promise<T> {
  let attempt = 0;
  let delay = initialDelay;
  const operationId = context?.requestId || `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log operation start
  logger.info('Starting operation with exponential backoff', {
    operationId,
    maxRetries,
    initialDelay,
    ...context
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      // Log successful operation
      logger.info('Operation completed successfully', {
        operationId,
        attempt: attempt + 1,
        duration,
        ...context
      });

      return result;
    } catch (error) {
      attempt++;
      const isLastAttempt = attempt >= maxRetries;

      // Log retry attempt
      logError(error, {
        ...context,
        operationId,
        attempt,
        maxRetries,
        isLastAttempt,
        nextDelay: isLastAttempt ? 0 : delay * 2
      });

      if (isLastAttempt) {
        // Log final failure
        logger.error('Operation failed after all retries', {
          operationId,
          totalAttempts: attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
          ...context
        });

        throw error;
      }

      // Wait before retry
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

// Enhanced error logging with multiple destinations
export function logError(error: any, context: ErrorContext = {}) {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Determine error severity and type
  const { severity, errorType } = categorizeError(error, context);
  
  // Prepare error data
  const errorData = {
    errorId,
    timestamp,
    severity,
    errorType,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: maskSensitiveData(context, loggingConfig.security.sensitiveFields),
    environment: process.env.NODE_ENV,
    service: 'autoposting-scheduler',
    version: process.env.npm_package_version
  };

  // Log to console/file using pino logger
  const logMethod = severity === AutopostingErrorSeverity.CRITICAL || severity === AutopostingErrorSeverity.HIGH 
    ? logger.error 
    : severity === AutopostingErrorSeverity.MEDIUM 
    ? logger.warn 
    : logger.info;

  logMethod('Autoposting error occurred', errorData);

  // Send to Sentry for error tracking and alerting
  Sentry.withScope((scope) => {
    scope.setTag('component', 'autoposting-scheduler');
    scope.setTag('errorType', errorType);
    scope.setTag('severity', severity);
    scope.setContext('errorData', errorData);
    
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context.requestId) {
      scope.setTag('requestId', context.requestId);
    }

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });

  // Log to database for audit trail (if needed)
  logToDatabase(errorData).catch(dbError => {
    logger.error('Failed to log error to database', {
      originalError: errorData,
      dbError: dbError instanceof Error ? dbError.message : String(dbError)
    });
  });

  // Store error for potential admin notification
  return errorId;
}

// Enhanced admin notification system
export async function notifyAdmin(error: any, context: ErrorContext = {}) {
  const errorId = `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { severity, errorType } = categorizeError(error, context);
  
  // Only notify for medium, high, or critical errors
  if (severity === AutopostingErrorSeverity.LOW) {
    return;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const notificationData = {
    errorId,
    timestamp: new Date().toISOString(),
    severity,
    errorType,
    message: errorMessage,
    context: maskSensitiveData(context, loggingConfig.security.sensitiveFields),
    environment: process.env.NODE_ENV,
    service: 'autoposting-scheduler'
  };

  try {
    // Use existing notification service for throttled notifications
    const notificationType = severity === AutopostingErrorSeverity.CRITICAL ? 'error' : 'anomaly';
    notificationService.sendNotification(
      notificationType,
      `Autoposting ${severity} error: ${errorMessage} (ID: ${errorId})`
    );

    // For critical errors, also use the error notification service for immediate alerts
    if (severity === AutopostingErrorSeverity.CRITICAL) {
      errorNotificationService.notifyCriticalError(
        error instanceof Error ? error : new Error(errorMessage),
        {
          category: ErrorCategory.API,
          component: 'autoposting-scheduler',
          userId: context.userId,
          context: `Autoposting operation failed: ${context.operation || 'unknown'}`,
          additionalData: context.additionalData
        }
      );
    }

    // Send email notification for high/critical errors (if email service is configured)
    if (severity === AutopostingErrorSeverity.HIGH || severity === AutopostingErrorSeverity.CRITICAL) {
      await sendEmailNotification(notificationData);
    }

    // Send Slack notification (if webhook is configured)
    await sendSlackNotification(notificationData);

    // Send webhook notification to external monitoring systems
    await sendWebhookNotification(notificationData);

    logger.info('Admin notification sent successfully', {
      errorId,
      severity,
      errorType,
      notificationMethods: ['internal', 'email', 'slack', 'webhook']
    });

  } catch (notificationError) {
    logger.error('Failed to send admin notification', {
      originalError: notificationData,
      notificationError: notificationError instanceof Error ? notificationError.message : String(notificationError)
    });

    // Fallback: log to Sentry
    Sentry.captureException(notificationError instanceof Error ? notificationError : new Error(String(notificationError)), {
      tags: {
        component: 'admin-notification',
        originalErrorId: errorId
      }
    });
  }
}

// Categorize errors for appropriate handling
function categorizeError(error: any, context: ErrorContext): {
  severity: AutopostingErrorSeverity;
  errorType: AutopostingErrorType;
} {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // Check for authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('token')) {
    return {
      severity: AutopostingErrorSeverity.HIGH,
      errorType: AutopostingErrorType.AUTHENTICATION_ERROR
    };
  }

  // Check for rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') || error.status === 429) {
    return {
      severity: AutopostingErrorSeverity.MEDIUM,
      errorType: AutopostingErrorType.RATE_LIMIT_ERROR
    };
  }

  // Check for network errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return {
      severity: AutopostingErrorSeverity.MEDIUM,
      errorType: AutopostingErrorType.NETWORK_ERROR
    };
  }

  // Check for content validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid content') || errorMessage.includes('format')) {
    return {
      severity: AutopostingErrorSeverity.LOW,
      errorType: AutopostingErrorType.CONTENT_VALIDATION_ERROR
    };
  }

  // Check for platform API errors
  if (context.platform || errorMessage.includes('api')) {
    return {
      severity: AutopostingErrorSeverity.MEDIUM,
      errorType: AutopostingErrorType.PLATFORM_API_ERROR
    };
  }

  // Check for queue errors
  if (context.operation?.includes('queue') || errorMessage.includes('queue')) {
    return {
      severity: AutopostingErrorSeverity.MEDIUM,
      errorType: AutopostingErrorType.QUEUE_ERROR
    };
  }

  // Check for scheduling errors
  if (context.operation?.includes('schedule') || errorMessage.includes('schedule')) {
    return {
      severity: AutopostingErrorSeverity.MEDIUM,
      errorType: AutopostingErrorType.SCHEDULING_ERROR
    };
  }

  // Default to unknown error with medium severity
  return {
    severity: AutopostingErrorSeverity.MEDIUM,
    errorType: AutopostingErrorType.UNKNOWN_ERROR
  };
}

// Database logging function
async function logToDatabase(errorData: any): Promise<void> {
  // This would integrate with your database
  // For now, we'll use the logger to create structured logs that can be ingested by log aggregation systems
  logger.info('Error audit log', {
    type: 'error_audit',
    ...errorData
  });
}

// Email notification function
async function sendEmailNotification(notificationData: any): Promise<void> {
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
  // For now, log the intent
  logger.info('Email notification would be sent', {
    type: 'email_notification',
    recipient: process.env.ADMIN_EMAIL || 'admin@clipscommerce.com',
    subject: `[${notificationData.severity.toUpperCase()}] Autoposting Error - ${notificationData.errorType}`,
    ...notificationData
  });
}

// Slack notification function
async function sendSlackNotification(notificationData: any): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!slackWebhookUrl) {
    logger.debug('Slack webhook URL not configured, skipping Slack notification');
    return;
  }

  try {
    const slackMessage = {
      text: `🚨 Autoposting ${notificationData.severity.toUpperCase()} Error`,
      attachments: [
        {
          color: notificationData.severity === AutopostingErrorSeverity.CRITICAL ? 'danger' : 'warning',
          fields: [
            {
              title: 'Error Type',
              value: notificationData.errorType,
              short: true
            },
            {
              title: 'Environment',
              value: notificationData.environment,
              short: true
            },
            {
              title: 'Message',
              value: notificationData.message,
              short: false
            },
            {
              title: 'Error ID',
              value: notificationData.errorId,
              short: true
            },
            {
              title: 'Timestamp',
              value: notificationData.timestamp,
              short: true
            }
          ]
        }
      ]
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }

    logger.info('Slack notification sent successfully', {
      errorId: notificationData.errorId,
      webhookUrl: slackWebhookUrl.substring(0, 50) + '...'
    });

  } catch (error) {
    logger.error('Failed to send Slack notification', {
      error: error instanceof Error ? error.message : String(error),
      originalErrorId: notificationData.errorId
    });
  }
}

// Webhook notification for external monitoring systems
async function sendWebhookNotification(notificationData: any): Promise<void> {
  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.debug('Error webhook URL not configured, skipping webhook notification');
    return;
  }

  try {
    const webhookPayload = {
      event: 'autoposting_error',
      timestamp: notificationData.timestamp,
      severity: notificationData.severity,
      error_type: notificationData.errorType,
      error_id: notificationData.errorId,
      message: notificationData.message,
      environment: notificationData.environment,
      service: notificationData.service,
      context: notificationData.context
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClipsCommerce-ErrorHandler/1.0'
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }

    logger.info('Webhook notification sent successfully', {
      errorId: notificationData.errorId,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    });

  } catch (error) {
    logger.error('Failed to send webhook notification', {
      error: error instanceof Error ? error.message : String(error),
      originalErrorId: notificationData.errorId
    });
  }
}

// Health check function for monitoring
export function checkErrorHandlingHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  timestamp: string;
} {
  const checks = {
    logger: !!logger,
    sentry: !!Sentry,
    notificationService: !!notificationService,
    config: !!loggingConfig
  };

  const allHealthy = Object.values(checks).every(check => check);
  const someHealthy = Object.values(checks).some(check => check);

  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  };
}
