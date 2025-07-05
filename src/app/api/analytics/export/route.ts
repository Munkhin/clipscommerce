import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { convertToCSV, convertToHTML, convertToXLSX, generateExportFilename, formatAnalyticsForExport } from '@/lib/utils/export';
import { Platform } from '@/types/platform';
import { AnalyticsFilter } from '@/types/analytics';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, platform, timeRange, format = 'csv', includeRawData = false, includeCharts = false } = body;

    // Enhanced validation
    if (!userId || !platform || !timeRange) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userId, platform, timeRange',
        details: {
          userId: !userId ? 'User ID is required' : null,
          platform: !platform ? 'Platform is required' : null,
          timeRange: !timeRange ? 'Time range is required' : null
        }
      }, { status: 400 });
    }

    if (!['csv', 'pdf', 'json', 'xlsx'].includes(format)) {
      return NextResponse.json({ 
        error: 'Invalid format. Must be csv, pdf, json, or xlsx',
        supportedFormats: ['csv', 'pdf', 'json', 'xlsx']
      }, { status: 400 });
    }

    // Validate time range
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format in timeRange. Use ISO date strings.' 
      }, { status: 400 });
    }

    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'Start date must be before end date' 
      }, { status: 400 });
    }

    // Create analytics service instance
    const supabase = createClient();
    const analyticsService = AnalyticsService.getInstance({
      getPlatformAuth: async (platform: Platform) => {
        const { data, error } = await supabase
          .from('platform_auth')
          .select('access_token')
          .eq('user_id', userId)
          .eq('platform', platform)
          .single();
        
        if (error || !data) return null;
        return { accessToken: data.access_token };
      },
      getPosts: async (filter: any) => {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', filter.publishedAt?.$gte || timeRange.start)
          .lte('created_at', filter.publishedAt?.$lte || timeRange.end);
        
        if (error) {
          console.error('Error fetching posts:', error);
          return [];
        }
        
        return data || [];
      },
      getPostMetrics: async (postId: string, platform: Platform) => {
        const { data, error } = await supabase
          .from('post_metrics')
          .select('*')
          .eq('post_id', postId)
          .eq('platform', platform)
          .single();
        
        if (error) {
          console.error('Error fetching post metrics:', error);
          return {
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            reach: 0,
            impressions: 0,
            engagementRate: 0,
            linkClicks: 0
          };
        }
        
        return {
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          saves: data.saves || 0,
          reach: data.reach || 0,
          impressions: data.impressions || 0,
          engagementRate: data.engagement_rate || 0,
          linkClicks: data.link_clicks || 0,
          videoViews: data.video_views,
          viewTime: data.view_time
        };
      }
    });

    // Generate analytics report
    const filter: AnalyticsFilter = {
      platforms: [platform as Platform],
      timeRange: {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end)
      }
    };

    const report = await analyticsService.generateReport(filter);
    const exportData = formatAnalyticsForExport(report, { includeRawData, includeCharts });

    // Handle different export formats
    switch (format) {
      case 'csv': {
        const csvData = convertToCSV(exportData);
        const filename = generateExportFilename('csv', platform);
        
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });
      }
      
      case 'json': {
        const jsonData = JSON.stringify(exportData, null, 2);
        const filename = generateExportFilename('json', platform);
        
        return new NextResponse(jsonData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });
      }
      
      case 'xlsx': {
        const xlsxData = await convertToXLSX(exportData);
        const filename = generateExportFilename('xlsx', platform);
        
        return new NextResponse(xlsxData, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });
      }
      
      case 'pdf': {
        const htmlContent = convertToHTML(exportData, { includeCharts });
        
        // Generate PDF using puppeteer with enhanced options
        const browser = await puppeteer.launch({
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
          ],
          headless: 'new',
          timeout: 30000
        });
        
        try {
          const page = await browser.newPage();
          await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
          
          const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
              top: '1in',
              right: '1in',
              bottom: '1in',
              left: '1in'
            },
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<div style="font-size: 10px; margin: 0 auto;">Analytics Report</div>',
            footerTemplate: '<div style="font-size: 10px; margin: 0 auto;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
          });
          
          const filename = generateExportFilename('pdf', platform);
          
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
          });
        } finally {
          await browser.close();
        }
      }
      
      default: {
        return NextResponse.json({ 
          error: 'Unsupported format',
          supportedFormats: ['csv', 'pdf', 'json', 'xlsx'] 
        }, { status: 400 });
      }
    }

  } catch (error) {
    console.error('Export API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('browser')) {
        return NextResponse.json({
          success: false,
          error: 'PDF generation service temporarily unavailable. Please try CSV or JSON export.',
          errorCode: 'PDF_SERVICE_ERROR'
        }, { status: 503 });
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json({
          success: false,
          error: 'Export request timed out. Please try with a smaller date range.',
          errorCode: 'TIMEOUT_ERROR'
        }, { status: 408 });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message,
        errorCode: 'EXPORT_ERROR'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}