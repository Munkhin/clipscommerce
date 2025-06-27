-- Supabase migration script
-- Timestamp: 20250605000000

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing raw Instagram posts
CREATE TABLE IF NOT EXISTS raw_instagram_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL, -- Internal system user ID who initiated the data fetch
  platform_user_id TEXT NOT NULL, -- Instagram user ID from the platform (the author of the post)
  caption TEXT,
  media_type TEXT, -- e.g., IMAGE, VIDEO, CAROUSEL_ALBUM
  media_url TEXT,
  permalink TEXT,
  thumbnail_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  raw_data JSONB NOT NULL, -- Store the full API response for this post
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for raw_instagram_posts
CREATE INDEX IF NOT EXISTS idx_instagram_post_id ON raw_instagram_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_internal_user_id ON raw_instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_platform_user_id_posts ON raw_instagram_posts(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_timestamp ON raw_instagram_posts(timestamp);

-- Table for storing raw Instagram user profiles
CREATE TABLE IF NOT EXISTS raw_instagram_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_user_id TEXT NOT NULL UNIQUE, -- Instagram user ID from the platform
  username TEXT NOT NULL,
  full_name TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  website TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  raw_data JSONB NOT NULL, -- Store the full API response for this user profile
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for raw_instagram_users
CREATE INDEX IF NOT EXISTS idx_instagram_platform_user_id_users ON raw_instagram_users(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_username_users ON raw_instagram_users(username);

-- Table for storing raw TikTok videos
CREATE TABLE IF NOT EXISTS raw_tiktok_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id TEXT NOT NULL UNIQUE,
  author_platform_id TEXT NOT NULL, -- TikTok author ID from the platform
  description TEXT,
  video_url TEXT,
  cover_image_url TEXT,
  duration INTEGER, -- in seconds
  music_title TEXT,
  music_author TEXT,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0, -- aka saves/favorites
  posted_at TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL, -- Store the full API response for this video
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for raw_tiktok_videos
CREATE INDEX IF NOT EXISTS idx_tiktok_video_id ON raw_tiktok_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_author_platform_id ON raw_tiktok_videos(author_platform_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_posted_at ON raw_tiktok_videos(posted_at);

-- Table for storing raw TikTok user profiles
CREATE TABLE IF NOT EXISTS raw_tiktok_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_platform_id TEXT NOT NULL UNIQUE, -- TikTok author ID from the platform
  unique_id TEXT NOT NULL UNIQUE, -- @username
  nickname TEXT,
  avatar_url TEXT,
  signature TEXT, -- bio
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  heart_count INTEGER DEFAULT 0, -- total likes received by the user
  video_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  raw_data JSONB NOT NULL, -- Store the full API response for this user profile
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for raw_tiktok_users
CREATE INDEX IF NOT EXISTS idx_tiktok_author_platform_id_users ON raw_tiktok_users(author_platform_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_unique_id_users ON raw_tiktok_users(unique_id);

-- Generic table for API call logs (useful for debugging and rate limit tracking)
CREATE TABLE IF NOT EXISTS api_call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL, -- e.g., 'instagram', 'tiktok'
  endpoint TEXT NOT NULL,
  request_params JSONB,
  response_status INTEGER,
  response_data JSONB,
  error_message TEXT,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_platform ON api_call_logs(platform);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_called_at ON api_call_logs(called_at);

-- Function to automatically update 'updated_at' timestamp on relevant tables
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for 'updated_at'
CREATE TRIGGER set_timestamp_raw_instagram_posts
BEFORE UPDATE ON raw_instagram_posts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_raw_instagram_users
BEFORE UPDATE ON raw_instagram_users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_raw_tiktok_videos
BEFORE UPDATE ON raw_tiktok_videos
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_raw_tiktok_users
BEFORE UPDATE ON raw_tiktok_users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

