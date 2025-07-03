import { BasePlatformClient } from './base-platform';
import { Post, Analytics } from '@/types';
import { ApiConfig, ApiResponse, PlatformComment, PlatformPostMetrics, PlatformUserActivity, PlatformPost, ApiRateLimit, PlatformClient } from './types';
import { YouTubeCommentThreadListResponseSchema, YouTubeCommentThread, YouTubeChannelListResponseSchema, YouTubeChannelListResponse, YouTubeVideoListResponseSchema, YouTubeVideoListResponse, YouTubeVideo, YouTubeCommentThreadListResponse, YouTubeChannel } from './youtube.types';
import { Platform, PlatformEnum } from '@/types/platform';
import { IAuthTokenManager } from '../auth.types';
import { ApiError, PlatformError, RateLimitError } from '../utils/errors';

export class YouTubeClient extends BasePlatformClient implements PlatformClient {
  protected readonly platform: Platform = PlatformEnum.YOUTUBE;

  constructor(config: Partial<ApiConfig>, authTokenManager: IAuthTokenManager, userId?: string) {
    const fullConfig: ApiConfig = {
      baseUrl: config.baseUrl || 'https://www.googleapis.com/youtube/v3',
      version: config.version || 'v3',
      rateLimit: config.rateLimit || { requests: 100, perSeconds: 100 },
      timeout: config.timeout || 10000,
      ...config
    };
    super(fullConfig, authTokenManager, userId);
  }

  protected handleRateLimit(headers: any): void {
    // YouTube API uses quota system, not traditional rate limiting headers
    // Check for quota exceeded errors in the response
    if (headers['x-ratelimit-quota-remaining']) {
      const remaining = parseInt(headers['x-ratelimit-quota-remaining'], 10);
      const limit = parseInt(headers['x-ratelimit-quota-limit'] || '10000', 10);
      const reset = parseInt(headers['x-ratelimit-quota-reset'] || '0', 10);
      
      this.rateLimit = {
        limit,
        remaining,
        reset: reset || Date.now() + (24 * 60 * 60 * 1000) // Default to 24 hours if no reset time
      };
      
      this.log('info', `YouTube quota updated: ${remaining}/${limit} remaining`);
    } else {
      this.log('debug', 'YouTube quota headers not found. Quota is managed via Google Cloud Console.');
    }
  }

  async fetchPosts(query: string): Promise<Post[]> {
    this.log('debug', `[YouTubeClient] Fetching posts with query: ${query}`);
    
    try {
      const response = await this.request<any>({
        url: '/search',
        method: 'GET',
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 25,
          order: 'relevance'
        }
      });

      const posts: Post[] = (response.data.items || []).map((item: any): Post => ({
        id: item.id.videoId,
        platform: this.platform.toString(),
        content: item.snippet.description,
        mediaUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        publishedAt: new Date(item.snippet.publishedAt)
      }));

      this.log('debug', `[YouTubeClient] Successfully fetched ${posts.length} posts`);
      return posts;
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to fetch posts`, { error, query });
      throw error;
    }
  }

  async uploadContent(videoData: any): Promise<Post> {
    this.log('debug', `[YouTubeClient] Uploading content`);
    
    try {
      const response = await this.request<any>({
        url: '/videos',
        method: 'POST',
        params: {
          part: 'snippet,status'
        },
        data: {
          snippet: {
            title: videoData.title,
            description: videoData.description,
            tags: videoData.tags || [],
            categoryId: videoData.categoryId || '22' // People & Blogs
          },
          status: {
            privacyStatus: videoData.privacyStatus || 'public',
            embeddable: videoData.embeddable !== false,
            license: videoData.license || 'youtube'
          }
        }
      });

      const post: Post = {
        id: response.data.id,
        platform: this.platform.toString(),
        content: response.data.snippet.description,
        mediaUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
        publishedAt: new Date()
      };

      this.log('debug', `[YouTubeClient] Successfully uploaded content with ID: ${post.id}`);
      return post;
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to upload content`, { error });
      throw error;
    }
  }

  async getAnalytics(postId: string): Promise<Analytics> {
    this.log('debug', `[YouTubeClient] Fetching analytics for post: ${postId}`);
    
    try {
      // Get video statistics
      const response = await this.request<any>({
        url: '/videos',
        method: 'GET',
        params: {
          part: 'statistics',
          id: postId
        }
      });

      const videoData = response.data.items?.[0];
      if (!videoData) {
        this.log('warn', `[YouTubeClient] No data found for video ${postId}`);
        return { views: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0 };
      }

      const stats = videoData.statistics;
      const views = parseInt(stats.viewCount || '0', 10);
      const likes = parseInt(stats.likeCount || '0', 10);
      const comments = parseInt(stats.commentCount || '0', 10);
      const shares = 0; // YouTube API doesn't provide share count directly
      
      const analytics: Analytics = {
        views,
        likes,
        comments,
        shares,
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0
      };

      this.log('debug', `[YouTubeClient] Successfully fetched analytics for post ${postId}`, analytics);
      return analytics;
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to fetch analytics for post ${postId}`, { error });
      // Return default analytics instead of throwing error
      return { views: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0 };
    }
  }

  // Required PlatformClient interface methods
  async getPostMetrics(postId: string): Promise<ApiResponse<PlatformPostMetrics>> {
    this.log('debug', `[YouTubeClient] Getting post metrics for: ${postId}`);
    
    try {
      const analytics = await this.getAnalytics(postId);
      const metrics: PlatformPostMetrics = {
        id: postId,
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        engagementRate: analytics.engagementRate,
        timestamp: new Date().toISOString()
      };
      
      return {
        data: metrics,
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to get post metrics for ${postId}`, { error });
      throw error;
    }
  }

  async getUserActivity(): Promise<ApiResponse<PlatformUserActivity>> {
    this.log('debug', `[YouTubeClient] Getting user activity`);
    
    try {
      // Get channel statistics
      const response = await this.request<any>({
        url: '/channels',
        method: 'GET',
        params: {
          part: 'statistics',
          mine: true
        }
      });

      const channelData = response.data.items?.[0];
      if (!channelData) {
        this.log('warn', `[YouTubeClient] No channel data found`);
        return {
          data: {
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            lastUpdated: new Date().toISOString()
          },
          rateLimit: this.rateLimit === null ? undefined : this.rateLimit
        };
      }

      const stats = channelData.statistics;
      const activity: PlatformUserActivity = {
        followerCount: parseInt(stats.subscriberCount || '0', 10),
        followingCount: 0, // YouTube doesn't provide following count for channels
        postCount: parseInt(stats.videoCount || '0', 10),
        lastUpdated: new Date().toISOString()
      };

      return {
        data: activity,
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to get user activity`, { error });
      return {
        data: {
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          lastUpdated: new Date().toISOString()
        },
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    }
  }

  async getUserVideos(options?: {
    userId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<{ posts: PlatformPost[]; nextPageCursor?: string; hasMore?: boolean }>> {
    this.log('debug', `[YouTubeClient] Getting user videos`, { options });
    
    try {
      const response = await this.request<any>({
        url: '/search',
        method: 'GET',
        params: {
          part: 'snippet',
          forMine: true,
          type: 'video',
          maxResults: options?.limit || 25,
          pageToken: options?.cursor,
          order: 'date'
        }
      });

      const posts: PlatformPost[] = response.data.items?.map((item: any) => ({
        id: item.id.videoId,
        platform: 'youtube' as Platform,
        title: item.snippet.title,
        description: item.snippet.description,
        mediaUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnailUrl: item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        createdAt: item.snippet.publishedAt,
        type: 'video' as const,
        isPublished: true,
        sourceData: item
      })) || [];

      return {
        data: {
          posts,
          nextPageCursor: response.data.nextPageToken,
          hasMore: !!response.data.nextPageToken
        },
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to get user videos`, { error, options });
      return {
        data: {
          posts: [],
          nextPageCursor: undefined,
          hasMore: false
        },
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    }
  }

  async getVideoComments(
    postId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    this.log('debug', `[YouTubeClient] Getting video comments for: ${postId}`, { options });
    
    try {
      const response = await this.request<any>({
        url: '/commentThreads',
        method: 'GET',
        params: {
          part: 'snippet',
          videoId: postId,
          maxResults: options?.limit || 20,
          pageToken: options?.cursor,
          order: 'time'
        }
      });

      const comments: PlatformComment[] = response.data.items?.map((item: any) => {
        const snippet = item.snippet.topLevelComment.snippet;
        return {
          id: item.snippet.topLevelComment.id,
          postId: postId,
          userId: snippet.authorChannelId?.value,
          userName: snippet.authorDisplayName,
          userProfileImageUrl: snippet.authorProfileImageUrl,
          text: snippet.textDisplay,
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt,
          updatedAt: snippet.updatedAt,
          platform: 'youtube' as Platform,
          sourceData: item
        };
      }) || [];

      return {
        data: {
          comments,
          nextPageCursor: response.data.nextPageToken,
          hasMore: !!response.data.nextPageToken
        },
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to get video comments for ${postId}`, { error, options });
      return {
        data: {
          comments: [],
          nextPageCursor: undefined,
          hasMore: false
        },
        rateLimit: this.rateLimit === null ? undefined : this.rateLimit
      };
    }
  }
}

