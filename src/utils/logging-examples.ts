/**
 * Examples of how to use the structured logging system
 * This file serves as documentation and can be removed in production
 */

import logger from './logger';

// Example 1: Basic logging with different levels
export function basicLoggingExamples() {
  // Simple string messages
  logger.debug('Application starting');
  logger.info('User authentication successful');
  logger.warn('High memory usage detected');
  logger.error('Database connection failed');
  logger.fatal('Critical system failure');
}

// Example 2: Structured logging with context
export function structuredLoggingExamples() {
  // Log with structured data
  logger.info('User login', {
    userId: '12345',
    email: 'user@example.com',
    loginMethod: 'email',
    timestamp: new Date().toISOString(),
  });

  // Error logging with context
  try {
    throw new Error('Database timeout');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Failed to save user data', error, {
        userId: '12345',
        operation: 'save',
        retryAttempt: 1,
      });
    }
  }
}

// Example 3: Performance logging
export async function performanceLoggingExample() {
  const startTime = Date.now();
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const duration = Date.now() - startTime;
  logger.info('User query completed', { duration });
}

// Example 4: Business metrics and audit logging
export function businessLoggingExamples() {
  // Audit logging
  logger.info('User profile updated', {
    event: 'user_profile_updated',
    resourceType: 'user_profile',
    resourceId: 'user123',
    fieldsChanged: ['email', 'name'],
    previousEmail: 'old@example.com',
    newEmail: 'new@example.com',
  });

  // Security events
  logger.warn('Failed login attempt', {
    event: 'failed_login_attempt',
    email: 'attacker@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'curl/7.68.0',
    attemptCount: 5,
    severity: 'high'
  });

  // Business metrics
  logger.info('User registration', {
    metric: 'user_registration_count',
    value: 1,
    type: 'count',
    source: 'web',
    plan: 'premium',
  });
}

// Example 5: HTTP request logging
export function httpLoggingExample() {
  // Log incoming HTTP requests
  logger.info('HTTP request', {
    method: 'POST',
    path: '/api/users',
    statusCode: 201,
    duration: 250,
    bodySize: 1024,
    responseSize: 512,
    userAgent: 'Mozilla/5.0...',
  });
}

// Example 6: Using correlation context
export function correlationContextExample() {
  // Set correlation context for the entire request
  logger.info('Processing user request');
  logger.debug('Validating input data');
  logger.info('Request completed successfully');
}

// Example 7: Running code with specific context
export async function contextScopedExample() {
  const context = {
    correlationId: 'batch-001',
    batchId: 'import-users-2024',
    operation: 'bulk_import',
  };
  
  logger.info('Starting bulk import', context);
  
  // All logs within this scope will include the context
  for (let i = 0; i < 100; i++) {
    logger.debug('Processing user', { ...context, userIndex: i });
  }
  
  logger.info('Bulk import completed', context);
}

// Example 8: Child loggers with persistent context
export function childLoggerExample() {
  const userLogger = logger.child({
    userId: 'user-123',
    email: 'user@example.com',
    module: 'user-service',
  });

  // All logs from this child logger will include the context
  userLogger.info('User service initialized');
  userLogger.debug('Loading user preferences');
  userLogger.warn('User quota exceeded');
}

// Example 9: Error logging with full stack traces
export function errorLoggingExamples() {
  try {
    throw new Error('Something went wrong');
  } catch (error: unknown) {
    // Simple error logging
    if (error instanceof Error) {
      logger.error('Operation failed', error);
    }
    
    // Error logging with additional context
    if (error instanceof Error) {
      logger.error('Database operation failed', error, {
        operation: 'SELECT',
        table: 'users',
        userId: '123',
        queryTime: 5000,
      });
    }
  }

  // Handling different error types
  try {
    JSON.parse('invalid json');
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error('JSON parsing failed', error, {
        operation: 'parse_config',
        input: 'user_config.json',
      });
    }
  }
}

// Example 10: Conditional logging based on environment
export function conditionalLoggingExample() {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    logger.debug('Development mode: detailed debugging info', {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    });
  }
  
  // Always log important events
  logger.info('Application event', {
    event: 'user_registration',
    environment: process.env.NODE_ENV,
  });
}

// Example 11: Logging with sensitive data masking
export function sensitiveDataExample() {
  // The logger automatically masks sensitive fields
  logger.info('User authentication', {
    email: 'user@example.com',
    password: 'secret123', // This will be masked as [MASKED]
    token: 'jwt-token-here', // This will be masked as [MASKED]
    userId: '123',
  });
}

// Example 12: API integration logging
export async function apiIntegrationExample() {
  const apiLogger = logger.child({
    service: 'external-api',
    endpoint: 'https://api.example.com',
  });

  try {
    apiLogger.info('API request starting', {
      method: 'POST',
      endpoint: '/users',
      timeout: 5000,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));

    apiLogger.info('API request completed', {
      statusCode: 200,
      responseTime: 200,
      retryCount: 0,
    });
  } catch (error) {
    apiLogger.error('API request failed', error as Error, {
      statusCode: 500,
      responseTime: 5000,
      retryCount: 3,
    });
  }
}

// Example 13: Database operation logging
export async function databaseLoggingExample() {
  const dbLogger = logger.child({
    module: 'database',
    connection: 'primary',
  });

  const query = 'SELECT * FROM users WHERE active = true';
  const startTime = Date.now();

  try {
    dbLogger.debug('Executing query', {
      sql: query,
      params: { active: true },
    });

    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 50));

    const duration = Date.now() - startTime;
    dbLogger.info('Query executed successfully', {
      sql: query,
      duration,
      rowCount: 25,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLogger.error('Query execution failed', error as Error, {
      sql: query,
      duration,
      errorCode: 'CONNECTION_TIMEOUT',
    });
  }
}

// Export all examples for easy testing
export const loggingExamples = {
  basicLoggingExamples,
  structuredLoggingExamples,
  performanceLoggingExample,
  businessLoggingExamples,
  httpLoggingExample,
  correlationContextExample,
  contextScopedExample,
  childLoggerExample,
  errorLoggingExamples,
  conditionalLoggingExample,
  sensitiveDataExample,
  apiIntegrationExample,
  databaseLoggingExample,
};