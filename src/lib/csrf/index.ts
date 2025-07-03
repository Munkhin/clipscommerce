import { cookies, headers } from 'next/headers';
import { randomBytes, createHmac, timingSafeEqual, createHash } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

export const CSRF_TOKEN_COOKIE = '__Host-csrf-token';
const CSRF_TOKEN_MAX_AGE = 60 * 60; // 1 hour in seconds
const CSRF_SECRET = process.env.CSRF_SECRET;
const CSRF_RATE_LIMIT = 100; // Max tokens per hour per IP
const CSRF_TOKEN_USAGE_LIMIT = 5; // Max uses per token

// Initialize rate limiter if Redis is configured
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Rate limiter for CSRF token generation
const rateLimiter = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    })
  : null;

if (!CSRF_SECRET || CSRF_SECRET === 'your-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'test') {
    // Use a test secret for testing
    process.env.CSRF_SECRET = 'test-csrf-secret-key-for-testing-only';
  } else {
    throw new Error('CSRF_SECRET environment variable is not set or is using default value');
  }
}

interface TokenPayload {
  value: string;
  expires: number;
  salt: string;
  usageCount: number;
  maxUsage: number;
  fingerprint?: string;
  sessionId: string;
}

// Generate a request fingerprint based on user agent and IP
async function generateRequestFingerprint(): Promise<string> {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent')?.toString() || '';
  const xForwardedFor = headerList.get('x-forwarded-for')?.toString() || '';
  const xRealIp = headerList.get('x-real-ip')?.toString() || '';
  const ip = (xForwardedFor || xRealIp || 'unknown').split(',')[0].trim();
  
  return createHash('sha256')
    .update(`${userAgent}:${ip}`)
    .digest('hex');
}

// Generate a secure random string
function generateRandomString(size = 32): string {
  return randomBytes(size).toString('hex');
}

// Get client IP address
async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const xForwardedFor = headerList.get('x-forwarded-for')?.toString();
  const xRealIp = headerList.get('x-real-ip')?.toString();
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  if (xRealIp) {
    return xRealIp;
  }
  return 'unknown';
}

// Create a signed token
function signToken(payload: Omit<TokenPayload, 'salt'>, salt: string): string {
  const hmac = createHmac('sha256', `${CSRF_SECRET}${salt}`);
  const data = [
    payload.value,
    payload.expires,
    payload.usageCount,
    payload.maxUsage,
    payload.sessionId,
    payload.fingerprint || ''
  ].join(':');
  
  const signature = hmac.update(data).digest('hex');
  return `${data}:${signature}`;
}

// Verify and decode token
async function verifyToken(token: string, salt: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split(':');
    if (parts.length < 6) return null; // Ensure all parts are present
    
    const [value, expires, usageCount, maxUsage, sessionId, fingerprint, signature] = parts;
    if (!value || !expires || !signature) return null;

    // Reconstruct the signed data
    const signedData = [
      value,
      expires,
      usageCount,
      maxUsage,
      sessionId,
      fingerprint || ''
    ].join(':');

    // Verify signature
    const hmac = createHmac('sha256', `${CSRF_SECRET}${salt}`);
    const expectedSignature = hmac.update(signedData).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks
    const isSignatureValid = timingSafeEqual(
      Buffer.from(signature, 'hex') as ArrayBufferView,
      Buffer.from(expectedSignature, 'hex') as ArrayBufferView
    );

    if (!isSignatureValid) return null;

    // Check expiration
    const expiresTime = parseInt(expires, 10);
    if (Date.now() > expiresTime) return null;

    // Check usage limit
    const currentUsage = parseInt(usageCount, 10);
    const maxAllowedUsage = parseInt(maxUsage, 10);
    if (currentUsage >= maxAllowedUsage) return null;

    // Verify request fingerprint if present
    if (fingerprint) {
      const currentFingerprint = await generateRequestFingerprint();
      if (fingerprint !== currentFingerprint) {
        return null;
      }
    }

    return { 
      value, 
      expires: expiresTime, 
      salt,
      usageCount: currentUsage,
      maxUsage: maxAllowedUsage,
      fingerprint,
      sessionId
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Server-side CSRF token generation
export async function generateCsrfToken(): Promise<{ token: string; cookie: string }> {
  // Apply rate limiting
  if (rateLimiter) {
    try {
      const ip = await getClientIp();
      // Ensure we have a valid IP before proceeding
      if (ip && ip !== 'unknown') {
        const result = await rateLimiter.limit(`csrf:${ip}`);
        if (!result.success) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if there's an error
    }
  }

  const value = generateRandomString(32);
  const salt = generateRandomString(16);
  const expires = Date.now() + (CSRF_TOKEN_MAX_AGE * 1000);
  const headerList = await headers();
  const sessionId = headerList.get('x-session-id')?.toString() || uuidv4();
  const fingerprint = await generateRequestFingerprint();
  
  const token = signToken({
    value,
    expires,
    usageCount: 0,
    maxUsage: CSRF_TOKEN_USAGE_LIMIT,
    sessionId,
    fingerprint
  }, salt);
  
  const cookie = [
    `${CSRF_TOKEN_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${CSRF_TOKEN_MAX_AGE}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
    'Partitioned',
  ].filter(Boolean).join('; ');
  
  return { token, cookie };
}

// Server-side CSRF token verification
export async function verifyCsrfToken(token: string): Promise<{ isValid: boolean; response?: Response }> {
  try {
    if (!token) return { isValid: false };
    
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
    
    if (!cookieToken) return { isValid: false };
    
    // Extract salt from the token (last part before signature)
    const salt = token.split(':').slice(-2, -1)[0];
    if (!salt) return { isValid: false };
    
    const [payload, cookiePayload] = await Promise.all([
      verifyToken(token, salt),
      verifyToken(cookieToken, salt)
    ]);
    
    // Verify both tokens are valid and match
    if (!payload || !cookiePayload || payload.value !== cookiePayload.value) {
      return { isValid: false };
    }
    
    // If we don't need to update the token, return early
    if (payload.usageCount >= payload.maxUsage - 1) {
      return { isValid: true };
    }
    
    // Generate new token with incremented usage count
    const newToken = signToken({
      ...payload,
      usageCount: payload.usageCount + 1
    }, salt);
    
    // Create a new response with the updated cookie
    const response = new Response(null, { status: 200 });
    response.headers.set(
      'Set-Cookie',
      `${CSRF_TOKEN_COOKIE}=${newToken}; ` +
      'Path=/; ' +
      'HttpOnly; ' +
      'SameSite=Strict; ' +
      `Max-Age=${CSRF_TOKEN_MAX_AGE}; ` +
      (process.env.NODE_ENV === 'production' ? 'Secure; ' : '') +
      'Partitioned'
    );
    
    return { isValid: true, response };
  } catch (error) {
    console.error('CSRF verification error:', error);
    return { isValid: false };
  }
}

// Server-side get CSRF token
export async function getCsrfToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
    if (!token) return null;
    
    // Verify the token is still valid
    const [, , salt] = token.split(':');
    if (!salt) return null;
    
    const isValid = await verifyToken(token, salt);
    return isValid ? token : null;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

// Client-side CSRF token generation
export async function generateClientCsrfToken(): Promise<string> {
  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to generate CSRF token: ${error}`);
    }
    
    const { token } = await response.json();
    if (!token) {
      throw new Error('No token received from server');
    }
    
    return token;
  } catch (error) {
    console.error('Error generating client CSRF token:', error);
    throw error;
  }
}

// Invalidate CSRF token after use (optional)
export async function invalidateCsrfToken(): Promise<Response> {
  const response = new Response(null, { status: 200 });
  
  // Set cookie with immediate expiration
  response.headers.set(
    'Set-Cookie',
    `${CSRF_TOKEN_COOKIE}=; ` +
    'Path=/; ' +
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT; ' +
    'HttpOnly; ' +
    'SameSite=Strict; ' +
    (process.env.NODE_ENV === 'production' ? 'Secure; ' : '')
  );
  
  return response;
}
