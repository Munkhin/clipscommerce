// difficult: TikTok API has strict rate limits and authentication requirements
// Ensure proper error handling for rate limits and token refreshes

import { BasePlatformClient, HeaderValue } from './base-platform'; // Added HeaderValue
import { ApiConfig, ApiResponse, PlatformPostMetrics, PlatformUserActivity, PlatformPost, PlatformComment } from './types'; // Consolidated imports, Added PlatformComment
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { ApiError, PlatformError, RateLimitError } from '../utils/errors'; // Corrected error imports path
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

  // Default TikTok API configurations, can be overridden by platformConfigFromFactory
  // or further specialized if needed for BasePlatformClient's ApiConfig.
  private static readonly TIKTOK_DEFAULT_TIMEOUT = 20000; // Example: TikTok specific timeout

  constructor(
    platformConfigFromFactory: ApiConfig, // Contains baseUrl, version, rateLimit
    authTokenManager: IAuthTokenManager,
    userId?: string
  ) {
    // Construct the full ApiConfig required by BasePlatformClient's super() call.
    // BasePlatformClient has its own defaults for maxRetries, retryDelay, enableLogging, headers.
    // We provide what's specific to TikTok or override BasePlatformClient's defaults if necessary.
    const configForSuper: ApiConfig = {
      baseUrl: platformConfigFromFactory.baseUrl,
      version: platformConfigFromFactory.version,
      rateLimit: platformConfigFromFactory.rateLimit,
      timeout: TikTokClient.TIKTOK_DEFAULT_TIMEOUT, // Example of a TikTok-specific override
      // Other fields like maxRetries, retryDelay, etc., will use BasePlatformClient's defaults
      // unless specified here.
    };
    super(configForSuper, authTokenManager, userId);
  }

  // getAuthHeaders() is now handled by BasePlatformClient using IAuthTokenManager

  protected handleRateLimit(headers: Record<string, HeaderValue>): void {
    const limit = headers['x-ratelimit-limit'] as string;
    const remaining = headers['x-ratelimit-remaining'] as string;
    const reset = headers['x-ratelimit-reset'] as string; // Unix timestamp in seconds

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedRemaining = remaining ? parseInt(remaining, 10) : undefined;
    const parsedResetTimestamp = reset ? parseInt(reset, 10) : undefined; // Unix timestamp in seconds

    if (typeof parsedRemaining === 'number' && typeof parsedResetTimestamp === 'number') {
      this.rateLimit = {
        limit: typeof parsedLimit === 'number' ? parsedLimit : (this.rateLimit?.limit || 0), // Default to 0 if not provided initially
        remaining: parsedRemaining,
        reset: parsedResetTimestamp, // Store as Unix timestamp (number)
      };
      this.log('debug', `TikTok rate limit updated: ${JSON.stringify(this.rateLimit)}`, { headers });
    } else {
      this.log('warn', 'TikTok rate limit headers (remaining, reset) not found, incomplete, or invalid.', { headers });
    }
  }

  async getPostMetrics(postId: string): Promise<ApiResponse<PlatformPostMetrics>> {
    const url = `/video/query/`; // Relative to baseUrl in this.config
    const requestBody = {
      filters: {
        video_ids: [postId]
      },
      fields: [
        'id',
        'view_count',
        'like_count',
        'comment_count',
        'share_count',
        // 'average_watch_time', // Verify exact field name from TikTok docs if needed
        'duration', // Assuming 'duration' is the field name for video length
        'create_time'
      ]
    };

    try {
      // this.client.post will go through BasePlatformClient's interceptors
      // which handle auth, rate limits, retries, and basic response wrapping.
      const axiosResponse = await this.client.post<unknown>(url, requestBody); // Expect unknown for raw validation

      // Validate the raw response data using Zod
      const validationResult = TikTokVideoQueryResponsePayloadSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `TikTok API response validation failed for getPostMetrics (postId: ${postId})`, {
          errors: validationResult.error.flatten(),
          rawData: axiosResponse.data,
        });
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'TikTok API response validation failed.',
            details: validationResult.error.issues,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const tiktokResponseData = validationResult.data; // Use validated data

      if (tiktokResponseData.error && tiktokResponseData.error.code !== 'ok' && tiktokResponseData.error.code !== 0) {
        this.log('error', `TikTok API error in getPostMetrics for postId ${postId}: ${tiktokResponseData.error.message}`, tiktokResponseData.error);
        return {
          error: {
            code: tiktokResponseData.error.code, // Removed String() conversion
            message: tiktokResponseData.error.message,
            details: tiktokResponseData.error,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      // Assuming 'videos' is the array and we take the first one for the given postId
      const videoData = tiktokResponseData.videos?.[0] || tiktokResponseData.video;

      if (!videoData) {
        this.log('warn', `No video data found in TikTok response for postId ${postId}`, tiktokResponseData);
        return {
          error: { code: 'NOT_FOUND', message: 'Post not found or no data returned.' },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const metrics: PlatformPostMetrics = {
        id: videoData.id,
        views: videoData.view_count || 0,
        likes: videoData.like_count || 0,
        comments: videoData.comment_count || 0,
        shares: videoData.share_count || 0,
        // avgWatchTime: videoData.average_watch_time || 0, // Map if field name is confirmed
        timestamp: videoData.create_time ? new Date(videoData.create_time * 1000).toISOString() : new Date().toISOString(),
        // engagementRate can be calculated if needed: (likes + comments + shares) / views
      };

      return {
        data: metrics,
        rateLimit: this.rateLimit || undefined,
        // metadata would have been added by BasePlatformClient's interceptor if this.client.post returned full ApiResponse
        // Since this.client.post (axios instance) returns AxiosResponse, we are essentially re-building ApiResponse here.
        // This might need adjustment based on how BasePlatformClient's request method is structured.
        // For now, assuming BasePlatformClient's this.client.post returns AxiosResponse<TikTokVideoQueryResponsePayload>
        // and the ApiResponse wrapping happens here or in a utility function.
      };
    } catch (error) {
      // Error should have been processed by BasePlatformClient's handleError interceptor
      // and re-thrown as a custom error (PlatformError, ApiError, RateLimitError)
      // This catch block is a fallback or for specific handling if needed.
      this.log('error', `Failed to get post metrics for postId ${postId}`, { error });
      let errorCode: string = 'UNKNOWN_ERROR';
      let errorMessage: string = 'An unexpected error occurred.';
      let errorDetails: unknown = error;
      let responseStatusCode: number | string | undefined = undefined;

      if (error instanceof ApiError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        responseStatusCode = error.statusCode;
      } else if (error instanceof RateLimitError) {
        errorCode = error.code; // This will be 'RATE_LIMIT_EXCEEDED'
        errorMessage = error.message;
        // The RateLimitError constructor puts original statusCode into details
        errorDetails = error.details;
        if (typeof error.details === 'object' && error.details !== null && 'statusCode' in error.details) {
          responseStatusCode = (error.details as { statusCode?: number }).statusCode;
        }
      } else if (error instanceof PlatformError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        // PlatformError itself doesn't have a statusCode property
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        error: {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          ...(responseStatusCode !== undefined && { httpStatusCode: responseStatusCode }) // Add httpStatusCode if available
        },
        rateLimit: this.rateLimit || undefined
      };
    } // End catch for getPostMetrics
  } // End getPostMetrics method

  async getUserActivity(): Promise<ApiResponse<PlatformUserActivity>> {
    const url = `/user/info/`; // Relative to baseUrl in this.config

    try {
      const axiosResponse = await this.client.get<unknown>(url); // Expect unknown for raw validation

      // Validate the raw response data using Zod
      const validationResult = TikTokUserQueryResponsePayloadSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `TikTok API response validation failed for getUserActivity`, {
          errors: validationResult.error.flatten(),
          rawData: axiosResponse.data,
        });
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'TikTok API response validation failed.',
            details: validationResult.error.issues,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const tiktokResponseData = validationResult.data; // Use validated data

      if (tiktokResponseData.error && tiktokResponseData.error.code !== 'ok' && tiktokResponseData.error.code !== 0) {
        this.log('error', `TikTok API error in getUserActivity: ${tiktokResponseData.error.message}`, tiktokResponseData.error);
        return {
          error: {
            code: String(tiktokResponseData.error.code), // Ensure code is string
            message: tiktokResponseData.error.message,
            details: tiktokResponseData.error,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const userData = tiktokResponseData.user;

      if (!userData) {
        this.log('warn', `No user data found in TikTok response for getUserActivity`, tiktokResponseData);
        return {
          error: { code: 'NOT_FOUND', message: 'User data not found or no data returned.' },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const activity: PlatformUserActivity = {
        followerCount: userData.follower_count || 0,
        followingCount: userData.following_count || 0,
        postCount: userData.video_count || 0,
        lastUpdated: new Date().toISOString(),
      };

      return {
        data: activity,
        rateLimit: this.rateLimit || undefined,
      };
    } catch (error) {
      this.log('error', `Failed to get user activity`, { error });
      let errorCode: string = 'UNKNOWN_ERROR';
      let errorMessage: string = 'An unexpected error occurred.';
      let errorDetails: unknown = error;
      let responseStatusCode: number | string | undefined = undefined;

      if (error instanceof ApiError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        responseStatusCode = error.statusCode;
      } else if (error instanceof RateLimitError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        if (typeof error.details === 'object' && error.details !== null && 'statusCode' in error.details) {
          responseStatusCode = (error.details as { statusCode?: number }).statusCode;
        }
      } else if (error instanceof PlatformError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        error: {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          ...(responseStatusCode !== undefined && { httpStatusCode: responseStatusCode })
        },
        rateLimit: this.rateLimit || undefined
      };
    }
  }

  // Additional TikTok-specific methods can be added here
  async getVideoAnalytics(videoId: string): Promise<ApiResponse<PlatformPostMetrics>> {
    const url = `/video/query/`; // Aligning with getPostMetrics endpoint
    this.log('info', `Fetching video analytics for videoId: ${videoId} using ${url}`);

    const requestBody = {
      filters: {
        video_ids: [videoId] // Using videoId here
      },
      fields: [
        'id',
        'view_count',
        'like_count',
        'comment_count',
        'share_count',
        'duration',
        'create_time'
      ]
    };

    try {
      const axiosResponse = await this.client.post<unknown>(url, requestBody); // Expect unknown for raw validation

      // Validate the raw response data using Zod
      const validationResult = TikTokVideoQueryResponsePayloadSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `TikTok API response validation failed for getVideoAnalytics (videoId: ${videoId})`, {
          errors: validationResult.error.flatten(),
          rawData: axiosResponse.data,
        });
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'TikTok API response validation failed.',
            details: validationResult.error.issues,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const tiktokResponseData = validationResult.data; // Use validated data

      if (tiktokResponseData.error && tiktokResponseData.error.code !== 'ok' && tiktokResponseData.error.code !== 0) {
        this.log('error', `TikTok API error in getVideoAnalytics for videoId ${videoId}: ${tiktokResponseData.error.message}`, tiktokResponseData.error);
        return {
          error: {
            code: tiktokResponseData.error.code,
            message: tiktokResponseData.error.message,
            details: tiktokResponseData.error,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const videoData = tiktokResponseData.videos?.[0] || tiktokResponseData.video;

      if (!videoData) {
        this.log('warn', `No video data found in TikTok response for getVideoAnalytics (videoId: ${videoId})`, tiktokResponseData);
        return {
          error: { code: 'NOT_FOUND', message: 'Video analytics not found or no data returned.' },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const metrics: PlatformPostMetrics = {
        id: videoData.id,
        views: videoData.view_count || 0,
        likes: videoData.like_count || 0,
        comments: videoData.comment_count || 0,
        shares: videoData.share_count || 0,
        timestamp: videoData.create_time ? new Date(videoData.create_time * 1000).toISOString() : new Date().toISOString(),
      };

      return {
        data: metrics,
        rateLimit: this.rateLimit || undefined,
      };
    } catch (error) {
      this.log('error', `Failed to get video analytics for videoId ${videoId}`, { error });
      let errorCode: string = 'UNKNOWN_ERROR';
      let errorMessage: string = 'An unexpected error occurred.';
      let errorDetails: unknown = error;
      let responseStatusCode: number | string | undefined = undefined;

      if (error instanceof ApiError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        responseStatusCode = error.statusCode;
      } else if (error instanceof RateLimitError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        if (typeof error.details === 'object' && error.details !== null && 'statusCode' in error.details) {
          responseStatusCode = (error.details as { statusCode?: number }).statusCode;
        }
      } else if (error instanceof PlatformError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        error: {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          ...(responseStatusCode !== undefined && { httpStatusCode: responseStatusCode })
        },
        rateLimit: this.rateLimit || undefined
      };
    }
  }

  async getUserVideos(
    options?: {
      // userId?: string; // For TikTok's /video/list/, open_id is implicitly the authenticated user's
      cursor?: string; // TikTok's cursor is a number, typically starts at 0
      limit?: number;  // TikTok uses 'max_count', defaults to 10 or 20
    }
  ): Promise<ApiResponse<{ posts: PlatformPost[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const url = `/video/list/`; // Using /video/list/ endpoint for user's videos
    const maxCount = options?.limit || 20;
    const currentCursor = options?.cursor || '0'; // TikTok cursor is numeric string or number, starts at 0

    const requestParams = {
      fields: [
        'id',
        'video_description',
        'create_time',
        'duration',
        'view_count',
        'like_count',
        'comment_count',
        'share_count',
        'cover_image_url',
        'share_url',
        // 'title', // TikTok might not have a separate 'title' field, often video_description is used
        // 'embed_html', // Check if TikTok provides these for /video/list/
        // 'embed_link',
        // 'is_published',
      ].join(','),
      cursor: currentCursor,
      max_count: maxCount.toString(),
    };

    this.log('debug', `[TikTokClient] Fetching user videos with params: ${JSON.stringify(requestParams)}`);

    try {
      const axiosResponse = await this.client.get<unknown>(url, { params: requestParams });

      const validationResult = TikTokVideoQueryResponsePayloadSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `[TikTokClient] API response validation failed for getUserVideos`, {
          errors: validationResult.error.flatten(),
          rawData: axiosResponse.data,
        });
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'TikTok API response validation failed for getUserVideos.',
            details: validationResult.error.issues,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const tiktokResponseData = validationResult.data;

      if (tiktokResponseData.error && tiktokResponseData.error.code !== 'ok' && tiktokResponseData.error.code !== 0) {
        this.log('error', `[TikTokClient] API error in getUserVideos: ${tiktokResponseData.error.message}`, tiktokResponseData.error);
        return {
          error: {
            code: String(tiktokResponseData.error.code),
            message: tiktokResponseData.error.message,
            details: tiktokResponseData.error,
          },
          rateLimit: this.rateLimit || undefined,
        };
      }

      const platformPosts: PlatformPost[] = (tiktokResponseData.videos || []).map((video: TikTokVideoData): PlatformPost => ({
        id: video.id,
        platform: Platform.TIKTOK,
        // userId: this.userId, // The /video/list/ endpoint is for the authenticated user
        title: video.video_description, // Using video_description as title
        description: video.video_description,
        thumbnailUrl: video.cover_image_url,
        shareUrl: video.share_url,
        createdAt: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
        publishedAt: video.create_time ? new Date(video.create_time * 1000).toISOString() : undefined,
        type: 'video',
        metrics: {
          id: video.id,
          views: video.view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
          timestamp: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
        },
        // isPublished: video.is_published !== undefined ? video.is_published : true, // Assuming videos listed are published
        sourceData: video,
      }));

      this.log('debug', `[TikTokClient] Successfully fetched ${platformPosts.length} videos.`);

      return {
        data: {
          posts: platformPosts,
          nextPageCursor: tiktokResponseData.cursor?.toString(),
          hasMore: tiktokResponseData.has_more || false,
        },
        rateLimit: this.rateLimit || undefined,
      };
    } catch (error) {
      this.log('error', `[TikTokClient] Failed to get user videos from TikTok`, { error });
      let errorCode: string = 'UNKNOWN_ERROR';
      let errorMessage: string = 'An unexpected error occurred while fetching user videos from TikTok.';
      let errorDetails: unknown = error;

      if (error instanceof ApiError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
      } else if (error instanceof RateLimitError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
      } else if (error instanceof PlatformError) {
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        error: {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
        },
        rateLimit: this.rateLimit || undefined,
      };
    }
  } // End getUserVideos method

  async getVideoComments(
    postId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    this.log('warn', 'getVideoComments is not yet implemented for TikTokClient (./tiktok-client.ts). Returning stubbed response.', { postId, options });
    // Placeholder: Implement actual API call to TikTok for comments
    // For now, return an empty list with no pagination
    return Promise.resolve({
      data: {
        comments: [],
        nextPageCursor: undefined,
        hasMore: false,
      },
      rateLimit: this.rateLimit || undefined,
    });
  }
}
