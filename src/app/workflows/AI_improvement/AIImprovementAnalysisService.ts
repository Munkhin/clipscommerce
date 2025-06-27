import { AIImprovementEngine } from '@/app/workflows/data_analysis/engines/AIImprovementEngine';
import {
  BaseAnalysisRequest,
  AIImprovementAnalysisData,
  AnalysisResult
} from '@/app/workflows/data_analysis/types/analysis_types';

export class AIImprovementAnalysisService {
  private aiImprovementEngine: AIImprovementEngine;

  constructor(aiImprovementEngine?: AIImprovementEngine) {
    this.aiImprovementEngine = aiImprovementEngine || new AIImprovementEngine();
  }

  async getAIImprovementInsights(
    request: BaseAnalysisRequest
  ): Promise<AnalysisResult<AIImprovementAnalysisData>> {
    console.log(`AIImprovementAnalysisService: Getting insights for userId: ${request.userId}`);
    return this.aiImprovementEngine.getAIImprovementInsights(request);
  }
}
