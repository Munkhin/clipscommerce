import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  CompetitorAnalysis,
  AnalysisResult,
} from './types'; 
import { EnhancedTextAnalyzer } from '@/lib/ai/enhancedTextAnalyzer';
import { CacheService } from './utils/cacheService';
import { DEFAULT_CONFIG } from './config';
import { CompetitorAnalysisEngine } from './engines/CompetitorAnalysisEngine';

export class CompetitorAnalysisService { 
  private engine: CompetitorAnalysisEngine;
  private _cachedAnalyzeCompetitor: (
    competitorId: string,
    niche: string,
    correlationId: string // Always present here, generated if not provided to public method
  ) => Promise<AnalysisResult<CompetitorAnalysis>>;

  constructor(
    private supabase: SupabaseClient,
    private textAnalyzer: EnhancedTextAnalyzer // Made required
  ) {
    this.engine = new CompetitorAnalysisEngine(this.supabase, this.textAnalyzer);


    const methodToCache = (
      competitorId: string,
      niche: string,
      correlationId: string
    ): Promise<AnalysisResult<CompetitorAnalysis>> => {
      // The correlationId is passed through from the public method or generated there
      return this._analyzeCompetitorUncached(competitorId, niche, correlationId);
    };

    this._cachedAnalyzeCompetitor = CacheService.withCache(
      methodToCache,
      'competitorAnalysis:analyze', 
      DEFAULT_CONFIG.CACHE_TTL.ANALYSIS_RESULTS / 1000 
    ) as (
      competitorId: string,
      niche: string,
      correlationId: string
    ) => Promise<AnalysisResult<CompetitorAnalysis>>;
  }

  async analyzeCompetitor(
    competitorId: string,
    niche: string,
    correlationId?: string
  ): Promise<AnalysisResult<CompetitorAnalysis>> {
    const effectiveCorrelationId = correlationId || randomUUID();
    return this._cachedAnalyzeCompetitor(competitorId, niche, effectiveCorrelationId);
  }

  private async _analyzeCompetitorUncached(
    competitorId: string,
    niche: string,
    correlationId: string // Now a required parameter from the caching layer/public method
  ): Promise<AnalysisResult<CompetitorAnalysis>> {
    console.log(`[CompetitorAnalysisServiceFacade] Cache miss for competitor: ${competitorId}, niche: ${niche}, correlationId: ${correlationId}. Fetching from engine.`);
    try {
      const result = await this.engine.analyzeCompetitor({ competitorId, niche, correlationId });
      return {
        success: true,
        data: result.data,
        metadata: {
          generatedAt: new Date(),
          source: 'CompetitorAnalysisServiceFacade',
          warnings: result.metadata.warnings,
          correlationId, // Include correlationId in error metadata
        },
      };
    } catch (error) {
      console.error(`[CompetitorAnalysisServiceFacade] Error calling CompetitorAnalysisEngine for ${competitorId}:`, error);
      return {
        success: false,
        data: {} as CompetitorAnalysis, 
        metadata: {
          generatedAt: new Date(),
          source: 'CompetitorAnalysisServiceFacade',
          warnings: [`Engine execution failed: ${error instanceof Error ? error.message : String(error)}`],
          correlationId, // Include correlationId in error metadata
        },
      };
    }
  }
}
