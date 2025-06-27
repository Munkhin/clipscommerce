import { Platform } from '../../deliverables/types/deliverables_types';

/**
 * Represents the structure of a raw TikTok video stored in the database.
 * NOTE: The 'description' field is always treated as the video description (not subtitle).
 */
export interface RawTikTokVideo {
  id: string; // UUID, primary key in the database
  video_id: string; // TikTok's ID for the video (unique)
  user_id: string; // Internal system user ID who initiated the data fetch
  platform_user_id: string; // TikTok user ID of the video's author
  /**
   * The description of the video (not a subtitle).
   */
  description?: string | null;
  video_url?: string | null; // URL to the video file
  cover_image_url?: string | null;
  share_url?: string | null; // URL to share the video
  timestamp: string; // ISO 8601 date string of video creation/publication
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  duration_seconds?: number | null;
  music_info?: { id: string; title: string; author: string; } | null; // Example structure
  hashtags?: string[] | null;
  raw_data: any; // The full, raw API response from TikTok for this video
  created_at: string; // ISO 8601 date string, when the record was created in DB
  updated_at: string; // ISO 8601 date string, when the record was last updated in DB
}

/**
 * Data Transfer Object for creating a new raw TikTok video record.
 * NOTE: The 'description' field is always treated as the video description (not subtitle).
 */
export type CreateRawTikTokVideoDto = Omit<RawTikTokVideo, 'id' | 'created_at' | 'updated_at'>;

/**
 * Data Transfer Object for updating an existing raw TikTok video record.
 */
export type UpdateRawTikTokVideoDto = Partial<Omit<RawTikTokVideo, 'id' | 'video_id' | 'user_id' | 'platform_user_id' | 'created_at' | 'updated_at'>> & {
  raw_data: any;
};

/**
 * Represents the structure of a raw TikTok user profile stored in the database.
 */
export interface RawTikTokUser {
  id: string; // UUID, primary key in the database
  platform_user_id: string; // TikTok's user ID (unique)
  unique_id: string; // TikTok's unique username (e.g., @username)
  nickname?: string | null; // Display name
  avatar_url?: string | null;
  signature?: string | null; // Bio
  verified: boolean;
  followers_count: number;
  following_count: number;
  heart_count: number; // Total likes received by the user
  video_count: number;
  raw_data: any; // The full, raw API response from TikTok for this user
  last_fetched_at: string; // ISO 8601 date string
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}

/**
 * Data Transfer Object for creating a new raw TikTok user record.
 */
export type CreateRawTikTokUserDto = Omit<RawTikTokUser, 'id' | 'created_at' | 'updated_at'>;

/**
 * Data Transfer Object for updating an existing raw TikTok user record.
 */
export type UpdateRawTikTokUserDto = Partial<Omit<RawTikTokUser, 'id' | 'platform_user_id' | 'unique_id' | 'created_at' | 'updated_at'>> & {
  raw_data: any;
  last_fetched_at: string;
};

// Example Types from a hypothetical TikTok API (subset, expand as needed)
// These would depend on the actual TikTok API you're using (e.g., TikTok API for Developers, unofficial APIs)

// Stubs for TikTok types
export interface TikTokApiVideoNode {
  id: string;
  title?: string;
  video_description?: string;
  create_time?: string;
  cover_image_url?: string;
  share_url?: string;
  duration?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  play_url?: string;
  download_url?: string;
  [key: string]: any;
}

export interface TikTokApiUserNode {
  open_id: string;
  union_id?: string;
  display_name?: string;
  avatar_url?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
  [key: string]: any;
}

export type TikTokApiResponse = any;
export type TikTokApiPagination = any;
