import { z } from 'zod';

// Common Instagram API Error Schema
export const InstagramApiErrorSchema = z.object({
  message: z.string(),
  type: z.string(),
  code: z.number().int(),
  error_subcode: z.number().int().optional(),
  is_transient: z.boolean().optional(),
  error_user_title: z.string().optional(),
  error_user_msg: z.string().optional(),
  fbtrace_id: z.string(),
});
export type InstagramApiError = z.infer<typeof InstagramApiErrorSchema>;

// Schema for a single Instagram Media Item (from /me/media or /{media-id})
export const InstagramMediaItemSchema = z.object({
  id: z.string(),
  caption: z.string().optional(),
  media_type: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']), // Add other types if necessary
  media_url: z.string().url().optional(),
  permalink: z.string().url(),
  thumbnail_url: z.string().url().optional(), // For videos
  timestamp: z.string().datetime(), // ISO 8601
  username: z.string(), // Owner of the media
  // Basic counts, often available directly or via insights for owned media
  like_count: z.number().int().min(0).optional(),
  comments_count: z.number().int().min(0).optional(),
  // For CAROUSEL_ALBUM, there might be a 'children' field with more media items
  // children: z.lazy(() => z.object({ data: z.array(InstagramMediaItemSchema.pick({ id: true, media_type: true, media_url: true, thumbnail_url: true })) })).optional(),
});
export type InstagramMediaItem = z.infer<typeof InstagramMediaItemSchema>;

// Schema for paginated response of Media Items
export const InstagramMediaResponseSchema = z.object({
  data: z.array(InstagramMediaItemSchema),
  paging: z.object({
    cursors: z.object({
      before: z.string().optional(),
      after: z.string().optional(),
    }).optional(),
    next: z.string().url().optional(),
    previous: z.string().url().optional(),
  }).optional(),
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramMediaResponse = z.infer<typeof InstagramMediaResponseSchema>;

// Schema for Instagram Media Insight Value
export const InstagramInsightValueSchema = z.object({
  value: z.any(), // Can be number, object, or array depending on the metric
  end_time: z.string().datetime().optional(), // For time series data
});
export type InstagramInsightValue = z.infer<typeof InstagramInsightValueSchema>;

// Schema for a single Instagram Media Insight
export const InstagramMediaInsightSchema = z.object({
  name: z.string(), // e.g., 'impressions', 'reach', 'engagement', 'saved', 'video_views'
  period: z.string(), // e.g., 'day', 'week', 'days_28', 'lifetime'
  values: z.array(InstagramInsightValueSchema),
  title: z.string().optional(),
  description: z.string().optional(),
  id: z.string(), // Typically in format {media_id}/insights/{metric_name}/{period}
});
export type InstagramMediaInsight = z.infer<typeof InstagramMediaInsightSchema>;

// Schema for response of Media Insights
export const InstagramMediaInsightsResponseSchema = z.object({
  data: z.array(InstagramMediaInsightSchema),
  paging: z.object({ // Insights can also be paginated for some metrics
    next: z.string().url().optional(),
    previous: z.string().url().optional(),
  }).optional(),
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramMediaInsightsResponse = z.infer<typeof InstagramMediaInsightsResponseSchema>;

// Schema for a single Instagram Comment
export const InstagramCommentSchema = z.object({
  id: z.string(),
  text: z.string(),
  timestamp: z.string().datetime(),
  username: z.string(),
  from: z.object({ // User who made the comment
    id: z.string(),
    username: z.string(),
    // profile_picture_url: z.string().url().optional(), // If requested and available
  }).optional(), 
  like_count: z.number().int().min(0).optional(),
  // replies: z.lazy(() => InstagramCommentsResponseSchema).optional(), // If fetching replies
});
export type InstagramComment = z.infer<typeof InstagramCommentSchema>;

// Schema for paginated response of Comments
export const InstagramCommentsResponseSchema = z.object({
  data: z.array(InstagramCommentSchema),
  paging: z.object({
    cursors: z.object({
      before: z.string().optional(),
      after: z.string().optional(),
    }).optional(),
    next: z.string().url().optional(),
    previous: z.string().url().optional(),
  }).optional(),
  summary: z.object({ // Optional summary, e.g., total_count
    total_count: z.number().int().optional(),
  }).optional(),
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramCommentsResponse = z.infer<typeof InstagramCommentsResponseSchema>;

// Schema for Instagram User Profile (subset, from /me?fields=...)
export const InstagramUserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  account_type: z.string().optional(), // e.g., BUSINESS, CREATOR, PERSONAL
  media_count: z.number().int().min(0).optional(),
  followers_count: z.number().int().min(0).optional(), // Requires different permissions/endpoints
  follows_count: z.number().int().min(0).optional(),   // Requires different permissions/endpoints
  // profile_picture_url: z.string().url().optional(),
  // name: z.string().optional(),
  // biography: z.string().optional(),
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramUserProfile = z.infer<typeof InstagramUserProfileSchema>;

// Schema for creating an Instagram Media Container (for image, video, carousel, stories)
export const InstagramMediaContainerParamsSchema = z.object({
  media_type: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL', 'STORIES']).optional(), // STORIES for stories
  image_url: z.string().url().optional(),
  video_url: z.string().url().optional(), // Required for VIDEO and STORIES (if video)
  caption: z.string().max(2200).optional(),
  is_carousel_item: z.boolean().optional(), // Set to true for carousel children
  children: z.array(z.string()).max(10).optional(), // Array of container IDs for CAROUSEL type
  thumb_offset: z.number().int().min(0).optional(), // For video, in milliseconds
  // For Reels (Note: Reels publishing via API is highly restricted/unavailable for most developers)
  // share_to_feed: z.boolean().optional(), // If media_type is REELS
  // cover_url: z.string().url().optional(), // If media_type is REELS
});
export type InstagramMediaContainerParams = z.infer<typeof InstagramMediaContainerParamsSchema>;

export const InstagramMediaContainerResponseSchema = z.object({
  id: z.string(), // This is the creation_id or container_id
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramMediaContainerResponse = z.infer<typeof InstagramMediaContainerResponseSchema>;

// Schema for publishing a media container
export const InstagramPublishMediaResponseSchema = z.object({
  id: z.string(), // This is the media_id of the published post/story
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramPublishMediaResponse = z.infer<typeof InstagramPublishMediaResponseSchema>;

// Schema for a single Instagram Story Item (subset of media item)
export const InstagramStoryItemSchema = InstagramMediaItemSchema.extend({
  // Stories might have specific fields, but often reuse media item structure
  // For now, assume it's a media item of type VIDEO or IMAGE, typically ephemeral
});
export type InstagramStoryItem = z.infer<typeof InstagramStoryItemSchema>;

// Schema for paginated response of Story Items
export const InstagramStoriesResponseSchema = z.object({
  data: z.array(InstagramStoryItemSchema),
  paging: z.object({
    cursors: z.object({
      before: z.string().optional(),
      after: z.string().optional(),
    }).optional(),
    next: z.string().url().optional(),
    previous: z.string().url().optional(),
  }).optional(),
  error: InstagramApiErrorSchema.optional(),
});
export type InstagramStoriesResponse = z.infer<typeof InstagramStoriesResponseSchema>;

// Input for posting media (convenience method)
export const InstagramPostMediaParamsSchema = z.object({
  media_type: z.enum(['IMAGE', 'VIDEO']),
  url: z.string().url(), // image_url or video_url
  caption: z.string().max(2200).optional(),
  thumb_offset: z.number().int().min(0).optional(), // For video
});
export type InstagramPostMediaParams = z.infer<typeof InstagramPostMediaParamsSchema>;

// Input for posting a story (convenience method)
export const InstagramPostStoryParamsSchema = z.object({
  media_type: z.enum(['IMAGE', 'VIDEO']),
  url: z.string().url(), // image_url or video_url
  // Stories typically don't have captions in the same way posts do via API
  // Interactive elements (stickers, polls) are complex and often not fully supported via public API for all developers.
});
export type InstagramPostStoryParams = z.infer<typeof InstagramPostStoryParamsSchema>
