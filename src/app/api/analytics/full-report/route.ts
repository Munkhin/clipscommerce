import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { ReportsAnalysisService } from '@/app/workflows/reports/ReportsAnalysisService';
import { PlatformEnum } from '@/types/platform';

// Cache configuration for ISR
export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform');
    const timeRange = searchParams.get('timeRange');
    const format = searchParams.get('format') || 'json';
    const includeCharts = searchParams.get('includeCharts') === 'true';
    const includeRawData = searchParams.get('includeRawData') === 'true';

    if (!userId || !platform || !timeRange) {
      return NextResponse.json({ 
        error: 'Missing required query parameters: userId, platform, timeRange' 
      }, { status: 400 });
    }

    // Validate platform is a valid PlatformEnum value
    const validPlatforms = Object.values(PlatformEnum);
    if (!validPlatforms.includes(platform as PlatformEnum)) {
      return NextResponse.json({ 
        error: `Invalid platform: ${platform}. Valid platforms are: ${validPlatforms.join(', ')}` 
      }, { status: 400 });
    }

    // Parse timeRange string into date range object
    const parseTimeRange = (range: string) => {
      const now = new Date();
      const end = now.toISOString();
      let start: string;

      switch (range) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
        case '3m':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          // Try to parse as ISO date range (e.g., "2023-01-01,2023-12-31")
          const dates = range.split(',');
          if (dates.length === 2) {
            return { start: dates[0], end: dates[1] };
          }
          throw new Error(`Invalid timeRange format: ${range}. Use 7d, 30d, 90d, 1y or "start,end" format.`);
      }

      return { start, end };
    };

    let parsedTimeRange;
    try {
      parsedTimeRange = parseTimeRange(timeRange);
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Invalid timeRange format' 
      }, { status: 400 });
    }

    // Cache key for storing/retrieving cached reports
    const cacheKey = `full-report-${userId}-${platform}-${timeRange}-${format}`;
    
    try {
      const supabase = createClient();
      const reportsService = new ReportsAnalysisService(supabase);
      
      const result = await reportsService.getFullReport(
        {
          userId,
          platform: platform as PlatformEnum,
          timeRange: parsedTimeRange,
          correlationId: `api-full-report-${userId}`,
        },
        {
          format: format as 'html' | 'json' | 'pdf',
          includeCharts,
          includeRawData,
        }
      );

      const response = NextResponse.json({
        success: true,
        report: result.toString(),
        generatedAt: new Date().toISOString(),
        cacheKey,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour
      });

      // Set cache headers for browser caching
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600');
      response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=3600');

      return response;
    } catch (error) {
      console.error('Full report generation error:', error);
      
      // Return cached error response with shorter cache time
      const errorResponse = NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed',
        generatedAt: new Date().toISOString(),
      }, { status: 500 });

      errorResponse.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return errorResponse;
    }
  } catch (error) {
    console.error('Full report API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 