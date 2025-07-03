import { createClient } from '@/lib/supabase/client';
import { TrendingHashtag, DetailedPlatformMetrics, VideoOptimizationAnalysisData } from '@/app/workflows/data_analysis/types/analysis_types';

export interface UserContentAnalysis {
  topCaptions: string[];
  hashtagPerformance: HashtagPerformanceData[];
  contentPatterns: ContentPattern[];
  engagementMetrics: ContentEngagementMetrics;
}

export interface HashtagPerformanceData {
  hashtag: string;
  usageCount: number;
  averageViews: number;
  averageLikes: number;
  averageEngagement: number;
  estimatedReach: number;
  rank?: number;
}

export interface ContentPattern {
  pattern: string;
  frequency: number;
  averagePerformance: number;
  examples: string[];
}

export interface ContentEngagementMetrics {
  averageViews: number;
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  engagementRate: number;
  topPerformingFormats: { format: string; performance: number }[];
}

export interface PlatformAnalyticsData {
  audienceDemographics: {
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    topCountries: Record<string, number>;
    topCities: Record<string, number>;
  };
  engagementTimes: {
    hourlyDistribution: Record<string, number>;
    dailyDistribution: Record<string, number>;
    peakTimes: { day: string; hour: number; score: number }[];
  };
  contentFormatMetrics: {
    formatName: string;
    averageViews: number;
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    averageEngagementRate: number;
    totalPosts: number;
  }[];
}

export class ContentInsightsService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  async analyzeUserContent(
    userId: string,
    platform: string,
    timeRange: { start: string; end: string },
    limit: number = 50
  ): Promise<UserContentAnalysis> {
    try {
      // Fetch user's content from the specified time range
      const userContent = await this.fetchUserContent(userId, platform, timeRange, limit);
      
      if (userContent.length === 0) {
        return this.getDefaultAnalysis();
      }

      // Analyze captions and extract patterns
      const topCaptions = this.extractTopPerformingCaptions(userContent);
      
      // Analyze hashtag performance
      const hashtagPerformance = await this.analyzeHashtagPerformance(userContent);
      
      // Identify content patterns
      const contentPatterns = this.identifyContentPatterns(userContent);
      
      // Calculate engagement metrics
      const engagementMetrics = this.calculateEngagementMetrics(userContent);

      return {
        topCaptions,
        hashtagPerformance,
        contentPatterns,
        engagementMetrics
      };

    } catch (error) {
      console.error('Error analyzing user content:', error);
      return this.getDefaultAnalysis();
    }
  }

  async getTrendingHashtags(
    platform: string,
    niche?: string,
    limit: number = 20
  ): Promise<TrendingHashtag[]> {
    try {
      // In a real implementation, this would:
      // 1. Query platform APIs for trending hashtags
      // 2. Filter by niche/category if specified
      // 3. Calculate reach estimates based on recent usage
      
      const trendingHashtags = await this.fetchTrendingHashtagsFromAPI(platform, niche, limit);
      const hashtagsWithReach = await this.calculateHashtagReach(trendingHashtags, platform);
      
      return hashtagsWithReach.map((hashtag, index) => ({
        tag: hashtag.tag,
        rank: index + 1,
        estimatedReach: hashtag.estimatedReach
      }));

    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return this.getDefaultTrendingHashtags(platform);
    }
  }

  async getDetailedPlatformAnalytics(
    userId: string,
    platform: string,
    timeRange: { start: string; end: string }
  ): Promise<DetailedPlatformMetrics> {
    try {
      // Fetch comprehensive analytics data
      const analyticsData = await this.fetchPlatformAnalytics(userId, platform, timeRange);
      
      return {
        audienceDemographics: {
          ageGroups: analyticsData.audienceDemographics.ageGroups,
          genderDistribution: analyticsData.audienceDemographics.genderDistribution,
          topCountries: analyticsData.audienceDemographics.topCountries,
          topCities: analyticsData.audienceDemographics.topCities
        },
        peakEngagementTimes: analyticsData.engagementTimes.peakTimes.map(peak => ({
          dayOfWeek: peak.day as any,
          hourOfDay: peak.hour,
          engagementScore: peak.score
        })),
        contentFormatPerformance: analyticsData.contentFormatMetrics.map(format => ({
          formatName: format.formatName,
          averageViews: format.averageViews,
          averageLikes: format.averageLikes,
          averageComments: format.averageComments,
          averageShares: format.averageShares,
          averageEngagementRate: format.averageEngagementRate,
          totalPosts: format.totalPosts
        }))
      };

    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      return this.getDefaultPlatformMetrics();
    }
  }

  private async fetchUserContent(
    userId: string,
    platform: string,
    timeRange: { start: string; end: string },
    limit: number
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_videos')
        .select(`
          *,
          video_processing_results (
            caption_analysis,
            hashtag_analysis,
            engagement_metrics
          )
        `)
        .eq('user_id', userId)
        .gte('uploaded_at', timeRange.start)
        .lte('uploaded_at', timeRange.end)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Database error fetching user content:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user content from database:', error);
      return [];
    }
  }

  private extractTopPerformingCaptions(content: any[]): string[] {
    if (content.length === 0) return [];

    // Sort content by engagement and extract captions
    const topContent = content
      .filter(item => item.caption && item.caption.trim())
      .sort((a, b) => {
        const engagementA = (a.view_count || 0) + (a.like_count || 0) * 2 + (a.comment_count || 0) * 3;
        const engagementB = (b.view_count || 0) + (b.like_count || 0) * 2 + (b.comment_count || 0) * 3;
        return engagementB - engagementA;
      })
      .slice(0, 10)
      .map(item => item.caption);

    return topContent;
  }

  private async analyzeHashtagPerformance(content: any[]): Promise<HashtagPerformanceData[]> {
    const hashtagMap = new Map<string, {
      count: number;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
    }>();

    // Aggregate hashtag data from content
    content.forEach(item => {
      const hashtags = this.extractHashtags(item.caption || '');
      const views = item.view_count || 0;
      const likes = item.like_count || 0;
      const comments = item.comment_count || 0;

      hashtags.forEach(hashtag => {
        const current = hashtagMap.get(hashtag) || {
          count: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0
        };

        hashtagMap.set(hashtag, {
          count: current.count + 1,
          totalViews: current.totalViews + views,
          totalLikes: current.totalLikes + likes,
          totalComments: current.totalComments + comments
        });
      });
    });

    // Convert to performance data
    const hashtagPerformance: HashtagPerformanceData[] = [];
    
    hashtagMap.forEach((data, hashtag) => {
      const averageViews = data.totalViews / data.count;
      const averageLikes = data.totalLikes / data.count;
      const averageEngagement = (data.totalLikes + data.totalComments) / Math.max(data.totalViews, 1);
      const estimatedReach = averageViews * 1.2; // Estimate based on views

      hashtagPerformance.push({
        hashtag,
        usageCount: data.count,
        averageViews,
        averageLikes,
        averageEngagement,
        estimatedReach
      });
    });

    // Sort by performance and assign ranks
    return hashtagPerformance
      .sort((a, b) => b.averageViews - a.averageViews)
      .slice(0, 15)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }

  private identifyContentPatterns(content: any[]): ContentPattern[] {
    const patterns = new Map<string, { frequency: number; performances: number[]; examples: string[] }>();

    content.forEach(item => {
      const caption = item.caption || '';
      const performance = this.calculateContentPerformance(item);
      
      // Identify patterns (simplified approach)
      const detectedPatterns = this.detectCaptionPatterns(caption);
      
      detectedPatterns.forEach(pattern => {
        const current = patterns.get(pattern) || { frequency: 0, performances: [], examples: [] };
        current.frequency++;
        current.performances.push(performance);
        if (current.examples.length < 3) {
          current.examples.push(caption.substring(0, 100) + '...');
        }
        patterns.set(pattern, current);
      });
    });

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency,
        averagePerformance: data.performances.reduce((sum, p) => sum + p, 0) / data.performances.length,
        examples: data.examples
      }))
      .sort((a, b) => b.averagePerformance - a.averagePerformance)
      .slice(0, 10);
  }

  private detectCaptionPatterns(caption: string): string[] {
    const patterns: string[] = [];
    
    // Simple pattern detection
    if (caption.includes('?')) patterns.push('Question format');
    if (caption.includes('!')) patterns.push('Exclamation');
    if (caption.match(/\d+.*step/i)) patterns.push('Step-by-step');
    if (caption.match(/how\s+to/i)) patterns.push('How-to tutorial');
    if (caption.match(/check\s+out/i)) patterns.push('Call to attention');
    if (caption.match(/\bemoji\b|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu)) {
      patterns.push('Contains emojis');
    }
    if (caption.match(/@\w+/)) patterns.push('Mentions others');
    if (caption.length < 50) patterns.push('Short caption');
    if (caption.length > 200) patterns.push('Long caption');

    return patterns;
  }

  private calculateContentPerformance(content: any): number {
    const views = content.view_count || 0;
    const likes = content.like_count || 0;
    const comments = content.comment_count || 0;
    const shares = content.share_count || 0;

    // Weighted performance score
    return views + (likes * 2) + (comments * 3) + (shares * 4);
  }

  private calculateEngagementMetrics(content: any[]): ContentEngagementMetrics {
    if (content.length === 0) {
      return {
        averageViews: 0,
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        engagementRate: 0,
        topPerformingFormats: []
      };
    }

    const totals = content.reduce((acc, item) => ({
      views: acc.views + (item.view_count || 0),
      likes: acc.likes + (item.like_count || 0),
      comments: acc.comments + (item.comment_count || 0),
      shares: acc.shares + (item.share_count || 0)
    }), { views: 0, likes: 0, comments: 0, shares: 0 });

    const averageViews = totals.views / content.length;
    const averageLikes = totals.likes / content.length;
    const averageComments = totals.comments / content.length;
    const averageShares = totals.shares / content.length;
    const engagementRate = (totals.likes + totals.comments + totals.shares) / Math.max(totals.views, 1);

    // Analyze format performance (simplified)
    const formatMap = new Map<string, number[]>();
    content.forEach(item => {
      const format = this.identifyContentFormat(item);
      const performance = this.calculateContentPerformance(item);
      
      if (!formatMap.has(format)) {
        formatMap.set(format, []);
      }
      formatMap.get(format)!.push(performance);
    });

    const topPerformingFormats = Array.from(formatMap.entries())
      .map(([format, performances]) => ({
        format,
        performance: performances.reduce((sum, p) => sum + p, 0) / performances.length
      }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 5);

    return {
      averageViews,
      averageLikes,
      averageComments,
      averageShares,
      engagementRate,
      topPerformingFormats
    };
  }

  private identifyContentFormat(content: any): string {
    // Simplified format identification based on available data
    const duration = content.duration || 0;
    
    if (duration === 0) return 'Static Image';
    if (duration < 15) return 'Short Video';
    if (duration < 60) return 'Medium Video';
    return 'Long Video';
  }

  private async fetchTrendingHashtagsFromAPI(platform: string, niche?: string, limit: number = 20): Promise<{ tag: string; usage: number }[]> {
    // Mock implementation - in reality, this would call platform APIs
    const baseTags = [
      '#viral', '#fyp', '#trending', '#love', '#instagood', '#photooftheday',
      '#beautiful', '#happy', '#cute', '#follow', '#followme', '#like4like',
      '#instadaily', '#friends', '#repost', '#nature', '#fun', '#style',
      '#smile', '#food'
    ];

    const nicheTags: Record<string, string[]> = {
      'tech': ['#technology', '#coding', '#programming', '#software', '#startup', '#innovation'],
      'fashion': ['#fashion', '#style', '#outfit', '#ootd', '#fashionista', '#clothing'],
      'fitness': ['#fitness', '#workout', '#gym', '#health', '#motivation', '#fit'],
      'food': ['#food', '#foodie', '#recipe', '#cooking', '#delicious', '#yummy'],
      'beauty': ['#beauty', '#makeup', '#skincare', '#cosmetics', '#beautycare', '#glam']
    };

    let tags = [...baseTags];
    if (niche && nicheTags[niche.toLowerCase()]) {
      tags = [...nicheTags[niche.toLowerCase()], ...baseTags];
    }

    return tags.slice(0, limit).map((tag, index) => ({
      tag,
      usage: Math.floor(Math.random() * 1000000) + 100000 - (index * 10000)
    }));
  }

  private async calculateHashtagReach(hashtags: { tag: string; usage: number }[], platform: string): Promise<{ tag: string; estimatedReach: number }[]> {
    return hashtags.map(hashtag => ({
      tag: hashtag.tag,
      estimatedReach: Math.floor(hashtag.usage * (0.1 + Math.random() * 0.3)) // 10-40% of usage as reach
    }));
  }

  private async fetchPlatformAnalytics(userId: string, platform: string, timeRange: { start: string; end: string }): Promise<PlatformAnalyticsData> {
    // Mock implementation - would integrate with platform analytics APIs
    return {
      audienceDemographics: {
        ageGroups: { '18-24': 0.35, '25-34': 0.40, '35-44': 0.15, '45-54': 0.08, '55+': 0.02 },
        genderDistribution: { 'female': 0.6, 'male': 0.38, 'other': 0.02 },
        topCountries: { 'US': 0.7, 'CA': 0.1, 'UK': 0.05, 'AU': 0.03, 'DE': 0.02 },
        topCities: { 'New York': 0.15, 'Los Angeles': 0.12, 'Toronto': 0.08, 'London': 0.05, 'Chicago': 0.04 }
      },
      engagementTimes: {
        hourlyDistribution: {
          '0': 0.02, '1': 0.01, '2': 0.01, '3': 0.01, '4': 0.01, '5': 0.02,
          '6': 0.03, '7': 0.05, '8': 0.07, '9': 0.08, '10': 0.06, '11': 0.05,
          '12': 0.08, '13': 0.06, '14': 0.05, '15': 0.06, '16': 0.07, '17': 0.08,
          '18': 0.10, '19': 0.12, '20': 0.09, '21': 0.07, '22': 0.05, '23': 0.03
        },
        dailyDistribution: {
          'Monday': 0.12, 'Tuesday': 0.13, 'Wednesday': 0.14, 'Thursday': 0.15,
          'Friday': 0.16, 'Saturday': 0.15, 'Sunday': 0.15
        },
        peakTimes: [
          { day: 'Friday', hour: 19, score: 1500 },
          { day: 'Saturday', hour: 15, score: 1400 },
          { day: 'Thursday', hour: 18, score: 1300 },
          { day: 'Wednesday', hour: 12, score: 1200 },
          { day: 'Tuesday', hour: 20, score: 1100 }
        ]
      },
      contentFormatMetrics: [
        {
          formatName: 'Short Video',
          averageViews: 15000,
          averageLikes: 1200,
          averageComments: 150,
          averageShares: 80,
          averageEngagementRate: 0.095,
          totalPosts: 45
        },
        {
          formatName: 'Medium Video',
          averageViews: 8000,
          averageLikes: 650,
          averageComments: 85,
          averageShares: 40,
          averageEngagementRate: 0.097,
          totalPosts: 20
        },
        {
          formatName: 'Static Image',
          averageViews: 5000,
          averageLikes: 400,
          averageComments: 50,
          averageShares: 25,
          averageEngagementRate: 0.095,
          totalPosts: 35
        }
      ]
    };
  }

  private getDefaultAnalysis(): UserContentAnalysis {
    return {
      topCaptions: [
        'Creating amazing content daily! ✨',
        'Behind the scenes of our latest project',
        'Tips and tricks for better engagement'
      ],
      hashtagPerformance: [
        { hashtag: '#content', usageCount: 5, averageViews: 1000, averageLikes: 80, averageEngagement: 0.08, estimatedReach: 1200, rank: 1 },
        { hashtag: '#creative', usageCount: 3, averageViews: 800, averageLikes: 60, averageEngagement: 0.075, estimatedReach: 960, rank: 2 }
      ],
      contentPatterns: [
        { pattern: 'Question format', frequency: 3, averagePerformance: 1500, examples: ['What do you think about...?', 'How would you handle...?'] },
        { pattern: 'Contains emojis', frequency: 8, averagePerformance: 1200, examples: ['Great day! ✨', 'Loving this view 🌅'] }
      ],
      engagementMetrics: {
        averageViews: 1000,
        averageLikes: 80,
        averageComments: 10,
        averageShares: 5,
        engagementRate: 0.095,
        topPerformingFormats: [
          { format: 'Short Video', performance: 1500 },
          { format: 'Static Image', performance: 800 }
        ]
      }
    };
  }

  private getDefaultTrendingHashtags(platform: string): TrendingHashtag[] {
    return [
      { tag: '#viral', rank: 1, estimatedReach: 1000000 },
      { tag: '#trending', rank: 2, estimatedReach: 800000 },
      { tag: '#fyp', rank: 3, estimatedReach: 600000 },
      { tag: '#love', rank: 4, estimatedReach: 500000 },
      { tag: '#instagood', rank: 5, estimatedReach: 400000 }
    ];
  }

  private getDefaultPlatformMetrics(): DetailedPlatformMetrics {
    return {
      audienceDemographics: {
        ageGroups: { '18-24': 0.3, '25-34': 0.4, '35-44': 0.2, '45+': 0.1 },
        genderDistribution: { 'female': 0.55, 'male': 0.43, 'other': 0.02 },
        topCountries: { 'US': 0.6, 'CA': 0.15, 'UK': 0.1, 'AU': 0.05, 'Other': 0.1 },
        topCities: { 'New York': 0.2, 'Los Angeles': 0.15, 'Toronto': 0.1, 'London': 0.08, 'Other': 0.47 }
      },
      peakEngagementTimes: [
        { dayOfWeek: 'Friday', hourOfDay: 18, engagementScore: 1200 },
        { dayOfWeek: 'Saturday', hourOfDay: 15, engagementScore: 1100 },
        { dayOfWeek: 'Wednesday', hourOfDay: 12, engagementScore: 950 }
      ],
      contentFormatPerformance: [
        {
          formatName: 'Short Video',
          averageViews: 10000,
          averageLikes: 800,
          averageComments: 100,
          averageShares: 50,
          averageEngagementRate: 0.095,
          totalPosts: 25
        },
        {
          formatName: 'Static Image',
          averageViews: 5000,
          averageLikes: 400,
          averageComments: 50,
          averageShares: 25,
          averageEngagementRate: 0.095,
          totalPosts: 40
        }
      ]
    };
  }
}