import { NextRequest, NextResponse } from 'next/server';

interface SchedulerMetrics {
  totalProcessed: number;
  successfulPosts: number;
  failedPosts: number;
  averageProcessingTime: number;
  queueLength: number;
  platformStats: Record<string, {
    posts: number;
    successes: number;
    failures: number;
  }>;
}

interface SchedulerHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: SchedulerMetrics;
  lastProcessingTime: number;
  queueHealth: string;
  platformStatuses: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    failureRate: number;
    consecutiveFailures: number;
  }>;
  errorRecoveryStatus: any;
  deadLetterQueueSize: number;
}

interface ErrorHandlingHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  timestamp: string;
}

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

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Temporarily return simple health response during optimization
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      service: 'autoposting-scheduler',
      overallStatus: 'healthy',
      message: 'Simplified health check'
    });

  } catch (error) {
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
    return NextResponse.json({
      success: true,
      message: 'Simplified health action endpoint',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Action failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

