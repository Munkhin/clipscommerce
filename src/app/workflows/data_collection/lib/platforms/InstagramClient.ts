import { BasePlatformClient, HeaderValue } from './base-platform';
import { ApiConfig as PlatformSpecificApiConfig, ApiResponse, PlatformPostMetrics, PlatformUserActivity } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { ApiError, PlatformError, RateLimitError, ValidationError } from '../utils/errors';
import {
  InstagramMediaItem,
  InstagramMediaResponse,
  InstagramMediaResponseSchema,
  InstagramMediaInsight,
  InstagramMediaInsightsResponse,
  InstagramMediaInsightsResponseSchema,
  InstagramComment,
  InstagramCommentsResponse,
  InstagramCommentsResponseSchema,
  InstagramUserProfile,
  InstagramUserProfileSchema,
  InstagramApiErrorSchema // For direct error object validation if needed
} from './instagram.types';
import {
  InstagramMediaContainerParams,
  InstagramMediaContainerResponseSchema,
  InstagramPublishMediaResponseSchema,
  InstagramStoriesResponseSchema,
  InstagramPostMediaParams,
  InstagramPostStoryParams,
  InstagramMediaContainerResponse, // Added for return type
  InstagramPublishMediaResponse, // Added for return type
  InstagramStoriesResponse, // Added for return type
} from './instagram.types';

const INSTAGRAM_DEFAULT_TIMEOUT = 15000;
const INSTAGRAM_HOURLY_CALL_LIMIT = 200; // Default assumed hourly limit for user-level actions

export class InstagramClient extends BasePlatformClient {
  protected readonly platform: Platform = Platform.INSTAGRAM;

  constructor(
    platformConfigFromFactory: PlatformSpecificApiConfig,
    authTokenManager: IAuthTokenManager,
    userId?: string
  ) {
    const configForSuper: PlatformSpecificApiConfig = {
      baseUrl: platformConfigFromFactory.baseUrl, // e.g., 'https://graph.instagram.com'
      version: platformConfigFromFactory.version, // e.g., 'v19.0'
      rateLimit: platformConfigFromFactory.rateLimit,
      timeout: INSTAGRAM_DEFAULT_TIMEOUT,
    };
    super(configForSuper, authTokenManager, userId);
  }

  protected handleRateLimit(headers: Record<string, HeaderValue>): void {
    const appUsageHeaderValue = headers['x-app-usage']; // Standard app-level usage header

    if (appUsageHeaderValue) {
      let rawHeaderValue = appUsageHeaderValue;
      if (Array.isArray(rawHeaderValue)) { // HeaderValue can be string[]
        rawHeaderValue = rawHeaderValue[0];
      }

      this.log('debug', `Instagram API usage header (x-app-usage) found: ${rawHeaderValue}`, { headerKey: 'x-app-usage', value: rawHeaderValue });
      try {
        const parsedUsage = JSON.parse(rawHeaderValue as string);
        this.log('info', 'Parsed x-app-usage data:', parsedUsage);

        // Check for call_count, assuming it's a percentage of the hourly limit
        if (parsedUsage && typeof parsedUsage.call_count === 'number') {
          const callCountPercent = parsedUsage.call_count;
          
          // Ensure callCountPercent is within a reasonable range (e.g., 0-100, though API might exceed 100 before throttling)
          // We'll cap it at 100 for remaining calculation to avoid negative remaining if API reports >100%.
          const effectivePercent = Math.min(Math.max(callCountPercent, 0), 100);

          const callsMade = Math.round((effectivePercent / 100) * INSTAGRAM_HOURLY_CALL_LIMIT);
          const remainingCalls = INSTAGRAM_HOURLY_CALL_LIMIT - callsMade;

          const now = new Date();
          const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
          const resetTimestampSeconds = Math.floor(nextHour.getTime() / 1000);

          this.rateLimit = {
            limit: INSTAGRAM_HOURLY_CALL_LIMIT,
            remaining: remainingCalls,
            reset: resetTimestampSeconds,
          };
          this.log('info', 'Updated Instagram rate limit based on x-app-usage:', this.rateLimit);
          return; // Successfully updated rate limit
        } else {
          this.log('info', 'x-app-usage header parsed, but call_count not found or not a number.', { parsedUsage });
        }
      } catch (e) {
        this.log('warn', 'Failed to parse Instagram x-app-usage header', { headerValue: rawHeaderValue, error: e });
      }
    } else {
        this.log('debug', 'No x-app-usage header found. Other headers like x-business-use-case-usage could be checked here if needed.');
    }

    // If no specific Instagram headers were found or parsed successfully for rate limiting,
    // the existing this.rateLimit (from config) or BasePlatformClient's 429 handling will apply.
  }

  async getMyProfile(): Promise<ApiResponse<InstagramUserProfile>> {
    const url = `/me`;
    const params = { fields: 'id,username,account_type,media_count' };
    try {
      const axiosResponse = await this.client.get<unknown>(url, { params });
      const validationResult = InstagramUserProfileSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', 'Instagram API response validation failed for getMyProfile', {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed.', validationResult.error.issues);
      }
      // Check for API-level error within the successfully parsed structure
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in getMyProfile: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError); // Using apiError.code as statusCode from Instagram's error object
      }

      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getMyProfile');
    }
  }

  async getMyMedia(fields?: string, limit: number = 25, after?: string): Promise<ApiResponse<InstagramMediaResponse>> {
    const url = `/me/media`;
    const defaultFields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count';
    const params: Record<string, any> = {
      fields: fields || defaultFields,
      limit,
    };
    if (after) params.after = after;

    try {
      const axiosResponse = await this.client.get<unknown>(url, { params });
      const validationResult = InstagramMediaResponseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', 'Instagram API response validation failed for getMyMedia', {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed.', validationResult.error.issues);
      }
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in getMyMedia: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError); // Using apiError.code as statusCode from Instagram's error object
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getMyMedia');
    }
  }

  async getMediaInsights(mediaId: string, metrics?: string[]): Promise<ApiResponse<InstagramMediaInsightsResponse>> {
    const url = `/${mediaId}/insights`;
    // Default metrics; specific ones might require different permissions or account types.
    const defaultMetrics = 'impressions,reach,engagement,saved'; // video_views for VIDEO type
    const params = { metric: metrics ? metrics.join(',') : defaultMetrics };

    try {
      const axiosResponse = await this.client.get<unknown>(url, { params });
      const validationResult = InstagramMediaInsightsResponseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `Instagram API response validation failed for getMediaInsights (mediaId: ${mediaId})`, {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed.', validationResult.error.issues);
      }
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in getMediaInsights: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError); // Using apiError.code as statusCode from Instagram's error object
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getMediaInsights');
    }
  }

  async getMediaComments(mediaId: string, limit: number = 25, after?: string): Promise<ApiResponse<InstagramCommentsResponse>> {
    const url = `/${mediaId}/comments`;
    const params: Record<string, any> = { limit };
    if (after) params.after = after;

    try {
      const axiosResponse = await this.client.get<unknown>(url, { params });
      const validationResult = InstagramCommentsResponseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `Instagram API response validation failed for getMediaComments (mediaId: ${mediaId})`, {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed.', validationResult.error.issues);
      }
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in getMediaComments: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError); // Using apiError.code as statusCode from Instagram's error object
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getMediaComments');
    }
  }

  // Helper to centralize error response creation from caught errors
  // --- Content Publishing Methods ---

  /**
   * Creates a media container for an image, video, or carousel.
   * For CAROUSEL, 'children' should be an array of already created image/video container IDs.
   * For STORIES, use media_type: 'STORIES' and provide video_url or image_url.
   */
  async createMediaContainer(params: InstagramMediaContainerParams): Promise<ApiResponse<InstagramMediaContainerResponse>> {
    if (!this.userId) {
      throw new PlatformError(this.platform, 'User ID is required for creating media containers.', 'USER_ID_MISSING');
    }
    const url = `/${this.userId}/media`;
    const apiParams: Record<string, any> = { ...params };

    // Instagram API expects image_url or video_url at the top level for simple posts/stories
    // and within children for carousels (which are handled by providing container IDs in `children`)

    try {
      const axiosResponse = await this.client.post<unknown>(url, apiParams);
      const validationResult = InstagramMediaContainerResponseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', 'Instagram API response validation failed for createMediaContainer', {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed for createMediaContainer.', validationResult.error.issues);
      }
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in createMediaContainer: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError);
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'createMediaContainer');
    }
  }

  /**
   * Publishes a previously created media container.
   * @param creationId The ID of the media container (returned by createMediaContainer).
   */
  async publishMediaContainer(creationId: string): Promise<ApiResponse<InstagramPublishMediaResponse>> {
    if (!this.userId) {
      throw new PlatformError(this.platform, 'User ID is required for publishing media containers.', 'USER_ID_MISSING');
    }
    const url = `/${this.userId}/media_publish`;
    const params = { creation_id: creationId };

    try {
      const axiosResponse = await this.client.post<unknown>(url, params);
      const validationResult = InstagramPublishMediaResponseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', 'Instagram API response validation failed for publishMediaContainer', {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed for publishMediaContainer.', validationResult.error.issues);
      }
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in publishMediaContainer: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError);
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'publishMediaContainer');
    }
  }

  /**
   * Convenience method to post a single image or video.
   * This will create a container and then publish it.
   */
  async postMedia(params: InstagramPostMediaParams): Promise<ApiResponse<InstagramPublishMediaResponse>> {
    const containerParams: InstagramMediaContainerParams = {
      media_type: params.media_type,
      caption: params.caption,
    };
    if (params.media_type === 'IMAGE') {
      containerParams.image_url = params.url;
    } else if (params.media_type === 'VIDEO') {
      containerParams.video_url = params.url;
      containerParams.thumb_offset = params.thumb_offset;
    }

    const containerResponse = await this.createMediaContainer(containerParams);
    if (!containerResponse.data?.id) {
      // Error already handled and returned by createMediaContainer, rethrow or return it
      // For simplicity, assuming createMediaContainer throws on critical failure or returns error in data
      throw new PlatformError(this.platform, 'Failed to create media container in postMedia.', 'CONTAINER_CREATION_FAILED', containerResponse.error?.code);
    }
    return this.publishMediaContainer(containerResponse.data.id);
  }

  // --- Story Methods ---

  /**
   * Fetches the authenticated user's stories.
   * Note: Story insights are typically not available through this endpoint.
   */
  async getStories(limit: number = 25, after?: string): Promise<ApiResponse<InstagramStoriesResponse>> {
    if (!this.userId) {
      throw new PlatformError(this.platform, 'User ID is required for fetching stories.', 'USER_ID_MISSING');
    }
    // The endpoint for fetching stories is typically /me/stories or similar, using the user's ID.
    // Or it might be part of /me/media with a filter, depending on API version and specifics.
    // For this example, assuming /me/stories is the correct endpoint.
    // The Instagram Graph API for stories is often more restrictive or uses different mechanisms than regular posts.
    // Let's assume a dedicated endpoint for stories for clarity, though it might be /me/media with specific filters.
    const url = `/${this.userId}/stories`; 
    const params: Record<string, any> = {
      fields: 'id,media_type,media_url,thumbnail_url,timestamp,username', // Common fields for stories
      limit,
    };
    if (after) params.after = after;

    try {
      const axiosResponse = await this.client.get<unknown>(url, { params });
      const validationResult = InstagramStoriesResponseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', 'Instagram API response validation failed for getStories', {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, 'Instagram API response validation failed for getStories.', validationResult.error.issues);
      }
      if (validationResult.data.error) {
        const apiError = validationResult.data.error;
        this.log('error', `Instagram API error in getStories: ${apiError.message}`, apiError);
        throw new ApiError(this.platform, String(apiError.code), apiError.message, apiError.code, apiError);
      }
      return { data: validationResult.data, rateLimit: this.rateLimit || undefined };
    } catch (error) {
      return this.handleClientError(error, 'getStories');
    }
  }

  /**
   * Convenience method to post a single image or video as a story.
   */
  async postStory(params: InstagramPostStoryParams): Promise<ApiResponse<InstagramPublishMediaResponse>> {
    const containerParams: InstagramMediaContainerParams = {
      media_type: 'STORIES', // Explicitly set media_type for stories
    };
    if (params.media_type === 'IMAGE') {
      containerParams.image_url = params.url;
    } else if (params.media_type === 'VIDEO') {
      containerParams.video_url = params.url;
    }

    const containerResponse = await this.createMediaContainer(containerParams);
    if (!containerResponse.data?.id) {
      throw new PlatformError(this.platform, 'Failed to create story container in postStory.', 'CONTAINER_CREATION_FAILED', containerResponse.error?.code);
    }
    return this.publishMediaContainer(containerResponse.data.id);
  }

  // Helper to centralize error response creation from caught errors
  private handleClientError(error: any, methodName: string): ApiResponse<any> {
    this.log('error', `Error in ${methodName}:`, { error });
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof RateLimitError || error instanceof PlatformError) {
      return { error: { code: error.code, message: error.message, details: error.details }, rateLimit: this.rateLimit || undefined };
    }
    const genericError = new PlatformError(this.platform, 'CLIENT_SIDE_ERROR', error?.message || 'An unknown client-side error occurred.', { originalError: error });
    return { error: { code: genericError.code, message: genericError.message, details: genericError.details }, rateLimit: this.rateLimit || undefined };
  }
}
