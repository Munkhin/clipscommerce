// difficult: Instagram's Graph API requires long-lived tokens and has complex permissions
// Pay special attention to token expiration and permission scopes

import { BasePlatformClient, HeaderValue } from './base-platform';
import { ApiConfig, ApiResponse, PlatformPostMetrics, PlatformUserActivity } from './types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { IAuthTokenManager } from '../auth.types';

export class InstagramClient extends BasePlatformClient {
  protected readonly platform: Platform = Platform.INSTAGRAM;
  private static readonly DEFAULT_CONFIG: ApiConfig = {
    baseUrl: 'https://graph.instagram.com',
    version: 'v12.0',
    rateLimit: {
      requests: 200,  // Instagram's standard rate limit
      perSeconds: 60  // Per hour, but we'll handle it per minute for better distribution
    }
  };

  constructor(config: Partial<ApiConfig>, authTokenManager: IAuthTokenManager, userId?: string) {
    super({ ...InstagramClient.DEFAULT_CONFIG, ...config }, authTokenManager, userId);
  }

  protected handleRateLimit(headers: Record<string, HeaderValue>): void {
    // HTTP headers are case-insensitive, so try lowercase
    const usageHeader = headers['x-app-usage'] || headers['X-App-Usage'];
    const usage = Array.isArray(usageHeader) ? usageHeader[0] : usageHeader;

    if (typeof usage !== 'string') return;

    try {
      const { call_count, total_cputime, total_time } = JSON.parse(usage);
      const threshold = 80; // Percentage threshold to start throttling
      
      // If any metric is above threshold, add a delay
      if (call_count > threshold || total_cputime > threshold || total_time > threshold) {
        const waitTime = 60000; // 1 minute
        this.requestQueue.unshift(() => 
          new Promise(resolve => setTimeout(resolve, waitTime))
        );
      }
    } catch (error) {
      console.error('Failed to parse rate limit headers:', error);
    }
  }

  private async ensureUserId(): Promise<string> {
    // The userId property is inherited from BasePlatformClient.
    // If it's already set, return it.
    if (this.userId) return this.userId;
    
    // If not set, fetch it and return. This method should not attempt to set this.userId directly
    // as it is managed by the base class. The consumer of this method should handle updating
    // the base client's userId if necessary after this call.
    const response = await this.request<{
      id: string;
    }>({ url: '/me', params: { fields: 'id' } });
    
    if (!response.data?.id) {
      throw new Error('Failed to fetch user ID');
    }
    
    return response.data.id;
  }

  async getPostMetrics(postId: string): Promise<ApiResponse<PlatformPostMetrics>> {
    const response = await this.request<any>({
      url: `/${postId}`,
      params: {
        fields: 'id,comments_count,like_count,media_product_type,media_type,media_url,permalink,timestamp,username,caption'
      },
    });

    if (response.status !== 200 || !response.data) {
      return { error: { code: response.status, message: response.statusText } };
    }

    const data = response.data;

    return {
      data: {
        id: data.id,
        views: data.video_views || 0,
        likes: data.like_count || 0,
        comments: data.comments_count || 0,
        shares: 0,
        timestamp: data.timestamp,
        engagementRate: this.calculateEngagementRate(data)
      }
    };
  }

  async getUserActivity(): Promise<ApiResponse<PlatformUserActivity>> {
    const userId = await this.ensureUserId();
    const response = await this.request<any>({
      url: `/${userId}`,
      params: {
        fields: 'account_type,media_count,username,media.limit(1){like_count,comments_count}'
      }
    });

    if (response.status !== 200 || !response.data) {
      return { error: { code: response.status, message: response.statusText } };
    }

    const data = response.data;

    return {
      data: {
        followerCount: data.followers_count || 0,
        followingCount: data.follows_count || 0,
        postCount: data.media_count || 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  private calculateEngagementRate(postData: any): number {
    if (!postData) return 0;
    
    const likes = postData.like_count || 0;
    const comments = postData.comments_count || 0;
    const views = postData.video_views || 1; // Avoid division by zero
    
    // Basic engagement rate calculation (can be customized)
    return (likes + comments) / views * 100;
  }

  // Additional Instagram-specific methods
  async getMediaInsights(mediaId: string): Promise<ApiResponse<any>> {
    const response = await this.request<any>({
      url: `/${mediaId}/insights`,
      params: {
        metric: 'engagement,impressions,reach,saved,video_views'
      }
    });

    if (response.status !== 200 || !response.data) {
      return { error: { code: response.status, message: response.statusText } };
    }

    return { data: response.data };
  }

  async getUserVideos(options?: { userId?: string; cursor?: string; limit?: number; }): Promise<ApiResponse<{ posts: any[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const targetUserId = options?.userId || await this.ensureUserId();
    const response = await this.request<any>({
      url: `/${targetUserId}/media`,
      params: {
        fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner',
        limit: options?.limit || 25,
        after: options?.cursor,
      }
    });

    if (response.status !== 200 || !response.data) {
      return { error: { code: response.status, message: response.statusText } };
    }

    const posts = response.data.data || [];
    const nextPageCursor = response.data.paging?.cursors?.after;
    const hasMore = !!nextPageCursor;

    return { data: { posts, nextPageCursor, hasMore } };
  }

  async getVideoComments(postId: string, options?: { cursor?: string; limit?: number; }): Promise<ApiResponse<{ comments: any[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const response = await this.request<any>({
      url: `/${postId}/comments`,
      params: {
        fields: 'id,username,text,timestamp',
        limit: options?.limit || 25,
        after: options?.cursor,
      }
    });

    if (response.status !== 200 || !response.data) {
      return { error: { code: response.status, message: response.statusText } };
    }

    const comments = response.data.data || [];
    const nextPageCursor = response.data.paging?.cursors?.after;
    const hasMore = !!nextPageCursor;

    return { data: { comments, nextPageCursor, hasMore } };
  }

  // Implementation of abstract methods from BasePlatformClient

  /**
   * Fetch posts from Instagram (alias for getUserVideos)
   */
  public async fetchPosts(options?: {
    userId?: string;
    cursor?: string;
    limit?: number;
    includeMetrics?: boolean;
  }): Promise<ApiResponse<{ posts: any[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const result = await this.getUserVideos(options);
    
    // If includeMetrics is true, fetch additional metrics for each post
    if (options?.includeMetrics && result.data?.posts) {
      const postsWithMetrics = await Promise.all(
        result.data.posts.map(async (post) => {
          const metricsResult = await this.getPostMetrics(post.id);
          return {
            ...post,
            metrics: metricsResult.data
          };
        })
      );
      result.data.posts = postsWithMetrics;
    }
    
    return result;
  }

  /**
   * Upload content to Instagram
   */
  public async uploadContent(content: {
    title?: string;
    description?: string;
    mediaUrl?: string;
    mediaFile?: Buffer | Blob;
    thumbnailUrl?: string;
    tags?: string[];
    scheduledPublishTime?: string;
  }, options?: {
    privacy?: 'public' | 'private' | 'unlisted';
    allowComments?: boolean;
    allowDownloads?: boolean;
    monetization?: boolean;
  }): Promise<ApiResponse<{ id: string; url?: string; status: string }>> {
    if (!content.mediaFile && !content.mediaUrl) {
      return {
        error: {
          code: 'MISSING_MEDIA',
          message: 'Either mediaFile or mediaUrl must be provided for upload'
        },
        rateLimit: this.rateLimit || undefined
      };
    }

    try {
      const userId = await this.ensureUserId();
      
      // Step 1: Create media container
      const containerUrl = `/${userId}/media`;
      const containerParams: any = {
        media_type: 'VIDEO',
        caption: content.description || content.title || '',
        video_url: content.mediaUrl // Instagram requires a public URL for videos
      };

      // Add thumbnail if provided
      if (content.thumbnailUrl) {
        containerParams.thumb_offset = '0'; // Default to first frame
      }

      // Handle scheduled publishing
      if (content.scheduledPublishTime) {
        const scheduleTime = Math.floor(new Date(content.scheduledPublishTime).getTime() / 1000);
        containerParams.published = false;
        containerParams.scheduled_publish_time = scheduleTime;
      }

      const containerResponse = await this.request<any>({
        url: containerUrl,
        method: 'POST',
        data: containerParams
      });

      if (containerResponse.status !== 200 || !containerResponse.data?.id) {
        return {
          error: {
            code: 'CONTAINER_CREATION_FAILED',
            message: 'Failed to create media container'
          },
          rateLimit: this.rateLimit || undefined
        };
      }

      const containerId = containerResponse.data.id;

      // Step 2: Publish the media (if not scheduled)
      if (!content.scheduledPublishTime) {
        const publishUrl = `/${userId}/media_publish`;
        const publishResponse = await this.request<any>({
          url: publishUrl,
          method: 'POST',
          data: {
            creation_id: containerId
          }
        });

        if (publishResponse.status !== 200 || !publishResponse.data?.id) {
          return {
            error: {
              code: 'PUBLISH_FAILED',
              message: 'Failed to publish media'
            },
            rateLimit: this.rateLimit || undefined
          };
        }

        return {
          data: {
            id: publishResponse.data.id,
            url: `https://www.instagram.com/p/${publishResponse.data.id}/`,
            status: 'published'
          },
          rateLimit: this.rateLimit || undefined
        };
      } else {
        return {
          data: {
            id: containerId,
            status: 'scheduled'
          },
          rateLimit: this.rateLimit || undefined
        };
      }
    } catch (error: any) {
      this.log('error', `Failed to upload content to Instagram`, { error: error.message, stack: error.stack });
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return {
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload content to Instagram'
        },
        rateLimit: this.rateLimit || undefined
      };
    }
  }

  /**
   * Get analytics data from Instagram
   */
  public async getAnalytics(options?: {
    dateRange?: { start: string; end: string };
    metrics?: string[];
    postIds?: string[];
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<ApiResponse<{
    overview?: {
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      engagementRate: number;
    };
    posts?: Array<{
      id: string;
      metrics: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        engagementRate: number;
      };
      timestamp: string;
    }>;
    timeSeries?: Array<{
      date: string;
      views: number;
      likes: number;
      comments: number;
      shares: number;
    }>;
  }>> {
    try {
      const userId = await this.ensureUserId();
      
      // Get user activity for overview stats
      const userActivityResult = await this.getUserActivity();
      let overview;

      if (userActivityResult.data) {
        // Instagram doesn't provide total engagement metrics at user level,
        // so we'll initialize with zero and aggregate from individual posts
        overview = {
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          engagementRate: 0
        };
      }

      // Get individual post metrics if postIds are provided
      let posts;
      if (options?.postIds && options.postIds.length > 0) {
        posts = await Promise.all(
          options.postIds.map(async (postId) => {
            const metricsResult = await this.getPostMetrics(postId);
            if (metricsResult.data) {
              const metrics = metricsResult.data;
              
              return {
                id: postId,
                metrics: {
                  views: metrics.views,
                  likes: metrics.likes,
                  comments: metrics.comments,
                  shares: metrics.shares,
                  engagementRate: metrics.engagementRate || 0
                },
                timestamp: metrics.timestamp
              };
            }
            return null;
          })
        );
        posts = posts.filter(post => post !== null);

        // Update overview with aggregated data from requested posts
        if (posts.length > 0 && overview) {
          overview.totalViews = posts.reduce((sum, post) => sum + post.metrics.views, 0);
          overview.totalLikes = posts.reduce((sum, post) => sum + post.metrics.likes, 0);
          overview.totalComments = posts.reduce((sum, post) => sum + post.metrics.comments, 0);
          overview.totalShares = posts.reduce((sum, post) => sum + post.metrics.shares, 0);
          overview.engagementRate = overview.totalViews > 0 ? 
            ((overview.totalLikes + overview.totalComments + overview.totalShares) / overview.totalViews) * 100 : 0;
        }
      }

      // Get insights data if date range is provided
      let timeSeries: Array<{
        date: string;
        views: number;
        likes: number;
        comments: number;
        shares: number;
      }> = [];

      if (options?.dateRange) {
        try {
          const insightsUrl = `/${userId}/insights`;
          const insightsResponse = await this.request<any>({
            url: insightsUrl,
            params: {
              metric: 'impressions,reach,profile_views,website_clicks',
              period: options.granularity === 'day' ? 'day' : 'days_28',
              since: Math.floor(new Date(options.dateRange.start).getTime() / 1000),
              until: Math.floor(new Date(options.dateRange.end).getTime() / 1000)
            }
          });

          if (insightsResponse.data?.data) {
            // Transform Instagram insights to our time series format
            timeSeries = insightsResponse.data.data.map((insight: any) => ({
              date: insight.end_time || new Date().toISOString(),
              views: insight.values?.[0]?.value || 0,
              likes: 0, // Instagram insights don't provide likes in time series
              comments: 0, // Instagram insights don't provide comments in time series
              shares: 0 // Instagram insights don't provide shares in time series
            }));
          }
        } catch (insightsError) {
          this.log('warn', 'Failed to fetch Instagram insights for time series data', { error: insightsError });
          // Continue without time series data
        }
      }

      return {
        data: {
          overview,
          posts,
          timeSeries
        },
        rateLimit: this.rateLimit || undefined
      };
    } catch (error: any) {
      this.log('error', `Failed to get analytics from Instagram`, { error: error.message, stack: error.stack });
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return {
        error: {
          code: 'ANALYTICS_FAILED',
          message: error.message || 'Failed to get analytics from Instagram'
        },
        rateLimit: this.rateLimit || undefined
      };
    }
  }
}
