import { NextRequest, NextResponse } from 'next/server';
import { AutoPostingScheduler } from '../../../workflows/autoposting/AutoPostingScheduler';
import { checkErrorHandlingHealth } from '../../../workflows/autoposting/ErrorHandling';
import logger from '../../../../utils/logger';

// Global scheduler instance (in a real application, this would be managed by a service container)
let schedulerInstance: AutoPostingScheduler | null = null;

function getSchedulerInstance(): AutoPostingScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AutoPostingScheduler({
      batchSize: 5,
      intervalMs: 300000, // 5 minutes
      maxRetries: 3,
      enableBatchProcessing: true,
      enableRealTimeUpdates: true
    });
  }
  return schedulerInstance;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    logger.info('Health check requested', {
      detailed,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    });

    // Get scheduler instance
    const scheduler = getSchedulerInstance();
    
    // Get comprehensive health status
    const schedulerHealth = scheduler.getHealthStatus();
    
    // Get error handling system health
    const errorHandlingHealth = checkErrorHandlingHealth();
    
    // Create comprehensive health report
    const healthReport = {
      timestamp: new Date().toISOString(),
      service: 'autoposting-scheduler',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Overall health status
      overallStatus: determineOverallHealth(schedulerHealth, errorHandlingHealth),
      
      // Scheduler health
      scheduler: {
        status: schedulerHealth.status,
        queueHealth: schedulerHealth.queueHealth,
        lastProcessingTime: schedulerHealth.lastProcessingTime,
        deadLetterQueueSize: schedulerHealth.deadLetterQueueSize,
        ...(detailed && {
          metrics: schedulerHealth.metrics,
          platformStatuses: schedulerHealth.platformStatuses,
          errorRecoveryStatus: schedulerHealth.errorRecoveryStatus
        })
      },
      
      // Error handling system health
      errorHandling: {
        status: errorHandlingHealth.status,
        checks: errorHandlingHealth.checks,
        ...(detailed && {
          timestamp: errorHandlingHealth.timestamp
        })
      },
      
      // System resources (basic checks)
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          limit: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        ...(detailed && {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        })
      }
    };

    // Add detailed monitoring data if requested
    if (detailed) {
      try {
        const monitoringReport = scheduler['monitoring']?.getHealthReport();
        if (monitoringReport) {
          healthReport['monitoring'] = monitoringReport;
        }
      } catch (error) {
        logger.warn('Failed to get monitoring report', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Determine HTTP status code based on health
    const httpStatus = healthReport.overallStatus === 'healthy' ? 200 :
                      healthReport.overallStatus === 'degraded' ? 200 : 503;

    logger.info('Health check completed', {
      overallStatus: healthReport.overallStatus,
      httpStatus,
      detailed
    });

    return NextResponse.json(healthReport, { status: httpStatus });

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse = {
      timestamp: new Date().toISOString(),
      service: 'autoposting-scheduler',
      overallStatus: 'unhealthy',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : String(error)
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    logger.info('Health check action requested', {
      action,
      timestamp: new Date().toISOString()
    });

    const scheduler = getSchedulerInstance();
    
    switch (action) {
      case 'reset_metrics':
        scheduler['monitoring']?.resetMetrics();
        return NextResponse.json({ 
          success: true, 
          message: 'Metrics reset successfully',
          timestamp: new Date().toISOString()
        });
        
      case 'retry_dead_letter_queue':
        const contentId = body.contentId;
        if (!contentId) {
          return NextResponse.json(
            { error: 'Content ID required for retry action' },
            { status: 400 }
          );
        }
        
        const retryResult = await scheduler['errorRecovery']?.retryDeadLetterQueueItem(contentId);
        return NextResponse.json({
          success: retryResult,
          message: retryResult ? 'Item requeued successfully' : 'Item not found in dead letter queue',
          contentId,
          timestamp: new Date().toISOString()
        });
        
      case 'get_dead_letter_queue':
        const deadLetterQueue = scheduler['errorRecovery']?.getDeadLetterQueue() || [];
        return NextResponse.json({
          deadLetterQueue,
          size: deadLetterQueue.length,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    logger.error('Health check action failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        error: 'Action failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

function determineOverallHealth(
  schedulerHealth: any,
  errorHandlingHealth: any
): 'healthy' | 'degraded' | 'unhealthy' {
  // If error handling system is unhealthy, overall is unhealthy
  if (errorHandlingHealth.status === 'unhealthy') {
    return 'unhealthy';
  }
  
  // If scheduler is unhealthy, overall is unhealthy
  if (schedulerHealth.status === 'unhealthy') {
    return 'unhealthy';
  }
  
  // If either is degraded, overall is degraded
  if (schedulerHealth.status === 'degraded' || errorHandlingHealth.status === 'degraded') {
    return 'degraded';
  }
  
  // Both are healthy
  return 'healthy';
}