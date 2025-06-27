import { Platform } from "./platform";

export interface PostContent {
  text: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
  links: string[];
  customFields: Record<string, any>;
}

export type PostStatusType = 'draft' | 'scheduled' | 'published' | 'failed' | 'pending' | 'processing';

export interface PostStatus {
  status: PostStatusType;
  publishedAt?: Date;
  scheduledFor?: Date;
  error?: string;
  platformPostIds: Record<string, string>; // platform -> postId
}

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  linkClicks: number;
  videoViews?: number;
  viewTime?: number; // in seconds
  updatedAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  content: PostContent;
  platforms: Platform[];
  status: PostStatus;
  metrics: PostMetrics;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  tags: string[];
  campaignId?: string;
  parentPostId?: string; // For thread/reply posts
  isRepost: boolean;
  repostOriginalId?: string;
}

export interface ScheduleRule {
  id: string;
  userId: string;
  name: string;
  platforms: Platform[];
  schedule: {
    type: 'optimal' | 'specific' | 'interval' | 'recurring';
    times: string[]; // HH:mm format
    days?: number[]; // 0-6 (Sun-Sat)
    timezone: string;
  };
  contentRules: {
    minInterval: number; // in minutes
    maxPostsPerDay: number;
    shuffle: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueItem {
  id: string;
  postId: string;
  platform: Platform;
  scheduledFor: Date;
  status: PostStatusType;
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
