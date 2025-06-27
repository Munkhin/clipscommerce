import { SupabaseClient } from '@supabase/supabase-js';
import { ReportsAnalysisService } from '@/app/workflows/reports/ReportsAnalysisService';
import {
  TimeRange,
  PerformanceTrends // Keep this type for the deprecated method's signature
} from '@/app/workflows/data_analysis/types/analysis_types';

/**
 * @deprecated This service is deprecated. Please use ReportsAnalysisService instead.
 * The functionality of HistoricalAnalysisService has been migrated to the new
 * modular analysis engines and facades architecture.
 */
export class HistoricalAnalysisService {
  private reportsAnalysisService: ReportsAnalysisService;

  constructor(private supabase: SupabaseClient) {
    console.warn(
      '[HistoricalAnalysisService DEPRECATED] This service is deprecated and will be removed in a future version. ' +
      'Please migrate to ReportsAnalysisService for historical performance analysis.'
    );
    // Instantiate the new service to delegate calls if necessary, or for a transition period.
    this.reportsAnalysisService = new ReportsAnalysisService(supabase);
  }

  /**
   * @deprecated This method is deprecated. Please use ReportsAnalysisService.getReport() instead.
   * Provides a compatibility layer during transition. Performance and data structure may differ.
   */
  async analyzePerformanceTrends(userId: string, timeRange: TimeRange): Promise<PerformanceTrends | null> {
    console.warn(
      '[HistoricalAnalysisService.analyzePerformanceTrends DEPRECATED] This method is deprecated. ' +
      'Consider using ReportsAnalysisService.getReport() for more comprehensive and structured data.'
    );

    // The method is deprecated. Returning null to encourage migration.
    // The new ReportsAnalysisService.getReport() should be used for accurate data.
    return null;
  }
}
