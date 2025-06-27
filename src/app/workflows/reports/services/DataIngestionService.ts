import { SupabaseClient } from '@supabase/supabase-js';
import { PostPerformanceData } from '../types/EngagementTypes';

/**
 * Service for ingesting data from various social media platforms
 */
export class DataIngestionService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Ingest data from TikTok API
   */
  async ingestTikTokData(userId: string, accessToken: string): Promise<PostPerformanceData[]> {
    console.log(`Ingesting TikTok data for user: ${userId}`);
    
    try {
      // In a real implementation, you would call TikTok's API
      // For now, return mock data
      const mockData = this.generateMockTikTokData(userId);
      
      // Store in database
      await this.storePostData(mockData);
      
      return mockData;
    } catch (error) {
      console.error('Error ingesting TikTok data:', error);
      return [];
    }
  }

  /**
   * Ingest data from Instagram API
   */
  async ingestInstagramData(userId: string, accessToken: string): Promise<PostPerformanceData[]> {
    console.log(`Ingesting Instagram data for user: ${userId}`);
    
    try {
      // In a real implementation, you would call Instagram's Graph API
      const mockData = this.generateMockInstagramData(userId);
      
      // Store in database
      await this.storePostData(mockData);
      
      return mockData;
    } catch (error) {
      console.error('Error ingesting Instagram data:', error);
      return [];
    }
  }

  /**
   * Ingest data from YouTube API
   */
  async ingestYouTubeData(userId: string, accessToken: string): Promise<PostPerformanceData[]> {
    console.log(`Ingesting YouTube data for user: ${userId}`);
    
    try {
      // In a real implementation, you would call YouTube Data API
      const mockData = this.generateMockYouTubeData(userId);
      
      // Store in database
      await this.storePostData(mockData);
      
      return mockData;
    } catch (error) {
      console.error('Error ingesting YouTube data:', error);
      return [];
    }
  }

  /**
   * Ingest data from all connected platforms
   */
  async ingestAllPlatforms(
    userId: string,
    tokens: {
      tiktok?: string;
      instagram?: string;
      youtube?: string;
    }
  ): Promise<{
    tiktok: PostPerformanceData[];
    instagram: PostPerformanceData[];
    youtube: PostPerformanceData[];
  }> {
    const results = {
      tiktok: [] as PostPerformanceData[],
      instagram: [] as PostPerformanceData[],
      youtube: [] as PostPerformanceData[],
    };

    // Ingest from all platforms in parallel
    const promises = [];

    if (tokens.tiktok) {
      promises.push(
        this.ingestTikTokData(userId, tokens.tiktok).then(data => {
          results.tiktok = data;
        })
      );
    }

    if (tokens.instagram) {
      promises.push(
        this.ingestInstagramData(userId, tokens.instagram).then(data => {
          results.instagram = data;
        })
      );
    }

    if (tokens.youtube) {
      promises.push(
        this.ingestYouTubeData(userId, tokens.youtube).then(data => {
          results.youtube = data;
        })
      );
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Store post data in database
   */
  private async storePostData(posts: PostPerformanceData[]): Promise<void> {
    try {
      const dbRecords = posts.map(post => ({
        id: post.postId,
        platform: post.platform,
        created_at: post.publishedAt.toISOString(),
        caption: post.contentMetadata.caption,
        hashtags: post.contentMetadata.hashtags,
        duration: post.contentMetadata.duration,
        content_type: post.contentMetadata.contentType,
        topic: post.contentMetadata.topic,
        views: post.metrics.views,
        likes: post.metrics.likes,
        shares: post.metrics.shares,
        comments: post.metrics.comments,
        saves: post.metrics.saves,
        watch_time: post.metrics.watchTime,
        ctr: post.metrics.clickThroughRate,
        engagement_rate: post.metrics.engagementRate,
        audience_data: post.audienceData,
        external_factors: post.externalFactors,
      }));

      const { error } = await this.supabase
        .from('posts')
        .upsert(dbRecords, { onConflict: 'id' });

      if (error) {
        console.error('Error storing post data:', error);
      } else {
        console.log(`Stored ${posts.length} posts in database`);
      }
    } catch (error) {
      console.error('Error in storePostData:', error);
    }
  }

  /**
   * Generate mock TikTok data for development
   */
  private generateMockTikTokData(userId: string): PostPerformanceData[] {
    const posts: PostPerformanceData[] = [];
    const tiktokHashtags = ['#fyp', '#viral', '#trending', '#dance', '#comedy', '#duet'];

    for (let i = 0; i < 20; i++) {
      const views = Math.floor(Math.random() * 50000) + 1000;
      const likes = Math.floor(views * (Math.random() * 0.15 + 0.05));
      const comments = Math.floor(views * (Math.random() * 0.03 + 0.01));
      const shares = Math.floor(views * (Math.random() * 0.02 + 0.005));

      posts.push({
        postId: `tiktok-${userId}-${i}`,
        platform: 'tiktok',
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        contentMetadata: {
          caption: `TikTok video ${i} - Amazing content!`,
          hashtags: this.getRandomHashtags(tiktokHashtags, 3),
          duration: Math.floor(Math.random() * 45) + 15,
          contentType: Math.random() > 0.5 ? 'video' : 'short',
        },
        metrics: {
          views,
          likes,
          shares,
          comments,
          engagementRate: (likes + comments + shares) / views,
        },
        externalFactors: {
          trendingTopics: ['dance', 'comedy'],
          seasonality: 'normal',
          competitorActivity: Math.floor(Math.random() * 100),
        },
      });
    }

    return posts;
  }

  /**
   * Generate mock Instagram data for development
   */
  private generateMockInstagramData(userId: string): PostPerformanceData[] {
    const posts: PostPerformanceData[] = [];
    const instagramHashtags = ['#instagood', '#photooftheday', '#love', '#beautiful', '#fashion', '#art'];

    for (let i = 0; i < 15; i++) {
      const views = Math.floor(Math.random() * 20000) + 500;
      const likes = Math.floor(views * (Math.random() * 0.12 + 0.03));
      const comments = Math.floor(views * (Math.random() * 0.02 + 0.005));
      const shares = Math.floor(views * (Math.random() * 0.01 + 0.002));

      const contentTypes: Array<'image' | 'carousel' | 'reel'> = ['image', 'carousel', 'reel'];
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

      posts.push({
        postId: `instagram-${userId}-${i}`,
        platform: 'instagram',
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        contentMetadata: {
          caption: `Instagram post ${i} - Check out this amazing content! 📸`,
          hashtags: this.getRandomHashtags(instagramHashtags, 5),
          duration: contentType === 'reel' ? Math.floor(Math.random() * 30) + 15 : undefined,
          contentType,
        },
        metrics: {
          views,
          likes,
          shares,
          comments,
          saves: Math.floor(views * (Math.random() * 0.05 + 0.01)),
          engagementRate: (likes + comments + shares) / views,
        },
        audienceData: {
          demographics: {
            '18-24': 0.3,
            '25-34': 0.4,
            '35-44': 0.2,
            '45+': 0.1,
          },
          geographics: {
            'US': 0.4,
            'UK': 0.2,
            'CA': 0.15,
            'AU': 0.1,
            'Other': 0.15,
          },
          interests: ['fashion', 'lifestyle', 'photography'],
        },
      });
    }

    return posts;
  }

  /**
   * Generate mock YouTube data for development
   */
  private generateMockYouTubeData(userId: string): PostPerformanceData[] {
    const posts: PostPerformanceData[] = [];
    const youtubeHashtags = ['#tutorial', '#howto', '#education', '#tech', '#gaming', '#vlog'];

    for (let i = 0; i < 10; i++) {
      const views = Math.floor(Math.random() * 100000) + 2000;
      const likes = Math.floor(views * (Math.random() * 0.08 + 0.02));
      const comments = Math.floor(views * (Math.random() * 0.015 + 0.005));
      const shares = Math.floor(views * (Math.random() * 0.005 + 0.001));

      posts.push({
        postId: `youtube-${userId}-${i}`,
        platform: 'youtube',
        publishedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        contentMetadata: {
          caption: `YouTube video ${i} - Complete tutorial and guide`,
          hashtags: this.getRandomHashtags(youtubeHashtags, 4),
          duration: Math.floor(Math.random() * 600) + 120, // 2-12 minutes
          contentType: Math.random() > 0.8 ? 'short' : 'video',
          topic: ['tutorial', 'entertainment', 'education'][Math.floor(Math.random() * 3)],
        },
        metrics: {
          views,
          likes,
          shares,
          comments,
          watchTime: Math.floor(views * (Math.random() * 180 + 60)), // Average watch time
          clickThroughRate: Math.random() * 0.1 + 0.02,
          engagementRate: (likes + comments + shares) / views,
        },
      });
    }

    return posts;
  }

  /**
   * Get random hashtags from a list
   */
  private getRandomHashtags(hashtags: string[], count: number): string[] {
    const shuffled = [...hashtags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get trending topics for external factors
   */
  async getTrendingTopics(platform: string): Promise<string[]> {
    // In a real implementation, you would fetch from trending APIs
    const trendingByPlatform = {
      tiktok: ['dance', 'comedy', 'pets', 'food', 'diy'],
      instagram: ['fashion', 'travel', 'food', 'fitness', 'art'],
      youtube: ['gaming', 'tech', 'education', 'music', 'sports'],
    };

    return trendingByPlatform[platform as keyof typeof trendingByPlatform] || [];
  }

  /**
   * Schedule regular data ingestion
   */
  async scheduleDataIngestion(
    userId: string,
    tokens: { tiktok?: string; instagram?: string; youtube?: string },
    frequency: 'hourly' | 'daily' | 'weekly' = 'daily'
  ): Promise<string> {
    console.log(`Scheduling ${frequency} data ingestion for user: ${userId}`);
    
    // In a real implementation, you would set up a cron job or scheduled task
    // For now, return a mock schedule ID
    return `schedule-${userId}-${Date.now()}`;
  }
} 