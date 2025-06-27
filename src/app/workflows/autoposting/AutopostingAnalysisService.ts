import { AudienceReachEngine } from '@/app/workflows/data_analysis/engines/AudienceReachEngine';
import {
  BaseAnalysisRequest,
  AutopostingAnalysisData,
  AnalysisResult
} from '@/app/workflows/data_analysis/types/analysis_types';

interface GetAutopostingInsightsRequest extends BaseAnalysisRequest {
  niche: string;
}

export class AutopostingAnalysisService {
  private audienceReachEngine: AudienceReachEngine;

  constructor(audienceReachEngine?: AudienceReachEngine) {
    this.audienceReachEngine = audienceReachEngine || new AudienceReachEngine();
  }

  async getAutopostingInsights(
    request: GetAutopostingInsightsRequest
  ): Promise<AnalysisResult<AutopostingAnalysisData>> {
    console.log(`AutopostingAnalysisService: Getting insights for userId: ${request.userId}, niche: ${request.niche}`);
    return this.audienceReachEngine.getAudienceReachAnalysis(
      {
        userId: request.userId,
        platform: request.platform,
        timeRange: request.timeRange,
      },
      request.niche
    );
  }
}
