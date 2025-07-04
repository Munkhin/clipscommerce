import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { verifyCsrfToken } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import logger from '@/utils/logger';
import { User } from '@supabase/supabase-js';

export interface AuthGuardOptions {
  requireAuth?: boolean;
  requireCsrf?: boolean;
  rateLimit?: {
    identifier: string;
    requests?: number;
    window?: string;
  };
  allowedRoles?: string[];
  requiredSubscriptionTier?: 'lite' | 'pro' | 'team';
  validateInput?: (body: any) => { isValid: boolean; errors: string[] };
  logAccess?: boolean;
}

export interface AuthGuardContext {
  user: User | null;
  profile?: any;
  request: NextRequest;
  body?: any;
}

export interface AuthGuardResult {
  success: boolean;
  response?: NextResponse;
  context?: AuthGuardContext;
  error?: string;
}

/**
 * Comprehensive authentication and authorization guard for API endpoints
 */
export async function authGuard(
  request: NextRequest,
  options: AuthGuardOptions = {}
): Promise<AuthGuardResult> {
  const {
    requireAuth = true,
    requireCsrf = true,
    rateLimit,
    allowedRoles,
    requiredSubscriptionTier,
    validateInput,
    logAccess = true
  } = options;

  try {
    // 1. Rate limiting check
    if (rateLimit) {
      const rateLimitResponse = await checkRateLimit(request, rateLimit.identifier);
      if (rateLimitResponse) {
        if (logAccess) {
          logger.warn('Rate limit exceeded', {
            path: request.nextUrl.pathname,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            identifier: rateLimit.identifier
          });
        }
        // Convert Response to NextResponse
        const responseData = await rateLimitResponse.json();
        return { 
          success: false, 
          response: NextResponse.json(responseData, {
            status: rateLimitResponse.status,
            headers: Object.fromEntries(rateLimitResponse.headers.entries())
          })
        };
      }
    }

    // 2. CSRF token verification (for non-GET requests)
    if (requireCsrf && request.method !== 'GET' && request.method !== 'HEAD') {
      const csrfToken = request.headers.get('x-csrf-token');
      if (!csrfToken) {
        if (logAccess) {
          logger.warn('Missing CSRF token', {
            path: request.nextUrl.pathname,
            method: request.method
          });
        }
        return {
          success: false,
          response: NextResponse.json(
            { error: 'CSRF token required' },
            { status: 403 }
          )
        };
      }

      const csrfResult = await verifyCsrfToken(csrfToken);
      if (!csrfResult.isValid) {
        if (logAccess) {
          logger.warn('Invalid CSRF token', {
            path: request.nextUrl.pathname,
            method: request.method
          });
        }
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          )
        };
      }
    }

    // 3. Authentication check
    let user: User | null = null;
    let profile: any = null;

    if (requireAuth) {
      const supabase = await createClient(cookies());
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        if (logAccess) {
          logger.warn('Authentication failed', {
            path: request.nextUrl.pathname,
            error: authError?.message
          });
        }
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        };
      }

      user = authUser;

      // Get user profile for role and subscription checks
      if (allowedRoles || requiredSubscriptionTier) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role, subscription_tier')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (logAccess) {
            logger.error('Failed to fetch user profile', profileError instanceof Error ? profileError : new Error(String(profileError)), {
              userId: user.id,
              path: request.nextUrl.pathname
            });
          }
          return {
            success: false,
            response: NextResponse.json(
              { error: 'Profile access error' },
              { status: 500 }
            )
          };
        }

        profile = userProfile;
      }
    }

    // 4. Role-based authorization
    if (allowedRoles && profile) {
      const userRole = profile.role || 'user';
      if (!allowedRoles.includes(userRole)) {
        if (logAccess) {
          logger.warn('Insufficient role permissions', {
            path: request.nextUrl.pathname,
            userRole,
            allowedRoles,
            userId: user?.id
          });
        }
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        };
      }
    }

    // 5. Subscription tier authorization
    if (requiredSubscriptionTier && profile) {
      const userTier = profile.subscription_tier || 'lite';
      const tierHierarchy = { lite: 1, pro: 2, team: 3 };
      const requiredLevel = tierHierarchy[requiredSubscriptionTier];
      const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] || 1;

      if (userLevel < requiredLevel) {
        if (logAccess) {
          logger.warn('Insufficient subscription tier', {
            path: request.nextUrl.pathname,
            userTier,
            requiredTier: requiredSubscriptionTier,
            userId: user?.id
          });
        }
        return {
          success: false,
          response: NextResponse.json(
            { 
              error: 'Subscription upgrade required',
              required_tier: requiredSubscriptionTier,
              current_tier: userTier,
              upgrade_url: '/pricing'
            },
            { status: 402 }
          )
        };
      }
    }

    // 6. Input validation
    let body: any = null;
    if (validateInput && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      try {
        body = await request.json();
        const validation = validateInput(body);
        
        if (!validation.isValid) {
          if (logAccess) {
            logger.warn('Input validation failed', {
              path: request.nextUrl.pathname,
              errors: validation.errors,
              userId: user?.id
            });
          }
          return {
            success: false,
            response: NextResponse.json(
              { 
                error: 'Invalid input',
                details: validation.errors
              },
              { status: 400 }
            )
          };
        }
      } catch (error) {
        if (logAccess) {
          logger.warn('Failed to parse request body', {
            path: request.nextUrl.pathname,
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user?.id
          });
        }
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
          )
        };
      }
    }

    // 7. Success logging
    if (logAccess) {
      logger.info('API access granted', {
        path: request.nextUrl.pathname,
        method: request.method,
        userId: user?.id,
        userRole: profile?.role,
        subscriptionTier: profile?.subscription_tier
      });
    }

    return {
      success: true,
      context: {
        user,
        profile,
        request,
        body
      }
    };

  } catch (error: unknown) {
    if (logAccess) {
      logger.error('Auth guard error', error instanceof Error ? error : new Error(String(error)), {
        path: request.nextUrl.pathname,
        method: request.method
      });
    }
    
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal security error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Helper function to create secure error responses that don't leak sensitive information
 */
export function createSecureErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response: any = { error: message };
  
  // Only include details in development mode
  if (isDevelopment && details) {
    response.details = details;
  }
  
  return NextResponse.json(response, { status });
}

/**
 * Input validation helpers
 */
export const validators = {
  required: (value: any) => value !== null && value !== undefined && value !== '',
  string: (value: any) => typeof value === 'string',
  number: (value: any) => typeof value === 'number' && !isNaN(value),
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  minLength: (min: number) => (value: string) => value.length >= min,
  maxLength: (max: number) => (value: string) => value.length <= max,
  enum: (values: string[]) => (value: string) => values.includes(value)
};

/**
 * Create a validation function for common input patterns
 */
export function createValidator(schema: Record<string, any[]>) {
  return (body: any) => {
    const errors: string[] = [];
    
    for (const [field, validationRules] of Object.entries(schema)) {
      const value = body[field];
      
      for (const rule of validationRules) {
        if (typeof rule === 'function') {
          if (!rule(value)) {
            errors.push(`Invalid ${field}`);
            break;
          }
        } else if (typeof rule === 'object' && rule.validator) {
          if (!rule.validator(value)) {
            errors.push(`${field}: ${rule.message || 'Invalid value'}`);
            break;
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
}