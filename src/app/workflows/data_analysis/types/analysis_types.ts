import { Database } from '../../../../types/supabase';
import { z } from 'zod';

// Alias for Supabase video table row (Kept from original)
// Using unknown since videos table structure is not defined in database types
export type Video = {
  id: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  isShort?: boolean;
  channelTitle?: string;
  tags?: string[];
  [key: string]: any;
};

// --- Base Schemas for common parameters ---
// Using z.string().datetime() for TimeRange as per original file's pattern
export const TimeRangeSchema = z.object({
  start: z.string().datetime({ message: 'Invalid ISO date string for start' }),
  end: z.string().datetime({ message: 'Invalid ISO date string for end' }),
}).refine(data => new Date(data.start) <= new Date(data.end), {
  message: 'Start date must be before or equal to end date',
  path: ['start'],
});
export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const PlatformSchema = z.enum(['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn']); // New, more specific
export type Platform = z.infer<typeof PlatformSchema>;

export const BaseAnalysisRequestSchema = z.object({
  userId: z.string().uuid(),
  platform: PlatformSchema,
  timeRange: TimeRangeSchema,
  correlationId: z.string().optional(), // For tracing requests
});
export type BaseAnalysisRequest = z.infer<typeof BaseAnalysisRequestSchema>;

// Generic structure for analysis results (New)
export interface AnalysisResult<TData> {
  success: boolean;
  data?: TData; // Data is optional if success is false
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  metadata: {
    generatedAt: Date;
    source: string; // e.g., 'HistoricalPerformanceEngine'
    cacheStatus?: 'hit' | 'miss';
    warnings?: string[];
    correlationId?: string; // For tracing requests
    processingTime?: number; // Added processingTime
  };
}

// --- Report Workflow Specific Types (New) ---
export const ReportMetricsSchema = z.object({
  views: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
  engagementRate: z.number().nonnegative().optional(),
  // E-commerce specific
  roi: z.number().optional(), // Can be float
  conversionRate: z.number().nonnegative().optional(),
});
export type ReportMetrics = z.infer<typeof ReportMetricsSchema>;

// E-commerce Data Types for Historical Performance Analysis
export const ECommerceDataSchema = z.object({
  // Sales Metrics
  totalRevenue: z.number().nonnegative().optional(),
  conversionRate: z.number().min(0).max(1).optional(), // 0-1 representing percentage
  averageOrderValue: z.number().nonnegative().optional(),
  totalOrders: z.number().int().nonnegative().optional(),
  productViews: z.number().int().nonnegative().optional(),
  cartAdditions: z.number().int().nonnegative().optional(),
  
  // Attribution & Traffic
  trafficFromSocial: z.number().int().nonnegative().optional(),
  attributedRevenue: z.number().nonnegative().optional(), // Revenue attributed to social media
  customerAcquisitionCost: z.number().nonnegative().optional(),
  returnOnAdSpend: z.number().optional(), // Can be negative
  
  // Customer Behavior
  repeatCustomerRate: z.number().min(0).max(1).optional(),
  avgSessionDuration: z.number().nonnegative().optional(), // in seconds
  bounceRate: z.number().min(0).max(1).optional(),
  
  // Product Performance
  topSellingProducts: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    revenue: z.number().nonnegative(),
    units: z.number().int().nonnegative(),
  })).optional(),
  
  // Campaign Data
  campaignData: z.object({
    impressions: z.number().int().nonnegative().optional(),
    clicks: z.number().int().nonnegative().optional(),
    spend: z.number().nonnegative().optional(),
    ctr: z.number().min(0).max(1).optional(), // Click-through rate
  }).optional(),
  
  // Time Period
  timeRange: TimeRangeSchema.optional(),
  
  // Metadata
  currency: z.string().default('USD'),
  dataSource: z.string().optional(), // e.g., 'shopify', 'woocommerce', 'stripe'
});

export type ECommerceData = z.infer<typeof ECommerceDataSchema>;

// Training data collection specific types
export const PostMetricsDataSchema = z.object({
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative().optional(),
  engagementRate: z.number().nonnegative(),
});

export const PostMetricsSchema = z.object({
  id: z.string(),
  platform: PlatformSchema,
  url: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  publishedAt: z.string().datetime(),
  metrics: PostMetricsDataSchema,
  metadata: z.record(z.any()).optional(),
});

export type PostMetrics = z.infer<typeof PostMetricsSchema>;

export const PostPerformanceSchema = z.object({
  postId: z.string(),
  publishedAt: z.string().datetime(), // Changed to string().datetime()
  metrics: ReportMetricsSchema,
  contentPreview: z.string().optional(),
});
export type PostPerformance = z.infer<typeof PostPerformanceSchema>;

export const ViewGrowthSchema = z.object({
  period: z.string(), // e.g., 'daily', 'weekly'
  currentViews: z.number().int().nonnegative(),
  previousViews: z.number().int().nonnegative(),
  growthPercentage: z.number(), // Can be float
});
export type ViewGrowth = z.infer<typeof ViewGrowthSchema>;

export interface ReportsAnalysisData { // New interface
  historicalViewGrowth: ViewGrowth[];
  pastPostsPerformance: PostPerformance[];
  ecommerceMetrics?: ReportMetrics;
}

// --- Autoposting Workflow Specific Types (New) ---
export const AudienceReachSchema = z.object({
  timeSlot: z.string(), // e.g., "09:00-10:00"
  estimatedReach: z.number().int().nonnegative(),
  confidenceScore: z.number().min(0).max(1).optional(),
});
export type AudienceReach = z.infer<typeof AudienceReachSchema>;

export interface AutopostingAnalysisData { // New interface
  optimalPostingTimes: AudienceReach[];
  nicheAudienceInsights: Record<string, any>; // Placeholder
}

// --- Video Optimization Workflow Specific Types (New) ---
export const TrendingHashtagSchema = z.object({
  tag: z.string(),
  rank: z.number().int().positive().optional(),
  estimatedReach: z.number().int().nonnegative().optional(),
});
export type TrendingHashtag = z.infer<typeof TrendingHashtagSchema>;

export const AudioViralitySchema = z.object({
  audioId: z.string(),
  title: z.string().optional(),
  viralityScore: z.number().min(0).max(1),
  suitabilityScore: z.number().min(0).max(1),
  trendingRank: z.number().int().positive().optional(),
});
export type AudioVirality = z.infer<typeof AudioViralitySchema>;

// --- AI Improvement Workflow Specific Types (New) ---
export const AIContentInsightSchema = z.object({
  postId: z.string(),
  contentType: z.string(),
  keyThemes: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  engagementDrivers: z.array(z.string()),
});
export type AIContentInsight = z.infer<typeof AIContentInsightSchema>;

export interface AIImprovementAnalysisData { // New interface
  topPerformingContentInsights: AIContentInsight[];
  workflowImprovementSuggestions: Record<string, string[]>;
}

// --- Existing Types from original analysis_types.ts (Integrated and reviewed) ---

// Competitor Analysis Types (Kept and integrated)
export interface ContentAnalysis {
  commonTopics: string[];
  popularHashtags: string[];
  postingFrequency: number; // posts per week or similar metric
  bestPerformingFormats: string[]; // e.g., short-form, long-form, specific content types
  sentimentDistribution: Record<string, number>; // e.g., { positive: 0.6, neutral: 0.3, negative: 0.1 }
}

export interface EngagementMetrics { // This is generic, could be used by ReportMetricsSchema too
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  averageViews: number;
  averageEngagementRate: number; // (likes + comments + shares) / views or followers
  followerGrowthRate?: number; // if available
}

// Zod schema for the subset of Video fields used in HistoricalAnalysisService (Kept)
export const HistoricalVideoSchema = z.object({
  id: z.string().uuid(),
  published_at: z.string().datetime(),
  like_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  comment_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  view_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  share_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  tags: z.array(z.string()).nullable().transform(val => val ?? []),
});
export type HistoricalVideo = z.infer<typeof HistoricalVideoSchema>;

// TopPerformingContent (Kept, but uses HistoricalVideo now for broader use)
export interface TopPerformingContent {
  videos: HistoricalVideo[]; // Changed from original Video[] to HistoricalVideo[]
  keySuccessFactors: string[];
}

export interface Recommendation { // Kept
  type: 'content' | 'strategy' | 'engagement' | 'optimization' | 'timing'; // Added more types
  description: string;
  actionableSteps?: string[];
  priority: 'high' | 'medium' | 'low';
}

// Competitor Analysis Service Schemas (Kept)
export const CompetitorIdSchema = z.string().uuid({ message: 'Invalid Competitor ID format' });
export const NicheSchema = z.string().min(1, { message: 'Niche cannot be empty' });

export const CompetitorApiDataSchema = z.object({ // Kept
  username: z.string(),
  platform: PlatformSchema, // Using the new, more specific PlatformSchema
});

export const CompetitorVideoSchema = z.object({ // Kept
  id: z.string().uuid(),
  published_at: z.string().datetime(),
  caption: z.string().nullable().transform(val => val ?? ''),
  tags: z.array(z.string()).nullable().transform(val => val ?? []),
  like_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  comment_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  share_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  view_count: z.number().int().nonnegative().nullable().transform(val => val ?? 0),
  duration: z.number().int().positive().nullable().optional(), // Duration in seconds
});
export type CompetitorVideo = z.infer<typeof CompetitorVideoSchema>;

// Specific TopPerformingContent for CompetitorAnalysis context (Kept)

// --- Feature Enhancement: Sentiment Analysis Types ---
export const SentimentLabelSchema = z.enum(['positive', 'negative', 'neutral', 'mixed', 'objective']);
export type SentimentLabel = z.infer<typeof SentimentLabelSchema>;

export const SentimentScoreSchema = z.object({
  positive: z.number().min(0).max(1),
  negative: z.number().min(0).max(1),
  neutral: z.number().min(0).max(1),
  mixed: z.number().min(0).max(1).optional(),
  objective: z.number().min(0).max(1).optional(), // For factual, non-opinionated text
});
export type SentimentScore = z.infer<typeof SentimentScoreSchema>;

export const AnalyzedTextSegmentSchema = z.object({
  text: z.string(),
  offset: z.number().int().nonnegative(), // Character offset in the original text
  length: z.number().int().positive(),   // Length of the segment
  sentiment: SentimentLabelSchema,
  scores: SentimentScoreSchema,
  keyPhrases: z.array(z.string()).optional(), // Key phrases contributing to sentiment
});
export type AnalyzedTextSegment = z.infer<typeof AnalyzedTextSegmentSchema>;

export interface SentimentAnalysisResult {
  overallSentiment: SentimentLabel;
  overallScores: SentimentScore;
  segments?: AnalyzedTextSegment[]; // Optional detailed breakdown
  dominantEmotion?: string; // e.g., joy, anger, sadness (if model supports it)
}

// --- Audience and Platform Analytics Types (New or Enhanced) ---
export const AudienceDemographicsSchema = z.object({
  ageGroups: z.record(z.string(), z.number().min(0).max(1)).optional(), // e.g., {"18-24": 0.4, "25-34": 0.3}
  genderDistribution: z.record(z.string(), z.number().min(0).max(1)).optional(), // e.g., {"male": 0.5, "female": 0.45, "other": 0.05}
  topCountries: z.record(z.string(), z.number().min(0).max(1)).optional(), // e.g., {"US": 0.6, "CA": 0.2}
  topCities: z.record(z.string(), z.number().min(0).max(1)).optional(), // e.g., {"New York": 0.1, "Los Angeles": 0.08}
});
export type AudienceDemographics = z.infer<typeof AudienceDemographicsSchema>;

export const PeakEngagementTimeSchema = z.object({
  dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  hourOfDay: z.number().int().min(0).max(23), // 0-23
  engagementScore: z.number().min(0), // Could be views, likes, or a combined score
});
export type PeakEngagementTime = z.infer<typeof PeakEngagementTimeSchema>;

export const ContentFormatPerformanceSchema = z.object({
  formatName: z.string(), // e.g., "Shorts", "Reels", "Carousel", "Long-form Video"
  averageViews: z.number().int().nonnegative().optional(),
  averageLikes: z.number().int().nonnegative().optional(),
  averageComments: z.number().int().nonnegative().optional(),
  averageShares: z.number().int().nonnegative().optional(),
  averageEngagementRate: z.number().nonnegative().optional(),
  totalPosts: z.number().int().nonnegative().optional(),
});
export type ContentFormatPerformance = z.infer<typeof ContentFormatPerformanceSchema>;

export const DetailedPlatformMetricsSchema = z.object({
  audienceDemographics: AudienceDemographicsSchema.optional(),
  peakEngagementTimes: z.array(PeakEngagementTimeSchema).optional(), // Array of peak times
  contentFormatPerformance: z.array(ContentFormatPerformanceSchema).optional(), // Performance per format
  // geoDistribution is covered by topCountries/topCities in AudienceDemographicsSchema
  // We can add more specific fields as needed, e.g.,
  // topPerformingContentTopics: z.array(z.string()).optional(),
  // audienceInterests: z.array(z.string()).optional(),
});
export type DetailedPlatformMetrics = z.infer<typeof DetailedPlatformMetricsSchema>;

// Conceptual update to VideoOptimizationAnalysisData to include these new insights.
// Actual integration will require careful refactoring of VideoOptimizationAnalysisData in a subsequent step.
// Example: (do not uncomment here, this is for planning)
export interface VideoOptimizationAnalysisData {
  topPerformingVideoCaptions: string[];
  trendingHashtags: TrendingHashtag[];
  audioViralityAnalysis: AudioVirality[];
  realTimeSentiment?: SentimentAnalysisResult; // NEW: Integrated for sentiment insights
  detailedPlatformAnalytics?: DetailedPlatformMetrics; // NEW: Integrated for richer analytics
  optimizedVideoContent?: OptimizedVideoContent; // New nested property
}

export interface CompetitorContextTopPerformingContent {
  videos: CompetitorVideo[];
  keySuccessFactors: string[];
}

export interface CompetitorAnalysis { // Kept
  competitorId: string;
  competitorName: string;
  niche: string;
  contentAnalysis: ContentAnalysis;
  engagementMetrics: EngagementMetrics;
  topPerformingContent: CompetitorContextTopPerformingContent;
  recommendations: Recommendation[];
  lastAnalyzed: string; // ISO date string
}

// Historical Analysis Types (Kept and integrated)
export interface EngagementTrendPoint {
  timestamp: string; // ISO date string
  value: number;
}

export interface EngagementTrends {
  likesTrend: EngagementTrendPoint[];
  commentsTrend: EngagementTrendPoint[];
  viewsTrend: EngagementTrendPoint[];
  engagementRateTrend: EngagementTrendPoint[];
}

export interface ContentPerformance { // Kept
  topPerformingVideos: HistoricalVideo[];
  bottomPerformingVideos: HistoricalVideo[];
  contentTypePerformance: Record<string, EngagementMetrics>; // e.g., performance by video length, topic
}

export interface AudienceGrowth { // Kept
  followerCountTrend?: EngagementTrendPoint[]; // if available
  // other audience metrics
}

export interface Benchmark { // Kept
  metricName: string;
  currentValue: number;
  averageValue: number;
  percentile?: number; // e.g., 75th percentile
}

export interface PerformanceTrends { // Kept
  userId: string;
  timeRange: TimeRange;
  overallSummary: string;
  engagementTrends: EngagementTrends;
  contentPerformance: ContentPerformance;
  audienceGrowth?: AudienceGrowth;
  benchmarks: Benchmark[];
  keyInsights: string[];
  actionableRecommendations: Recommendation[];
}

export interface AudioHandling {
  audioDetected: boolean;
  musicSuggestions?: string[];
  voiceoverSuggestions?: boolean;
}

export interface MultiAudioHandling {
  tracksProcessed: number;
  primaryTrackSelected: string;
  alternativeTracksOptimized: boolean;
}

export interface AspectRatioHandling {
  originalRatio: string;
  recommendedRatio: string;
  cropSuggestions: boolean;
}

export interface ShortVideoHandling {
  durationWarning: boolean;
  optimizationLimited: boolean;
  suggestions: string[];
}

export interface ErrorHandling {
  corruptionDetected: boolean;
  recoveryAttempted: boolean;
  recoverySuccess: boolean;
}

export interface MemoryStats {
  peakUsage: number;
  averageUsage: number;
  optimizationEffective: boolean;
}

export interface BatchResult {
  videoId: string;
  score: number;
  status: 'completed' | 'failed' | 'pending';
}

export interface VideoRecommendation {
  score: number;
  recommendations: string[];
}

export interface OptimizedVideoContent {
  optimizedCaption?: string;
  optimizedHashtags?: TrendingHashtag[];
  videoRecommendation?: VideoRecommendation;
  thumbnails?: Array<{ timestamp: number; url: string; score: number }>;
  audioHandling?: AudioHandling;
  multiAudioHandling?: MultiAudioHandling;
  aspectRatioHandling?: AspectRatioHandling;
  shortVideoHandling?: ShortVideoHandling;
  errorHandling?: ErrorHandling;
  memoryStats?: MemoryStats;
  batchResults?: BatchResult[];
}
