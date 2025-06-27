import { SupabaseClient } from '@supabase/supabase-js';
import { CompetitorAnalysisService } from '../competitor_analysis_service';
import { HistoricalAnalysisService } from '../historical_analysis_service'; // Added import
import {
  CompetitorAnalysis,
  PerformanceTrends, // Added import
  TimeRange, // Added import
} from '../types/analysis_types';
import { randomUUID } from 'crypto';
import { EnhancedTextAnalyzer } from '@/lib/ai/enhancedTextAnalyzer';

/**
 * Orchestrates various analysis services to provide a comprehensive analytical overview.
 * This service will be expanded to include historical analysis, virality prediction, etc.
 */
export class ComprehensiveAnalysisService {
  private competitorAnalysisService: CompetitorAnalysisService;
  private historicalAnalysisService: HistoricalAnalysisService; // Uncommented and activated
  // private viralityPredictionService: ViralityPredictionService; // Future addition

  constructor(private supabase: SupabaseClient) {
    this.competitorAnalysisService = new CompetitorAnalysisService(this.supabase, new EnhancedTextAnalyzer({}));
    this.historicalAnalysisService = new HistoricalAnalysisService(this.supabase); // Uncommented and activated
    // this.viralityPredictionService = new ViralityPredictionService(this.supabase); // Future addition
  }

  /**
   * Gathers and returns insights about a specific competitor.
   *
   * @param competitorId - The ID of the competitor to analyze.
   * @param niche - The niche or market segment the competitor operates in.
   * @returns A promise that resolves to CompetitorAnalysis data, or null if an error occurs.
   */
  async getCompetitorInsights(
    competitorId: string,
    niche: string
  ): Promise<CompetitorAnalysis | null> {
    try {
      const correlationId = randomUUID();
      const analysisResult = await this.competitorAnalysisService.analyzeCompetitor(
        competitorId,
        niche,
        correlationId
      );
      return analysisResult?.data || null;
    } catch (error) {
      console.error(
        `Error getting competitor insights for ${competitorId} in niche ${niche}:`,
        error
      );
      return null;
    }
  }

  /**
   * Gathers and returns historical performance trends for a specific user.
   *
   * @param userId - The ID of the user whose performance trends are to be analyzed.
   * @param timeRange - The time range for the historical analysis.
   * @returns A promise that resolves to PerformanceTrends data, or null if an error occurs.
   */
  async getUserPerformanceTrends(
    userId: string,
    timeRange: TimeRange
  ): Promise<PerformanceTrends | null> {
    try {
      const trends = await this.historicalAnalysisService.analyzePerformanceTrends(
        userId,
        timeRange
      );
      return trends;
    } catch (error) {
      console.error(
        `Error getting user performance trends for ${userId}:`,
        error
      );
      return null;
    }
  }

  // Future methods:
  // async getComprehensiveMarketView(niche: string, competitors: string[]): Promise<MarketView | null> { ... }
}

