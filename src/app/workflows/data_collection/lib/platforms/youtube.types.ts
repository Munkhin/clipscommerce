import { z } from 'zod';

// Basic YouTube API Error Schema
export const YouTubeApiErrorSchema = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
    errors: z.array(z.object({
      message: z.string(),
      domain: z.string(),
      reason: z.string(),
    })).optional(),
  }),
});
export type YouTubeApiError = z.infer<typeof YouTubeApiErrorSchema>;

// Video Snippet Schema (Commonly part of video resource)
export const YouTubeVideoSnippetSchema = z.object({
  publishedAt: z.string().datetime(),
  channelId: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnails: z.record(z.object({
    url: z.string().url(),
    width: z.number(),
    height: z.number(),
  })),
  channelTitle: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  liveBroadcastContent: z.string().optional(), // e.g., "none", "live", "upcoming"
  defaultLanguage: z.string().optional(),
  localized: z.object({
    title: z.string(),
    description: z.string(),
  }).optional(),
  defaultAudioLanguage: z.string().optional(),
});
export type YouTubeVideoSnippet = z.infer<typeof YouTubeVideoSnippetSchema>;

// Video Status Schema
export const YouTubeVideoStatusSchema = z.object({
  uploadStatus: z.string(), // e.g., "processed", "failed", "rejected"
  privacyStatus: z.string(), // e.g., "private", "public", "unlisted"
  license: z.string(),
  embeddable: z.boolean(),
  publicStatsViewable: z.boolean(),
  madeForKids: z.boolean().optional(),
  selfDeclaredMadeForKids: z.boolean().optional(),
});
export type YouTubeVideoStatus = z.infer<typeof YouTubeVideoStatusSchema>;

// Video Statistics Schema
export const YouTubeVideoStatisticsSchema = z.object({
  viewCount: z.string().optional(),
  likeCount: z.string().optional(),
  favoriteCount: z.string().optional(), // YouTube often uses 'favoriteCount' for public likes shown
  commentCount: z.string().optional(),
});
export type YouTubeVideoStatistics = z.infer<typeof YouTubeVideoStatisticsSchema>;

// Video ContentDetails Schema
export const YouTubeVideoContentDetailsSchema = z.object({
  duration: z.string().optional(), // ISO 8601 duration, e.g., PT1M30S
  dimension: z.string().optional(),
  definition: z.string().optional(), // e.g., "hd", "sd"
  caption: z.string().optional(), // e.g., "true", "false"
  licensedContent: z.boolean().optional(),
  projection: z.string().optional(), // e.g., "rectangular", "360"
});
export type YouTubeVideoContentDetails = z.infer<typeof YouTubeVideoContentDetailsSchema>;

// Video Resource Schema (Simplified)
export const YouTubeVideoSchema = z.object({
  kind: z.literal('youtube#video'),
  etag: z.string(),
  id: z.string(), // Video ID
  snippet: YouTubeVideoSnippetSchema.optional(),
  status: YouTubeVideoStatusSchema.optional(),
  statistics: YouTubeVideoStatisticsSchema.optional(), // Added statistics
  contentDetails: YouTubeVideoContentDetailsSchema.optional(), // Added contentDetails
  // Add other parts like contentDetails, statistics as needed
});
export type YouTubeVideo = z.infer<typeof YouTubeVideoSchema>;

export const YouTubeVideoListResponseSchema = z.object({
  kind: z.literal('youtube#videoListResponse'),
  etag: z.string(),
  items: z.array(YouTubeVideoSchema),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
});
export type YouTubeVideoListResponse = z.infer<typeof YouTubeVideoListResponseSchema>;

// Comment Snippet Schema
export const YouTubeCommentSnippetSchema = z.object({
  authorDisplayName: z.string().optional(),
  authorProfileImageUrl: z.string().url().optional(),
  authorChannelUrl: z.string().url().optional(),
  authorChannelId: z.object({ value: z.string() }).optional(),
  videoId: z.string().optional(),
  textDisplay: z.string(),
  textOriginal: z.string(),
  parentId: z.string().optional(), // For replies
  canRate: z.boolean().optional(),
  viewerRating: z.string().optional(), // e.g., "none", "like"
  likeCount: z.number().optional(),
  moderationStatus: z.string().optional(), // e.g., "published", "heldForReview"
  publishedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type YouTubeCommentSnippet = z.infer<typeof YouTubeCommentSnippetSchema>;

// Top-Level Comment Schema (part of CommentThread)
export const YouTubeTopLevelCommentSchema = z.object({
  kind: z.literal('youtube#comment'),
  etag: z.string(),
  id: z.string(),
  snippet: YouTubeCommentSnippetSchema,
});
export type YouTubeTopLevelComment = z.infer<typeof YouTubeTopLevelCommentSchema>;

// CommentThread Snippet Schema
export const YouTubeCommentThreadSnippetSchema = z.object({
  channelId: z.string().optional(), // Only for channel comments
  videoId: z.string().optional(), // Only for video comments
  topLevelComment: YouTubeTopLevelCommentSchema,
  canReply: z.boolean().optional(),
  totalReplyCount: z.number().optional(),
  isPublic: z.boolean().optional(),
});
export type YouTubeCommentThreadSnippet = z.infer<typeof YouTubeCommentThreadSnippetSchema>;

// Schema for the 'replies' object within a CommentThread
export const YouTubeCommentRepliesSchema = z.object({
  comments: z.array(YouTubeTopLevelCommentSchema).optional(), // Array of reply comments
});
export type YouTubeCommentReplies = z.infer<typeof YouTubeCommentRepliesSchema>;

// Channel Snippet Schema
export const YouTubeChannelSnippetSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  customUrl: z.string().optional(),
  publishedAt: z.string().datetime(),
  thumbnails: z.record(z.object({
    url: z.string().url(),
    width: z.number().optional(), // Make optional as not always present
    height: z.number().optional(), // Make optional as not always present
  })),
  defaultLanguage: z.string().optional(),
  localized: z.object({
    title: z.string(),
    description: z.string().optional(),
  }).optional(),
  country: z.string().optional(), // e.g., "US"
});
export type YouTubeChannelSnippet = z.infer<typeof YouTubeChannelSnippetSchema>;

// Channel Statistics Schema
export const YouTubeChannelStatisticsSchema = z.object({
  viewCount: z.string(), // Note: these are often strings from the API
  subscriberCount: z.string().optional(), // Can be hidden
  hiddenSubscriberCount: z.boolean(),
  videoCount: z.string(),
});
export type YouTubeChannelStatistics = z.infer<typeof YouTubeChannelStatisticsSchema>;

// Channel Branding Settings Schema (Simplified)
export const YouTubeChannelBrandingSettingsSchema = z.object({
  channel: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
    unsubscribedTrailer: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  image: z.object({
    bannerExternalUrl: z.string().url().optional(),
  }).optional(),
});
export type YouTubeChannelBrandingSettings = z.infer<typeof YouTubeChannelBrandingSettingsSchema>;

// Channel Resource Schema
export const YouTubeChannelSchema = z.object({
  kind: z.literal('youtube#channel'),
  etag: z.string(),
  id: z.string(), // Channel ID
  snippet: YouTubeChannelSnippetSchema.optional(),
  statistics: YouTubeChannelStatisticsSchema.optional(),
  brandingSettings: YouTubeChannelBrandingSettingsSchema.optional(),
  // Add other parts like contentDetails, topicDetails, status as needed
});
export type YouTubeChannel = z.infer<typeof YouTubeChannelSchema>;

export const YouTubeChannelListResponseSchema = z.object({
  kind: z.literal('youtube#channelListResponse'),
  etag: z.string(),
  items: z.array(YouTubeChannelSchema),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
});
export type YouTubeChannelListResponse = z.infer<typeof YouTubeChannelListResponseSchema>;

// CommentThread Resource Schema
export const YouTubeCommentThreadSchema = z.object({
  kind: z.literal('youtube#commentThread'),
  etag: z.string(),
  id: z.string(), // CommentThread ID
  snippet: YouTubeCommentThreadSnippetSchema.optional(),
  replies: YouTubeCommentRepliesSchema.optional(), // Define if needed - Now defined and uncommented
});
export type YouTubeCommentThread = z.infer<typeof YouTubeCommentThreadSchema>;

export const YouTubeCommentThreadListResponseSchema = z.object({
  kind: z.literal('youtube#commentThreadListResponse'),
  etag: z.string(),
  items: z.array(YouTubeCommentThreadSchema),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional(),
  pageInfo: z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
  }),
});
export type YouTubeCommentThreadListResponse = z.infer<typeof YouTubeCommentThreadListResponseSchema>;
