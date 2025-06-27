import { Platform, PlatformAuth } from "@/types/platform";
import { Post, PostContent, PostStatus } from "@/types/schedule";

export abstract class PlatformApiClient {
  protected platform: Platform;
  protected auth: PlatformAuth;

  constructor(platform: Platform, auth: PlatformAuth) {
    this.platform = platform;
    this.auth = auth;
  }

  // Authentication
  abstract refreshToken(): Promise<PlatformAuth>;
  abstract validateCredentials(): Promise<boolean>;

  // Content Management
  abstract createPost(content: PostContent): Promise<{ id: string; status: PostStatus }>;
  abstract updatePost(postId: string, content: Partial<PostContent>): Promise<boolean>;
  abstract deletePost(postId: string): Promise<boolean>;
  abstract getPost(postId: string): Promise<Post | null>;
  
  // Scheduling
  abstract schedulePost(postId: string, publishAt: Date): Promise<boolean>;
  abstract getScheduledPosts(startDate: Date, endDate: Date): Promise<Post[]>;
  
  // Analytics
  abstract getPostInsights(postId: string): Promise<any>;
  abstract getPostsInsights(postIds: string[]): Promise<Record<string, any>>;
  abstract getAccountMetrics(): Promise<any>;
  
  // Comments & Engagement
  abstract getComments(postId: string): Promise<any[]>;
  abstract replyToComment(commentId: string, message: string): Promise<boolean>;
  abstract likeComment(commentId: string): Promise<boolean>;
  
  // User Management
  abstract getUserProfile(): Promise<any>;
  abstract getFollowers(): Promise<any[]>;
  abstract followUser(userId: string): Promise<boolean>;
  abstract unfollowUser(userId: string): Promise<boolean>;
  
  // Media Handling
  abstract uploadMedia(media: File | Blob, type: 'image' | 'video' | 'story'): Promise<{ id: string; url: string }>;
  abstract getMediaStatus(mediaId: string): Promise<{ status: 'processing' | 'succeeded' | 'failed'; url?: string }>;
  
  // Utility Methods
  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.auth.accessToken}`,
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { ...defaultHeaders, ...headers },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
          { cause: errorData }
        );
      }

      return response.json();
    } catch (error) {
      console.error(`Error in ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  // Token Refresh Logic
  protected async refreshAuth(): Promise<void> {
    try {
      const newAuth = await this.refreshToken();
      this.auth = newAuth;
      // In a real app, you'd want to persist the new tokens
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      throw new Error('Session expired. Please re-authenticate.');
    }
  }

  // Rate Limiting
  protected async handleRateLimit(
    requestFn: () => Promise<Response>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<Response> {
    let retries = 0;
    let lastError: any;

    while (retries < maxRetries) {
      try {
        const response = await requestFn();
        
        // If we hit rate limit, wait and retry
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('Retry-After') || '1');
          const delay = retryAfter * 1000 || baseDelay * Math.pow(2, retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error;
        retries++;
        const delay = baseDelay * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
}
