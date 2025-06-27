import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  EngagementPredictionAgent,
  initializeEngagementPredictionAgent,
  ModelEvaluation,
} from '../../workflows/reports/index'; // Adjust path as necessary
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionResponseDto } from './dto/prediction-response.dto';
import { EngagementPrediction, PredictionRequest } from '../../workflows/reports/types/EngagementTypes';

@Injectable()
export class EngagementPredictionService implements OnModuleInit {
  private agent!: EngagementPredictionAgent;
  private readonly logger = new Logger(EngagementPredictionService.name);
  private supabaseClient!: SupabaseClient;
  private agentInitialized = false;

  constructor() {
    // Initialize Supabase client - In a real app, this should be configured via a dedicated module/provider
    // and injected, rather than hardcoding credentials or relying solely on env vars here.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        'Supabase URL or Key not configured. EngagementPredictionAgent may not work correctly.',
      );
      // Create a mock client or handle appropriately if essential for startup
      this.supabaseClient = {} as unknown as SupabaseClient;
    } else {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing EngagementPredictionService and Agent...');
    try {
      const { agent, evaluation } = await initializeEngagementPredictionAgent(this.supabaseClient, {
        userId: 'api-global-agent', // Or manage user-specific agents if needed
      });
      this.agent = agent;
      this.agentInitialized = true;
      this.logger.log(
        `EngagementPredictionAgent initialized. RMSE: ${evaluation.engagementModel.rmse.toFixed(4)}, Accuracy: ${evaluation.viralModel.accuracy.toFixed(4)}`,
      );
    } catch (error: any) {
      this.logger.error('Failed to initialize EngagementPredictionAgent', error?.stack);
      // Depending on requirements, might throw error to prevent app start or run in a degraded mode.
    }
  }

  async predict(createPredictionDto: CreatePredictionDto): Promise<PredictionResponseDto> {
    if (!this.agentInitialized || !this.agent) {
      this.logger.warn('Agent not initialized. Returning default/error response.');
      // Potentially re-attempt initialization or throw a specific service unavailable error
      throw new Error('Engagement Prediction Agent is not available at the moment.');
    }

    this.logger.log(`Received prediction request for platform: ${createPredictionDto.platform}`);

    const request: PredictionRequest = {
      userId: createPredictionDto.userId || 'anonymous-api-user',
      platform: createPredictionDto.platform,
      contentMetadata: {
        caption: createPredictionDto.contentMetadata.caption,
        hashtags: createPredictionDto.contentMetadata.hashtags,
        duration: createPredictionDto.contentMetadata.duration,
        contentType: createPredictionDto.contentMetadata.contentType,
        scheduledPublishTime: createPredictionDto.contentMetadata.scheduledPublishTime
          ? new Date(createPredictionDto.contentMetadata.scheduledPublishTime)
          : undefined,
      },
      targetAudience: createPredictionDto.targetAudience,
    };

    try {
      const predictionResult: EngagementPrediction = await this.agent.predictEngagement(request);
      this.logger.log(`Prediction successful for platform: ${createPredictionDto.platform}`);
      return this.mapToResponseDto(predictionResult);
    } catch (error: any) {
      this.logger.error(`Error during prediction: ${error?.message}`, error?.stack);
      throw error; // Re-throw to be handled by NestJS exception filters
    }
  }

  private mapToResponseDto(prediction: EngagementPrediction): PredictionResponseDto {
    return {
      predictedMetrics: {
        views: prediction.predictedMetrics.views,
        likes: prediction.predictedMetrics.likes,
        shares: prediction.predictedMetrics.shares,
        comments: prediction.predictedMetrics.comments,
        engagementRate: prediction.predictedMetrics.engagementRate,
        confidence: prediction.predictedMetrics.confidence,
      },
      viralProbability: {
        score: prediction.viralProbability.score,
        threshold: prediction.viralProbability.threshold,
        isLikelyViral: prediction.viralProbability.isLikelyViral,
        confidence: prediction.viralProbability.confidence,
      },
      recommendations: prediction.recommendations.map(rec => ({
        type: rec.type,
        title: rec.title,
        description: rec.description,
        expectedImpact: {
          metric: rec.expectedImpact.metric,
          percentageIncrease: rec.expectedImpact.percentageIncrease,
          confidence: rec.expectedImpact.confidence,
        },
        actionable: rec.actionable,
        priority: rec.priority,
      })),
      modelMetadata: {
        modelVersion: prediction.modelMetadata.modelVersion,
        predictionTimestamp: prediction.modelMetadata.predictionTimestamp.toISOString(),
        // Feature importance might be too verbose for all API responses, consider if needed
        // featureImportance: prediction.modelMetadata.featureImportance,
      },
    };
  }

  async getAgentStatus(): Promise<{ initialized: boolean; modelPerformance?: ModelEvaluation | null }> {
    if (!this.agentInitialized || !this.agent) {
        return { initialized: false };
    }
    const performance = await this.agent.getModelPerformance();
    return {
        initialized: this.agent.isReady(),
        modelPerformance: performance,
    };
  }
} 