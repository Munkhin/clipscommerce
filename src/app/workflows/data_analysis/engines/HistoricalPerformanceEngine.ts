import { SupabaseClient } from '@supabase/supabase-js';
import {
  BaseAnalysisRequest,
  ReportsAnalysisData,
  TimeRange,
  Platform,
  AnalysisResult,
  TimeRangeSchema,
  HistoricalVideoSchema,
  HistoricalVideo,
  EngagementTrends,
  ContentPerformance,
  Benchmark,
  Recommendation,
  EngagementTrendPoint,
  EngagementMetrics,
  ViewGrowth,
  PostPerformance,
  ReportMetrics
} from '../types';

export class HistoricalPerformanceEngine {
  constructor(private supabase: SupabaseClient) {}

  async getHistoricalData(
    request: BaseAnalysisRequest,
    eCommerceData?: any // TODO: Define a proper type for this
  ): Promise<AnalysisResult<ReportsAnalysisData>> {
    const timeRangeValidation = TimeRangeSchema.safeParse(request.timeRange);
    if (!timeRangeValidation.success) {
      console.error(`[HistoricalPerformanceEngine] Invalid timeRange for user ${request.userId}:`, timeRangeValidation.error.flatten());
      // Consider throwing an error or returning a structured error response
      return {
        success: false,
        error: { message: 'Invalid time range provided.', details: timeRangeValidation.error.flatten() },
        metadata: {
          generatedAt: new Date(),
          source: 'HistoricalPerformanceEngine',
          correlationId: request.correlationId,
        },
      };
    }
    const validatedTimeRange = timeRangeValidation.data;

    const { data: videos, error: videosError } = await this.supabase
      .from('videos') // Assuming 'videos' is the correct table name
      .select('id, published_at, like_count, comment_count, view_count, share_count, tags')
      .eq('user_id', request.userId)
      // .eq('platform', request.platform) // TODO: Add platform filter if your 'videos' table has a platform column
      .gte('published_at', validatedTimeRange.start)
      .lte('published_at', validatedTimeRange.end)
      .order('published_at', { ascending: true });

    if (videosError) {
      console.error(`[HistoricalPerformanceEngine] Error fetching historical videos for user ${request.userId}:`, videosError);
      return {
        success: false,
        error: { message: videosError.message || JSON.stringify(videosError) || `An unknown error occurred while fetching videos for platform ${request.platform}`, details: videosError },
        metadata: {
          generatedAt: new Date(),
          source: 'HistoricalPerformanceEngine',
          correlationId: request.correlationId,
        },
      };
    }

    if (!videos || videos.length === 0) {
      console.log(`[HistoricalPerformanceEngine] No historical videos found for user ${request.userId} in the given time range.`);
      const emptyData: ReportsAnalysisData = {
        historicalViewGrowth: [],
        pastPostsPerformance: [],
        ecommerceMetrics: eCommerceData ? { roi: 0, conversionRate: 0 } : undefined,
      };
      return {
        success: true,
        data: emptyData,
        metadata: {
          generatedAt: new Date(),
          source: 'HistoricalPerformanceEngine',
          warnings: ['No video data found for this period.'],
          correlationId: request.correlationId,
        },
      };
    }

    const videoDataValidation = HistoricalVideoSchema.array().safeParse(videos);
    if (!videoDataValidation.success) {
      console.error(`[HistoricalPerformanceEngine] Invalid video data structure from Supabase for user ${request.userId}:`, videoDataValidation.error.flatten());
      return {
        success: false,
        error: { message: 'Invalid video data structure from database', details: videoDataValidation.error.flatten() },
        metadata: {
          generatedAt: new Date(),
          source: 'HistoricalPerformanceEngine',
          correlationId: request.correlationId,
        },
      };
    }
    const validatedVideos: HistoricalVideo[] = videoDataValidation.data;

    // Perform calculations
    const engagementTrends = this.calculateEngagementTrends(validatedVideos);
    const contentPerformance = this.analyzeContentPerformance(validatedVideos);
    // const benchmarks = this.calculateBenchmarks(validatedVideos, engagementTrends); // Benchmarks might be too detailed for this specific output
    // const keyInsights = this.generateKeyInsights(engagementTrends, contentPerformance, benchmarks);
    // const actionableRecommendations = this.generateRecommendations(keyInsights, contentPerformance);

    // Adapt to ReportsAnalysisData structure
    const historicalViewGrowth = this.calculateViewGrowth(validatedVideos, validatedTimeRange); // Placeholder, needs more logic
    const pastPostsPerformance = this.formatPastPostPerformance(validatedVideos); // Adapt validatedVideos
    
    const reportData: ReportsAnalysisData = {
      historicalViewGrowth,
      pastPostsPerformance,
      ecommerceMetrics: this.calculateEcommerceMetrics(eCommerceData), // Process eCommerceData if provided
    };

    return {
      success: true,
      data: reportData,
      metadata: {
        generatedAt: new Date(),
        source: 'HistoricalPerformanceEngine',
        correlationId: request.correlationId, // Propagate correlationId
        // TODO: Add any relevant warnings from calculations if needed
      },
    };
  }

  private calculateEngagementTrends(videos: HistoricalVideo[]): EngagementTrends {
    const likesTrend: EngagementTrendPoint[] = [];
    const commentsTrend: EngagementTrendPoint[] = [];
    const viewsTrend: EngagementTrendPoint[] = [];
    const engagementRateTrend: EngagementTrendPoint[] = [];

    videos.forEach(video => {
      const timestamp = video.published_at;
      likesTrend.push({ timestamp, value: video.like_count || 0 });
      commentsTrend.push({ timestamp, value: video.comment_count || 0 });
      viewsTrend.push({ timestamp, value: video.view_count || 0 });
      
      const engagement = (video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0);
      const rate = (video.view_count || 1) > 0 ? engagement / (video.view_count || 1) : 0;
      engagementRateTrend.push({ timestamp, value: rate });
    });

    return {
      likesTrend,
      commentsTrend,
      viewsTrend,
      engagementRateTrend,
    };
  }

  private analyzeContentPerformance(videos: HistoricalVideo[]): ContentPerformance {
    if (videos.length === 0) return { topPerformingVideos: [], bottomPerformingVideos: [], contentTypePerformance: {} };

    const sortedByEngagementRate = [...videos].sort((a, b) => {
      const engagementA = (a.like_count || 0) + (a.comment_count || 0) + (a.share_count || 0);
      const engagementB = (b.like_count || 0) + (b.comment_count || 0) + (b.share_count || 0);
      const rateA = (a.view_count || 1) > 0 ? engagementA / (a.view_count || 1) : 0;
      const rateB = (b.view_count || 1) > 0 ? engagementB / (b.view_count || 1) : 0;
      return rateB - rateA; // Descending
    });

    const topVideos = sortedByEngagementRate.slice(0, Math.min(5, videos.length));
    const bottomVideos = sortedByEngagementRate.slice(-Math.min(5, videos.length)).reverse();

    const contentTypePerformance: Record<string, EngagementMetrics> = {}; 
    const overallMetrics = videos.reduce((acc, v) => {
        acc.totalLikes += v.like_count || 0;
        acc.totalComments += v.comment_count || 0;
        acc.totalShares += v.share_count || 0;
        acc.totalViews += v.view_count || 0;
        return acc;
    }, { totalLikes: 0, totalComments: 0, totalShares: 0, totalViews: 0, count: videos.length });

    if (overallMetrics.count > 0) {
        contentTypePerformance['overall'] = {
            averageLikes: overallMetrics.totalLikes / overallMetrics.count,
            averageComments: overallMetrics.totalComments / overallMetrics.count,
            averageShares: overallMetrics.totalShares / overallMetrics.count,
            averageViews: overallMetrics.totalViews / overallMetrics.count,
            averageEngagementRate: overallMetrics.totalViews > 0 ? (overallMetrics.totalLikes + overallMetrics.totalComments + overallMetrics.totalShares) / overallMetrics.totalViews : 0
        };
    }

    return {
      topPerformingVideos: topVideos,
      bottomPerformingVideos: bottomVideos,
      contentTypePerformance,
    };
  }
  
  // --- Methods to structure data for ReportsAnalysisData ---
  private calculateViewGrowth(videos: HistoricalVideo[], timeRange: TimeRange): ViewGrowth[] {
    // Simplified: Calculate overall view growth for the period.
    // A more detailed implementation would compare to a previous period or show daily/weekly trends.
    if (videos.length === 0) return [];

    const totalViewsInPeriod = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
    // Placeholder for previous period views - this needs a strategy (e.g., query for previous identical duration)
    const previousPeriodViews = totalViewsInPeriod * 0.8; // Assuming 20% growth for placeholder
    const growthPercentage = previousPeriodViews > 0 ? ((totalViewsInPeriod - previousPeriodViews) / previousPeriodViews) * 100 : (totalViewsInPeriod > 0 ? 100 : 0);

    return [
      {
        period: `Overall (${timeRange.start.substring(0,10)} to ${timeRange.end.substring(0,10)})`,
        currentViews: totalViewsInPeriod,
        previousViews: previousPeriodViews, // This is a placeholder
        growthPercentage: parseFloat(growthPercentage.toFixed(2)),
      },
    ];
  }

  private formatPastPostPerformance(videos: HistoricalVideo[]): PostPerformance[] {
    return videos.map(video => ({
      postId: video.id,
      publishedAt: video.published_at,
      metrics: {
        views: video.view_count || 0,
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        engagementRate: ((video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0)) / (video.view_count || 1),
      },
      contentPreview: video.tags?.join(', ') || 'N/A', // Example preview from tags
    }));
  }

  private calculateEcommerceMetrics(eCommerceData?: any): ReportMetrics | undefined {
    if (!eCommerceData) return undefined;
    // TODO: Implement actual e-commerce metrics calculation based on eCommerceData structure
    // For now, returning placeholder or data as-is if it matches ReportMetrics
    return {
      roi: eCommerceData.roi || Math.random() * 2, // Placeholder ROI
      conversionRate: eCommerceData.conversionRate || Math.random() * 0.1, // Placeholder conversion rate
      views: eCommerceData.views, // if available
      // ... other e-commerce related metrics
    } as ReportMetrics;
  }

  // The following methods from the original service might be useful for more detailed analysis or other engines
  // but are not directly used in the simplified getHistoricalData for ReportsAnalysisData structure.
  // They are kept here for reference or future use.

  private calculateBenchmarks(videos: HistoricalVideo[], trends: EngagementTrends): Benchmark[] {
    if (videos.length === 0) return [];
    const avgLikes = trends.likesTrend.length > 0 ? trends.likesTrend.reduce((sum, p) => sum + p.value, 0) / trends.likesTrend.length : 0;
    const avgComments = trends.commentsTrend.length > 0 ? trends.commentsTrend.reduce((sum, p) => sum + p.value, 0) / trends.commentsTrend.length : 0;
    const avgViews = trends.viewsTrend.length > 0 ? trends.viewsTrend.reduce((sum, p) => sum + p.value, 0) / trends.viewsTrend.length : 0;
    const avgEngRate = trends.engagementRateTrend.length > 0 ? trends.engagementRateTrend.reduce((sum, p) => sum + p.value, 0) / trends.engagementRateTrend.length : 0;

    const latestVideo = videos.length > 0 ? videos[videos.length - 1] : null;
    const currentEngRate = latestVideo ? ((latestVideo.like_count || 0) + (latestVideo.comment_count || 0) + (latestVideo.share_count || 0)) / (latestVideo.view_count || 1) : 0;

    return [
      { metricName: 'Average Likes', currentValue: latestVideo?.like_count || 0, averageValue: avgLikes },
      { metricName: 'Average Comments', currentValue: latestVideo?.comment_count || 0, averageValue: avgComments },
      { metricName: 'Average Views', currentValue: latestVideo?.view_count || 0, averageValue: avgViews },
      { metricName: 'Average Engagement Rate', currentValue: currentEngRate, averageValue: avgEngRate },
    ];
  }

  private generateKeyInsights(trends: EngagementTrends, content: ContentPerformance, benchmarks: Benchmark[]): string[] {
    const insights: string[] = [];
    if (trends.viewsTrend.length > 1) {
      const lastViewPoint = trends.viewsTrend[trends.viewsTrend.length -1].value;
      const firstViewPoint = trends.viewsTrend[0].value;
      if (lastViewPoint > firstViewPoint) insights.push('Viewership is trending upwards.');
      else if (lastViewPoint < firstViewPoint) insights.push('Viewership is trending downwards.');
      else insights.push('Viewership is stable.');
    }
    if (content.topPerformingVideos.length > 0) {
      insights.push(`Top videos are performing well, like video ID: ${content.topPerformingVideos[0].id}.`);
    }
    // Add more insights based on benchmarks, etc.
    return insights.slice(0, 3);
  }

  private generateRecommendations(insights: string[], content: ContentPerformance): Recommendation[] {
    const recommendations: Recommendation[] = [];
    if (insights.some(insight => insight.includes('downwards'))) {
      recommendations.push({
        type: 'strategy',
        description: 'Review content strategy to improve viewership trends. Analyze what changed.',
        priority: 'high'
      });
    }
    if (content.topPerformingVideos.length > 0) {
      recommendations.push({
        type: 'content',
        description: `Continue creating content similar to your top performing videos (e.g., based on tags: ${content.topPerformingVideos[0].tags?.join(', ')}).`,
        priority: 'high'
      });
    }
    if (content.bottomPerformingVideos.length > 0 && content.topPerformingVideos.length > 0) {
        const topVideoExample = content.topPerformingVideos[0];
        const bottomVideoExample = content.bottomPerformingVideos[0]; // last element of sorted by engagement (worst)
        recommendations.push({
            type: 'content',
            description: `Analyze differences between top content (e.g., ID ${topVideoExample.id}) and bottom content (e.g., ID ${bottomVideoExample.id}) to identify improvement areas.`,
            priority: 'medium'
        });
    }
    recommendations.push({
        type: 'strategy',
        description: 'Regularly review performance trends to adapt your content strategy.',
        priority: 'low'
    });
    return recommendations.slice(0,3); 
  }
}
