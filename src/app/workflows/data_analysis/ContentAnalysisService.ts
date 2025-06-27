import { SupabaseClient } from '@supabase/supabase-js';
import {
  SentimentAnalysisEngine,
  EngagementPredictionEngine,
  ContentOptimizationEngine,
  SentimentInput,
  SentimentOutput,
  EngagementPredictionInput,
  EngagementPredictionOutput,
  ContentOptimizationInput,
  ContentOptimizationOutput
} from './engines'; // Corrected path to engines
import { AnalysisResult, BaseAnalysisRequest, Platform, TimeRange, Video } from './types/analysis_types'; // Corrected path to types

// --- Request and Response Types for ContentAnalysisService ---

export interface AnalyzeContentRequest extends BaseAnalysisRequest {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  contentFeatures?: Record<string, any>; // For engagement prediction
  currentHashtags?: string[];
  topic?: string;
  brandNames?: string[]; // For brand sentiment analysis
  audienceSegment?: string; // For engagement prediction
}

export interface ContentAnalysisOutput {
  sentiment?: SentimentOutput;
  brandSentiment?: Record<string, SentimentOutput>;
  engagementPrediction?: EngagementPredictionOutput;
  contentOptimization?: ContentOptimizationOutput;
}

export interface PredictAudienceGrowthRequest extends BaseAnalysisRequest {}

export interface AudienceGrowthOutput {
  currentFollowers: number;
  projectedFollowersNext30Days: number;
  growthRatePercentage: string;
  // Add more detailed metrics as needed
}

// --- ContentAnalysisService Class ---

export class ContentAnalysisService {
  private sentimentAnalysisEngine: SentimentAnalysisEngine;
  private engagementPredictionEngine: EngagementPredictionEngine;
  private contentOptimizationEngine: ContentOptimizationEngine;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.sentimentAnalysisEngine = new SentimentAnalysisEngine(); 
    this.engagementPredictionEngine = new EngagementPredictionEngine(this.supabase);
    this.contentOptimizationEngine = new ContentOptimizationEngine(); 
  }

  /**
   * Performs a comprehensive analysis of a piece of content.
   * This can include sentiment analysis, engagement prediction, and content optimization.
   */
  async analyzeContent(request: AnalyzeContentRequest): Promise<AnalysisResult<ContentAnalysisOutput>> {
    console.log(`ContentAnalysisService: Analyzing content for userId: ${request.userId}, platform: ${request.platform}`);
    const results: ContentAnalysisOutput = {};
    const errors: { service: string; message: string }[] = [];

    try {
      // 1. Sentiment Analysis (if text is provided)
      if (request.text) {
        const sentimentInput: SentimentInput = { text: request.text };
        results.sentiment = await this.sentimentAnalysisEngine.analyzeSentiment(sentimentInput);

        if (request.brandNames && request.brandNames.length > 0) {
          results.brandSentiment = await this.sentimentAnalysisEngine.analyzeBrandMentionSentiment(request.text, request.brandNames);
        }
      }

      // 2. Engagement Prediction (if contentFeatures are provided)
      if (request.contentFeatures) {
        const engagementInput: EngagementPredictionInput = {
          userId: request.userId,
          platform: request.platform,
          contentFeatures: request.contentFeatures,
          audienceSegment: request.audienceSegment,
          // historicalData could be fetched here if needed
        };
        results.engagementPrediction = await this.engagementPredictionEngine.predictEngagement(engagementInput);
      }

      // 3. Content Optimization
      const optimizationInput: ContentOptimizationInput = {
        text: request.text,
        imageUrl: request.imageUrl,
        videoUrl: request.videoUrl,
        currentHashtags: request.currentHashtags,
        topic: request.topic,
        platform: request.platform as 'TikTok' | 'Instagram' | 'YouTube', // Adjust type as needed
      };
      results.contentOptimization = await this.contentOptimizationEngine.optimizeContent(optimizationInput);
      
    } catch (error: any) {
      console.error('ContentAnalysisService: Error during content analysis', error);
      errors.push({ service: 'OverallAnalysis', message: error.message || 'An unexpected error occurred.' });
      // Depending on requirements, you might want to re-throw or handle partially successful results
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? results : undefined,
      error: errors.length > 0 ? { message: 'One or more analysis steps failed.', details: errors } : undefined,
      metadata: {
        generatedAt: new Date(),
        source: 'ContentAnalysisService.analyzeContent',
        correlationId: request.correlationId,
        warnings: errors.length > 0 ? ['Partial failure during analysis.'] : undefined
      }
    };
  }

  /**
   * Predicts audience growth for a user on a specific platform.
   */
  async predictAudienceGrowth(request: PredictAudienceGrowthRequest): Promise<AnalysisResult<AudienceGrowthOutput>> {
    console.log(`ContentAnalysisService: Predicting audience growth for userId: ${request.userId}, platform: ${request.platform}`);
    try {
      const growthData = await this.engagementPredictionEngine.modelAudienceGrowth(
        request.userId,
        request.platform,
        request.timeRange || { unit: 'days', value: 30 } // Default to last 30 days if not provided
      );
      return {
        success: true,
        data: growthData as AudienceGrowthOutput,
        metadata: {
          generatedAt: new Date(),
          source: 'ContentAnalysisService.predictAudienceGrowth',
          correlationId: request.correlationId
        }
      };
    } catch (error: any) {
      console.error('ContentAnalysisService: Error predicting audience growth', error);
      return {
        success: false,
        error: { message: error.message || 'Failed to predict audience growth.' },
        metadata: {
          generatedAt: new Date(),
          source: 'ContentAnalysisService.predictAudienceGrowth',
          correlationId: request.correlationId
        }
      };
    }
  }
}
