// Error handling utilities for the Accelerate module

export class ContentOptimizerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ContentOptimizerError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCodes = {
  // Configuration errors
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_CONFIG: 'INVALID_CONFIG',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Service errors
  OPENAI_ERROR: 'OPENAI_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  MODEL_LOAD_ERROR: 'MODEL_LOAD_ERROR',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  
  // System errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
} as const;

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ContentOptimizerError)) return false;
  
  // Consider network errors and rate limits as retryable
  const retryableCodes = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.TIMEOUT,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    ErrorCodes.REDIS_ERROR,
  ];
  
  return error.isRetryable || retryableCodes.includes(error.code as any);
}

export function createError(
  code: keyof typeof ErrorCodes,
  message: string,
  details?: unknown,
  isRetryable: boolean = false
): ContentOptimizerError {
  return new ContentOptimizerError(message, code, details, isRetryable);
}

export function wrapError(
  error: unknown,
  defaultCode: keyof typeof ErrorCodes = ErrorCodes.UNKNOWN_ERROR,
  defaultMessage: string = 'An unexpected error occurred'
): ContentOptimizerError {
  if (error instanceof ContentOptimizerError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ContentOptimizerError(
      error.message || defaultMessage,
      defaultCode,
      error,
      false
    );
  }
  
  return new ContentOptimizerError(
    defaultMessage,
    defaultCode,
    error,
    false
  );
}
