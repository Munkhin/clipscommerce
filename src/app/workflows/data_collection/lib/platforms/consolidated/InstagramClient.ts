import axios, { AxiosError, AxiosInstance } from 'axios';
import { InstagramApiMediaNode, InstagramApiUserNode } from '../../../types/instagramTypes';
import { 
  BasePlatformClient, Post, Analytics
} from '../base-platform';
import { Platform } from '@/types/platform';
import { ApiConfig, ApiCredentials, ApiResponse, PlatformPost, PlatformPostMetrics, PlatformUserActivity, PlatformComment } from '../types';
import { extractErrorMessage } from '@/lib/errors/errorHandling';

const INSTAGRAM_GRAPH_API_VERSION = 'v19.0';

interface InstagramApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export class InstagramClient extends BasePlatformClient {
  protected readonly platform: Platform = 'instagram';

  private static readonly DEFAULT_CONFIG: ApiConfig = {
    baseUrl: 'https://graph.instagram.com',
    version: INSTAGRAM_GRAPH_API_VERSION,
    rateLimit: {
      requests: 200,
      perSeconds: 3600, // Per hour
    },
    headers: {
      'Content-Type': 'application/json',
    },
  };

  protected client: AxiosInstance;

  constructor(authTokenManager: any, userId?: string, config: Partial<ApiConfig> = {}) {
    const mergedConfig = { ...InstagramClient.DEFAULT_CONFIG, ...config };
    super(mergedConfig, authTokenManager, userId);
    this.client = axios.create({
      baseURL: `${mergedConfig.baseUrl}/${mergedConfig.version}`,
      timeout: mergedConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        // access_token will be added by interceptor
      },
    });
    this.setupInterceptors();
  }


  protected setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(async (config) => {
      // Add auth token to all requests
      if (config.params?.access_token === undefined) {
        const authHeaders = await this.getAuthHeaders();
        if (config.headers) {
          Object.assign(config.headers, authHeaders);
        } else {
          config.headers = authHeaders as any;
        }
      }
      return config;
    });

    // Response interceptor - errors are handled by BasePlatformClient
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<InstagramApiErrorResponse>) => {
        if (error.response?.data?.error) {
          const apiError = error.response.data.error;
          console.error(
            `Instagram API Error: ${apiError.message} ` +
            `(Type: ${apiError.type || 'unknown'}, Code: ${apiError.code || 'N/A'})`
          );
        }
        return Promise.reject(error);
      }
    );
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    // Implement as async to match base class/interface
    return {
      'Authorization': `Bearer token`, // Replace with real token logic
    };
  }

  /**
   * Makes a GET request to the Instagram API
   * @param endpoint API endpoint (without base URL)
   * @param params Query parameters
   * @param options Request options
   */
  public async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const axiosResponse = await this.client.get<T>(endpoint, { params, ...options });
      return { data: axiosResponse.data };
    } catch (error: unknown) {
      let apiResponseError: ApiResponse<T>['error'];
      const operationDescription = `InstagramClient.get for endpoint '${endpoint}'`;

      if (axios.isAxiosError(error)) {
        const axiosErr = error as AxiosError<InstagramApiErrorResponse>;
        if (axiosErr.response?.data?.error) {
          const igError = axiosErr.response.data.error;
          apiResponseError = {
            code: igError.code,
            message: igError.message,
            details: igError,
          };
        } else if (axiosErr.response) {
          apiResponseError = {
            code: axiosErr.response.status,
            message: axiosErr.response.statusText || 'HTTP error',
            details: axiosErr.response.data,
          };
        } else {
          apiResponseError = {
            code: axiosErr.code || 'NETWORK_ERROR',
            message: extractErrorMessage(axiosErr),
          };
        }
      } else {
        apiResponseError = {
          code: 'UNKNOWN_CLIENT_ERROR',
          message: extractErrorMessage(error),
        };
      }

      this.log('error', `Error in ${operationDescription}: ${apiResponseError.message}`, {
          endpoint,
          params,
          errorCode: apiResponseError.code,
          errorDetails: apiResponseError.details,
          platform: this.platform
      });

      return { error: apiResponseError };
    }
  }

  /**
   * Fetches basic data about an Instagram user.
   * @param userId The Instagram User ID (defaults to 'me' for authenticated user).
   * @param fields Fields to retrieve (comma-separated string).
   * @returns User information or null if not found
   */
  async getUserInfo(userId: string = 'me', fields?: string): Promise<InstagramApiUserNode | null> {
    const defaultFields = 'id,username,account_type,media_count,followers_count,follows_count,name,profile_picture_url,biography,website';
    const response = await this.get<InstagramApiUserNode>(`/${userId}`, {
      fields: fields || defaultFields,
    });
    return response.data || null;
  }

  /**
   * Fetches recent media for an Instagram user.
   * @param userId The Instagram User ID (defaults to 'me' for authenticated user).
   * @param fields Fields to retrieve (comma-separated string).
   * @param limit Maximum number of media items to retrieve (default: 25, max: 100).
   * @returns Media items with pagination info or null on error
   */
  async getUserMedia(
    userId: string = 'me',
    fields?: string,
    limit: number = 25
  ): Promise<{ data: InstagramApiMediaNode[]; paging?: any } | null> {
    const defaultFields =
      'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner';
    const response = await this.get<{ data: InstagramApiMediaNode[]; paging?: any }>(
      `/${userId}/media`,
      {
        fields: fields || defaultFields,
        limit: Math.min(Math.max(1, limit), 100), // Ensure limit is between 1-100
      }
    );
    return response.data || null;
  }

  /**
   * Fetches details for a specific media item.
   * @param mediaId The ID of the media item.
   * @param fields Fields to retrieve (comma-separated string).
   * @returns Media details or null if not found
   */
  async getMediaDetails(mediaId: string, fields?: string): Promise<InstagramApiMediaNode | null> {
    const defaultFields =
      'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner';
    const response = await this.get<InstagramApiMediaNode>(`/${mediaId}`, {
      fields: fields || defaultFields,
    });
    return response.data || null;
  }

  /**
   * Handles pagination for API endpoints that support it.
   * @param paginationUrl The full URL for the next/previous page of results.
   * @returns Paginated data or null on error
   */
  async getPaginatedData<T>(paginationUrl: string): Promise<T | null> {
    try {
      const response = await axios.get<T>(paginationUrl, {
        timeout: this.config.timeout,
        headers: await this.getAuthHeaders(),
      });
      
      // Update rate limit from response headers if available
      if (response.headers) {
        const headers: Record<string, any> = {};
        Object.entries(response.headers).forEach(([key, value]) => {
          headers[key] = value as any;
        });
        this.handleRateLimit(headers);
      }
      
      return response.data as T;
    } catch (error) {
      const axiosError = error as AxiosError<InstagramApiErrorResponse>;
      if (axiosError.response?.data?.error) {
        const apiError = axiosError.response.data.error;
        console.error(`Instagram API Pagination Error: ${apiError.message}`);
      }
      return null;
    }
  }

  // PlatformClient interface stubs
  async getPostMetrics(postId: string): Promise<ApiResponse<PlatformPostMetrics>> {
    return { data: undefined };
  }
  async getUserActivity(): Promise<ApiResponse<PlatformUserActivity>> {
    return { data: undefined };
  }
  async getUserVideos(options?: { userId?: string; cursor?: string; limit?: number; }): Promise<ApiResponse<{ posts: PlatformPost[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const { userId = this.userId || 'me', cursor, limit = 25 } = options || {};
    
    const response = await this.get<{ data: InstagramApiMediaNode[]; paging?: any }>(
      `/${userId}/media`,
      {
        fields:
          'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count',
        limit,
        after: cursor,
      },
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
        this.log('warn', `InstagramClient.getUserVideos: No data object in response from get() for user ${userId}.`, { userId, cursor, limit });
        return {
            error: {
                code: 'NO_DATA_OBJECT',
                message: 'No data object in API response for user videos and no specific error was reported.'
            }
        };
    }

    const mediaItemsArray = response.data.data || [];
    const validMediaItems = mediaItemsArray.filter(
      (m): m is InstagramApiMediaNode & { timestamp: string } => typeof m.timestamp === 'string'
    );
    
    const posts: PlatformPost[] = validMediaItems.map((m) => ({
      id: m.id,
      platform: 'instagram',
      userId: userId,
      description: m.caption,
      mediaUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url,
      publishedAt: m.timestamp,
      createdAt: m.timestamp,
      type:
        m.media_type === 'VIDEO'
          ? 'video'
          : m.media_type === 'IMAGE'
          ? 'image'
          : m.media_type === 'CAROUSEL_ALBUM'
          ? 'carousel'
          : 'unknown',
      shareUrl: m.permalink,
      metrics: {
        id: m.id,
        views: 0,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        shares: 0,
        timestamp: m.timestamp,
      },
      sourceData: m,
    }));

    const paging = response.data.paging || {};
    return {
      data: {
        posts,
        nextPageCursor: paging?.cursors?.after,
        hasMore: !!paging?.next,
      },
    };
  }
  async getVideoComments(postId: string, options?: { cursor?: string; limit?: number; }): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    const { cursor, limit = 25 } = options || {};
    try {
      const response = await this.get<{ data: any[]; paging?: any }>(
        `/${postId}/comments`,
        {
          fields: 'id,text,username,timestamp,like_count',
          limit,
          after: cursor,
        },
      );

      const commentsArray = response.data?.data || [];
      const comments: PlatformComment[] = commentsArray.map((c: any) => ({
        id: c.id,
        postId,
        userName: c.username,
        text: c.text,
        likeCount: c.like_count,
        publishedAt: c.timestamp,
        platform: 'instagram',
        sourceData: c,
      }));

      const paging = (response as any)?.paging || {};
      return {
        data: {
          comments,
          nextPageCursor: paging?.cursors?.after,
          hasMore: !!paging?.next,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Implementation of abstract methods from BasePlatformClient
  protected handleRateLimit(headers: any): void {
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
      return []; // Placeholder implementation
    } catch (error) {
      this.log('error', 'Failed to fetch Instagram posts', error);
      return [];
    }
  }

  async uploadContent(content: any): Promise<Post> {
    try {
      this.log('info', 'Uploading content to Instagram', content);
      // Placeholder implementation
      return {
        id: 'placeholder-id',
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
      // Placeholder implementation
      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0
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

export default InstagramClient;
