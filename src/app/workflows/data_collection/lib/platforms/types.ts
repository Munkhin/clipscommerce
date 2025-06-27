import { Platform } from '../../../deliverables/types/deliverables_types';

// Base types for platform API integration
export interface ApiConfig {
  baseUrl: string;
  version: string;
  timeout?: number;
  rateLimit: {
    requests: number;
    perSeconds: number;
  };
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  enableLogging?: boolean;
  [key: string]: any; // Allow for additional config
}

export interface ApiCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ApiRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string | number; // Changed from number to string | number
    message: string;
    details?: unknown;
  };
  rateLimit?: ApiRateLimit;
}

export interface PlatformPostMetrics {
  id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avgWatchTime?: number;
  engagementRate?: number;
  timestamp: string;
}

export interface PlatformUserActivity {
  followerCount: number;
  followingCount: number;
  postCount: number;
  lastUpdated: string;
}

export interface PlatformPost {
  id: string; // Platform-specific post ID
  platform: Platform;
  userId?: string; // Platform-specific user ID of the creator
  title?: string;
  description?: string;
  mediaUrl?: string; // URL to the primary media (e.g., video URL) - Platform-specific availability
  thumbnailUrl?: string; // Optional, URL to the media thumbnail
  embedHtml?: string; // Optional, HTML for embedding the post
  shareUrl?: string; // Optional, URL to share the post
  publishedAt?: string; // ISO date string - when the post went live
  createdAt: string; // ISO date string - when the post was created on the platform
  updatedAt?: string; // ISO date string - when the post was last updated on the platform
  type: 'video' | 'image' | 'carousel' | 'text' | 'story' | 'reel' | 'unknown';
  metrics?: PlatformPostMetrics; // Can be fetched separately or included
  tags?: string[];
  location?: string;
  isPublished?: boolean;
  sourceData?: any; // Raw platform-specific post data for extensibility
}

export interface PlatformComment {
  id: string; // Platform-specific comment ID
  postId: string; // ID of the post the comment belongs to
  userId?: string; // Platform-specific user ID of the comment author
  userName?: string; // Display name of the comment author
  userProfileImageUrl?: string; // URL to author's profile image
  text: string; // The comment content
  likeCount?: number;
  replyCount?: number; // Number of direct replies to this comment
  publishedAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  parentId?: string; // Optional, if it's a reply to another comment (ID of parent comment)
  platform: Platform;
  sourceData?: any; // Raw platform-specific comment data for extensibility
}

// Platform specific types
// Platform enum is now imported from deliverables_types

export interface PlatformClient {
  getPostMetrics(postId: string): Promise<ApiResponse<PlatformPostMetrics>>;
  getUserActivity(): Promise<ApiResponse<PlatformUserActivity>>;
  getUserVideos(options?: {
    userId?: string; // Optional: specify user, otherwise defaults to authenticated user
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<{ posts: PlatformPost[]; nextPageCursor?: string; hasMore?: boolean }>>;
  getVideoComments(postId: string, options?: { cursor?: string; limit?: number; }): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>>;
  // Add other platform-specific methods as needed
}

export { Platform };
