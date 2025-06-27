import { Platform } from '../../deliverables/types/deliverables_types';

/**
 * Represents the structure of a raw Instagram post stored in the database.
 * NOTE: The 'caption' field is always treated as the video/post description (not subtitle).
 */
export interface RawInstagramPost {
  id: string; // UUID, primary key in the database
  post_id: string; // Instagram's ID for the post (unique)
  user_id: string; // Internal system user ID who initiated the data fetch
  platform_user_id: string; // Instagram user ID of the post's author
  /**
   * The description of the post or video (not a subtitle).
   */
  caption?: string | null;
  media_type: string; // e.g., IMAGE, VIDEO, CAROUSEL_ALBUM
  media_url?: string | null;
  permalink?: string | null;
  thumbnail_url?: string | null;
  timestamp: string; // ISO 8601 date string
  likes_count: number;
  comments_count: number;
  raw_data: any; // The full, raw API response from Instagram for this post
  created_at: string; // ISO 8601 date string, when the record was created in DB
  updated_at: string; // ISO 8601 date string, when the record was last updated in DB
}

/**
 * Data Transfer Object for creating a new raw Instagram post record.
 * NOTE: The 'caption' field is always treated as the video/post description (not subtitle).
 */
export type CreateRawInstagramPostDto = Omit<RawInstagramPost, 'id' | 'created_at' | 'updated_at'>;

/**
 * Data Transfer Object for updating an existing raw Instagram post record.
 * All fields are optional except for the ones essential for an update.
 */
export type UpdateRawInstagramPostDto = Partial<Omit<RawInstagramPost, 'id' | 'post_id' | 'user_id' | 'platform_user_id' | 'created_at' | 'updated_at'>> & {
  raw_data: any; // raw_data should be updated if other fields are
  // Add other fields that might be updated, e.g., likes_count, comments_count
};

/**
 * Represents the structure of a raw Instagram user profile stored in the database.
 */
export interface RawInstagramUser {
  id: string; // UUID, primary key in the database
  platform_user_id: string; // Instagram's user ID (unique)
  username: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
  bio?: string | null;
  website?: string | null;
  followers_count: number;
  following_count: number;
  media_count: number;
  raw_data: any; // The full, raw API response from Instagram for this user
  last_fetched_at: string; // ISO 8601 date string
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}

/**
 * Data Transfer Object for creating a new raw Instagram user record.
 */
export type CreateRawInstagramUserDto = Omit<RawInstagramUser, 'id' | 'created_at' | 'updated_at'>;

/**
 * Data Transfer Object for updating an existing raw Instagram user record.
 */
export type UpdateRawInstagramUserDto = Partial<Omit<RawInstagramUser, 'id' | 'platform_user_id' | 'username' | 'created_at' | 'updated_at'>> & {
  raw_data: any;
  last_fetched_at: string;
};

// Types from Instagram Graph API (subset, expand as needed)
// Refer to: https://developers.facebook.com/docs/instagram-graph-api/reference/media
// And: https://developers.facebook.com/docs/instagram-graph-api/reference/user

// Stubs for Instagram types
export interface InstagramApiMediaNode {
  id: string;
  media_type: string;
  media_url: string;
  caption?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface InstagramApiUserNode {
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  name?: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  [key: string]: any;
}

// Stubs for module resolution
export {};
