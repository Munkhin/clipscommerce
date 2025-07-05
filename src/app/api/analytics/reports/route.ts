import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ReportsAnalysisService } from '@/app/workflows/reports/ReportsAnalysisService';
import { authMiddleware } from '@/lib/middleware/authMiddleware';
import { Permission } from '@/lib/rbac/roleManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and check permissions
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      requirePermission: Permission.ANALYTICS_READ
    });

    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const userId = authResult.user!.id; // Use authenticated user's ID
    const platform = searchParams.get('platform') || 'tiktok';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Use default date range if not provided (current month)
    const now = new Date();
    const start = startDate ? startDate : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = endDate ? endDate : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const supabase = await createClient(cookies());
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