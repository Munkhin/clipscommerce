import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { trace } from '@opentelemetry/api';

// Types for structured logging
export interface LogContext {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operationId?: string;
  [key: string]: any;
}

export interface LogMeta {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    cause?: any;
  };
  duration?: number;
  [key: string]: any;
}

// Async local storage for context propagation
const contextStorage = new AsyncLocalStorage<LogContext>();

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Log level configuration
const getLogLevel = (): pino.Level => {
  const level = process.env.LOG_LEVEL?.toLowerCase() as pino.Level;
  if (level && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(level)) {
    return level;
  }
  
  if (isTest) return 'warn';
  if (isDevelopment) return 'debug';
  return 'info';
};

// Error serializer for better error logging
const errorSerializer = (error: Error): LogMeta['error'] => {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    cause: (error as any).cause,
  };
};

// Transport configuration
const createTransports = (): pino.TransportMultiOptions => {
  const targets: pino.TransportTargetOptions[] = [];

  // Console transport with pretty printing in development
  if (isDevelopment) {
    targets.push({
      target: 'pino-pretty',
      level: getLogLevel(),
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
        hideObject: false,
      },
    });
  }

  // File transport for production
  if (isProduction) {
    // Main log file
    targets.push({
      target: 'pino/file',
      level: 'info',
      options: {
        destination: process.env.LOG_FILE_PATH || './logs/app.log',
        mkdir: true,
      },
    });

    // Error log file
    targets.push({
      target: 'pino/file',
      level: 'error',
      options: {
        destination: process.env.ERROR_LOG_FILE_PATH || './logs/error.log',
        mkdir: true,
      },
    });
  }

  // Console transport for production (structured JSON)
  if (isProduction && !isDevelopment) {
    targets.push({
      target: 'pino/file',
      level: getLogLevel(),
      options: {
        destination: 1, // stdout
      },
    });
  }

  // Test transport (minimal logging)
  if (isTest) {
    targets.push({
      target: 'pino/file',
      level: 'warn',
      options: {
        destination: process.env.TEST_LOG_FILE || './logs/test.log',
        mkdir: true,
      },
    });
  }

  return {
    targets,
    options: {
      dedupe: true,
    },
  };
};

// Create the base logger instance
const baseLogger = pino({
  level: getLogLevel(),
  name: 'clipscommerce',
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    error: errorSerializer,
    err: errorSerializer,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'localhost',
    service: 'clipscommerce',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
  transport: createTransports(),
});

// Utility functions for context management
export const getCorrelationContext = (): LogContext => {
  const storedContext = contextStorage.getStore() || {};
  
  // Try to get OpenTelemetry context
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    return {
      ...storedContext,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }
  
  return storedContext;
};

export const setCorrelationContext = (context: LogContext): void => {
  const currentContext = getCorrelationContext();
  contextStorage.enterWith({ ...currentContext, ...context });
};

export const runWithContext = <T>(context: LogContext, fn: () => T): T => {
  const currentContext = getCorrelationContext();
  return contextStorage.run({ ...currentContext, ...context }, fn);
};

// Enhanced logger class
class StructuredLogger {
  private logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  private enrichLogData(data: any = {}, context?: LogContext): any {
    const correlationContext = getCorrelationContext();
    const enrichedContext = { ...correlationContext, ...context };
    
    return {
      ...data,
      ...(Object.keys(enrichedContext).length > 0 && { context: enrichedContext }),
    };
  }

  trace(message: string, data?: any, context?: LogContext): void {
    this.logger.trace(this.enrichLogData(data, context), message);
  }

  debug(message: string, data?: any, context?: LogContext): void {
    this.logger.debug(this.enrichLogData(data, context), message);
  }

  info(message: string, data?: any, context?: LogContext): void {
    this.logger.info(this.enrichLogData(data, context), message);
  }

  warn(message: string, data?: any, context?: LogContext): void {
    this.logger.warn(this.enrichLogData(data, context), message);
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorData = error instanceof Error ? { error } : { data: error };
    this.logger.error(this.enrichLogData(errorData, context), message);
  }

  fatal(message: string, error?: Error | any, context?: LogContext): void {
    const errorData = error instanceof Error ? { error } : { data: error };
    this.logger.fatal(this.enrichLogData(errorData, context), message);
  }

  // Performance logging
  time(label: string, context?: LogContext): void {
    const startTime = Date.now();
    setCorrelationContext({ 
      ...getCorrelationContext(), 
      [`${label}_start`]: startTime,
      ...context 
    });
  }

  timeEnd(label: string, message?: string, context?: LogContext): void {
    const startTime = getCorrelationContext()[`${label}_start`];
    if (startTime) {
      const duration = Date.now() - startTime;
      this.info(message || `${label} completed`, { duration, operation: label }, context);
    }
  }

  // Child logger with persistent context
  child(context: LogContext): StructuredLogger {
    const childLogger = this.logger.child(context);
    return new StructuredLogger(childLogger);
  }

  // Backward compatibility methods
  log(level: pino.Level, message: string, data?: any, context?: LogContext): void {
    this.logger[level](this.enrichLogData(data, context), message);
  }

  // Audit logging
  audit(action: string, resource: string, userId?: string, metadata?: any): void {
    this.info('Audit Log', {
      audit: {
        action,
        resource,
        userId,
        timestamp: new Date().toISOString(),
        metadata,
      },
    });
  }

  // Security logging
  security(event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.warn('Security Event', {
      security: {
        event,
        severity,
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Business metrics logging
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.info('Metric', {
      metric: {
        name,
        value,
        unit,
        tags,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // HTTP request logging
  request(method: string, url: string, statusCode: number, duration: number, metadata?: any): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, 'HTTP Request', {
      request: {
        method,
        url,
        statusCode,
        duration,
        metadata,
      },
    });
  }
}

// Create the main logger instance
export const logger = new StructuredLogger(baseLogger);

// Export utility functions - removed duplicate exports that were already exported above

// Export the raw pino logger for special cases
export const rawLogger = baseLogger;

// Default export for backward compatibility
export default logger; 