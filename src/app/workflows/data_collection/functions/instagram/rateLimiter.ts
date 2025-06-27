import Bottleneck from 'bottleneck';

// Instagram Graph API rate limits can be complex and depend on the token type and endpoint.
// A common general limit for business/creator accounts is 200 calls per user per hour for most endpoints.
// However, some endpoints might have different limits (e.g., insights).
// It's crucial to check the official documentation for the specific endpoints you use.
// This is a generic limiter; you might need more sophisticated handling for different types of calls.

const INSTAGRAM_HOURLY_LIMIT = 200;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// Global limiter for all Instagram API calls
// Adjust reservoir and reservoirRefreshInterval based on the most common or restrictive limit
const globalInstagramLimiter = new Bottleneck({
  reservoir: INSTAGRAM_HOURLY_LIMIT, // Number of requests allowed in the interval
  reservoirRefreshInterval: ONE_HOUR_IN_MS, // Interval in ms to refresh the reservoir
  reservoirRefreshAmount: INSTAGRAM_HOURLY_LIMIT, // How much to add to the reservoir at each refresh
  maxConcurrent: 5, // Max number of requests to run concurrently (adjust as needed)
  minTime: 1000, // Minimum time (ms) between requests (e.g., 1 second)
});

// It's good practice to also have shorter-term limiters if needed, e.g., per second or per 5 minutes.
// For instance, if there's a burst limit of 10 requests per minute:
// const shortTermLimiter = new Bottleneck({
//   reservoir: 10,
//   reservoirRefreshInterval: 60 * 1000, // 1 minute
//   reservoirRefreshAmount: 10,
//   maxConcurrent: 2,
//   minTime: 500,
// });

// You can chain limiters if necessary, e.g., pass through a short-term then a long-term limiter.

/**
 * Wraps an asynchronous function with the global Instagram rate limiter.
 * @param fn The asynchronous function to be rate-limited.
 * @returns A new function that, when called, will schedule the original function's execution according to rate limits.
 */
export function limitInstagramApiCall<F extends (...args: any[]) => Promise<any>>(
  fn: F
): F {
  return (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return globalInstagramLimiter.schedule(async () => {
      return await fn(...args);
    });
  }) as F;
}

// Example of how you might use this with an API client method:
// import InstagramApiClient from './instagramClient';
// const client = new InstagramApiClient('YOUR_ACCESS_TOKEN');
// const limitedGetUserInfo = limitInstagramApiCall(client.getUserInfo.bind(client));
// const limitedGetUserMedia = limitInstagramApiCall(client.getUserMedia.bind(client));

// // Then, instead of client.getUserInfo(...), you'd call:
// // limitedGetUserInfo(...).then(data => console.log(data));

// Event listeners for debugging or monitoring the limiter's state (optional)
globalInstagramLimiter.on('error', (error) => {
  console.error('Bottleneck error:', error);
});

globalInstagramLimiter.on('depleted', (empty) => {
  if (empty) {
    console.warn('Instagram API global rate limiter reservoir is depleted. Waiting for refresh.');
  }
});

// You might want to export the limiter instance itself if you need to interact with it directly elsewhere.
export { globalInstagramLimiter };
