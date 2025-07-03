import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redisCache } from '@/lib/cache/redisCache';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      response_time?: number;
      details?: Record<string, unknown>;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      response_time?: number;
      details?: Record<string, unknown>;
    };
    api: {
      status: 'healthy' | 'unhealthy';
      response_time?: number;
      uptime: number;
    };
  };
  checks: {
    total: number;
    passed: number;
    failed: number;
  };
}

async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; response_time?: number; details?: Record<string, unknown> }> {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient(cookies());
    
    // Test basic database connectivity with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'unhealthy',
        response_time: responseTime,
        details: { error: error.message }
      };
    }
    
    return {
      status: 'healthy',
      response_time: responseTime,
      details: { connection: 'active', query_executed: true }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      response_time: responseTime,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown database error',
        connection: 'failed'
      }
    };
  }
}

async function checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; response_time?: number; details?: Record<string, unknown> }> {
  const startTime = Date.now();
  
  try {
    const healthCheck = await redisCache.healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      status: healthCheck.status,
      response_time: responseTime,
      details: healthCheck.details
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      response_time: responseTime,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown Redis error',
        connection: 'failed'
      }
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Run health checks in parallel for better performance
    const [databaseCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis()
    ]);
    
    const apiResponseTime = Date.now() - startTime;
    const uptime = process.uptime();
    
    // Calculate overall status
    const failedChecks = [databaseCheck, redisCheck].filter(check => check.status === 'unhealthy');
    const totalChecks = 2;
    const passedChecks = totalChecks - failedChecks.length;
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (failedChecks.length === 0) {
      overallStatus = 'healthy';
    } else if (failedChecks.length === totalChecks) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseCheck,
        redis: redisCheck,
        api: {
          status: 'healthy',
          response_time: apiResponseTime,
          uptime: Math.floor(uptime)
        }
      },
      checks: {
        total: totalChecks,
        passed: passedChecks,
        failed: failedChecks.length
      }
    };
    
    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 503 : 500;
    
    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: 'unhealthy',
          details: { error: 'Health check failed' }
        },
        redis: {
          status: 'unhealthy',
          details: { error: 'Health check failed' }
        },
        api: {
          status: 'unhealthy',
          response_time: responseTime,
          uptime: Math.floor(process.uptime())
        }
      },
      checks: {
        total: 2,
        passed: 0,
        failed: 2
      }
    };
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    // Quick health check without detailed responses
    const [databaseCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis()
    ]);
    
    const hasFailures = databaseCheck.status === 'unhealthy' || redisCheck.status === 'unhealthy';
    const httpStatus = hasFailures ? 503 : 200;
    
    return new NextResponse(null, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
