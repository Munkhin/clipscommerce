import { Platform } from "@/types/platform";
import { Post, PostMetrics } from "@/types/schedule";
import { AnalyticsFilter, EngagementMetrics, PerformanceMetrics, AudienceDemographics, PlatformComparison, ContentPerformance, TrendAnalysis, AnalyticsReport } from "@/types/analytics";
import { PlatformApiFactory } from "./platformApis/factory";

interface AnalyticsServiceDependencies {
  getPlatformAuth: (platform: Platform) => Promise<{ accessToken: string } | null>;
  getPosts: (filter: any) => Promise<Post[]>;
  getPostMetrics: (postId: string, platform: Platform) => Promise<PostMetrics>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private dependencies: AnalyticsServiceDependencies;

  private constructor(dependencies: AnalyticsServiceDependencies) {
    this.dependencies = dependencies;
  }

  public static getInstance(dependencies: AnalyticsServiceDependencies): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(dependencies);
    }
    return AnalyticsService.instance;
  }

  /**
   * Get performance metrics for the specified filter
   */
  public async getPerformanceMetrics(filter: AnalyticsFilter): Promise<PerformanceMetrics> {
    const posts = await this.dependencies.getPosts(this.buildFilterQuery(filter));
    
    // Get metrics for all posts
    const metricsPromises = posts.flatMap(post => 
      post.platforms.map(platform => 
        this.dependencies.getPostMetrics(post.id, platform)
      )
    );
    
    const allMetrics = await Promise.all(metricsPromises);
    
    // Calculate aggregate metrics
    const totalEngagement = allMetrics.reduce((sum, metrics) => ({
      likes: sum.likes + (metrics.likes || 0),
      comments: sum.comments + (metrics.comments || 0),
      shares: sum.shares + (metrics.shares || 0),
      saves: sum.saves + (metrics.saves || 0),
      reach: sum.reach + (metrics.reach || 0),
      impressions: sum.impressions + (metrics.impressions || 0),
      engagementRate: sum.engagementRate + (metrics.engagementRate || 0),
      linkClicks: sum.linkClicks + (metrics.linkClicks || 0),
    }), {
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      impressions: 0,
      engagementRate: 0,
      linkClicks: 0,
    });
    
    // Find best and worst performing posts
    let bestPost = { engagementRate: -1 };
    let worstPost = { engagementRate: Infinity };
    
    posts.forEach((post, index) => {
      const metrics = allMetrics[index];
      if (metrics && metrics.engagementRate > bestPost.engagementRate) {
        bestPost = { ...post, ...metrics };
      }
      if (metrics && metrics.engagementRate < worstPost.engagementRate) {
        worstPost = { ...post, ...metrics };
      }
    });
    
    return {
      ...totalEngagement,
      postCount: posts.length,
      avgEngagementRate: allMetrics.length > 0 
        ? totalEngagement.engagementRate / allMetrics.length 
        : 0,
      bestPerformingPost: bestPost.engagementRate > -1 ? {
        id: bestPost.id,
        content: bestPost.content?.text?.substring(0, 100) || '',
        engagementRate: bestPost.engagementRate,
        platform: bestPost.platforms?.[0] || 'unknown',
        publishedAt: bestPost.status?.publishedAt || new Date(),
      } : null,
      worstPerformingPost: worstPost.engagementRate < Infinity ? {
        id: worstPost.id,
        content: worstPost.content?.text?.substring(0, 100) || '',
        engagementRate: worstPost.engagementRate,
        platform: worstPost.platforms?.[0] || 'unknown',
        publishedAt: worstPost.status?.publishedAt || new Date(),
      } : null,
    };
  }

  /**
   * Get audience demographics data
   */
  public async getAudienceDemographics(filter: AnalyticsFilter): Promise<AudienceDemographics> {
    // In a real app, you would fetch this from your analytics database
    // For now, return mock data
    return {
      ageRange: {
        '13-17': 5,
        '18-24': 25,
        '25-34': 45,
        '35-44': 15,
        '45-54': 7,
        '55-64': 2,
        '65+': 1,
      },
      gender: {
        male: 45,
        female: 52,
        other: 2,
        unknown: 1,
      },
      topLocations: [
        { location: 'United States', percentage: 40 },
        { location: 'United Kingdom', percentage: 15 },
        { location: 'Canada', percentage: 10 },
        { location: 'Australia', percentage: 8 },
        { location: 'India', percentage: 7 },
      ],
      languages: [
        { language: 'English', percentage: 85 },
        { language: 'Spanish', percentage: 7 },
        { language: 'French', percentage: 3 },
        { language: 'German', percentage: 2 },
        { language: 'Other', percentage: 3 },
      ],
    };
  }

  /**
   * Compare performance across platforms
   */
  public async getPlatformComparison(filter: AnalyticsFilter): Promise<PlatformComparison[]> {
    const platforms = filter.platforms || [];
    if (platforms.length === 0) return [];
    
    const results: PlatformComparison[] = [];
    
    for (const platform of platforms) {
      const platformFilter = { ...filter, platforms: [platform] };
      const metrics = await this.getPerformanceMetrics(platformFilter);
      
      // In a real app, you would analyze best performing times and content types
      results.push({
        platform,
        metrics: {
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          reach: metrics.reach,
          impressions: metrics.impressions,
          engagementRate: metrics.avgEngagementRate,
        },
        postCount: metrics.postCount,
        avgEngagementRate: metrics.avgEngagementRate,
        bestPerformingTime: '2:00 PM', // Mock data
        bestPerformingContentType: 'image', // Mock data
      });
    }
    
    return results;
  }

  /**
   * Get content performance data
   */
  public async getContentPerformance(filter: AnalyticsFilter): Promise<ContentPerformance[]> {
    const posts = await this.dependencies.getPosts(this.buildFilterQuery(filter));
    
    const results: ContentPerformance[] = [];
    
    for (const post of posts) {
      for (const platform of post.platforms) {
        const metrics = await this.dependencies.getPostMetrics(post.id, platform);
        
        // Analyze content type
        const mediaType = this.determineMediaType(post);
        
        results.push({
          id: `${post.id}-${platform}`,
          content: post.content?.text?.substring(0, 200) || '',
          platform,
          publishedAt: post.status?.publishedAt || new Date(),
          metrics: {
            likes: metrics.likes || 0,
            comments: metrics.comments || 0,
            shares: metrics.shares || 0,
            saves: metrics.saves || 0,
            reach: metrics.reach || 0,
            impressions: metrics.impressions || 0,
            engagementRate: metrics.engagementRate || 0,
            linkClicks: metrics.linkClicks || 0,
            videoViews: metrics.videoViews,
            viewTime: metrics.viewTime,
          },
          contentType: mediaType,
          tags: post.tags || [],
          mediaType,
          mediaCount: post.content?.mediaUrls?.length || 0,
          hasLink: (post.content?.links?.length || 0) > 0,
          hasHashtags: (post.content?.hashtags?.length || 0) > 0,
          hasMentions: (post.content?.mentions?.length || 0) > 0,
          wordCount: post.content?.text?.split(/\s+/).length || 0,
          characterCount: post.content?.text?.length || 0,
        });
      }
    }
    
    return results;
  }

  /**
   * Get trend analysis data
   */
  public async getTrendAnalysis(filter: AnalyticsFilter): Promise<TrendAnalysis> {
    // In a real app, you would analyze trending hashtags and topics
    // For now, return mock data
    return {
      trendingHashtags: [
        { tag: 'socialmedia', postCount: 1500, growth: 45 },
        { tag: 'marketing', postCount: 1200, growth: 32 },
        { tag: 'digitalmarketing', postCount: 980, growth: 28 },
        { tag: 'contentcreation', postCount: 750, growth: 22 },
        { tag: 'socialmediamarketing', postCount: 620, growth: 18 },
      ],
      trendingTopics: [
        { topic: 'AI in Marketing', postCount: 3200, growth: 65 },
        { topic: 'Video Content', postCount: 2800, growth: 58 },
        { topic: 'Instagram Reels', postCount: 2400, growth: 52 },
        { topic: 'TikTok Strategies', postCount: 2100, growth: 48 },
        { topic: 'LinkedIn Engagement', postCount: 1800, growth: 42 },
      ],
      trendingAudio: [
        { id: 'audio1', title: 'Upbeat Corporate', author: 'Audio Library', postCount: 12500, growth: 85 },
        { id: 'audio2', title: 'Happy Pop', author: 'Royalty Free Music', postCount: 9800, growth: 72 },
        { id: 'audio3', title: 'Chill Vibes', author: 'AudioJungle', postCount: 8600, growth: 68 },
      ],
    };
  }

  /**
   * Generate a comprehensive analytics report
   */
  public async generateReport(filter: AnalyticsFilter): Promise<AnalyticsReport> {
    const [
      performance,
      audience,
      platformComparison,
      contentPerformance,
      trends
    ] = await Promise.all([
      this.getPerformanceMetrics(filter),
      this.getAudienceDemographics(filter),
      this.getPlatformComparison(filter),
      this.getContentPerformance(filter),
      this.getTrendAnalysis(filter)
    ]);
    
    // Sort content by engagement rate
    const sortedContent = [...contentPerformance].sort(
      (a, b) => b.metrics.engagementRate - a.metrics.engagementRate
    );
    
    return {
      summary: {
        totalPosts: performance.postCount,
        totalEngagement: performance.likes + performance.comments + performance.shares,
        avgEngagementRate: performance.avgEngagementRate,
        followersGrowth: 5.2, // Mock data
        bestPerformingPlatform: platformComparison[0]?.platform || 'instagram',
        bestPerformingContentType: 'video', // Mock data
        bestPerformingTime: '2:00 PM', // Mock data
      },
      platformComparison,
      contentPerformance: sortedContent,
      audience,
      trends,
      timeSeries: this.generateTimeSeriesData(filter),
    };
  }

  // Helper methods
  private buildFilterQuery(filter: AnalyticsFilter): any {
    const query: any = {};
    
    if (filter.platforms && filter.platforms.length > 0) {
      // This would be a database query in a real app
      query.platforms = { $in: filter.platforms };
    }
    
    if (filter.timeRange) {
      query.publishedAt = {
        $gte: filter.timeRange.start,
        $lte: filter.timeRange.end,
      };
    }
    
    if (filter.tags && filter.tags.length > 0) {
      query.tags = { $in: filter.tags };
    }
    
    if (filter.campaigns && filter.campaigns.length > 0) {
      query.campaignId = { $in: filter.campaigns };
    }
    
    return query;
  }
  
  private determineMediaType(post: Post): 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'text' {
    if (!post.content?.mediaUrls?.length) return 'text';
    
    const mediaUrls = post.content.mediaUrls;
    
    // Check for video
    const hasVideo = mediaUrls.some(url => 
      /\.(mp4|mov|avi|mkv|webm)$/i.test(url)
    );
    
    // Check for story or reel based on aspect ratio or other metadata
    // This is simplified - in a real app, you'd have more metadata
    if (post.content.customFields?.isStory) return 'story';
    if (post.content.customFields?.isReel) return 'reel';
    
    // Determine based on media count and type
    if (mediaUrls.length > 1) return 'carousel';
    if (hasVideo) return 'video';
    return 'image';
  }
  
  private generateTimeSeriesData(filter: AnalyticsFilter): Array<{ date: Date; metrics: EngagementMetrics }> {
    // In a real app, you would generate this from your time-series database
    // This is mock data for demonstration
    const days = filter.timeRange 
      ? Math.ceil((filter.timeRange.end.getTime() - filter.timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    
    const result = [];
    const baseDate = filter.timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      
      // Generate random-ish data that trends upward
      const base = 10 + Math.sin(i / 3) * 5 + i * 0.5;
      const noise = (Math.random() - 0.5) * 5;
      const value = Math.max(5, Math.round(base + noise));
      
      result.push({
        date,
        metrics: {
          likes: value * 10,
          comments: Math.round(value * 0.8),
          shares: Math.round(value * 0.5),
          saves: Math.round(value * 0.3),
          reach: value * 50,
          impressions: value * 80,
          engagementRate: 0.05 + (Math.random() * 0.1),
          linkClicks: Math.round(value * 0.2),
        },
      });
    }
    
    return result;
  }
}
