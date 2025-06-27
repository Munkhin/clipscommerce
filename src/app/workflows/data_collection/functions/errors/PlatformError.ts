// difficult: Custom error class for platform-specific errors
export class PlatformError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PlatformError';
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PlatformError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

// Common error codes
export const ErrorCodes = {
  // YouTube API errors
  YOUTUBE_QUOTA_EXCEEDED: 'youtube_quota_exceeded',
  YOUTUBE_RATE_LIMIT: 'youtube_rate_limit',
  YOUTUBE_API_ERROR: 'youtube_api_error',
  YOUTUBE_VIDEO_NOT_FOUND: 'youtube_video_not_found',
  
  // Generic errors
  INVALID_INPUT: 'invalid_input',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  RATE_LIMITED: 'rate_limited',
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
