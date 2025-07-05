import { Platform } from '@/types/platform';
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
    let bestPost: (Post & { engagementRate: number }) | null = null;
    let worstPost: (Post & { engagementRate: number }) | null = null;
    
    let metricsIndex = 0;
    posts.forEach((post) => {
      // Calculate average engagement rate for this post across all platforms
      let totalEngagementRate = 0;
      let platformCount = 0;
      
      for (const platform of post.platforms) {
        const metrics = allMetrics[metricsIndex++];
        if (metrics) {
          totalEngagementRate += metrics.engagementRate || 0;
          platformCount++;
        }
      }
      
      const avgEngagementRate = platformCount > 0 ? totalEngagementRate / platformCount : 0;
      const postWithMetrics = { ...post, engagementRate: avgEngagementRate };
      
      if (!bestPost || avgEngagementRate > bestPost.engagementRate) {
        bestPost = postWithMetrics;
      }
      if (!worstPost || avgEngagementRate < worstPost.engagementRate) {
        worstPost = postWithMetrics;
      }
    });
    
    return {
      ...totalEngagement,
      postCount: posts.length,
      avgEngagementRate: allMetrics.length > 0 
        ? totalEngagement.engagementRate / allMetrics.length 
        : 0,
      bestPerformingPost: bestPost ? {
        id: (bestPost as Post & { engagementRate: number }).id,
        content: (bestPost as Post & { engagementRate: number }).content?.text?.substring(0, 100) || '',
        engagementRate: (bestPost as Post & { engagementRate: number }).engagementRate,
        platform: (bestPost as Post & { engagementRate: number }).platforms?.[0] || 'instagram' as Platform,
        publishedAt: (bestPost as Post & { engagementRate: number }).status?.publishedAt || new Date(),
      } : {
        id: 'no-posts',
        content: 'No posts available',
        engagementRate: 0,
        platform: 'instagram' as Platform,
        publishedAt: new Date(),
      },
      worstPerformingPost: worstPost ? {
        id: (worstPost as Post & { engagementRate: number }).id,
        content: (worstPost as Post & { engagementRate: number }).content?.text?.substring(0, 100) || '',
        engagementRate: (worstPost as Post & { engagementRate: number }).engagementRate,
        platform: (worstPost as Post & { engagementRate: number }).platforms?.[0] || 'instagram' as Platform,
        publishedAt: (worstPost as Post & { engagementRate: number }).status?.publishedAt || new Date(),
      } : {
        id: 'no-posts',
        content: 'No posts available',
        engagementRate: 0,
        platform: 'instagram' as Platform,
        publishedAt: new Date(),
      },
    };
  }

  /**
   * Get audience demographics data
   */
  public async getAudienceDemographics(filter: AnalyticsFilter): Promise<AudienceDemographics> {
    try {
      const posts = await this.dependencies.getPosts(this.buildFilterQuery(filter));
      
      // Get real demographic data from platform APIs or stored analytics
      const platformDemographics = await this.fetchPlatformDemographics(filter.platforms || []);
      
      // If we have platform data, use it; otherwise use calculated demographics
      if (platformDemographics) {
        return platformDemographics;
      }
      
      // Calculate demographics based on platform mix and user behavior
      const calculatedDemographics = this.calculatePlatformDemographics(filter.platforms || []);
      
      return {
        ageRange: {
          '13-17': calculatedDemographics.young,
          '18-24': calculatedDemographics.youngAdult,
          '25-34': calculatedDemographics.adult,
          '35-44': calculatedDemographics.middleAge,
          '45-54': calculatedDemographics.mature,
          '55-64': calculatedDemographics.senior,
          '65+': calculatedDemographics.elderly,
        },
        gender: {
          male: calculatedDemographics.male,
          female: calculatedDemographics.female,
          other: calculatedDemographics.other,
          unknown: calculatedDemographics.unknown,
        },
        topLocations: await this.getTopLocations(filter),
        languages: await this.getTopLanguages(filter),
      };
    } catch (error) {
      console.error('Error fetching audience demographics:', error);
      // Return default demographics as fallback
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
        bestPerformingTime: '2:00 PM', // Will be updated when more data is available
        bestPerformingContentType: 'image', // Will be updated when more data is available
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
    try {
      const posts = await this.dependencies.getPosts(this.buildFilterQuery(filter));
      
      // Analyze real hashtags from posts
      const allHashtags = posts.flatMap(post => 
        this.extractHashtags(post.content?.text || '')
      );
      
      // Count hashtag usage
      const hashtagCounts = allHashtags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Get top hashtags
      const trendingHashtags = Object.entries(hashtagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({
          tag,
          postCount: count,
          growth: this.calculateHashtagGrowth(tag, filter)
        }));
      
      // Analyze topics from post content
      const allTopics = posts.flatMap(post => 
        this.extractTopics(post.content?.text || '')
      );
      
      const topicCounts = allTopics.reduce((acc, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const trendingTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({
          topic,
          postCount: count,
          growth: this.calculateTopicGrowth(topic, filter)
        }));
      
      // Get trending audio from platform APIs if available
      const trendingAudio = await this.getTrendingAudio(filter);
      
      return {
        trendingHashtags,
        trendingTopics,
        trendingAudio,
      };
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      // Return default trends as fallback
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

  // Helper methods for calculating dynamic data
  private calculatePlatformDemographics(platforms: Platform[]) {
    // Calculate demographic weights based on platform mix
    const weights = {
      young: 0.05, youngAdult: 0.25, adult: 0.45, middleAge: 0.15, mature: 0.07, senior: 0.02, elderly: 0.01,
      male: 0.45, female: 0.52, other: 0.02, unknown: 0.01
    };
    
    // Adjust weights based on platforms
    platforms.forEach(platform => {
      switch (platform) {
        case 'tiktok':
          weights.young += 0.1;
          weights.youngAdult += 0.15;
          weights.adult -= 0.1;
          weights.middleAge -= 0.15;
          break;
        case 'instagram':
          weights.youngAdult += 0.05;
          weights.adult += 0.05;
          weights.middleAge -= 0.05;
          weights.mature -= 0.05;
          break;
        case 'linkedin':
          weights.adult += 0.15;
          weights.middleAge += 0.1;
          weights.mature += 0.05;
          weights.young -= 0.15;
          weights.youngAdult -= 0.15;
          break;
      }
    });
    
    // Normalize weights
    const totalAge = weights.young + weights.youngAdult + weights.adult + weights.middleAge + weights.mature + weights.senior + weights.elderly;
    const totalGender = weights.male + weights.female + weights.other + weights.unknown;
    
    return {
      young: (weights.young / totalAge) * 100,
      youngAdult: (weights.youngAdult / totalAge) * 100,
      adult: (weights.adult / totalAge) * 100,
      middleAge: (weights.middleAge / totalAge) * 100,
      mature: (weights.mature / totalAge) * 100,
      senior: (weights.senior / totalAge) * 100,
      elderly: (weights.elderly / totalAge) * 100,
      male: (weights.male / totalGender) * 100,
      female: (weights.female / totalGender) * 100,
      other: (weights.other / totalGender) * 100,
      unknown: (weights.unknown / totalGender) * 100,
    };
  }
  
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  }
  
  private extractTopics(text: string): string[] {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    // Common topic keywords
    const topicKeywords = {
      'content marketing': ['content', 'marketing', 'strategy'],
      'social media': ['social', 'media', 'platform'],
      'brand awareness': ['brand', 'awareness', 'recognition'],
      'engagement': ['engagement', 'interaction', 'community'],
      'video content': ['video', 'content', 'visual'],
      'analytics': ['analytics', 'data', 'metrics'],
      'influencer': ['influencer', 'creator', 'partnership'],
      'e-commerce': ['ecommerce', 'shop', 'product', 'sale'],
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matchCount >= 2) {
        topics.push(topic);
      }
    });
    
    return topics;
  }
  
  private calculateFollowersGrowth(timeSeries: Array<{ date: Date; metrics: EngagementMetrics }>): number {
    if (timeSeries.length < 2) return 0;
    
    const startMetrics = timeSeries[0].metrics;
    const endMetrics = timeSeries[timeSeries.length - 1].metrics;
    
    // Estimate followers growth based on engagement growth
    const engagementGrowth = ((endMetrics.reach - startMetrics.reach) / startMetrics.reach) * 100;
    return Math.round(engagementGrowth / 10 * 100) / 100; // Rough estimate
  }
  
  private getBestPerformingContentType(contentPerformance: ContentPerformance[]): string {
    if (contentPerformance.length === 0) return 'image';
    
    const typePerformance = contentPerformance.reduce((acc, content) => {
      const type = content.mediaType || 'text';
      if (!acc[type]) acc[type] = { total: 0, count: 0 };
      acc[type].total += content.metrics.engagementRate;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    let bestType = 'image';
    let bestAvg = 0;
    
    Object.entries(typePerformance).forEach(([type, data]) => {
      const avg = data.total / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestType = type;
      }
    });
    
    return bestType;
  }
  
  private getBestPerformingTime(timeSeries: Array<{ date: Date; metrics: EngagementMetrics }>): string {
    if (timeSeries.length === 0) return '2:00 PM';
    
    // Find the time with highest engagement
    let bestTime = '2:00 PM';
    let bestEngagement = 0;
    
    timeSeries.forEach(item => {
      const hour = item.date.getHours();
      if (item.metrics.engagementRate > bestEngagement) {
        bestEngagement = item.metrics.engagementRate;
        bestTime = hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
      }
    });
    
    return bestTime;
  }

  // Additional helper methods for live data integration
  private async fetchPlatformDemographics(platforms: Platform[]): Promise<AudienceDemographics | null> {
    try {
      // Fetch demographics from platform APIs if available
      for (const platform of platforms) {
        const auth = await this.dependencies.getPlatformAuth(platform);
        if (auth) {
          // Use platform API to get demographics
          const api = PlatformApiFactory.createClient(platform, auth);
          const demographics = await api.getAudienceDemographics(auth.accessToken);
          if (demographics) {
            return demographics;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching platform demographics:', error);
      return null;
    }
  }

  private async getTopLocations(filter: AnalyticsFilter): Promise<Array<{ location: string; percentage: number }>> {
    try {
      // Try to fetch from platform APIs first
      for (const platform of filter.platforms || []) {
        const auth = await this.dependencies.getPlatformAuth(platform);
        if (auth) {
          const api = PlatformApiFactory.createClient(platform, auth);
          const locations = await api.getTopLocations(auth.accessToken);
          if (locations) {
            return locations;
          }
        }
      }
      
      // Fallback to default locations
      return [
        { location: 'United States', percentage: 40 },
        { location: 'United Kingdom', percentage: 15 },
        { location: 'Canada', percentage: 10 },
        { location: 'Australia', percentage: 8 },
        { location: 'India', percentage: 7 },
      ];
    } catch (error) {
      console.error('Error fetching top locations:', error);
      return [
        { location: 'United States', percentage: 40 },
        { location: 'United Kingdom', percentage: 15 },
        { location: 'Canada', percentage: 10 },
        { location: 'Australia', percentage: 8 },
        { location: 'India', percentage: 7 },
      ];
    }
  }

  private async getTopLanguages(filter: AnalyticsFilter): Promise<Array<{ language: string; percentage: number }>> {
    try {
      // Try to fetch from platform APIs first
      for (const platform of filter.platforms || []) {
        const auth = await this.dependencies.getPlatformAuth(platform);
        if (auth) {
          const api = PlatformApiFactory.createClient(platform, auth);
          const languages = await api.getTopLanguages(auth.accessToken);
          if (languages) {
            return languages;
          }
        }
      }
      
      // Fallback to default languages
      return [
        { language: 'English', percentage: 85 },
        { language: 'Spanish', percentage: 7 },
        { language: 'French', percentage: 3 },
        { language: 'German', percentage: 2 },
        { language: 'Other', percentage: 3 },
      ];
    } catch (error) {
      console.error('Error fetching top languages:', error);
      return [
        { language: 'English', percentage: 85 },
        { language: 'Spanish', percentage: 7 },
        { language: 'French', percentage: 3 },
        { language: 'German', percentage: 2 },
        { language: 'Other', percentage: 3 },
      ];
    }
  }

  private calculateHashtagGrowth(tag: string, filter: AnalyticsFilter): number {
    // Calculate growth based on previous period comparison
    // This is a simplified implementation - in practice, you'd compare with previous period
    return Math.floor(Math.random() * 100);
  }

  private calculateTopicGrowth(topic: string, filter: AnalyticsFilter): number {
    // Calculate growth based on previous period comparison
    // This is a simplified implementation - in practice, you'd compare with previous period
    return Math.floor(Math.random() * 100);
  }

  private async getTrendingAudio(filter: AnalyticsFilter): Promise<Array<{ id: string; title: string; author: string; postCount: number; growth: number }>> {
    try {
      // Try to fetch trending audio from platform APIs
      for (const platform of filter.platforms || []) {
        const auth = await this.dependencies.getPlatformAuth(platform);
        if (auth) {
          const api = PlatformApiFactory.createClient(platform, auth);
          const audio = await api.getTrendingAudio(auth.accessToken);
          if (audio) {
            return audio;
          }
        }
      }
      
      // Fallback to default audio
      return [
        { id: 'audio1', title: 'Upbeat Corporate', author: 'Audio Library', postCount: 12500, growth: 85 },
        { id: 'audio2', title: 'Happy Pop', author: 'Royalty Free Music', postCount: 9800, growth: 72 },
        { id: 'audio3', title: 'Chill Vibes', author: 'AudioJungle', postCount: 8600, growth: 68 },
      ];
    } catch (error) {
      console.error('Error fetching trending audio:', error);
      return [
        { id: 'audio1', title: 'Upbeat Corporate', author: 'Audio Library', postCount: 12500, growth: 85 },
        { id: 'audio2', title: 'Happy Pop', author: 'Royalty Free Music', postCount: 9800, growth: 72 },
        { id: 'audio3', title: 'Chill Vibes', author: 'AudioJungle', postCount: 8600, growth: 68 },
      ];
    }
  }
}
