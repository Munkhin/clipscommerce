import { SupabaseClient } from '@supabase/supabase-js';
import { HistoricalPerformanceEngine } from '@/app/workflows/data_analysis/engines/HistoricalPerformanceEngine';
import {
  BaseAnalysisRequest,
  ReportsAnalysisData,
  AnalysisResult
} from '@/app/workflows/data_analysis/types/analysis_types';
import { collectReportData } from './ReportDataCollector';
import { generateInsights } from './InsightsEngine';
import { ReportGenerator, ReportOptions } from './ReportGenerator';
import { ChartGenerator, ChartData } from './ChartGenerator';
import { TextSummaryEngine } from './TextSummaryEngine';

interface GetReportRequest extends BaseAnalysisRequest {
  eCommerceData?: any; // Define a more specific type if eCommerce data structure is known
}

export class ReportsAnalysisService {
  private historicalPerformanceEngine: HistoricalPerformanceEngine;

  constructor(supabase: SupabaseClient) {
    this.historicalPerformanceEngine = new HistoricalPerformanceEngine(supabase);
  }

  /**
   * Generates a comprehensive report including historical view growth,
   * past post performances, and e-commerce metrics (if applicable).
   * 
   * @param request - The request object containing userId, platform, timeRange, and optional eCommerceData.
   * @returns A promise that resolves to an AnalysisResult containing the report data.
   */
  async getReport(
    request: GetReportRequest
  ): Promise<AnalysisResult<ReportsAnalysisData>> {
    console.log(`ReportsAnalysisService: Generating report for userId: ${request.userId}`);

    // Delegate the core data fetching and analysis to the HistoricalPerformanceEngine
    const historicalDataResult = await this.historicalPerformanceEngine.getHistoricalData(
      {
        userId: request.userId,
        platform: request.platform,
        timeRange: request.timeRange,
      },
      request.eCommerceData
    );

    // The facade can add additional formatting, combine results from multiple engines (if needed in future),
    // or apply specific business logic for the 'Reports' workflow.
    // For now, it directly returns the result from the engine.

    if (historicalDataResult.success) {
      return {
        success: true,
        data: historicalDataResult.data, // data is present because historicalDataResult.success is true
        metadata: {
          ...(historicalDataResult.metadata || {}), // Ensure metadata exists
          source: 'ReportsAnalysisService (via HistoricalPerformanceEngine)',
          generatedAt: new Date(),
          correlationId: request.correlationId, // Propagate correlationId from original request
        },
      };
    } else {
      return {
        success: false,
        // data is implicitly undefined here as per AnalysisResult when success is false
        error: historicalDataResult.error, // Propagate error from engine
        metadata: {
          ...(historicalDataResult.metadata || {}), // Ensure metadata exists, might contain warnings
          source: 'ReportsAnalysisService (via HistoricalPerformanceEngine)',
          generatedAt: new Date(),
          correlationId: request.correlationId, // Propagate correlationId
        },
      };
    }
  }

  /**
   * Generates a comprehensive report including historical view growth,
   * past post performances, e-commerce metrics, insights, and charts.
   *
   * @param request - The request object containing userId, platform, timeRange, and optional eCommerceData.
   * @param options - Report generation options (format, charts, etc.)
   * @returns A promise that resolves to a report output (HTML/JSON/Buffer).
   */
  async getFullReport(
    request: GetReportRequest,
    options: ReportOptions
  ): Promise<string | Buffer> {
    // 1. Aggregate data
    const data = await collectReportData({
      platform: request.platform.toLowerCase() as 'tiktok' | 'instagram' | 'youtube',
      dateRange: {
        start: new Date(request.timeRange.start),
        end: new Date(request.timeRange.end),
      },
      metrics: ['engagement', 'roi', 'followerGrowth'],
      compareWithPreviousPeriod: true,
      eCommerce: { roi: true, salesAmount: true, conversionRate: true },
    });
    // 2. Generate insights
    const insights = await generateInsights({
      metrics: data.summary,
      timeSeries: data.timeSeries,
      platform: request.platform,
    });
    // 2.5. Summarize insights and data
    const summaryEngine = new TextSummaryEngine(process.env.HF_API_KEY || '');
    const summary = await summaryEngine.summarizeText(
      `Key findings: ${insights.keyFindings.join('; ')}. Recommendations: ${insights.recommendations.join('; ')}.`,
      30, 120
    );
    // 3. Generate charts (stub)
    const chart: ChartData = {
      type: 'line',
      title: 'Engagement Over Time',
      data: data.timeSeries,
      xAxis: 'date',
      yAxis: 'engagement',
    };
    const chartSvg = options.includeCharts ? await ChartGenerator.createChart(chart, 'svg') : '';
    // 4. Generate report
    const generator = new ReportGenerator();
    const report = await generator.generateReport(
      { ...data, chart: chartSvg, summary },
      insights,
      options
    );
    return report;
  }
}
