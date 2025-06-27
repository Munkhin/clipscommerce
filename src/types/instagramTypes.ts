/**
 * Instagram API types
 */

export interface InstagramApiUserNode {
  id: string;
  username?: string;
  account_type?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  name?: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  ig_id?: number;
}

export interface InstagramApiMediaNode {
  id: string;
  caption?: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data: Array<{
      id: string;
      media_type: 'IMAGE' | 'VIDEO';
      media_url: string;
    }>;
  };
  thumbnail_url?: string;
  shortcode?: string;
  is_shared_to_feed?: boolean;
  location?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  owner?: {
    id: string;
  };
  video_title?: string;
}

export interface InstagramApiPagination {
  next?: string;
  cursor?: string;
}

export interface InstagramApiResponse<T> {
  data: T;
  paging?: InstagramApiPagination;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export interface InstagramApiMediaResponse extends InstagramApiResponse<InstagramApiMediaNode> {}
export interface InstagramApiUserResponse extends InstagramApiResponse<InstagramApiUserNode> {}
// Add more specific response types as needed
