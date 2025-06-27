// difficult: YouTube Data API has complex quota system and requires careful quota management
// Be mindful of quota costs for each API call

import { BasePlatformClient, HeaderValue } from './base-platform';
import { ApiConfig, ApiResponse, PlatformComment, PlatformPostMetrics, PlatformUserActivity, PlatformPost } from './types';
import { YouTubeCommentThreadListResponseSchema, YouTubeCommentThread, YouTubeChannelListResponseSchema, YouTubeChannelListResponse, YouTubeVideoListResponseSchema, YouTubeVideoListResponse, YouTubeVideo, YouTubeCommentThreadListResponse, YouTubeChannel } from './youtube.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { IAuthTokenManager } from '../auth.types';
import { ApiError, PlatformError, RateLimitError } from '../utils/errors';

export class YouTubeClient extends BasePlatformClient {
  public readonly platform: Platform = Platform.YOUTUBE;
  private static readonly DEFAULT_CONFIG: ApiConfig = {
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    version: 'v3',
    rateLimit: {
      requests: 10000,  // YouTube's quota limit is the main constraint, not request rate
      perSeconds: 60
    }
  };

  private channelId: string | null = null;

  constructor(config: Partial<ApiConfig> = {}, authTokenManager: IAuthTokenManager, userId?: string) {
    super({ ...YouTubeClient.DEFAULT_CONFIG, ...config }, authTokenManager, userId);
  }

  protected handleRateLimit(headers: Record<string, HeaderValue>): void {
    // YouTube uses a quota system. BasePlatformClient handles generic rate limit delays.
    // This method can be used to parse YouTube-specific quota headers and log them or update internal state if needed.
    const quotaUser = headers['x-goog-quota-user'] as string || headers['quota-user'] as string; // Google often uses 'x-goog-quota-user'
    const quotaRemaining = headers['x-ratelimit-remaining'] as string; // This header might not be standard for YouTube API quota

    this.log('debug', 'YouTube handleRateLimit called.', { quotaUser, quotaRemaining, allHeaders: headers });

    // Example: Update internal rateLimit object if specific headers are present
    // const limit = headers['x-youtube-quota-limit'] ? parseInt(headers['x-youtube-quota-limit'] as string, 10) : undefined;
    // const remaining = headers['x-youtube-quota-remaining'] ? parseInt(headers['x-youtube-quota-remaining'] as string, 10) : undefined;
    // const reset = headers['x-youtube-quota-reset'] ? parseInt(headers['x-youtube-quota-reset'] as string, 10) : undefined; // Assuming reset is a timestamp

    // if (limit !== undefined && remaining !== undefined && reset !== undefined) {
    //   this.rateLimit = { limit, remaining, reset };
    //   this.log('info', `YouTube quota updated: ${remaining}/${limit}, resets at ${new Date(reset * 1000).toISOString()}`);
    // } else if (quotaRemaining && parseInt(quotaRemaining, 10) < 100) {
    //   this.log('warn', `Low YouTube quota detected (generic header): ${quotaRemaining}. BaseClient handles retries/delays.`);
    // }
  }

  private async ensureChannelId(): Promise<string> {
    if (this.channelId) return this.channelId;

    const url = `${this.config.baseUrl}/channels`;
    try {
      const response = await this.request<YouTubeChannelListResponse>({
        url,
        method: 'GET',
        params: { part: 'id', mine: true },
      });

      // BasePlatformClient's request method throws for non-2xx, so response.data should exist.
      // Zod validation for the actual data structure
      const validationResult = YouTubeChannelListResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        this.log('error', 'ensureChannelId response validation failed', { error: validationResult.error.flatten(), data: response.data });
        throw new Error('Failed to validate channel ID response from YouTube.');
      }

      const channelData = validationResult.data;
      this.channelId = channelData.items?.[0]?.id || null;

      if (!this.channelId) {
        this.log('error', 'No channel ID found for the authenticated user in YouTube response.', { data: channelData });
        throw new Error('No channel found for the authenticated user on YouTube.');
      }
      return this.channelId;
    } catch (error: any) {
      this.log('error', 'Failed to fetch YouTube channel ID', { error: error.message, stack: error.stack });
      // Re-throw or handle as a more specific PlatformError if BaseClient doesn't already
      throw new Error(`Failed to fetch YouTube channel ID: ${error.message}`);
    }
  }

  async getPostMetrics(videoId: string): Promise<ApiResponse<PlatformPostMetrics>> {
    const url = `/videos`; // Relative to baseUrl from this.config
    try {
      const response = await this.request<YouTubeVideoListResponse>({
        // url is relative to baseUrl, so no need to prepend this.config.baseUrl
        url,
        method: 'GET',
        params: { part: 'snippet,statistics,contentDetails', id: videoId },
      });

      const validationResult = YouTubeVideoListResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        this.log('error', `getPostMetrics response validation failed for video ${videoId}`, { error: validationResult.error.flatten(), data: response.data });
        return { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Failed to validate video metrics response from YouTube.', 
            details: validationResult.error.flatten() 
          },
          rateLimit: this.rateLimit || undefined 
        };
      }

      const videoData = validationResult.data;
      const video: YouTubeVideo | undefined = videoData.items?.[0];

      if (!video) {
        this.log('warn', `Video not found: ${videoId}`, { responseData: videoData });
        return { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Video not found' 
          }, 
          rateLimit: this.rateLimit || undefined 
        };
      }

      return {
        data: {
          id: video.id, // Changed from postId
          views: parseInt(video.statistics?.viewCount || '0', 10),
          likes: parseInt(video.statistics?.likeCount || '0', 10),
          comments: parseInt(video.statistics?.commentCount || '0', 10),
          shares: 0, // YouTube API does not provide share count directly
          // avgWatchTime: this.parseDuration(video.contentDetails?.duration), // Example, ensure parseDuration exists and is correct
          timestamp: video.snippet?.publishedAt ? new Date(video.snippet.publishedAt).toISOString() : new Date().toISOString(),
        },
        rateLimit: this.rateLimit || undefined
      };
    } catch (error: any) {
      this.log('error', `Failed to fetch YouTube post metrics for video ${videoId}`, { error: error.message, stack: error.stack });
      // BasePlatformClient's request method should convert AxiosError to a structured error or rethrow it.
      // If it's already an ApiError/PlatformError from BaseClient, use its properties.
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return { 
        error: { 
          code: 'CLIENT_REQUEST_FAILED', 
          message: error.message || 'Failed to fetch post metrics due to client-side error.' 
        }, 
        rateLimit: this.rateLimit || undefined 
      };
    }
  }

  async getUserActivity(): Promise<ApiResponse<PlatformUserActivity>> {
    const channelId = await this.ensureChannelId();
    const url = `/channels`; // Relative to baseUrl
    
    try {
      const response = await this.request<YouTubeChannelListResponse>({
        url,
        method: 'GET',
        params: { part: 'statistics,snippet', id: channelId },
      });

      const validationResult = YouTubeChannelListResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        this.log('error', 'getUserActivity response validation failed', { error: validationResult.error.flatten(), data: response.data });
        return { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Failed to validate channel activity response from YouTube.', 
            details: validationResult.error.flatten() 
          },
          rateLimit: this.rateLimit || undefined
        };
      }
      
      const channelData = validationResult.data;
      const channel = channelData.items?.[0];

      if (!channel || !channel.statistics) {
        this.log('warn', 'Channel or channel statistics not found for getUserActivity', { channelId, responseData: channelData });
        return { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Channel not found or missing statistics for user activity.' 
          }, 
          rateLimit: this.rateLimit || undefined 
        };
      }

      const stats = channel.statistics;
      return {
        data: {
          followerCount: parseInt(stats.subscriberCount || '0', 10),
          followingCount: 0, // YouTube doesn't provide following count via API for channels
          postCount: parseInt(stats.videoCount || '0', 10),
          lastUpdated: new Date().toISOString() // Or use a timestamp from snippet if available and relevant
        },
        rateLimit: this.rateLimit || undefined
      };
    } catch (error: any) {
      this.log('error', `Failed to fetch YouTube user activity for channel ${channelId}`, { error: error.message, stack: error.stack });
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return { 
        error: { 
          code: 'CLIENT_REQUEST_FAILED', 
          message: error.message || 'Failed to fetch user activity due to client-side error.' 
        }, 
        rateLimit: this.rateLimit || undefined 
      };
    }
  }

  private parseDuration(isoDuration?: string): number | undefined { // Made isoDuration optional
    if (!isoDuration) return undefined;
    
    // Parse ISO 8601 duration format (e.g., PT1H2M3S)
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return undefined;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private calculateEngagementRate(stats: any): number {
    if (!stats) return 0;
    
    const views = parseInt(stats.viewCount || '1', 10);
    const likes = parseInt(stats.likeCount || '0', 10);
    const comments = parseInt(stats.commentCount || '0', 10);
    
    // Basic engagement rate calculation (can be customized)
    return ((likes + comments) / views) * 100;
  }

  // Additional YouTube-specific methods
  async getVideoAnalytics(videoId: string): Promise<ApiResponse<any>> {
    const url = `/videos`; // Relative to baseUrl, params specify the rest
    
    try {
      const response = await this.request<any>({
        url,
        method: 'GET',
        params: { part: 'statistics,contentDetails,status', id: videoId },
      });
      // Assuming the raw response.data is what we want for "any"
      // Add Zod validation here if a specific type is expected for analytics
      return {
        data: response.data,
        rateLimit: this.rateLimit || undefined,
      };
    } catch (error: any) {
      this.log('error', `Failed to fetch YouTube video analytics for video ${videoId}`, { error: error.message, stack: error.stack });
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return { 
        error: { 
          code: 'CLIENT_REQUEST_FAILED', 
          message: error.message || 'Failed to fetch video analytics due to client-side error.' 
        }, 
        rateLimit: this.rateLimit || undefined 
      };
    }
  }

  async getVideoComments(
    videoId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const { cursor: pageToken, limit = 20 } = options || {};
    const url = `/commentThreads`; // Relative to baseUrl

    try {
      const response = await this.request<YouTubeCommentThreadListResponse>({
        url,
        method: 'GET',
        params: {
          part: 'snippet,replies',
          videoId: videoId,
          maxResults: limit.toString(),
          order: 'relevance', 
          ...(pageToken && { pageToken }), // Conditionally add pageToken
        },
      });

      const validationResult = YouTubeCommentThreadListResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.log('error', 'YouTube API getVideoComments response validation error', { 
          videoId, 
          errors: validationResult.error.flatten(), 
          rawData: response.data 
        });
        return { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Failed to validate YouTube comment threads response.', 
            details: validationResult.error.flatten() 
          },
          rateLimit: this.rateLimit || undefined
        };
      }

      const youtubeData = validationResult.data;
      const comments: PlatformComment[] = (youtubeData.items || []).map((item: YouTubeCommentThread): PlatformComment => {
        const topLevelComment = item.snippet?.topLevelComment;
        return {
          id: topLevelComment?.id || item.id, // Fallback to thread ID if topLevelComment ID is missing
          postId: videoId,
          userId: topLevelComment?.snippet?.authorChannelId?.value,
          userName: topLevelComment?.snippet?.authorDisplayName,
          userProfileImageUrl: topLevelComment?.snippet?.authorProfileImageUrl,
          text: topLevelComment?.snippet?.textDisplay || '',
          likeCount: topLevelComment?.snippet?.likeCount,
          replyCount: item.replies?.comments?.length || item.snippet?.totalReplyCount || 0,
          publishedAt: topLevelComment?.snippet?.publishedAt ? new Date(topLevelComment.snippet.publishedAt).toISOString() : '',
          updatedAt: topLevelComment?.snippet?.updatedAt ? new Date(topLevelComment.snippet.updatedAt).toISOString() : undefined,
          platform: Platform.YOUTUBE,
          sourceData: item,
        };
      });

      return {
        data: {
          comments,
          nextPageCursor: youtubeData.nextPageToken,
          hasMore: !!youtubeData.nextPageToken,
        },
        rateLimit: this.rateLimit || undefined
      };
    } catch (error: any) {
      this.log('error', `Failed to fetch YouTube video comments for video ${videoId}`, { error: error.message, stack: error.stack });
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return { 
        error: { 
          code: 'CLIENT_REQUEST_FAILED', 
          message: error.message || 'Failed to fetch video comments due to client-side error.' 
        }, 
        rateLimit: this.rateLimit || undefined 
      };
    }
  }

  async getUserVideos(
    options?: {
      userId?: string; 
      cursor?: string;
      limit?: number;
    }
  ): Promise<ApiResponse<{ posts: PlatformPost[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const { userId = await this.ensureChannelId(), cursor: pageToken, limit = 20 } = options || {};
    this.log('warn', 'getUserVideos is not fully implemented for YouTubeClient. Using search.list as a placeholder.', { userId, pageToken, limit });

    // This is a placeholder using search.list which is more flexible but might not be the exact intent.
    // A more accurate implementation might use playlistItems for a specific playlist (e.g., uploads).
    const url = new URL(`${this.config.baseUrl}/search`);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('channelId', userId); // or forUsername for username
    url.searchParams.append('maxResults', limit.toString());
    url.searchParams.append('order', 'date'); // Most recent first
    url.searchParams.append('type', 'video');
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    try {
      const response = await this.request<any>({
        method: 'GET',
        url: url.toString(),
      });

      const rawData = response.data;
      // Basic transformation, a proper Zod schema for search results would be better here.
      const posts: PlatformPost[] = (rawData.items || []).map((item: any): PlatformPost => ({
        id: item.id.videoId,
        platform: Platform.YOUTUBE,
        userId: item.snippet.channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        createdAt: item.snippet.publishedAt, // Or a different creation timestamp if available
        type: 'video',
        sourceData: item,
      }));

      return {
        data: {
          posts,
          nextPageCursor: rawData.nextPageToken,
          hasMore: !!rawData.nextPageToken,
        },
        rateLimit: this.rateLimit || undefined,
      };

    } catch (error) {
      this.log('error', 'Failed to fetch user videos from YouTube', { error });
      // Error should be an ApiResponse by now from BasePlatformClient
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
         return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      // Fallback for unexpected errors
      return { error: { code: 'UNKNOWN_ERROR', message: (error as Error).message }, rateLimit: this.rateLimit || undefined };
    }
  }

  // Example method: Get Channel Details
  public async getChannelDetails(channelId: string): Promise<ApiResponse<YouTubeChannel | null>> {
    const url = `/channels`; // Relative to baseUrl
    try {
      const response = await this.request<YouTubeChannelListResponse>({
        url,
        method: 'GET',
        params: {
          part: 'snippet,statistics,brandingSettings', // Adjust parts as needed
          id: channelId,
        },
      });

      // Perform Zod validation on the response data
      const validationResult = YouTubeChannelListResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.log('error', `Channel data validation failed for channel ID ${channelId}`,
          { errors: validationResult.error.flatten(), rawData: response.data }
        );
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Failed to validate YouTube channel data response.',
            details: validationResult.error.flatten(),
          },
          rateLimit: this.rateLimit || undefined,
        };
      }
      const channelList = validationResult.data; 
      const channel = channelList?.items && channelList.items.length > 0 ? channelList.items[0] : null;

      if (!channel) {
        this.log('warn', `Channel not found or empty response for ID: ${channelId}`);
        return { data: null, rateLimit: this.rateLimit || undefined };
      }
      return { data: channel, rateLimit: this.rateLimit || undefined };

    } catch (error: any) { 
      this.log('error', `Unexpected error in getChannelDetails for channel ID ${channelId}:`, { error: error.message, stack: error.stack });
      // Ensure error is one of the known types or a generic one
      if (error instanceof ApiError || error instanceof PlatformError || error instanceof RateLimitError) {
        return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
      }
      return { 
        error: { 
          code: 'CLIENT_REQUEST_FAILED', 
          message: error.message || 'Failed to fetch channel details due to client-side error.' 
        }, 
        rateLimit: this.rateLimit || undefined 
      };
    }
  }

  // TODO: Implement other YouTube specific methods like uploadVideo, etc.
}
