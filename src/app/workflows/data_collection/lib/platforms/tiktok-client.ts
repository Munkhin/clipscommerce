import { BasePlatformClient } from './base-platform';
import { ApiConfig, ApiResponse, PlatformPostMetrics, PlatformUserActivity, PlatformPost, PlatformComment, ApiRateLimit } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { ApiError, PlatformError, RateLimitError } from '../utils/errors';
import { Post, Analytics } from '@/types/platform';
import {
  TikTokVideoData,
  TikTokVideoQueryError,
  TikTokVideoQueryResponsePayload,
  TikTokUserData,
  TikTokUserQueryResponsePayload,
  TikTokVideoDataSchema,
  TikTokVideoQueryResponsePayloadSchema,
  TikTokUserQueryResponsePayloadSchema,
} from './tiktok.types';

export class TikTokClient extends BasePlatformClient {
  protected readonly platform: Platform = Platform.TIKTOK;

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
        remaining: parseInt(headers['x-ratelimit-remaining'], 10),
        reset: new Date(parseInt(headers['x-ratelimit-reset'], 10) * 1000),
      };
    }
  }

  async fetchPosts(postId: string): Promise<Post[]> {
    const url = `/video/comment/list/`;
    const maxCount = 20;
    const currentCursor = '0';

    const requestParams = {
      video_id: postId,
      cursor: currentCursor,
      count: maxCount.toString()
    };

    this.log('debug', `[TikTokClient] Fetching video comments for postId: ${postId}`, requestParams);

    try {
      const response = await this.request<any>({
        url,
        method: 'GET',
        params: requestParams,
      });

      const responseData = response.data;

      if (responseData.error && responseData.error.code !== 'ok' && responseData.error.code !== 0) {
        this.log('error', `[TikTokClient] API error in getVideoComments: ${responseData.error.message}`, responseData.error);
        throw new ApiError(Platform.TIKTOK, responseData.error.code, responseData.error.message, 400, responseData.error);
      }

      const comments: Post[] = (responseData.comments || []).map((comment: any): Post => ({
        id: comment.id || comment.comment_id,
        title: comment.text || comment.comment_text || 'TikTok Comment',
        content: comment.text || comment.comment_text || '',
        createdAt: comment.create_time ? new Date(comment.create_time * 1000) : new Date(),
        author: {
          id: comment.user?.unique_id || comment.user?.user_id || 'unknown',
          name: comment.user?.display_name || comment.user?.nickname || 'Unknown User'
        }
      }));

      this.log('debug', `[TikTokClient] Successfully fetched ${comments.length} comments for video ${postId}.`);

      return comments;
    } catch (error) {
      this.log('error', `[TikTokClient] Failed to get video comments for postId ${postId}`, { error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(Platform.TIKTOK, 'UNEXPECTED_ERROR', 'An unexpected error occurred while fetching video comments from TikTok.', 500);
    }
  }

  async uploadContent(content: any): Promise<Post> {
    this.log('debug', `[TikTokClient] Uploading content`);
    
    try {
      // TikTok API upload process
      const response = await this.request<any>({
        url: '/video/upload/',
        method: 'POST',
        data: {
          video_url: content.videoUrl,
          text: content.description,
          privacy_level: content.privacy || 'PUBLIC_TO_EVERYONE',
          disable_duet: content.disable_duet || false,
          disable_comment: content.disable_comment || false,
          disable_stitch: content.disable_stitch || false,
          brand_content_toggle: content.brand_content || false
        }
      });

      const responseData = response.data;

      if (responseData.error && responseData.error.code !== 'ok' && responseData.error.code !== 0) {
        this.log('error', `[TikTokClient] API error in uploadContent: ${responseData.error.message}`, responseData.error);
        throw new ApiError(Platform.TIKTOK, responseData.error.code, responseData.error.message, 400, responseData.error);
      }

      const post: Post = {
        id: responseData.data?.publish_id || responseData.publish_id || 'unknown',
        title: content.description ? content.description.substring(0, 100) : 'TikTok Video',
        content: content.description || '',
        createdAt: new Date(),
        author: {
          id: 'current_user',
          name: 'Current User'
        }
      };

      this.log('debug', `[TikTokClient] Successfully uploaded content with ID: ${post.id}`);
      return post;
    } catch (error) {
      this.log('error', `[TikTokClient] Failed to upload content`, { error });
      throw error;
    }
  }

  async getAnalytics(postId: string): Promise<Analytics> {
    this.log('debug', `[TikTokClient] Fetching analytics for post: ${postId}`);
    
    try {
      const response = await this.request<any>({
        url: `/video/data/`,
        method: 'GET',
        params: {
          fields: 'id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count',
          video_ids: postId
        }
      });

      const responseData = response.data;

      if (responseData.error && responseData.error.code !== 'ok' && responseData.error.code !== 0) {
        this.log('error', `[TikTokClient] API error in getAnalytics: ${responseData.error.message}`, responseData.error);
        throw new ApiError(Platform.TIKTOK, responseData.error.code, responseData.error.message, 400, responseData.error);
      }

      const videoData = responseData.data?.videos?.[0] || {};
      const analytics: Analytics = {
        views: videoData.view_count || 0,
        likes: videoData.like_count || 0,
        comments: videoData.comment_count || 0,
        shares: videoData.share_count || 0
      };

      this.log('debug', `[TikTokClient] Successfully fetched analytics for post ${postId}`, analytics);
      return analytics;
    } catch (error) {
      this.log('error', `[TikTokClient] Failed to fetch analytics for post ${postId}`, { error });
      // Return default analytics instead of throwing error
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }
}
