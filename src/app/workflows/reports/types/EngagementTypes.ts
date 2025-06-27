/**
 * Historical post performance data for training and prediction
 */
export interface PostPerformanceData {
  postId: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  publishedAt: Date;
  contentMetadata: {
    caption?: string;
    hashtags: string[];
    duration?: number; // in seconds for videos
    contentType: 'video' | 'image' | 'carousel' | 'reel' | 'short';
    topic?: string;
  };
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    saves?: number;
    watchTime?: number; // in seconds
    clickThroughRate?: number;
    engagementRate: number;
  };
  audienceData?: {
    demographics: Record<string, number>;
    geographics: Record<string, number>;
    interests: string[];
  };
  externalFactors?: {
    trendingTopics: string[];
    seasonality: string;
    competitorActivity: number;
  };
}

/**
 * Features engineered for ML model input
 */
export interface EngagementFeatures {
  // Temporal features
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  
  // Content features
  captionLength: number;
  hashtagCount: number;
  contentDuration: number;
  contentTypeEncoded: number;
  
  // Engagement ratios
  likesPerView: number;
  commentsPerView: number;
  sharesPerView: number;
  
  // Historical performance
  avgEngagementLast7Days: number;
  avgEngagementLast30Days: number;
  followerCount: number;
  
  // Content embeddings (simplified as arrays)
  textEmbedding: number[];
  visualEmbedding?: number[];
  
  // External factors
  trendScore: number;
  competitorScore: number;
  seasonalityScore: number;
}

/**
 * Prediction request input
 */
export interface PredictionRequest {
  userId: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  contentMetadata: {
    caption?: string;
    hashtags: string[];
    duration?: number;
    contentType: 'video' | 'image' | 'carousel' | 'reel' | 'short';
    scheduledPublishTime?: Date;
  };
  targetAudience?: {
    demographics?: Record<string, number>;
    interests?: string[];
  };
}

/**
 * Engagement prediction result
 */
export interface EngagementPrediction {
  predictedMetrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    engagementRate: number;
    confidence: number; // 0-1 scale
  };
  viralProbability: {
    score: number; // 0-1 scale
    threshold: number;
    isLikelyViral: boolean;
    confidence: number;
  };
  recommendations: StrategyRecommendation[];
  modelMetadata: {
    modelVersion: string;
    predictionTimestamp: Date;
    featureImportance: Record<string, number>;
  };
}

/**
 * Strategy recommendation for optimization
 */
export interface StrategyRecommendation {
  type: 'timing' | 'hashtags' | 'content' | 'audience';
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    percentageIncrease: number;
    confidence: number;
  };
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Model training configuration
 */
export interface ModelConfig {
  engagementModel: {
    algorithm: 'lightgbm' | 'xgboost' | 'random_forest';
    hyperparameters: Record<string, any>;
    features: string[];
  };
  viralModel: {
    algorithm: 'lightgbm' | 'xgboost' | 'neural_network';
    hyperparameters: Record<string, any>;
    features: string[];
    threshold: number;
  };
  featureEngineering: {
    textEmbeddingModel: string;
    visualEmbeddingModel?: string;
    scalingMethod: 'standard' | 'minmax' | 'robust';
  };
}

/**
 * Model evaluation metrics
 */
export interface ModelEvaluation {
  engagementModel: {
    mae: number;
    rmse: number;
    r2Score: number;
    mape: number; // Mean Absolute Percentage Error
  };
  viralModel: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
    prAuc: number;
  };
  crossValidationScores: number[];
  featureImportance: Record<string, number>;
  evaluationDate: Date;
} 