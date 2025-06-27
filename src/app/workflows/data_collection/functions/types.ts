// difficult: This file defines the core types and validation for the SCAN phase
import { z } from 'zod';
import { Platform as DeliverablePlatform } from '../../deliverables/types/deliverables_types';

export const PlatformSchema = z.nativeEnum(DeliverablePlatform);
export type Platform = DeliverablePlatform;

// Common error types
export type ApiError = {
  code: string;
  message: string;
  status?: number;
  retryAfter?: number;
};

export type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
  meta?: {
    requestId?: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      resetAt: Date;
    };
  };
};

// Helper to validate IANA timezone format
const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      // This will throw if the timezone is invalid
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch (e) {
      return false;
    }
  },
  { message: 'Invalid IANA timezone format' }
);

export const InstagramMediaProductTypeSchema = z.enum(['FEED', 'STORY', 'REELS']);
export type InstagramMediaProductType = z.infer<typeof InstagramMediaProductTypeSchema>;

// Common pagination interface
export interface Pagination {
  cursor?: string | null;
  hasMore: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
}

// Common response type for paginated results
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export const MetricsSchema = z.object({
  engagement: z.object({
    likes: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(),
    views: z.number().int().nonnegative(),
    saves: z.number().int().nonnegative().optional(),
    reach: z.number().int().nonnegative().optional(),
    impressions: z.number().int().nonnegative().optional(),
  }),
  // Add other metric categories as needed
}).optional();

export type Metrics = z.infer<typeof MetricsSchema>;

export const PostMetricsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
  platform: PlatformSchema,
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  watchTime: z.number().nonnegative().optional(),
  engagementRate: z.number().min(0).max(100),
  timestamp: z.union([z.date(), z.string().datetime()]).transform(val => new Date(val)),
  timezone: timezoneSchema.optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  url: z.string().url('Invalid post URL'),
  mediaProductType: InstagramMediaProductTypeSchema.optional(), // Primarily for Instagram
  storyReplies: z.number().int().nonnegative().optional(),
  storyExits: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional()
    .refine((val) => {
      if (!val) return true;
      const { title, thumbnail, duration, isShort, channelTitle, tags, videoTitle, ...rest } = val as any;
      return (
        (title === undefined || typeof title === 'string') &&
        (thumbnail === undefined || typeof thumbnail === 'string') &&
        (duration === undefined || typeof duration === 'number') &&
        (isShort === undefined || typeof isShort === 'boolean') &&
        (channelTitle === undefined || typeof channelTitle === 'string') &&
        (tags === undefined || (Array.isArray(tags) && tags.every(t => typeof t === 'string'))) &&
        (videoTitle === undefined || typeof videoTitle === 'string')
      );
    }, 'Invalid metadata structure'),
  metrics: MetricsSchema.optional()
});

export type PostMetrics = z.infer<typeof PostMetricsSchema>;

export const CompetitorSchema = z.object({
  id: z.string().min(1, 'Competitor ID is required'),
  username: z.string().min(1, 'Username is required'),
  platform: PlatformSchema,
  followerCount: z.number().int().nonnegative(),
  lastScraped: z.date().optional()
});

export type Competitor = z.infer<typeof CompetitorSchema>;

export const ScanStatusSchema = z.union([
  z.literal('pending'),
  z.literal('in_progress'),
  z.literal('completed'),
  z.literal('failed')
]);

export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const ScanMetricsSchema = z.object({
  totalPosts: z.number().int().nonnegative(),
  averageEngagement: z.number().min(0).max(100),
  peakTimes: z.array(z.object({
    hour: z.number().int().min(0).max(23),
    engagementScore: z.number().min(0)
  })),
  topPerformingPosts: z.array(PostMetricsSchema)
});

// Moving ScanResultSchema definition after ScanOptionsSchema

export const ScanOptionsSchema = z.object({
  platforms: z.array(PlatformSchema).nonempty('At least one platform is required'),
  competitors: z.array(z.string().min(1, 'Competitor ID cannot be empty')).optional(),
  lookbackDays: z.number().int().min(1).max(365).default(30),
  timezone: timezoneSchema.optional(),
  includeOwnPosts: z.boolean().default(true)
}).refine(
  (data) => data.platforms.length <= 3,
  'Maximum of 3 platforms can be scanned at once'
);

export type ScanOptions = z.infer<typeof ScanOptionsSchema>;

export const ScanResultSchema = z.object({
  id: z.string().min(1, 'Scan ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  timestamp: z.number().int().nonnegative(),
  status: ScanStatusSchema,
  options: ScanOptionsSchema,
  totalPosts: z.number().int().nonnegative().default(0),
  averageEngagement: z.number().nonnegative().default(0),
  peakTimes: z.array(z.object({
    hour: z.number().int().min(0).max(23),
    engagementScore: z.number().nonnegative(),
    day: z.number().int().min(1).max(31).optional(),
    dayOfWeek: z.string().optional(),
    timezone: z.string().optional()
  })).default([]),
  topPerformingPosts: z.array(PostMetricsSchema).default([]),
  completedAt: z.number().int().nonnegative().optional(),
  error: z.string().optional()
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

// Rate limiting types
export type RateLimit = {
  limit: number;
  remaining: number;
  resetAt: Date;
};

export type RateLimitConfig = {
  [key in Platform]: {
    requestsPerMinute: number;
    burstCapacity: number;
  };
};

export type BatchConfig = {
  batchSize: number;
  processingDelay: number;
  useParallelProcessing?: boolean;
};

// Cache types
export type CacheEntry<T> = {
  data: T;
  expiresAt: Date;
};

export type CacheConfig = {
  ttl: number;
  maxSize: number;
  staleWhileRevalidate?: number;
  compressionThreshold?: number;
  maxCacheSize?: number; // Added for compatibility with OptimizedPostAnalyzer
  namespace?: string;
  version?: string;
  environment?: string;
  volatility?: number;
};
