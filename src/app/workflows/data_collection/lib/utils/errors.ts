import { Platform } from '../../../deliverables/types/deliverables_types';
import { retryWithBackoff } from '../../../../shared_infra';

export class PlatformError extends Error {
  constructor(
    public readonly platform: Platform,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(`[${platform}] ${message}`);
    this.name = 'PlatformError';
  }
}

export class RateLimitError extends PlatformError {
  constructor(
    platform: Platform, 
    public readonly retryAfter: number,
    message?: string,
    public readonly statusCode?: number,
    details?: unknown
  ) {
    super(
      platform, 
      'RATE_LIMIT_EXCEEDED', 
      message || `Rate limit exceeded. Retry after ${retryAfter}ms`, 
      { retryAfter, originalMessage: message, statusCode, originalDetails: details }
    );
  }
}

export class AuthenticationError extends PlatformError {
  constructor(platform: Platform, message: string) {
    super(platform, 'AUTHENTICATION_FAILED', message);
  }
}

export class ValidationError extends PlatformError {
  constructor(
    platform: Platform,
    message: string,
    public readonly validationIssues?: any, // Can be ZodError.issues or similar
    details?: unknown
  ) {
    super(platform, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class ApiError extends PlatformError {
  constructor(
    platform: Platform,
    code: string,
    message: string,
    public readonly statusCode: number,
    details?: unknown
  ) {
    super(platform, code, message, details);
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof ApiError) {
    // Retry on server errors and too many requests
    return error.statusCode >= 500 || error.statusCode === 429;
  }
  return false;
}

export function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; backoffMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, backoffMs = 1000 } = options;
  return retryWithBackoff(fn, { maxRetries, initialDelayMs: backoffMs });
}
