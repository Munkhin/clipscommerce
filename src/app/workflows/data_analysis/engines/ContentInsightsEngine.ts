import { BaseAnalysisRequest, VideoOptimizationAnalysisData, AnalysisResult, DetailedPlatformMetrics } from '../types/analysis_types';
import { ContentInsightsService } from '@/services/contentInsightsService';
import { createClient } from '@/../supabase';

export class ContentInsightsEngine {
  private contentInsightsService: ContentInsightsService;
  private supabase;

  constructor() {
    this.contentInsightsService = new ContentInsightsService();
    this.supabase = createClient();
  }

  async getTopPerformingContentInsights(
    request: BaseAnalysisRequest
  ): Promise<AnalysisResult<Pick<VideoOptimizationAnalysisData, 'topPerformingVideoCaptions' | 'trendingHashtags'>>> {
    const startTime = Date.now();
    console.log(`ContentInsightsEngine: Analyzing content for userId: ${request.userId}`);

    try {
      // Get user's niche for better hashtag recommendations
      const userNiche = await this.getUserNiche(request.userId);

      // Analyze user's content for top-performing captions and hashtag insights
      const userContentAnalysis = await this.contentInsightsService.analyzeUserContent(
        request.userId,
        request.platform,
        request.timeRange,
        50 // Analyze top 50 pieces of content
      );

      // Get trending hashtags relevant to the user's niche
      const trendingHashtags = await this.contentInsightsService.getTrendingHashtags(
        request.platform,
        userNiche,
        20
      );

      // Combine user's best performing hashtags with trending ones
      const combinedHashtags = this.combineHashtagRecommendations(
        userContentAnalysis.hashtagPerformance,
        trendingHashtags
      );

      // Store insights for future reference
      await this.storeContentInsights(request.userId, request.platform, {
        captions: userContentAnalysis.topCaptions,
        hashtags: combinedHashtags,
        contentPatterns: userContentAnalysis.contentPatterns
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          topPerformingVideoCaptions: userContentAnalysis.topCaptions,
          trendingHashtags: combinedHashtags
        },
        metadata: {
          generatedAt: new Date(),
          source: 'ContentInsightsEngine',
          correlationId: request.correlationId,
          processingTime,
          cacheStatus: 'miss',
          warnings: userContentAnalysis.topCaptions.length === 0 ? ['No content data available for analysis'] : undefined
        },
      };

    } catch (error) {
      console.error('ContentInsightsEngine analysis failed:', error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          message: 'Content insights analysis failed',
          code: 'CONTENT_INSIGHTS_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata: {
          generatedAt: new Date(),
          source: 'ContentInsightsEngine',
          correlationId: request.correlationId,
          processingTime,
          warnings: ['Analysis failed - check data availability and platform connectivity']
        },
      };
    }
  }

  async getDetailedPlatformAnalytics(
    request: BaseAnalysisRequest
  ): Promise<AnalysisResult<DetailedPlatformMetrics>> {
    const startTime = Date.now();
    console.log(`ContentInsightsEngine: Fetching detailed platform analytics for userId: ${request.userId}, platform: ${request.platform}`);

    try {
      // Check for cached analytics first
      const cachedAnalytics = await this.getCachedPlatformAnalytics(
        request.userId,
        request.platform,
        60 // 1 hour cache
      );

      if (cachedAnalytics) {
        return {
          success: true,
          data: cachedAnalytics,
          metadata: {
            generatedAt: new Date(),
            source: 'ContentInsightsEngine.getDetailedPlatformAnalytics',
            correlationId: request.correlationId,
            processingTime: Date.now() - startTime,
            cacheStatus: 'hit',
            warnings: ['Using cached analytics data']
          }
        };
      }

      // Fetch fresh detailed analytics
      const platformAnalytics = await this.contentInsightsService.getDetailedPlatformAnalytics(
        request.userId,
        request.platform,
        request.timeRange
      );

      // Store analytics for caching
      await this.storePlatformAnalytics(request.userId, request.platform, platformAnalytics);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: platformAnalytics,
        metadata: {
          generatedAt: new Date(),
          source: 'ContentInsightsEngine.getDetailedPlatformAnalytics',
          correlationId: request.correlationId,
          processingTime,
          cacheStatus: 'miss'
        },
      };

    } catch (error) {
      console.error('Platform analytics analysis failed:', error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          message: 'Platform analytics analysis failed',
          code: 'PLATFORM_ANALYTICS_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata: {
          generatedAt: new Date(),
          source: 'ContentInsightsEngine.getDetailedPlatformAnalytics',
          correlationId: request.correlationId,
          processingTime,
          warnings: ['Analytics failed - check platform API connectivity']
        },
      };
    }
  }

  async getContentRecommendations(
    userId: string,
    platform: string,
    _contentType?: string,
    limit: number = 10
  ): Promise<AnalysisResult<{ captions: string[]; hashtags: any[]; patterns: any[] }>> {
    try {
      const baseRequest: BaseAnalysisRequest = {
        userId,
        platform: platform as any,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          end: new Date().toISOString()
        }
      };

      const insights = await this.getTopPerformingContentInsights(baseRequest);
      
      if (insights.success && insights.data) {
        // Filter and enhance recommendations based on content type
        const recommendations = {
          captions: insights.data.topPerformingVideoCaptions.slice(0, limit),
          hashtags: insights.data.trendingHashtags
            .filter(tag => tag.estimatedReach && tag.estimatedReach > 10000)
            .slice(0, limit),
          patterns: [] // Content patterns from analysis
        };

        return {
          success: true,
          data: recommendations,
          metadata: {
            generatedAt: new Date(),
            source: 'ContentInsightsEngine'
          }
        };
      }

      return insights as any;

    } catch (error) {
      return {
        success: false,
        error: {
          message: 'Failed to get content recommendations',
          code: 'CONTENT_RECOMMENDATIONS_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata: {
          generatedAt: new Date(),
          source: 'ContentInsightsEngine'
        }
      };
    }
  }

  private async getUserNiche(userId: string): Promise<string | undefined> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .select('niche, industry, content_category')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn('Could not fetch user niche:', error);
        return undefined;
      }

      return profile?.niche || profile?.industry || profile?.content_category;
    } catch (error) {
      console.warn('Error fetching user niche:', error);
      return undefined;
    }
  }

  private combineHashtagRecommendations(
    userHashtags: any[],
    trendingHashtags: any[]
  ): any[] {
    // Create a map to avoid duplicates and merge performance data
    const hashtagMap = new Map();

    // Add user's best performing hashtags
    userHashtags.slice(0, 10).forEach((hashtag, index) => {
      hashtagMap.set(hashtag.hashtag, {
        tag: hashtag.hashtag,
        rank: index + 1,
        estimatedReach: hashtag.estimatedReach,
        userPerformance: hashtag.averageEngagement,
        source: 'user_content'
      });
    });

    // Add trending hashtags (if not already present)
    trendingHashtags.forEach((hashtag, _index) => {
      if (!hashtagMap.has(hashtag.tag)) {
        hashtagMap.set(hashtag.tag, {
          tag: hashtag.tag,
          rank: hashtagMap.size + 1,
          estimatedReach: hashtag.estimatedReach,
          source: 'trending'
        });
      } else {
        // Update existing with trending data
        const existing = hashtagMap.get(hashtag.tag);
        existing.estimatedReach = Math.max(existing.estimatedReach, hashtag.estimatedReach);
        existing.trendingRank = hashtag.rank;
      }
    });

    // Convert back to array and sort by combined performance
    return Array.from(hashtagMap.values())
      .sort((a, b) => {
        // Prioritize hashtags with both user performance and trending status
        const scoreA = (a.userPerformance || 0) * 100 + (a.estimatedReach / 10000);
        const scoreB = (b.userPerformance || 0) * 100 + (b.estimatedReach / 10000);
        return scoreB - scoreA;
      })
      .slice(0, 15);
  }

  private async storeContentInsights(
    userId: string,
    platform: string,
    insights: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('content_insights_analyses')
        .insert({
          user_id: userId,
          platform,
          insights_data: insights,
          analyzed_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store content insights:', error);
    }
  }

  private async storePlatformAnalytics(
    userId: string,
    platform: string,
    analytics: DetailedPlatformMetrics
  ): Promise<void> {
    try {
      await this.supabase
        .from('platform_analytics_cache')
        .insert({
          user_id: userId,
          platform,
          analytics_data: analytics,
          cached_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store platform analytics:', error);
    }
  }

  private async getCachedPlatformAnalytics(
    userId: string,
    platform: string,
    maxAgeMinutes: number
  ): Promise<DetailedPlatformMetrics | null> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('platform_analytics_cache')
        .select('analytics_data')
        .eq('user_id', userId)
        .eq('platform', platform)
        .gte('cached_at', cutoffTime)
        .order('cached_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data.analytics_data;
    } catch (error) {
      console.warn('Error retrieving cached analytics:', error);
      return null;
    }
  }
}
