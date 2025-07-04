// Logger utility with HTTP request logging support
import type { Logger, LogFn } from 'pino';

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
}

// Create a simple console-based logger for development
const createLogger = (): AppLogger => {
  const logFn = (level: string) => {
    return (obj: any, msg?: string, ...args: any[]) => {
      if (typeof obj === 'string') {
        // First argument is a string message
        console.log(`[${level.toUpperCase()}]`, obj, msg, ...args);
      } else if (typeof obj === 'object' && msg && typeof msg === 'string') {
        // First argument is an object, second is a message string
        console.log(`[${level.toUpperCase()}]`, msg, obj, ...args);
      } else {
        // Fallback handling
        console.log(`[${level.toUpperCase()}]`, msg || obj, ...args);
      }
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
      const childLogger = createLogger();
      // In a real implementation, you'd merge bindings
      return childLogger;
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
    }
  };
};

const logger = createLogger();

export default logger;