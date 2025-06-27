import { z } from 'zod';
import { Platform, TimeRange, AnalysisResult } from '../data_analysis/types/analysis_types';

// Enhanced Content Recommendations Types
export const CaptionVariationSchema = z.object({
  id: z.string(),
  text: z.string(),
  style: z.enum(['casual', 'professional', 'humorous', 'authoritative', 'friendly', 'emotional']),
  tone: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  length: z.number().int().positive(),
  callToAction: z.boolean(),
  targetAudience: z.string().optional(),
  estimatedEngagement: z.number().min(0).max(1).optional(),
});
export type CaptionVariation = z.infer<typeof CaptionVariationSchema>;

export const HashtagStrategySchema = z.object({
  id: z.string(),
  name: z.string(),
  hashtags: z.array(z.string()),
  strategy: z.enum(['trending', 'niche-specific', 'engagement-focused', 'brand-building', 'viral-potential']),
  estimatedReach: z.number().int().nonnegative().optional(),
  competitionLevel: z.enum(['low', 'medium', 'high']).optional(),
  platform: z.string(),
  reasoning: z.string().optional(),
});
export type HashtagStrategy = z.infer<typeof HashtagStrategySchema>;

export const VisualContentSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(['color-palette', 'layout', 'text-overlay', 'visual-element', 'thumbnail', 'background']),
  suggestion: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  platform: z.string(),
  reasoning: z.string().optional(),
  examples: z.array(z.string()).optional(),
});
export type VisualContentSuggestion = z.infer<typeof VisualContentSuggestionSchema>;

export const ContentRecommendationsSchema = z.object({
  captionVariations: z.array(CaptionVariationSchema),
  hashtagStrategies: z.array(HashtagStrategySchema),
  visualContentSuggestions: z.array(VisualContentSuggestionSchema),
  overallScore: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type ContentRecommendations = z.infer<typeof ContentRecommendationsSchema>;

// Posting Time Optimization Types
export const OptimalPostingTimeSchema = z.object({
  timeSlot: z.string(), // e.g., "09:00-10:00"
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  timezone: z.string(), // e.g., "UTC", "EST", "PST"
  estimatedEngagement: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  audienceSize: z.number().int().nonnegative().optional(),
  platform: z.string(),
  reasoning: z.string().optional(),
});
export type OptimalPostingTime = z.infer<typeof OptimalPostingTimeSchema>;

export const EngagementPatternSchema = z.object({
  pattern: z.string(),
  description: z.string(),
  strength: z.number().min(0).max(1),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'seasonal']),
  platforms: z.array(z.string()),
  demographics: z.record(z.any()).optional(),
});
export type EngagementPattern = z.infer<typeof EngagementPatternSchema>;

export const TimeZoneRecommendationSchema = z.object({
  timezone: z.string(),
  audiencePercentage: z.number().min(0).max(1),
  optimalTimes: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
  reasoning: z.string().optional(),
});
export type TimeZoneRecommendation = z.infer<typeof TimeZoneRecommendationSchema>;

export const PostingTimeOptimizationSchema = z.object({
  optimalTimes: z.array(OptimalPostingTimeSchema),
  audienceEngagementPatterns: z.array(EngagementPatternSchema),
  timeZoneConsiderations: z.array(TimeZoneRecommendationSchema),
  overallScore: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type PostingTimeOptimization = z.infer<typeof PostingTimeOptimizationSchema>;

// A/B Testing Parameters Types
export const ExperimentDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['content-variation', 'posting-time', 'hashtag-strategy', 'visual-elements', 'caption-style']),
  hypothesis: z.string(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.any()),
  })),
  targetMetric: z.string(),
  minimumSampleSize: z.number().int().positive(),
  estimatedDuration: z.number().int().positive(), // in days
  statisticalPower: z.number().min(0).max(1),
  significanceLevel: z.number().min(0).max(1),
  platform: z.string(),
  reasoning: z.string().optional(),
});
export type ExperimentDesign = z.infer<typeof ExperimentDesignSchema>;

export const ABTestingParametersSchema = z.object({
  experiments: z.array(ExperimentDesignSchema),
  testDuration: z.number().int().positive(),
  successMetrics: z.array(z.string()),
  statisticalSignificance: z.number().min(0).max(1),
  recommendedSequence: z.array(z.string()).optional(),
  overallScore: z.number().min(0).max(1).optional(),
});
export type ABTestingParameters = z.infer<typeof ABTestingParametersSchema>;

// Enhanced Task Types
export interface EnhancedContentOptimizationTask {
  id: string;
  type: 'generate_content_recommendations' | 'optimize_posting_times' | 'design_ab_tests' | 'optimize_content' | 'update_optimization_models' | 'generate_variations';
  platform: Platform;
  niche?: string;
  userId: string;
  correlationId?: string;
  
  // Content recommendation specific
  baseContent?: {
    caption?: string;
    hashtags?: string[];
    visualElements?: string[];
  };
  nicheSpecific?: boolean;
  includeVisualSuggestions?: boolean;
  targetAudience?: string;
  contentStyle?: string[];
  
  // Posting time optimization specific
  timeRange?: TimeRange;
  timeZoneTargeting?: string[];
  audienceData?: any;
  
  // A/B testing specific
  experimentObjectives?: string[];
  testTypes?: string[];
  minimumConfidence?: number;
  maxTestDuration?: number;
  
  // General task properties
  priority?: 'high' | 'medium' | 'low';
  parameters?: Record<string, any>;
  deadline?: string;
}

// Service Response Types
export interface ContentOptimizationResponse {
  contentRecommendations?: ContentRecommendations;
  postingTimeOptimization?: PostingTimeOptimization;
  abTestingParameters?: ABTestingParameters;
  metadata: {
    generatedAt: Date;
    source: string;
    correlationId?: string;
    processingTime?: number;
    cacheStatus?: 'hit' | 'miss';
  };
}

// Analysis Request Types
export interface ContentOptimizationRequest {
  userId: string;
  platform: Platform;
  niche?: string;
  timeRange?: TimeRange;
  correlationId?: string;
  
  // What to analyze/generate
  includeContentRecommendations?: boolean;
  includePostingTimeOptimization?: boolean;
  includeABTestingParameters?: boolean;
  
  // Content context
  existingContent?: {
    captions?: string[];
    hashtags?: string[];
    performanceData?: any;
  };
  
  // Audience context
  audienceData?: {
    demographics?: any;
    engagementPatterns?: any;
    timeZones?: string[];
  };
  
  // Optimization preferences
  optimizationGoals?: string[];
  constraints?: {
    maxCaptionLength?: number;
    maxHashtags?: number;
    excludedHashtags?: string[];
    brandGuidelines?: any;
  };
}

// Performance Tracking Types
export interface OptimizationPerformanceMetrics {
  taskId: string;
  taskType: string;
  executionTime: number;
  success: boolean;
  qualityScore?: number;
  userSatisfaction?: number;
  engagementImprovement?: number;
  timestamp: Date;
  errors?: string[];
}

// Cache Types
export interface OptimizationCacheEntry {
  key: string;
  data: ContentOptimizationResponse;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

// Error Types
export interface ContentOptimizationError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  correlationId?: string;
  recoverable: boolean;
} 