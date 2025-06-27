/**
 * TikTok API types
 */

export interface TikTokApiUserNode {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_url_200?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokApiVideoNode {
  id: string;
  title?: string;
  video_description?: string;
  create_time: number;
  cover_image_url?: string;
  share_url: string;
  duration: number;
  height: number;
  width: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  play_url: string;
  download_url?: string;
  music?: {
    id: string;
    title: string;
    author: string;
    album?: string;
    duration: number;
    cover_url?: string;
    is_original?: boolean;
  };
  hashtags?: Array<{ id: string; title: string }>;
  mentions?: Array<{ id: string; username: string }>;
  location?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
  };
}

export interface TikTokApiPagination {
  cursor?: string;
  has_more: boolean;
}

export interface TikTokApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
    log_id?: string;
  };
  pagination?: TikTokApiPagination;
}
