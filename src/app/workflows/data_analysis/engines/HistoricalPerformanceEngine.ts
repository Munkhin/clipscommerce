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
  ReportMetrics,
  ECommerceData,
  ECommerceDataSchema
} from '../types';

export class HistoricalPerformanceEngine {
  constructor(private supabase: SupabaseClient) {}

  async getHistoricalData(
    request: BaseAnalysisRequest,
    eCommerceData?: ECommerceData
  ): Promise<AnalysisResult<ReportsAnalysisData>> {
    const warnings: string[] = [];
    
    // Validate time range
    const timeRangeValidation = TimeRangeSchema.safeParse(request.timeRange);
    if (!timeRangeValidation.success) {
      console.error(`[HistoricalPerformanceEngine] Invalid timeRange for user ${request.userId}:`, timeRangeValidation.error.flatten());
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

    // Validate eCommerce data if provided
    let validatedECommerceData: ECommerceData | undefined;
    if (eCommerceData) {
      const eCommerceValidation = ECommerceDataSchema.safeParse(eCommerceData);
      if (!eCommerceValidation.success) {
        warnings.push('Invalid e-commerce data structure provided - using default values for calculations');
        console.warn(`[HistoricalPerformanceEngine] Invalid eCommerce data for user ${request.userId}:`, eCommerceValidation.error.flatten());
        validatedECommerceData = undefined;
      } else {
        validatedECommerceData = eCommerceValidation.data;
        
        // Add data quality warnings for e-commerce data
        if (validatedECommerceData.conversionRate && validatedECommerceData.conversionRate > 0.2) {
          warnings.push('Unusually high conversion rate detected - please verify data accuracy');
        }
        if (validatedECommerceData.totalRevenue && validatedECommerceData.totalOrders && 
            validatedECommerceData.totalRevenue / validatedECommerceData.totalOrders < 1) {
          warnings.push('Very low average order value detected - please check currency and data units');
        }
      }
    }

    const { data: videos, error: videosError } = await this.supabase
      .from('videos') // Assuming 'videos' is the correct table name
      .select('id, published_at, like_count, comment_count, view_count, share_count, tags, platform')
      .eq('user_id', request.userId)
      .eq('platform', request.platform) // Filter by platform for accurate analysis
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
      warnings.push('No video data found for this period.');
      const emptyData: ReportsAnalysisData = {
        historicalViewGrowth: [],
        pastPostsPerformance: [],
        ecommerceMetrics: validatedECommerceData ? this.calculateEcommerceMetrics(validatedECommerceData) : undefined,
      };
      return {
        success: true,
        data: emptyData,
        metadata: {
          generatedAt: new Date(),
          source: 'HistoricalPerformanceEngine',
          warnings,
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
          warnings,
        },
      };
    }
    const validatedVideos: HistoricalVideo[] = videoDataValidation.data;

    // Add data quality warnings for video metrics
    const videosWithZeroViews = validatedVideos.filter(v => v.view_count === 0).length;
    if (videosWithZeroViews > 0) {
      warnings.push(`${videosWithZeroViews} videos have zero views - this may indicate data collection issues`);
    }

    const videosWithHighEngagement = validatedVideos.filter(v => {
      const engagementRate = ((v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0)) / (v.view_count || 1);
      return engagementRate > 0.5; // 50% engagement rate is unusually high
    }).length;
    
    if (videosWithHighEngagement > 0) {
      warnings.push(`${videosWithHighEngagement} videos have unusually high engagement rates - please verify data accuracy`);
    }

    if (validatedVideos.length < 5) {
      warnings.push('Limited video data available - analysis may be less accurate with fewer data points');
    }

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
      ecommerceMetrics: validatedECommerceData ? this.calculateEcommerceMetrics(validatedECommerceData) : undefined,
    };

    return {
      success: true,
      data: reportData,
      metadata: {
        generatedAt: new Date(),
        source: 'HistoricalPerformanceEngine',
        correlationId: request.correlationId,
        warnings: warnings.length > 0 ? warnings : undefined,
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

  private calculateEcommerceMetrics(eCommerceData: ECommerceData): ReportMetrics {
    const metrics: ReportMetrics = {};

    // Calculate ROI (Return on Investment)
    if (eCommerceData.attributedRevenue && eCommerceData.campaignData?.spend) {
      const roi = ((eCommerceData.attributedRevenue - eCommerceData.campaignData.spend) / eCommerceData.campaignData.spend) * 100;
      metrics.roi = parseFloat(roi.toFixed(2));
    } else if (eCommerceData.returnOnAdSpend) {
      metrics.roi = eCommerceData.returnOnAdSpend;
    }

    // Set conversion rate
    if (eCommerceData.conversionRate) {
      metrics.conversionRate = eCommerceData.conversionRate;
    } else if (eCommerceData.totalOrders && eCommerceData.productViews) {
      // Calculate conversion rate from product views to orders
      metrics.conversionRate = parseFloat((eCommerceData.totalOrders / eCommerceData.productViews).toFixed(4));
    }

    // Set traffic views from social media
    if (eCommerceData.trafficFromSocial) {
      metrics.views = eCommerceData.trafficFromSocial;
    }

    // Additional e-commerce specific metrics
    const additionalMetrics: any = {};

    // Average Order Value
    if (eCommerceData.totalRevenue && eCommerceData.totalOrders) {
      additionalMetrics.averageOrderValue = parseFloat((eCommerceData.totalRevenue / eCommerceData.totalOrders).toFixed(2));
    } else if (eCommerceData.averageOrderValue) {
      additionalMetrics.averageOrderValue = eCommerceData.averageOrderValue;
    }

    // Customer Acquisition Cost
    if (eCommerceData.customerAcquisitionCost) {
      additionalMetrics.customerAcquisitionCost = eCommerceData.customerAcquisitionCost;
    } else if (eCommerceData.campaignData?.spend && eCommerceData.totalOrders) {
      additionalMetrics.customerAcquisitionCost = parseFloat((eCommerceData.campaignData.spend / eCommerceData.totalOrders).toFixed(2));
    }

    // Customer Lifetime Value indicators
    if (eCommerceData.repeatCustomerRate) {
      additionalMetrics.repeatCustomerRate = eCommerceData.repeatCustomerRate;
    }

    // Campaign Performance Metrics
    if (eCommerceData.campaignData) {
      const campaign = eCommerceData.campaignData;
      
      if (campaign.ctr) {
        additionalMetrics.clickThroughRate = campaign.ctr;
      } else if (campaign.clicks && campaign.impressions) {
        additionalMetrics.clickThroughRate = parseFloat((campaign.clicks / campaign.impressions).toFixed(4));
      }

      if (campaign.impressions) {
        additionalMetrics.impressions = campaign.impressions;
      }

      if (campaign.clicks) {
        additionalMetrics.clicks = campaign.clicks;
      }

      if (campaign.spend) {
        additionalMetrics.adSpend = campaign.spend;
      }

      // Cost per click
      if (campaign.spend && campaign.clicks) {
        additionalMetrics.costPerClick = parseFloat((campaign.spend / campaign.clicks).toFixed(2));
      }

      // Cost per acquisition (if we have conversions/orders)
      if (campaign.spend && eCommerceData.totalOrders) {
        additionalMetrics.costPerAcquisition = parseFloat((campaign.spend / eCommerceData.totalOrders).toFixed(2));
      }
    }

    // Revenue Metrics
    if (eCommerceData.totalRevenue) {
      additionalMetrics.totalRevenue = eCommerceData.totalRevenue;
    }

    if (eCommerceData.attributedRevenue) {
      additionalMetrics.attributedRevenue = eCommerceData.attributedRevenue;
    }

    // Traffic and Engagement Metrics
    if (eCommerceData.avgSessionDuration) {
      additionalMetrics.avgSessionDuration = eCommerceData.avgSessionDuration;
    }

    if (eCommerceData.bounceRate) {
      additionalMetrics.bounceRate = eCommerceData.bounceRate;
    }

    // Cart and Product Metrics
    if (eCommerceData.cartAdditions) {
      additionalMetrics.cartAdditions = eCommerceData.cartAdditions;
    }

    if (eCommerceData.productViews) {
      additionalMetrics.productViews = eCommerceData.productViews;
    }

    // Cart conversion rate (cart additions to orders)
    if (eCommerceData.cartAdditions && eCommerceData.totalOrders) {
      additionalMetrics.cartConversionRate = parseFloat((eCommerceData.totalOrders / eCommerceData.cartAdditions).toFixed(4));
    }

    // Product Performance
    if (eCommerceData.topSellingProducts && eCommerceData.topSellingProducts.length > 0) {
      additionalMetrics.topSellingProducts = eCommerceData.topSellingProducts;
      
      // Calculate total units sold across top products
      const totalTopProductUnits = eCommerceData.topSellingProducts.reduce((sum, product) => sum + product.units, 0);
      additionalMetrics.topProductsTotalUnits = totalTopProductUnits;
      
      // Calculate revenue share of top products
      const totalTopProductRevenue = eCommerceData.topSellingProducts.reduce((sum, product) => sum + product.revenue, 0);
      additionalMetrics.topProductsTotalRevenue = totalTopProductRevenue;
      
      if (eCommerceData.totalRevenue) {
        additionalMetrics.topProductsRevenueShare = parseFloat((totalTopProductRevenue / eCommerceData.totalRevenue).toFixed(4));
      }
    }

    // Merge additional metrics into the main metrics object
    Object.assign(metrics, additionalMetrics);

    return metrics;
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
