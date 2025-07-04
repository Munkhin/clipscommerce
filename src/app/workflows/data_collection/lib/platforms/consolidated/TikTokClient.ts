import axios, { AxiosInstance } from "axios";
import { BasePlatformClient, Post, Analytics } from "../base-platform";
import {
  ApiConfig,
  ApiResponse,
  PlatformPost,
  PlatformPostMetrics,
  PlatformUserActivity,
  PlatformComment,
} from "../types";
import { Platform, PlatformEnum } from '@/types/platform';
import { extractErrorMessage } from '@/lib/errors/errorHandling';

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
  protected readonly platform: Platform = PlatformEnum.TIKTOK;
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
    });

    const videos: any[] = response.data?.data?.videos || [];
    const posts: PlatformPost[] = videos.map((v) => ({
      id: v.id,
      platform: PlatformEnum.TIKTOK,
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
    });

    const returnedComments: any[] = response.data?.data?.comments || [];
    const comments: PlatformComment[] = returnedComments.map((c) => ({
      id: c.id,
      postId,
      userId: c.user_id,
      text: c.text,
      likeCount: c.digg_count,
      publishedAt: new Date(c.create_time * 1000).toISOString(),
      platform: PlatformEnum.TIKTOK,
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

  // Implementation of abstract methods from BasePlatformClient
  async fetchPosts(query: string): Promise<Post[]> {
    try {
      this.log('info', `Fetching TikTok posts with query: ${query}`);
      return []; // Placeholder implementation
    } catch (error: unknown) {
      this.log('error', 'Failed to fetch TikTok posts', extractErrorMessage(error));
      return [];
    }
  }

  async uploadContent(content: any): Promise<Post> {
    try {
      this.log('info', 'Uploading content to TikTok', content);
      // Placeholder implementation
      return {
        id: 'placeholder-id',
        platform: this.platform.toString(),
        content: content.description || '',
        mediaUrl: content.videoUrl,
        publishedAt: new Date()
      };
    } catch (error) {
      this.log('error', 'Failed to upload content to TikTok', error);
      throw error;
    }
  }

  async getAnalytics(postId: string): Promise<Analytics> {
    try {
      this.log('info', `Fetching analytics for TikTok post: ${postId}`);
      // Placeholder implementation
      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0
      };
    } catch (error) {
      this.log('error', 'Failed to fetch TikTok analytics', error);
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

export default TikTokClient;
