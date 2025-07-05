// Logger utility with HTTP request logging support
import type { Logger, LogFn } from 'pino';
import type { LogContext } from '@/types/log';

// Simple logger interface for our application
interface AppLogger {
  info: LogFn;
  error: LogFn;
  warn: LogFn;
  debug: LogFn;
  trace: LogFn;
  fatal: LogFn;
  silent: LogFn;
  child: (bindings?: Record<string, any>) => AppLogger;
  level: string;
  request: (
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ) => void;
  withContext: (context: LogContext) => AppLogger;
}

// Create a simple console-based logger for development
const createLogger = (context?: LogContext): AppLogger => {
  const formatLog = (level: string, obj: any, msg?: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    // Add correlation context if available
    let contextStr = '';
    if (context?.correlationId) {
      contextStr = ` [${context.correlationId}]`;
    }
    
    if (typeof obj === 'string') {
      // First argument is a string message
      console.log(`${prefix}${contextStr}`, obj, msg, ...args);
    } else if (typeof obj === 'object' && msg && typeof msg === 'string') {
      // First argument is an object, second is a message string
      console.log(`${prefix}${contextStr}`, msg, { ...obj, ...context }, ...args);
    } else {
      // Fallback handling
      console.log(`${prefix}${contextStr}`, msg || obj, context ? { context } : '', ...args);
    }
  };

  const logFn = (level: string) => {
    return (obj: any, msg?: string, ...args: any[]) => {
      formatLog(level, obj, msg, ...args);
    };
  };

  const baseLogger = {
    info: logFn('info'),
    error: logFn('error'),
    warn: logFn('warn'),
    debug: logFn('debug'),
    trace: logFn('trace'),
    fatal: logFn('fatal'),
    silent: () => {}, // No-op for silent logging
    child: (bindings?: Record<string, any>) => {
      const childContext = { ...context, ...bindings };
      return createLogger(childContext);
    },
    level: 'info'
  };

  return {
    ...baseLogger,
    request: (
      method: string,
      url: string,
      statusCode: number,
      duration: number,
      metadata?: Record<string, any>
    ) => {
      baseLogger.info({
        method,
        url,
        statusCode,
        duration,
        ...metadata,
        type: 'http_request'
      }, `${method} ${url} ${statusCode} - ${duration}ms`);
    },
    withContext: (newContext: LogContext) => {
      return createLogger({ ...context, ...newContext });
    }
  };
};

const logger = createLogger();

export default logger;