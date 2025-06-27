import { BasePlatformClient } from './base-platform';
import { ApiConfig, ApiResponse, PlatformPostMetrics, PlatformUserActivity, PlatformPost, PlatformComment, RateLimit } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { ApiError, PlatformError, RateLimitError } from '../utils/errors';
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
        throw new ApiError(responseData.error.message, responseData.error.code, responseData.error);
      }

      const comments: Post[] = (responseData.comments || []).map((comment: any): Post => ({
        id: comment.id || comment.comment_id,
        postId: postId,
        userId: comment.user?.unique_id || comment.user?.user_id,
        userName: comment.user?.display_name || comment.user?.nickname,
        userProfileImageUrl: comment.user?.avatar_url,
        text: comment.text || comment.comment_text,
        likeCount: comment.like_count || 0,
        replyCount: comment.reply_comment_total || 0,
        publishedAt: comment.create_time ? new Date(comment.create_time * 1000).toISOString() : new Date().toISOString(),
        updatedAt: comment.update_time ? new Date(comment.update_time * 1000).toISOString() : undefined,
        platform: Platform.TIKTOK,
        sourceData: comment,
      }));

      this.log('debug', `[TikTokClient] Successfully fetched ${comments.length} comments for video ${postId}.`);

      return comments;
    } catch (error) {
      this.log('error', `[TikTokClient] Failed to get video comments for postId ${postId}`, { error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('An unexpected error occurred while fetching video comments from TikTok.', 500);
    }
  }

  async uploadContent(content: any): Promise<Post> {
    // TODO: Implement uploadContent for TikTok
    return {} as Post;
  }

  async getAnalytics(postId: string): Promise<Analytics> {
    // TODO: Implement getAnalytics for TikTok
    return {} as Analytics;
  }
}
