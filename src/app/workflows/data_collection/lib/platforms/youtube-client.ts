import { BasePlatformClient, Post, Analytics } from './base-platform';
import { ApiConfig, ApiResponse, PlatformComment, PlatformPostMetrics, PlatformUserActivity, PlatformPost, ApiRateLimit } from './types';
import { YouTubeCommentThreadListResponseSchema, YouTubeCommentThread, YouTubeChannelListResponseSchema, YouTubeChannelListResponse, YouTubeVideoListResponseSchema, YouTubeVideoListResponse, YouTubeVideo, YouTubeCommentThreadListResponse, YouTubeChannel } from './youtube.types';
import { Platform, PlatformEnum } from '../../../deliverables/types/deliverables_types';
import { IAuthTokenManager } from '../auth.types';
import { ApiError, PlatformError, RateLimitError } from '../utils/errors';

export class YouTubeClient extends BasePlatformClient {
  public readonly platform: Platform = PlatformEnum.YOUTUBE;

  constructor(config: Partial<ApiConfig> = {}, authTokenManager: IAuthTokenManager, userId?: string) {
    super(config, authTokenManager, userId);
  }

  protected handleRateLimit(headers: any): void {
    this.log('info', 'YouTube does not provide standard rate limit headers. Quota is managed via the Google Cloud Console.');
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
        title: item.snippet.title,
        content: item.snippet.description,
        createdAt: new Date(item.snippet.publishedAt),
        author: {
          id: item.snippet.channelId,
          name: item.snippet.channelTitle
        }
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
        title: response.data.snippet.title,
        content: response.data.snippet.description,
        createdAt: new Date(),
        author: {
          id: 'current_user',
          name: 'Current User'
        }
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
        return { views: 0, likes: 0, comments: 0, shares: 0 };
      }

      const stats = videoData.statistics;
      const analytics: Analytics = {
        views: parseInt(stats.viewCount || '0', 10),
        likes: parseInt(stats.likeCount || '0', 10),
        comments: parseInt(stats.commentCount || '0', 10),
        shares: 0 // YouTube API doesn't provide share count directly
      };

      this.log('debug', `[YouTubeClient] Successfully fetched analytics for post ${postId}`, analytics);
      return analytics;
    } catch (error) {
      this.log('error', `[YouTubeClient] Failed to fetch analytics for post ${postId}`, { error });
      // Return default analytics instead of throwing error
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }
}

