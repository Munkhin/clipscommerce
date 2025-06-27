import { z } from 'zod';

// Schema for TikTok API errors (as part of response payload)
export const TikTokVideoQueryErrorSchema = z.object({
  code: z.union([z.string(), z.number()]),
  message: z.string(),
  log_id: z.string(),
});
export type TikTokVideoQueryError = z.infer<typeof TikTokVideoQueryErrorSchema>;

// Schema for individual TikTok video data
export const TikTokVideoDataSchema = z.object({
  id: z.string(),
  video_description: z.string().optional(),
  view_count: z.number().int().min(0).optional(),
  like_count: z.number().int().min(0).optional(),
  comment_count: z.number().int().min(0).optional(),
  share_count: z.number().int().min(0).optional(),
  duration: z.number().min(0).optional(),
  create_time: z.number().int().optional(), // Unix timestamp
  cover_image_url: z.string().url().optional(), // URL for the video's cover image
  share_url: z.string().url().optional(), // URL to share the video
});
export type TikTokVideoData = z.infer<typeof TikTokVideoDataSchema>;

// Schema for the payload of a TikTok video query response
export const TikTokVideoQueryResponsePayloadSchema = z.object({
  videos: z.array(TikTokVideoDataSchema).optional(),
  video: TikTokVideoDataSchema.optional(), // For single video fetch
  error: TikTokVideoQueryErrorSchema.optional(),
  cursor: z.union([z.number(), z.string()]).optional(),
  has_more: z.boolean().optional(),
});
export type TikTokVideoQueryResponsePayload = z.infer<typeof TikTokVideoQueryResponsePayloadSchema>;

// Schema for TikTok user data
export const TikTokUserDataSchema = z.object({
  follower_count: z.number().int().min(0).optional(),
  following_count: z.number().int().min(0).optional(),
  video_count: z.number().int().min(0).optional(),
});
export type TikTokUserData = z.infer<typeof TikTokUserDataSchema>;

// Schema for the payload of a TikTok user query response
export const TikTokUserQueryResponsePayloadSchema = z.object({
  user: TikTokUserDataSchema.optional(),
  error: TikTokVideoQueryErrorSchema.optional(),
});
export type TikTokUserQueryResponsePayload = z.infer<typeof TikTokUserQueryResponsePayloadSchema>;

// --- TikTok API v2 Schemas ---

// Common Error Schema for TikTok API v2 responses
export const TikTokApiErrorDataSchema = z.object({
  code: z.string(), // e.g., "ok", "error_code_example"
  message: z.string(),
  log_id: z.string().optional(), // Optional, but often present for debugging
});
export type TikTokApiErrorData = z.infer<typeof TikTokApiErrorDataSchema>;

// Generic TikTok API Response Wrapper
export function createTikTokApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.optional(), // Data can be absent on error
    error: TikTokApiErrorDataSchema,
  });
}

// User Info Schemas (/v2/user/info/)
export const TikTokUserInfoFieldsSchema = z.array(z.enum([
  'open_id', 'union_id', 'avatar_url', 'avatar_url_100', 'avatar_url_200', 'avatar_large_url',
  'display_name', 'bio_description', 'profile_deep_link', 'is_verified',
  'follower_count', 'following_count', 'likes_count', 'video_count'
]));
export type TikTokUserInfoFields = z.infer<typeof TikTokUserInfoFieldsSchema>;

export const TikTokUserInfoRequestSchema = z.object({
  fields: TikTokUserInfoFieldsSchema,
});
export type TikTokUserInfoRequest = z.infer<typeof TikTokUserInfoRequestSchema>;

export const TikTokUserInfoSchema = z.object({
  open_id: z.string().optional(),
  union_id: z.string().optional(),
  avatar_url: z.string().url().optional(),
  avatar_url_100: z.string().url().optional(),
  avatar_url_200: z.string().url().optional(),
  avatar_large_url: z.string().url().optional(),
  display_name: z.string().optional(),
  bio_description: z.string().optional(),
  profile_deep_link: z.string().url().optional(),
  is_verified: z.boolean().optional(),
  follower_count: z.number().int().min(0).optional(),
  following_count: z.number().int().min(0).optional(),
  likes_count: z.number().int().min(0).optional(),
  video_count: z.number().int().min(0).optional(),
});
export type TikTokUserInfo = z.infer<typeof TikTokUserInfoSchema>;

export const TikTokUserInfoResponseDataSchema = z.object({
  user: TikTokUserInfoSchema,
});
export type TikTokUserInfoResponseData = z.infer<typeof TikTokUserInfoResponseDataSchema>;
export const TikTokUserInfoResponseSchema = createTikTokApiResponseSchema(TikTokUserInfoResponseDataSchema);
export type TikTokUserInfoResponse = z.infer<typeof TikTokUserInfoResponseSchema>;


// Video List Schemas (/v2/video/list/)
export const TikTokVideoListRequestSchema = z.object({
  fields: z.array(z.string()), // Specific fields for video list, e.g., from TikTokVideoDataSchema keys
  cursor: z.string().optional(), // Or number, depending on API version
  max_count: z.number().int().min(1).max(20).optional(), // Max 20 for this endpoint usually
});
export type TikTokVideoListRequest = z.infer<typeof TikTokVideoListRequestSchema>;

export const TikTokVideoListItemSchema = TikTokVideoDataSchema.extend({}); // Can be extended if list has different fields

export const TikTokVideoListResponseDataSchema = z.object({
  videos: z.array(TikTokVideoListItemSchema),
  cursor: z.union([z.string(), z.number()]).optional(),
  has_more: z.boolean(),
});
export type TikTokVideoListResponseData = z.infer<typeof TikTokVideoListResponseDataSchema>;
export const TikTokVideoListResponseSchema = createTikTokApiResponseSchema(TikTokVideoListResponseDataSchema);
export type TikTokVideoListResponse = z.infer<typeof TikTokVideoListResponseSchema>;


// Video Query Schemas (/v2/video/query/) - For video analytics/details
export const TikTokVideoQueryRequestSchema = z.object({
  fields: z.array(z.string()), // Specific fields for video query
  video_ids: z.array(z.string()),
});
export type TikTokVideoQueryRequest = z.infer<typeof TikTokVideoQueryRequestSchema>;

export const TikTokVideoQueryDetailSchema = TikTokVideoDataSchema.extend({
  // Add more detailed analytics fields if available from this endpoint
  title: z.string().optional(),
  embed_html: z.string().optional(),
  embed_link: z.string().url().optional(),
  privacy_level: z.string().optional(), // e.g., PUBLICLY_AVAILABLE, FRIENDS_ONLY, SELF_ONLY
  // Potentially more stats here
});
export type TikTokVideoQueryDetail = z.infer<typeof TikTokVideoQueryDetailSchema>;

export const TikTokVideoQueryResponseDataSchema = z.object({
  videos: z.array(TikTokVideoQueryDetailSchema),
});
export type TikTokVideoQueryResponseData = z.infer<typeof TikTokVideoQueryResponseDataSchema>;
export const TikTokVideoQueryResponseSchema = createTikTokApiResponseSchema(TikTokVideoQueryResponseDataSchema);
export type TikTokVideoQueryResponse = z.infer<typeof TikTokVideoQueryResponseSchema>;


// Video Upload Schemas (/v2/video/upload/)
export const TikTokVideoUploadInitRequestSchema = z.object({
  // TikTok for Business API usually requires source_info for direct posting
  source_info: z.object({
    source: z.enum(['FILE_URL', 'PULL_URL']), // PULL_URL for direct URL, FILE_URL for resumable
    video_url: z.string().url().optional(), // if source is PULL_URL
    video_size: z.number().int().min(1).optional(), // if source is FILE_URL (bytes)
    chunk_size: z.number().int().min(1024 * 1024).optional(), // if source is FILE_URL (bytes, e.g., 5MB)
    total_chunk_count: z.number().int().min(1).optional(), // if source is FILE_URL
  }).optional(),
  // For Resumable Upload (Open API)
  video_name: z.string().optional(), // Optional, helps identify the video
});
export type TikTokVideoUploadInitRequest = z.infer<typeof TikTokVideoUploadInitRequestSchema>;

export const TikTokVideoUploadInitResponseDataSchema = z.object({
  upload_id: z.string(),
  upload_url: z.string().url(), // URL to PUT the video file to
  // For resumable uploads, it might provide multiple URLs or a pattern
});
export type TikTokVideoUploadInitResponseData = z.infer<typeof TikTokVideoUploadInitResponseDataSchema>;
export const TikTokVideoUploadInitResponseSchema = createTikTokApiResponseSchema(TikTokVideoUploadInitResponseDataSchema);
export type TikTokVideoUploadInitResponse = z.infer<typeof TikTokVideoUploadInitResponseSchema>;


// Video Publish Schemas (/v2/video/publish/)
export const TikTokVideoPublishRequestSchema = z.object({
  upload_id: z.string(), // From upload init response
  title: z.string().max(150).optional(),
  description: z.string().max(500).optional(), // Often used for hashtags too
  privacy_level: z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY', 'PRIVATE']).optional(),
  disable_comment: z.boolean().optional(),
  disable_duet: z.boolean().optional(),
  disable_stitch: z.boolean().optional(),
  brand_content_toggle: z.boolean().optional(),
  brand_organic_toggle: z.boolean().optional(),
  // schedule_time: z.number().int().optional(), // Unix timestamp for scheduled posts, if supported
});
export type TikTokVideoPublishRequest = z.infer<typeof TikTokVideoPublishRequestSchema>;

export const TikTokVideoPublishResponseDataSchema = z.object({
  video_id: z.string(), // The ID of the published video
  // share_url: z.string().url().optional(),
});
export type TikTokVideoPublishResponseData = z.infer<typeof TikTokVideoPublishResponseDataSchema>;
export const TikTokVideoPublishResponseSchema = createTikTokApiResponseSchema(TikTokVideoPublishResponseDataSchema);
export type TikTokVideoPublishResponse = z.infer<typeof TikTokVideoPublishResponseSchema>;

// Convenience schema for posting a video directly via URL
export const TikTokPostVideoParamsSchema = z.object({
  video_url: z.string().url(),
  title: z.string().max(150).optional(),
  description: z.string().max(500).optional(),
  privacy_level: z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY', 'PRIVATE']).optional(),
  disable_comment: z.boolean().optional(),
  disable_duet: z.boolean().optional(),
  disable_stitch: z.boolean().optional(),
});
export type TikTokPostVideoParams = z.infer<typeof TikTokPostVideoParamsSchema>
