import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { ReportsAnalysisService } from '@/app/workflows/reports/ReportsAnalysisService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform') || 'tiktok';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Use default date range if not provided (current month)
    const now = new Date();
    const start = startDate ? startDate : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = endDate ? endDate : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const supabase = createClient();
    const reportsService = new ReportsAnalysisService(supabase);
    
    const result = await reportsService.getReport({
      userId,
      platform: platform as any,
      timeRange: { start, end },
      correlationId: `api-analytics-reports-${userId}`,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: result.metadata
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        metadata: result.metadata
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 