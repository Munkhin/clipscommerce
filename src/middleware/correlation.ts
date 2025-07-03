import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { LogContext } from '../types';

// Correlation ID header names
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';
export const TRACE_ID_HEADER = 'x-trace-id';

// Generate a correlation ID if one doesn't exist
const generateCorrelationId = (): string => {
  return uuidv4();
};

// Extract correlation context from request headers
const extractCorrelationContext = (request: NextRequest): LogContext => {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
  const requestId = request.headers.get(REQUEST_ID_HEADER) || generateCorrelationId();
  const traceId = request.headers.get(TRACE_ID_HEADER);
  const userAgent = request.headers.get('user-agent');
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  // Extract user information if available (from auth cookies/headers)
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');
  
  return {
    correlationId,
    requestId,
    ...(traceId && { traceId }),
    ...(sessionCookie && { sessionId: sessionCookie.value }),
    userAgent,
    clientIp: realIp || forwarded || 'unknown',
    ...(authHeader && { hasAuth: true }),
  };
};

// Middleware function for correlation ID management
export function correlationMiddleware(request: NextRequest): NextResponse {
  const startTime = Date.now();
  const context = extractCorrelationContext(request);
  
  // Log the incoming request
  logger.info('HTTP Request Started', {
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    userAgent: context.userAgent,
    clientIp: context.clientIp,
  }, context);
  
  // Create response and add correlation headers
  const response = NextResponse.next();
  
  // Add correlation headers to response
  response.headers.set(CORRELATION_ID_HEADER, context.correlationId!);
  response.headers.set(REQUEST_ID_HEADER, context.requestId!);
  
  if (context.traceId) {
    response.headers.set(TRACE_ID_HEADER, context.traceId);
  }
  
  // Log request completion (this won't capture the actual end time, but it's a start)
  const duration = Date.now() - startTime;
  logger.info('HTTP Request Processed', {
    method: request.method,
    url: request.url,
    duration,
  }, context);
  
  return response;
}

// Express middleware for API routes
export const expressCorrelationMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  // Extract correlation context
  const correlationId = req.headers[CORRELATION_ID_HEADER] || generateCorrelationId();
  const requestId = req.headers[REQUEST_ID_HEADER] || generateCorrelationId();
  const traceId = req.headers[TRACE_ID_HEADER];
  
  const context: LogContext = {
    correlationId,
    requestId,
    ...(traceId && { traceId }),
    userAgent: req.headers['user-agent'],
    clientIp: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    method: req.method,
    url: req.url,
  };
  
  // Add to request object for later use
  req.correlationContext = context;
  
  // Add correlation headers to response
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  res.setHeader(REQUEST_ID_HEADER, requestId);
  if (traceId) {
    res.setHeader(TRACE_ID_HEADER, traceId);
  }
  
  // Log incoming request
  logger.info('API Request Started', {
    method: req.method,
    url: req.url,
    userAgent: context.userAgent,
    clientIp: context.clientIp,
  }, context);
  
  // Wrap end method to log completion
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - startTime;
    
    logger.request(
      req.method,
      req.url,
      res.statusCode,
      duration,
      {
        userAgent: context.userAgent,
        clientIp: context.clientIp,
      }
    );
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Utility function to get correlation context from request
export const getRequestCorrelationContext = (req: any): LogContext | null => {
  return req.correlationContext || null;
};

// React Server Component wrapper for correlation context
export const withCorrelationContext = <T extends any[]>(
  fn: (...args: T) => Promise<any>
) => {
  return async (...args: T) => {
    // For server components, we need to extract context from headers
    // This is a simplified version - in production you might want to use
    // Next.js headers() function or similar
    const context: LogContext = {
      correlationId: generateCorrelationId(),
      requestId: generateCorrelationId(),
    };
    
    try {
      return await fn(...args);
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Server Component Error', error, context);
      }
      throw error;
    }
  };
};

// API route wrapper with correlation context
export const withApiCorrelationContext = (handler: any) => {
  return async (req: any, res: any) => {
    const startTime = Date.now();
    
    // Set up correlation context
    const context = extractCorrelationContext(req);
    
    // Add to request object
    req.correlationContext = context;
    
    // Add headers to response
    res.setHeader(CORRELATION_ID_HEADER, context.correlationId!);
    res.setHeader(REQUEST_ID_HEADER, context.requestId!);
    
    try {
      logger.info('API Handler Started', {
        method: req.method,
        url: req.url,
      }, context);
      
      const result = await handler(req, res);
      
      const duration = Date.now() - startTime;
      logger.info('API Handler Completed', {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
      }, context);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('API Handler Error', error instanceof Error ? error : new Error(String(error)), {
        ...context,
        method: req.method,
        url: req.url,
        duration,
      });
      throw error;
    }
  };
};

export default correlationMiddleware;