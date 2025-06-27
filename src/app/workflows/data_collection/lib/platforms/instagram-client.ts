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
}
