import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { InputSanitizer, ValidationRateLimit } from './inputSanitizer';
import { getSchemaForEndpoint } from './validationSchemas';

/**
 * Validation middleware for Next.js API routes
 * 
 * Provides comprehensive input validation and sanitization for all API endpoints
 */

// Types for validation results
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Configuration for validation middleware
export interface ValidationConfig {
  enableRateLimit?: boolean;
  enableSanitization?: boolean;
  enableLogging?: boolean;
  maxRequestSize?: number;
  allowedMethods?: string[];
  requireAuth?: boolean;
}

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableRateLimit: true,
  enableSanitization: true,
  enableLogging: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  requireAuth: false
};

/**
 * Create validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
) {
  return async (
    req: NextRequest,
    handler: (req: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Check HTTP method
      if (config.allowedMethods && !config.allowedMethods.includes(req.method)) {
        return createErrorResponse(405, 'Method not allowed', []);
      }

      // Check request size
      if (config.maxRequestSize) {
        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > config.maxRequestSize) {
          return createErrorResponse(413, 'Request entity too large', []);
        }
      }

      // Rate limiting
      if (config.enableRateLimit) {
        const clientIp = getClientIp(req);
        if (!ValidationRateLimit.checkRateLimit(clientIp)) {
          return createErrorResponse(429, 'Too many requests', []);
        }
      }

      // Extract request data
      let requestData: any = {};
      
      if (req.method === 'GET') {
        // Parse query parameters
        const url = new URL(req.url);
        requestData = Object.fromEntries(url.searchParams.entries());
      } else {
        // Parse request body
        try {
          const contentType = req.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            requestData = await req.json();
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            requestData = Object.fromEntries(formData.entries());
          } else if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            requestData = Object.fromEntries(formData.entries());
          } else {
            requestData = await req.text();
          }
        } catch (error) {
          return createErrorResponse(400, 'Invalid request body', []);
        }
      }

      // Sanitize input data
      if (config.enableSanitization) {
        requestData = InputSanitizer.sanitizeApiParams(requestData);
      }

      // Validate against schema
      const validationResult = await validateData(schema, requestData);
      
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.errors || []);
      }

      // Log validation success
      if (config.enableLogging) {
        console.log(`[Validation] ${req.method} ${req.url} - Success (${Date.now() - startTime}ms)`);
      }

      // Call the handler with validated data
      return await handler(req, validationResult.data!);

    } catch (error) {
      // Log validation error
      if (config.enableLogging) {
        console.error(`[Validation] ${req.method} ${req.url} - Error:`, error);
      }

      return createErrorResponse(
        500, 
        'Internal server error',
        ['An unexpected error occurred during validation']
      );
    }
  };
}

/**
 * Auto-validation middleware that uses endpoint-based schema detection
 */
export function withValidation(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
  return (
    handler: (req: NextRequest, validatedData: any) => Promise<NextResponse> | NextResponse
  ) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const url = new URL(req.url);
      const schema = getSchemaForEndpoint(url.pathname, req.method);
      
      if (!schema) {
        // No schema found, proceed without validation but with basic sanitization
        if (config.enableSanitization) {
          let requestData: any = {};
          
          try {
            if (req.method !== 'GET') {
              requestData = await req.json();
              requestData = InputSanitizer.sanitizeApiParams(requestData);
            }
          } catch {
            // Ignore parsing errors for non-JSON requests
          }
          
          return await handler(req, requestData);
        }
        
        return await handler(req, {});
      }
      
      // Use the detected schema for validation
      const middleware = createValidationMiddleware(schema, config);
      return await middleware(req, handler);
    };
  };
}

/**
 * Validate data against a Zod schema
 */
async function validateData<T>(
  schema: z.ZodSchema<T>,
  data: any
): Promise<ValidationResult<T>> {
  try {
    const validatedData = await schema.parseAsync(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  status: number,
  message: string,
  errors: string[]
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: status,
        details: errors,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

/**
 * Extract client IP address from request
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return req.ip || 'unknown';
}

/**
 * Body parser middleware with size limits and validation
 */
export function withBodyParser(
  maxSize: number = 10 * 1024 * 1024, // 10MB default
  allowedTypes: string[] = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']
) {
  return (handler: (req: NextRequest, body: any) => Promise<NextResponse> | NextResponse) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        // Check content type
        const contentType = req.headers.get('content-type') || '';
        const isAllowedType = allowedTypes.some(type => contentType.includes(type));
        
        if (!isAllowedType) {
          return createErrorResponse(415, 'Unsupported media type', []);
        }

        // Check content length
        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxSize) {
          return createErrorResponse(413, 'Request entity too large', []);
        }

        // Parse body based on content type
        let body: any = null;
        
        if (contentType.includes('application/json')) {
          body = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await req.formData();
          body = Object.fromEntries(formData.entries());
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          body = formData;
        }

        return await handler(req, body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid request body', ['Failed to parse request body']);
      }
    };
  };
}

/**
 * CORS middleware
 */
export function withCORS(
  allowedOrigins: string[] = ['*'],
  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: string[] = ['Content-Type', 'Authorization', 'X-Requested-With']
) {
  return (handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const origin = req.headers.get('origin');
      const isOriginAllowed = allowedOrigins.includes('*') || 
                             (origin && allowedOrigins.includes(origin));

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });
        
        if (isOriginAllowed) {
          response.headers.set('Access-Control-Allow-Origin', origin || '*');
        }
        
        response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
        response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        response.headers.set('Access-Control-Max-Age', '86400');
        
        return response;
      }

      // Handle actual requests
      const response = await handler(req);
      
      if (isOriginAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
      }
      
      return response;
    };
  };
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders() {
  return (handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const response = await handler(req);
      
      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Content Security Policy
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https:",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      
      response.headers.set('Content-Security-Policy', csp);
      
      return response;
    };
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Pre-built middleware compositions for common use cases
 */
export const secureApiHandler = compose(
  withSecurityHeaders(),
  withCORS(),
  withValidation({
    enableRateLimit: true,
    enableSanitization: true,
    enableLogging: true
  })
);

export const fileUploadHandler = compose(
  withSecurityHeaders(),
  withCORS(),
  withBodyParser(100 * 1024 * 1024, ['multipart/form-data']), // 100MB for file uploads
  withValidation({
    enableRateLimit: true,
    enableSanitization: true,
    enableLogging: true
  })
);

export const publicApiHandler = compose(
  withSecurityHeaders(),
  withCORS(['*'], ['GET', 'POST', 'OPTIONS']),
  withValidation({
    enableRateLimit: true,
    enableSanitization: true,
    enableLogging: false
  })
);