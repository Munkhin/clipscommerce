import axios, { AxiosInstance } from "axios";
import { BasePlatformClient } from "../base-platform";
import {
  ApiConfig,
  ApiResponse,
  Platform,
  PlatformPost,
  PlatformPostMetrics,
  PlatformUserActivity,
  PlatformComment,
} from "../types";

interface TikTokApiErrorResponse {
  error: {
    code: string;
    message: string;
    log_id?: string;
  };
  [key: string]: any;
}

export class TikTokClient extends BasePlatformClient {
  protected client: AxiosInstance;
  protected readonly platform: Platform = Platform.TIKTOK;
  private static readonly DEFAULT_CONFIG: ApiConfig = {
    baseUrl: "https://open.tiktokapis.com",
    version: "v2",
    rateLimit: {
      requests: 5, // TikTok's standard rate limit per second
      perSeconds: 1,
    },
    headers: {
      "Content-Type": "application/json",
    },
  };

  constructor(
    authTokenManager: any,
    userId?: string,
    config: Partial<ApiConfig> = {},
  ) {
    const mergedConfig = { ...TikTokClient.DEFAULT_CONFIG, ...config };
    super(mergedConfig, authTokenManager, userId);

    this.client = axios.create({
      baseURL: `${mergedConfig.baseUrl}/${mergedConfig.version}`,
      timeout: mergedConfig.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  protected setupInterceptors() {
    // Request interceptor - add auth token to all requests
    this.client.interceptors.request.use((config) => {
      // Minimal: just return config
      return config;
    });

    // Response interceptor - just return response or error
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    );
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    // Implement as async to match base class/interface
    return {
      Authorization: `Bearer token`, // Replace with real token logic
    };
  }

  async getPostMetrics(
    postId: string,
  ): Promise<ApiResponse<PlatformPostMetrics>> {
    return { data: undefined };
  }
  async getUserActivity(): Promise<ApiResponse<PlatformUserActivity>> {
    return { data: undefined };
  }
  async getUserVideos(options?: {
    userId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<
    ApiResponse<{
      posts: PlatformPost[];
      nextPageCursor?: string;
      hasMore?: boolean;
    }>
  > {
    const { userId = this.userId || 'me', cursor, limit = 20 } = options || {};
    const response = await this.request<any>({
      method: 'GET',
      url: '/video/list/',
      params: {
        open_id: userId,
        cursor: cursor ?? 0,
        max_count: limit,
      },
      useAuth: true,
    });

    const videos: any[] = response.data?.data?.videos || [];
    const posts: PlatformPost[] = videos.map((v) => ({
      id: v.id,
      platform: Platform.TIKTOK,
      userId: userId,
      title: v.desc,
      description: v.desc,
      mediaUrl: v.video_url,
      thumbnailUrl: v.cover_url || undefined,
      publishedAt: new Date(v.create_time * 1000).toISOString(),
      createdAt: new Date(v.create_time * 1000).toISOString(),
      type: 'video',
      metrics: {
        id: v.id,
        views: v.stats?.play_count ?? 0,
        likes: v.stats?.digg_count ?? 0,
        comments: v.stats?.comment_count ?? 0,
        shares: v.stats?.share_count ?? 0,
        timestamp: new Date(v.create_time * 1000).toISOString(),
      },
      sourceData: v,
    }));

    return {
      data: {
        posts,
        nextPageCursor: response.data?.cursor,
        hasMore: response.data?.has_more ?? false,
      },
      rateLimit: this.rateLimit || undefined,
    };
  }
  async getVideoComments(
    postId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<
    ApiResponse<{
      comments: PlatformComment[];
      nextPageCursor?: string;
      hasMore?: boolean;
    }>
  > {
    const { cursor, limit = 20 } = options || {};
    const response = await this.request<any>({
      method: 'GET',
      url: '/video/comment/list/',
      params: {
        video_id: postId,
        cursor: cursor ?? 0,
        count: limit,
      },
      useAuth: true,
    });

    const returnedComments: any[] = response.data?.data?.comments || [];
    const comments: PlatformComment[] = returnedComments.map((c) => ({
      id: c.id,
      postId,
      userId: c.user_id,
      text: c.text,
      likeCount: c.digg_count,
      publishedAt: new Date(c.create_time * 1000).toISOString(),
      platform: Platform.TIKTOK,
      sourceData: c,
    }));

    return {
      data: {
        comments,
        nextPageCursor: response.data?.cursor,
        hasMore: response.data?.has_more ?? false,
      },
      rateLimit: this.rateLimit || undefined,
    };
  }

  // Minimal no-op handleRateLimit to satisfy abstract member requirement
  protected handleRateLimit(headers: Record<string, any>): void {
    // No-op for now
  }
}

export default TikTokClient;
