import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize the Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create a rate limiter that allows 5 requests per minute
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'rate-limit',
});

export async function rateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  
  if (!success) {
    return {
      success: false,
      message: 'Too many requests',
      retryAfter: Math.ceil((reset - Date.now()) / 1000),
    };
  }
  
  return { success: true };
}

export async function checkRateLimit(req: Request, identifier: string) {
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
}
