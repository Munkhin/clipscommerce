import { Platform } from "../../../deliverables/types/deliverables_types";
import { IAuthTokenManager } from "../auth.types";
import { ApiConfig, ApiResponse } from "./types";
import { BasePlatformClient, HeaderValue } from "./base-platform"; // Assuming ApiRateLimit is also exported from here or base

import {
  YouTubeVideoListResponseSchema,
  YouTubeVideoListResponse,
  YouTubeVideo,
  YouTubeCommentThreadListResponseSchema,
  YouTubeCommentThreadListResponse,
  YouTubeChannelListResponseSchema, // Added for channel list response schema
  YouTubeChannelListResponse, // Added for channel list response type
  YouTubeChannel, // Added for single channel details
} from './youtube.types';
import { PlatformError, RateLimitError, ApiError, ValidationError } from "../utils/errors";

export class YouTubeClient extends BasePlatformClient {
  protected readonly platform = Platform.YOUTUBE;
  private quotaUsed: number = 0;
  private quotaLimit: number = 10000; // Default YouTube quota per day
  private quotaResetTime: string = 'Midnight PST';

  constructor(config: ApiConfig, authTokenManager: IAuthTokenManager, userId?: string) {
    super(
      {
        ...config,
        baseUrl: config.baseUrl || 'https://www.googleapis.com/youtube/v3',
        // YouTube specific defaults can be added here if not in general config
      },
      authTokenManager,
      userId
    );
    this.log('info', 'YouTubeClient initialized', { userId });
  }

  protected handleRateLimit(headers: Record<string, HeaderValue>): void {
    // YouTube API uses a quota system. Standard rate limit headers (Limit, Remaining, Reset) are not typical.
    // This method will log any Google-specific headers (x-goog-*) that might provide context.
    const googleHeaders: Record<string, HeaderValue> = {};
    for (const key in headers) {
      if (key.toLowerCase().startsWith('x-goog-')) {
        googleHeaders[key] = headers[key];
      }
    }

    if (this.config.enableLogging && Object.keys(googleHeaders).length > 0) {
      this.log('debug', `YouTubeClient: Observed Google-specific headers.`, { googleHeaders });
    }
    // No direct update to this.rateLimit as YouTube quotas are not communicated this way.
    // Emit quota usage event for monitoring
    this.emit('quotaUsage', { quotaUsed: this.quotaUsed, quotaLimit: this.quotaLimit, resetTime: this.quotaResetTime });
  }

  private trackQuota(cost: number, correlationId?: string) {
    this.quotaUsed += cost;
    this.log('info', `YouTube quota used: ${this.quotaUsed}/${this.quotaLimit}`, { correlationId });
    if (this.quotaUsed > this.quotaLimit * 0.9) {
      this.emit('quotaLow', { quotaUsed: this.quotaUsed, quotaLimit: this.quotaLimit, resetTime: this.quotaResetTime });
    }
    if (this.quotaUsed >= this.quotaLimit) {
      this.emit('quotaExceeded', { quotaUsed: this.quotaUsed, quotaLimit: this.quotaLimit, resetTime: this.quotaResetTime });
    }
  }

  // Example method: Get Video Details
  public async getVideoDetails(videoId: string, correlationId?: string): Promise<ApiResponse<YouTubeVideo | null>> {
    this.trackQuota(1, correlationId);
    try {
      const response = await this.request<YouTubeVideoListResponse>({
        method: 'GET',
        url: '/videos',
        params: {
          part: 'snippet,status,contentDetails,statistics', // Customize as needed
          id: videoId,
        },
        useAuth: true, // Typically true for most YouTube Data API calls
      });

      const validationResult = YouTubeVideoListResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        this.log('error', 'YouTube API getVideoDetails validation error', { errors: validationResult.error.issues, videoId });
        throw new ValidationError(this.platform, 'Failed to validate video details response', validationResult.error.issues);
      }
      // Assuming the list response for a single ID returns one item
      const videoData = validationResult.data.items && validationResult.data.items.length > 0 ? validationResult.data.items[0] : null;
      return { data: videoData, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getVideoDetails');
    }
  }

  // Example method: Get Comments for a Video
  public async getVideoComments(videoId: string, maxResults: number = 20): Promise<ApiResponse<YouTubeCommentThreadListResponse>> {
    try {
      const response = await this.request<YouTubeCommentThreadListResponse>({
        method: 'GET',
        url: '/commentThreads',
        params: {
          part: 'snippet,replies',
          videoId: videoId,
          maxResults: maxResults,
          order: 'relevance', // or 'time'
        },
        useAuth: true,
      });

      const validationResult = YouTubeCommentThreadListResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        this.log('error', 'YouTube API getVideoComments validation error', { errors: validationResult.error.issues, videoId });
        throw new ValidationError(this.platform, 'Failed to validate video comments response', validationResult.error.issues);
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getVideoComments');
    }
  }

  private handleClientError(error: any, methodName: string): ApiResponse<any> {
    this.log('error', `Error in YouTubeClient.${methodName}:`, { error });
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof RateLimitError || error instanceof PlatformError) {
      return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
    }
    // Check for Google API specific error structure if error is from Axios
    if (error.isAxiosError && error.response?.data?.error) {
        const apiErrorData = error.response.data.error; // Contains code, message, errors[]

        // Check for quota exceeded errors specifically
        if (apiErrorData.errors && Array.isArray(apiErrorData.errors)) {
            const quotaErrorDetail = apiErrorData.errors.find((e: any) => 
                e.reason === 'quotaExceeded' || 
                e.reason === 'userRateLimitExceeded' || 
                e.reason === 'rateLimitExceeded' || // General rate limit reason
                e.domain === 'youtube.quota'
            );

            if (quotaErrorDetail) {
                this.log('warn', `YouTube API quota/rate limit exceeded in ${methodName}: ${quotaErrorDetail.message}`, { reason: quotaErrorDetail.reason, details: apiErrorData });
                const rateLimitError = new RateLimitError(
                    this.platform,
                    0, // Placeholder for retryAfter as YouTube daily quotas don't provide a specific backoff duration.
                    quotaErrorDetail.message || apiErrorData.message || 'YouTube API quota exceeded.',
                    error.response.status,
                    { // Details object
                        reason: quotaErrorDetail.reason || `youtube.quota.${apiErrorData.code || 'unknown'}`,
                        limit: null, 
                        remaining: null,
                        resetTime: 'Midnight PST', // YouTube daily quotas reset at a fixed time.
                        originalError: apiErrorData
                    }
                );
                return { error: { code: rateLimitError.code, message: rateLimitError.message, details: rateLimitError.details }, rateLimit: this.rateLimit || undefined };
            }
        }

        // If not a specific quota error, treat as a general ApiError
        const platformApiError = new ApiError(
            this.platform,
            String(apiErrorData.code || error.response.status),
            apiErrorData.message || 'Unknown YouTube API error',
            error.response.status,
            apiErrorData.errors || apiErrorData
        );
        return { error: { code: platformApiError.code, message: platformApiError.message, details: platformApiError.details }, rateLimit: this.rateLimit || undefined };
    }
    const genericError = new PlatformError(this.platform, 'CLIENT_SIDE_ERROR', error?.message || 'An unknown client-side error occurred.', { originalError: error });
    return { error: { code: genericError.code, message: genericError.message, details: genericError.details }, rateLimit: this.rateLimit || undefined };
  }

  // Example method: Get Channel Details
  public async getChannelDetails(channelId: string): Promise<ApiResponse<YouTubeChannel | null>> {
    try {
      const response = await this.request<YouTubeChannelListResponse>({
        method: 'GET',
        url: '/channels',
        params: {
          part: 'snippet,statistics,brandingSettings', // Adjust parts as needed
          id: channelId,
        },
        // zodSchema: YouTubeChannelListResponseSchema, // Removed from here
      });

      // Perform Zod validation on the response data
      const validationResult = YouTubeChannelListResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.log('error', `getChannelDetails response validation failed for channel ID ${channelId}`,
          { errors: validationResult.error.flatten(), rawData: response.data }
        );
        throw new ValidationError(this.platform, 'Failed to validate YouTube channel details response.', validationResult.error.issues);
      }

      const channelList = validationResult.data;
      const channel = channelList?.items && channelList.items.length > 0 ? channelList.items[0] : null;

      if (!channel) {
        this.log('warn', `Channel not found or empty response for ID: ${channelId}`);
        // Return a success response with null data, as per original logic if channel not found
        return { data: null, rateLimit: this.rateLimit || undefined }; 
      }

      return { data: channel, rateLimit: this.rateLimit || undefined };

    } catch (error) {
      // This catch block is for unexpected errors during the method execution itself,
      // or errors re-thrown from this.request (like ValidationError, ApiError, etc.)
      this.log('error', `Error in getChannelDetails for channel ID ${channelId}:`, { error });
      // Let BasePlatformClient.handleError (via this.request) or a specific handler like this.handleClientError deal with it.
      // For now, re-throwing to ensure it's caught by a generic handler if not already one of our custom errors.
      // Or, if this method is called directly and not part of the PlatformClient interface that expects specific ApiResponse format on error,
      // this re-throw is fine. If it needs to conform to returning ApiResponse on error, then use this.handleClientError.
      // Assuming this is a public helper not directly part of PlatformClient interface mandated returns:
      if (error instanceof ValidationError || error instanceof ApiError || error instanceof RateLimitError || error instanceof PlatformError) {
        throw error; // Re-throw known platform errors
      }
      // Wrap unknown errors
      throw new PlatformError(this.platform, 'GET_CHANNEL_DETAILS_FAILED', (error as Error).message, { originalError: error});
    }
  }

  // TODO: Implement other YouTube specific methods like uploadVideo, etc.

  /**
   * Uploads a video file to the authenticated YouTube channel.
   * NOTE: This is a simplified wrapper around the resumable upload flow.
   * For production usage consider googleapis library which handles token refresh and chunked uploads.
   */
  public async uploadVideo(params: {
    videoPath: string;
    title: string;
    description?: string;
    tags?: string[];
    privacyStatus?: 'private' | 'unlisted' | 'public';
  }): Promise<ApiResponse<{ videoId: string }>> {
    try {
      // In a real implementation we would initiate a resumable upload session
      // and stream the file. Here we return NOT_IMPLEMENTED to indicate stub.
      return {
        error: {
          code: 'NOT_IMPLEMENTED',
          message:
            'Resumable uploads require streaming and OAuth 2.0 scopes not provided in this client stub.',
          details: {
            hint: 'Use googleapis npm package or YouTube Data API direct HTTP with resumable uploads.',
          },
        },
      };
    } catch (error) {
      return this.handleClientError(error, 'uploadVideo');
    }
  }

}
