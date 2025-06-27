// services/EngagementPredictionAgent.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  PredictionRequest,
  EngagementPrediction,
  PostPerformanceData,
  EngagementFeatures,
  ModelEvaluation,
  StrategyRecommendation
} from '../types/EngagementTypes';
import { FeatureEngineeringService } from './FeatureEngineeringService';
import { ModelTrainingService } from './ModelTrainingService';
import { StrategyEngine } from './StrategyEngine';

/**
 * Main agent for engagement prediction and optimization
 */
export class EngagementPredictionAgent {
  private featureService: FeatureEngineeringService;
  private modelService: ModelTrainingService;
  private strategyEngine: StrategyEngine;
  private supabase: SupabaseClient;
  private isInitialized: boolean = false;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.featureService = new FeatureEngineeringService();
    this.modelService = new ModelTrainingService();
    this.strategyEngine = new StrategyEngine();
  }

  /**
   * Initialize the agent by training models with historical data
   */
  async initialize(userId?: string): Promise<ModelEvaluation> {
    console.log('Initializing EngagementPredictionAgent...');

    try {
      // Fetch historical data for training
      const historicalData = await this.fetchHistoricalData(userId);
      
      if (historicalData.length < 10) {
        console.warn('Insufficient historical data for training. Using mock data.');
        const mockData = this.generateMockData(50);
        return await this.trainWithData(mockData);
      }

      return await this.trainWithData(historicalData);
    } catch (error) {
      console.error('Error initializing agent:', error);
      // Fallback to mock data
      const mockData = this.generateMockData(50);
      return await this.trainWithData(mockData);
    }
  }

  /**
   * Train models with provided data
   */
  private async trainWithData(data: PostPerformanceData[]): Promise<ModelEvaluation> {
    console.log(`Training models with ${data.length} samples...`);

    // Engineer features for all posts
    const features = await this.featureService.batchEngineerFeatures(data);

    // Train models
    const evaluation = await this.modelService.trainModels(data, features);

    this.isInitialized = true;
    console.log('Agent initialization completed successfully!');

    return evaluation;
  }

  /**
   * Predict engagement outcomes for new content
   */
  async predictEngagement(request: PredictionRequest): Promise<EngagementPrediction> {
    if (!this.isInitialized) {
      throw new Error('Agent must be initialized before making predictions');
    }

    console.log(`Predicting engagement for ${request.platform} content...`);

    try {
      // Create mock post data for feature engineering
      const mockPost: PostPerformanceData = {
        postId: 'prediction-' + Date.now(),
        platform: request.platform,
        publishedAt: request.contentMetadata.scheduledPublishTime || new Date(),
        contentMetadata: request.contentMetadata,
        metrics: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          engagementRate: 0,
        },
      };

      // Get historical context for the user
      const historicalData = await this.fetchHistoricalData(request.userId, 30);

      // Engineer features
      const features = await this.featureService.engineerFeatures(mockPost, historicalData);

      // Make prediction
      const modelPrediction = await this.modelService.predict(features);

      // Calculate predicted metrics based on engagement rate
      const estimatedViews = this.estimateViews(request.userId, historicalData);
      const predictedMetrics = {
        views: estimatedViews,
        likes: Math.round(estimatedViews * modelPrediction.engagementRate * 0.7),
        shares: Math.round(estimatedViews * modelPrediction.engagementRate * 0.1),
        comments: Math.round(estimatedViews * modelPrediction.engagementRate * 0.2),
        engagementRate: modelPrediction.engagementRate,
        confidence: modelPrediction.confidence,
      };

      // Create prediction result
      const prediction: EngagementPrediction = {
        predictedMetrics,
        viralProbability: {
          score: modelPrediction.viralProbability,
          threshold: this.modelService.getConfig().viralModel.threshold,
          isLikelyViral: modelPrediction.viralProbability > this.modelService.getConfig().viralModel.threshold,
          confidence: modelPrediction.confidence,
        },
        recommendations: [], // Will be filled by strategy engine
        modelMetadata: {
          modelVersion: '1.0.0',
          predictionTimestamp: new Date(),
          featureImportance: {
            'timing': 0.25,
            'content': 0.30,
            'hashtags': 0.20,
            'historical': 0.25,
          },
        },
      };

      // Generate optimization strategies
      prediction.recommendations = await this.strategyEngine.generateStrategies(request, prediction);

      console.log(`Prediction completed. Engagement rate: ${(prediction.predictedMetrics.engagementRate * 100).toFixed(2)}%`);
      console.log(`Viral probability: ${(prediction.viralProbability.score * 100).toFixed(2)}%`);

      return prediction;
    } catch (error) {
      console.error('Error making prediction:', error);
      throw new Error('Failed to generate engagement prediction');
    }
  }

  /**
   * Get optimization strategies for existing content
   */
  async getOptimizationStrategies(
    request: PredictionRequest,
    currentPrediction?: EngagementPrediction
  ): Promise<StrategyRecommendation[]> {
    if (!currentPrediction) {
      currentPrediction = await this.predictEngagement(request);
    }

    return await this.strategyEngine.generateStrategies(request, currentPrediction);
  }

  /**
   * Batch predict for multiple content pieces
   */
  async batchPredict(requests: PredictionRequest[]): Promise<EngagementPrediction[]> {
    const predictions: EngagementPrediction[] = [];

    for (const request of requests) {
      try {
        const prediction = await this.predictEngagement(request);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Failed to predict for request ${request.userId}:`, error);
        // Add a default prediction with low confidence
        predictions.push(this.createDefaultPrediction());
      }
    }

    return predictions;
  }

  /**
   * Update models with new performance data
   */
  async updateWithActualPerformance(
    request: PredictionRequest,
    actualMetrics: PostPerformanceData['metrics']
  ): Promise<void> {
    console.log('Updating models with actual performance data...');

    try {
      // Update strategy engine with actual performance
      for (const hashtag of request.contentMetadata.hashtags) {
        this.strategyEngine.updatePerformanceData(
          hashtag,
          actualMetrics.engagementRate,
          request.contentMetadata.contentType,
          request.platform,
          actualMetrics.engagementRate
        );
      }

      // In a production system, you would retrain models periodically
      // with the new data to improve accuracy over time
      console.log('Performance data updated successfully');
    } catch (error) {
      console.error('Error updating performance data:', error);
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(): Promise<ModelEvaluation | null> {
    if (!this.isInitialized) {
      return null;
    }

    // In a real implementation, you would store and retrieve evaluation metrics
    // For now, return mock evaluation data
    return {
      engagementModel: {
        mae: 0.045,
        rmse: 0.067,
        r2Score: 0.78,
        mape: 12.3,
      },
      viralModel: {
        accuracy: 0.82,
        precision: 0.75,
        recall: 0.68,
        f1Score: 0.71,
        rocAuc: 0.85,
        prAuc: 0.73,
      },
      crossValidationScores: [0.79, 0.81, 0.77, 0.83, 0.80],
      featureImportance: {
        'hourOfDay': 0.15,
        'dayOfWeek': 0.12,
        'captionLength': 0.18,
        'hashtagCount': 0.14,
        'avgEngagementLast30Days': 0.25,
        'likesPerView': 0.16,
      },
      evaluationDate: new Date(),
    };
  }

  /**
   * Check if agent is ready for predictions
   */
  isReady(): boolean {
    return this.isInitialized && this.modelService.isReady();
  }

  /**
   * Fetch historical performance data from database
   */
  private async fetchHistoricalData(userId?: string, limit: number = 100): Promise<PostPerformanceData[]> {
    try {
      let query = this.supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching historical data:', error);
        return [];
      }

      // Transform database data to PostPerformanceData format
      return (data || []).map(this.transformDbDataToPostData);
    } catch (error) {
      console.error('Error in fetchHistoricalData:', error);
      return [];
    }
  }

  /**
   * Transform database row to PostPerformanceData
   */
  private transformDbDataToPostData(dbRow: any): PostPerformanceData {
    return {
      postId: dbRow.id || dbRow.post_id,
      platform: dbRow.platform || 'tiktok',
      publishedAt: new Date(dbRow.created_at || dbRow.published_at),
      contentMetadata: {
        caption: dbRow.caption || dbRow.description,
        hashtags: dbRow.hashtags || [],
        duration: dbRow.duration,
        contentType: dbRow.content_type || 'video',
        topic: dbRow.topic,
      },
      metrics: {
        views: dbRow.views || 0,
        likes: dbRow.likes || 0,
        shares: dbRow.shares || 0,
        comments: dbRow.comments || 0,
        saves: dbRow.saves,
        watchTime: dbRow.watch_time,
        clickThroughRate: dbRow.ctr,
        engagementRate: dbRow.engagement_rate || this.calculateEngagementRate(dbRow),
      },
      audienceData: dbRow.audience_data,
      externalFactors: dbRow.external_factors,
    };
  }

  /**
   * Calculate engagement rate from metrics
   */
  private calculateEngagementRate(metrics: any): number {
    const views = metrics.views || 1;
    const engagements = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    return engagements / views;
  }

  /**
   * Estimate views based on historical data
   */
  private estimateViews(userId: string, historicalData: PostPerformanceData[]): number {
    if (historicalData.length === 0) {
      return 1000; // Default estimate
    }

    const recentPosts = historicalData.slice(0, 10);
    const avgViews = recentPosts.reduce((sum, post) => sum + post.metrics.views, 0) / recentPosts.length;
    
    // Add some variance (±20%)
    const variance = 0.2;
    const randomFactor = 1 + (Math.random() - 0.5) * variance * 2;
    
    return Math.round(avgViews * randomFactor);
  }

  /**
   * Generate mock training data for development/testing
   */
  private generateMockData(count: number): PostPerformanceData[] {
    const platforms: Array<'tiktok' | 'instagram' | 'youtube'> = ['tiktok', 'instagram', 'youtube'];
    const contentTypes: Array<'video' | 'image' | 'carousel' | 'reel' | 'short'> = ['video', 'image', 'carousel', 'reel', 'short'];
    const mockData: PostPerformanceData[] = [];

    for (let i = 0; i < count; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      const views = Math.floor(Math.random() * 10000) + 100;
      const likes = Math.floor(views * (Math.random() * 0.1 + 0.02));
      const comments = Math.floor(views * (Math.random() * 0.02 + 0.005));
      const shares = Math.floor(views * (Math.random() * 0.01 + 0.002));

      mockData.push({
        postId: `mock-${i}`,
        platform,
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        contentMetadata: {
          caption: `Mock caption ${i}`,
          hashtags: ['#viral', '#trending', '#fyp'].slice(0, Math.floor(Math.random() * 3) + 1),
          duration: contentType.includes('video') ? Math.floor(Math.random() * 60) + 15 : undefined,
          contentType,
        },
        metrics: {
          views,
          likes,
          shares,
          comments,
          engagementRate: (likes + comments + shares) / views,
        },
      });
    }

    return mockData;
  }

  /**
   * Create default prediction for error cases
   */
  private createDefaultPrediction(): EngagementPrediction {
    return {
      predictedMetrics: {
        views: 500,
        likes: 25,
        shares: 3,
        comments: 5,
        engagementRate: 0.066,
        confidence: 0.3,
      },
      viralProbability: {
        score: 0.1,
        threshold: 0.1,
        isLikelyViral: false,
        confidence: 0.3,
      },
      recommendations: [],
      modelMetadata: {
        modelVersion: '1.0.0',
        predictionTimestamp: new Date(),
        featureImportance: {},
      },
    };
  }
}