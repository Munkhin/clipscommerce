import Bottleneck from 'bottleneck';

// TikTok API rate limits are specific to the API version and endpoint being used.
// For example, the TikTok for Developers API has various quotas (per user, per app, per endpoint).
// It's crucial to consult the official documentation for the specific TikTok API you are integrating with.
// The values below are placeholders and should be adjusted.

const TIKTOK_DEFAULT_RESERVOIR = 100; // Example: 100 requests
const TIKTOK_DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // Example: per hour
const TIKTOK_MAX_CONCURRENT = 3; // Example: max 3 concurrent requests
const TIKTOK_MIN_TIME_MS = 1500; // Example: min 1.5 seconds between requests

// Global limiter for TikTok API calls
// Adjust reservoir, reservoirRefreshInterval, etc., based on the API's most common or restrictive limit.
const globalTikTokLimiter = new Bottleneck({
  reservoir: TIKTOK_DEFAULT_RESERVOIR,
  reservoirRefreshInterval: TIKTOK_DEFAULT_INTERVAL_MS,
  reservoirRefreshAmount: TIKTOK_DEFAULT_RESERVOIR,
  maxConcurrent: TIKTOK_MAX_CONCURRENT,
  minTime: TIKTOK_MIN_TIME_MS,
});

/**
 * Wraps an asynchronous function with the global TikTok rate limiter.
 * @param fn The asynchronous function to be rate-limited.
 * @returns A new function that, when called, will schedule the original function's execution according to rate limits.
 */
export function limitTikTokApiCall<A extends any[], R>(
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    return globalTikTokLimiter.schedule(async () => {
      return await fn(...args);
    });
  };
}

// Event listeners for debugging or monitoring the limiter's state (optional)
globalTikTokLimiter.on('error', (error) => {
  console.error('Bottleneck (TikTok) error:', error);
});

globalTikTokLimiter.on('depleted', (empty) => {
  if (empty) {
    console.warn('TikTok API global rate limiter reservoir is depleted. Waiting for refresh.');
  }
});

export { globalTikTokLimiter };
