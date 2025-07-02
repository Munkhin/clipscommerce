/**
 * Comprehensive Error Handling Utilities
 * Provides type-safe error handling, type guards, and unknown type management
 */

// Type guards for unknown error types
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

export function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

export function isSupabaseError(error: unknown): error is { message: string; code: string; details?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error &&
    typeof (error as any).message === 'string' &&
    typeof (error as any).code === 'string'
  );
}

// Structured error interfaces
export interface StructuredError {
  message: string;
  code?: string;
  details?: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

export interface TrainingError extends StructuredError {
  phase: 'data_loading' | 'training' | 'evaluation' | 'saving';
  progress?: number;
}

export interface CacheError extends StructuredError {
  operation: 'get' | 'set' | 'delete' | 'clear' | 'pattern' | 'tags';
  key?: string;
  tags?: string[];
}

export interface AuthError extends StructuredError {
  action: 'signup' | 'signin' | 'signout' | 'reset' | 'verify';
  userId?: string;
  email?: string;
}

export interface StorageError extends StructuredError {
  operation: 'cleanup' | 'upload' | 'delete' | 'list' | 'stats';
  bucket?: string;
  filePath?: string;
}

// Error extraction utilities
export function extractErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }
  
  return 'An unknown error occurred';
}

export function extractErrorCode(error: unknown): string | undefined {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  
  if (isError(error) && 'code' in error) {
    return (error as any).code;
  }
  
  return undefined;
}

export function extractErrorDetails(error: unknown): string | undefined {
  if (isSupabaseError(error)) {
    return error.details;
  }
  
  if (typeof error === 'object' && error !== null && 'details' in error) {
    const details = (error as any).details;
    return typeof details === 'string' ? details : JSON.stringify(details);
  }
  
  return undefined;
}

// Error creation utilities
export function createStructuredError(
  error: unknown,
  context?: Record<string, unknown>
): StructuredError {
  return {
    message: extractErrorMessage(error),
    code: extractErrorCode(error),
    details: extractErrorDetails(error),
    originalError: error,
    context
  };
}

export function createTrainingError(
  error: unknown,
  phase: TrainingError['phase'],
  progress?: number,
  context?: Record<string, unknown>
): TrainingError {
  return {
    ...createStructuredError(error, context),
    phase,
    progress
  };
}

export function createCacheError(
  error: unknown,
  operation: CacheError['operation'],
  key?: string,
  tags?: string[],
  context?: Record<string, unknown>
): CacheError {
  return {
    ...createStructuredError(error, context),
    operation,
    key,
    tags
  };
}

export function createAuthError(
  error: unknown,
  action: AuthError['action'],
  userId?: string,
  email?: string,
  context?: Record<string, unknown>
): AuthError {
  return {
    ...createStructuredError(error, context),
    action,
    userId,
    email
  };
}

export function createStorageError(
  error: unknown,
  operation: StorageError['operation'],
  bucket?: string,
  filePath?: string,
  context?: Record<string, unknown>
): StorageError {
  return {
    ...createStructuredError(error, context),
    operation,
    bucket,
    filePath
  };
}

// Safe error handling wrappers
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<{ success: true; data: T } | { success: false; error: StructuredError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: createStructuredError(error)
    };
  }
}

export function safeSync<T>(
  fn: () => T,
  fallback?: T
): { success: true; data: T } | { success: false; error: StructuredError } {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: createStructuredError(error)
    };
  }
}

// Unknown type handling for cache operations
export function safeCacheValue<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  try {
    // If it's already parsed JSON or a primitive, return as-is
    if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value as T;
    }
    
    // Try to parse if it's a JSON string
    if (typeof value === 'string') {
      return JSON.parse(value) as T;
    }
    
    return value as T;
  } catch {
    return null;
  }
}

export function safeCacheKey(key: unknown): string {
  if (typeof key === 'string') {
    return key;
  }
  
  if (typeof key === 'number') {
    return key.toString();
  }
  
  if (typeof key === 'object' && key !== null) {
    return JSON.stringify(key);
  }
  
  return String(key);
}

// Logger integration
export function logError(error: StructuredError, context?: Record<string, unknown>): void {
  console.error('[ERROR]', {
    message: error.message,
    code: error.code,
    details: error.details,
    context: error.context,
    additionalContext: context,
    timestamp: new Date().toISOString()
  });
}

// Error retry utilities
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break; // Don't delay on the last attempt
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(backoffMultiplier, attempt)));
    }
  }
  
  throw createStructuredError(lastError, { 
    retryAttempts: maxRetries + 1,
    totalDelayMs: delayMs * (Math.pow(backoffMultiplier, maxRetries + 1) - 1) / (backoffMultiplier - 1)
  });
}

// Error boundary helpers
export function formatErrorForDisplay(error: StructuredError): string {
  const parts = [error.message];
  
  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }
  
  if (error.details) {
    parts.push(`Details: ${error.details}`);
  }
  
  return parts.join(' | ');
}

export function shouldRetryError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  const code = extractErrorCode(error);
  
  // Network errors that should be retried
  const networkErrors = [
    'network error',
    'fetch failed',
    'connection refused',
    'timeout',
    'socket hang up'
  ];
  
  // HTTP status codes that should be retried
  const retryCodes = ['500', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT'];
  
  return networkErrors.some(err => message.includes(err)) ||
         (code ? retryCodes.includes(code) : false);
}