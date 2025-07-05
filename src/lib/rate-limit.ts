import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Check if Redis configuration is available
const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Initialize the Redis client only if configuration is available
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

if (hasRedisConfig) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  // Create a rate limiter that allows 5 requests per minute
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'rate-limit',
  });
} else {
  console.warn('[RATE_LIMIT] Redis configuration not found. Rate limiting will be disabled in development mode.');
}

export async function rateLimit(identifier: string) {
  // If Redis is not configured, allow all requests in development/build mode
  if (!ratelimit) {
    console.debug('[RATE_LIMIT] Rate limiting skipped - Redis not configured');
    return { success: true };
  }

  try {
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
    
    if (!success) {
      return {
        success: false,
        message: 'Too many requests',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[RATE_LIMIT] Rate limiting error:', error);
    // In case of Redis errors, allow requests to prevent blocking the app
    return { success: true };
  }
}

export async function checkRateLimit(req: Request, identifier: string) {
  // If Redis is not configured, skip rate limiting
  if (!ratelimit) {
    return null;
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const result = await rateLimit(`${ip}:${identifier}`);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests',
          retryAfter: result.retryAfter 
        }), 
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter)
          } 
        }
      );
    }
    
    return null;
  } catch (error) {
    console.error('[RATE_LIMIT] Rate limit check error:', error);
    // In case of errors, don't block the request
    return null;
  }
}
