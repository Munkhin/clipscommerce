import { BasePlatformClient } from './base-platform';
import { Post, Analytics } from '@/types';
import { ApiConfig, ApiResponse, ApiRateLimit } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform, PlatformEnum } from '@/types/platform';

export class InstagramClient extends BasePlatformClient {
  protected readonly platform: Platform = PlatformEnum.INSTAGRAM;

  constructor(
    platformConfigFromFactory: ApiConfig,
    authTokenManager: IAuthTokenManager,
    userId?: string
  ) {
    super(platformConfigFromFactory, authTokenManager, userId);
  }

  protected handleRateLimit(headers: any): void {
    if (headers && headers['x-ratelimit-remaining'] && headers['x-ratelimit-reset']) {
      this.rateLimit = {
        limit: parseInt(headers['x-ratelimit-limit'], 10) || 1000,
        remaining: parseInt(headers['x-ratelimit-remaining'], 10),
        reset: parseInt(headers['x-ratelimit-reset'], 10) * 1000,
      };
    }
  }

  async fetchPosts(query: string): Promise<Post[]> {
    this.log('debug', `[InstagramClient] Fetching posts with query: ${query}`);
    
    try {
      const response = await this.request<any>({
        url: '/me/media',
        method: 'GET',
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,username',
          limit: 25
        }
      });

      const posts: Post[] = (response.data.data || []).map((item: any): Post => ({
        id: item.id,
        platform: this.platform.toString(),
        content: item.caption || '',
        mediaUrl: item.media_url,
        publishedAt: new Date(item.timestamp)
      }));

      this.log('debug', `[InstagramClient] Successfully fetched ${posts.length} posts`);
      return posts;
    } catch (error) {
      this.log('error', `[InstagramClient] Failed to fetch posts`, { error, query });
      throw error;
    }
  }

  async uploadContent(content: any): Promise<Post> {
    this.log('debug', `[InstagramClient] Uploading content`);
    
    try {
      // Instagram Graph API requires a two-step process for media upload
      // Step 1: Create media object
      const mediaResponse = await this.request<any>({
        url: '/me/media',
        method: 'POST',
        data: {
          image_url: content.mediaUrl,
          caption: content.caption,
          access_token: await this.authTokenManager.getToken()
        }
      });

      // Step 2: Publish the media
      const publishResponse = await this.request<any>({
        url: '/me/media_publish',
        method: 'POST',
        data: {
          creation_id: mediaResponse.data.id,
          access_token: await this.authTokenManager.getToken()
        }
      });

      const post: Post = {
        id: publishResponse.data.id,
        platform: this.platform.toString(),
        content: content.caption || '',
        mediaUrl: content.mediaUrl,
        publishedAt: new Date()
      };

      this.log('debug', `[InstagramClient] Successfully uploaded content with ID: ${post.id}`);
      return post;
    } catch (error) {
      this.log('error', `[InstagramClient] Failed to upload content`, { error });
      throw error;
    }
  }

  async getAnalytics(postId: string): Promise<Analytics> {
    this.log('debug', `[InstagramClient] Fetching analytics for post: ${postId}`);
    
    try {
      const response = await this.request<any>({
        url: `/${postId}/insights`,
        method: 'GET',
        params: {
          metric: 'impressions,reach,likes,comments,shares,saved'
        }
      });

      const metrics = response.data.data || [];
      const views = this.getMetricValue(metrics, 'impressions') || 0;
      const likes = this.getMetricValue(metrics, 'likes') || 0;
      const comments = this.getMetricValue(metrics, 'comments') || 0;
      const shares = this.getMetricValue(metrics, 'shares') || 0;
      
      const analytics: Analytics = {
        views,
        likes,
        comments,
        shares,
        engagementRate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0
      };

      this.log('debug', `[InstagramClient] Successfully fetched analytics for post ${postId}`, analytics);
      return analytics;
    } catch (error) {
      this.log('error', `[InstagramClient] Failed to fetch analytics for post ${postId}`, { error });
      // Return default analytics instead of throwing error
      return { views: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0 };
    }
  }

  private getMetricValue(metrics: any[], metricName: string): number {
    const metric = metrics.find(m => m.name === metricName);
    return metric?.values?.[0]?.value || 0;
  }
}
