import { BasePlatformClient, Post, Analytics } from './base-platform';
import { ApiConfig, PlatformComment, ApiResponse } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../../deliverables/types/deliverables_types';

export class InstagramClient extends BasePlatformClient {
  protected readonly platform: Platform = Platform.INSTAGRAM;

  constructor(
    platformConfigFromFactory: ApiConfig,
    authTokenManager: IAuthTokenManager,
    userId?: string
  ) {
    super(platformConfigFromFactory, authTokenManager, userId);
  }

  async getUserInfo(): Promise<any> {
    // Placeholder for fetching user info from Instagram
    return Promise.resolve({
      id: 'instagram-user-id',
      username: 'instagram_user',
      name: 'Instagram User',
    });
  }

  async listUserVideos(): Promise<any> {
    // Placeholder for fetching user videos from Instagram
    return Promise.resolve([]);
  }

  async postVideo(params: any): Promise<any> {
    // Placeholder for posting a video to Instagram
    console.log('Posting video to Instagram:', params);
    return Promise.resolve({
      id: 'instagram-post-id',
    });
  }

  async getVideoComments(
    postId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    this.log('warn', 'getVideoComments is not yet implemented for InstagramClient. Returning stubbed response.', { postId, options });
    return Promise.resolve({
      data: {
        comments: [],
        nextPageCursor: undefined,
        hasMore: false,
      },
      rateLimit: this.rateLimit === null ? undefined : this.rateLimit,
    });
  }

  // Implementation of abstract methods from BasePlatformClient
  protected handleRateLimit(headers: any): void {
    // Instagram Graph API rate limiting headers
    const rateLimitRemaining = headers['x-ratelimit-remaining'];
    const rateLimitLimit = headers['x-ratelimit-limit'];
    const rateLimitReset = headers['x-ratelimit-reset'];

    if (rateLimitLimit && rateLimitRemaining && rateLimitReset) {
      this.rateLimit = {
        limit: parseInt(rateLimitLimit, 10),
        remaining: parseInt(rateLimitRemaining, 10),
        reset: parseInt(rateLimitReset, 10)
      };
    }
  }

  async fetchPosts(query: string): Promise<Post[]> {
    try {
      this.log('info', `Fetching Instagram posts with query: ${query}`);
      
      // Basic implementation - in real scenario this would use Instagram Graph API
      const response = await this.request({
        method: 'GET',
        url: '/me/media',
        params: {
          fields: 'id,media_type,media_url,permalink,timestamp,caption',
          limit: 25
        }
      });

      const posts: Post[] = (response.data as any)?.data?.map((item: any) => ({
        id: item.id,
        platform: this.platform.toString(),
        content: item.caption || '',
        mediaUrl: item.media_url,
        publishedAt: new Date(item.timestamp),
        metrics: undefined // Would be fetched separately
      })) || [];

      return posts;
    } catch (error) {
      this.log('error', 'Failed to fetch Instagram posts', error);
      return [];
    }
  }

  async uploadContent(content: any): Promise<Post> {
    try {
      this.log('info', 'Uploading content to Instagram', content);
      
      // Basic implementation - actual implementation would use Instagram Graph API
      const response = await this.request({
        method: 'POST',
        url: '/me/media',
        data: {
          image_url: content.mediaUrl,
          caption: content.caption
        }
      });

      return {
        id: (response.data as any).id,
        platform: this.platform.toString(),
        content: content.caption || '',
        mediaUrl: content.mediaUrl,
        publishedAt: new Date()
      };
    } catch (error) {
      this.log('error', 'Failed to upload content to Instagram', error);
      throw error;
    }
  }

  async getAnalytics(postId: string): Promise<Analytics> {
    try {
      this.log('info', `Fetching analytics for Instagram post: ${postId}`);
      
      // Basic implementation - actual implementation would use Instagram Graph API
      const response = await this.request({
        method: 'GET',
        url: `/${postId}/insights`,
        params: {
          metric: 'engagement,impressions,reach,saved'
        }
      });

      const data = (response.data as any)?.data || [];
      const metrics = data.reduce((acc: any, metric: any) => {
        acc[metric.name] = metric.values[0]?.value || 0;
        return acc;
      }, {});

      return {
        views: metrics.impressions || 0,
        likes: metrics.engagement || 0,
        comments: 0, // Would need separate API call
        shares: 0, // Would need separate API call
        engagementRate: metrics.reach > 0 ? (metrics.engagement / metrics.reach) * 100 : 0
      };
    } catch (error) {
      this.log('error', 'Failed to fetch Instagram analytics', error);
      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0
      };
    }
  }
}