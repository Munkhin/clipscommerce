-- AI Improvement Pipeline Complete Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing user posts across all platforms (normalized view)
CREATE TABLE IF NOT EXISTS user_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  post_id TEXT NOT NULL,
  platform_post_id TEXT NOT NULL, -- Original platform post ID
  caption TEXT,
  hashtags TEXT[],
  media_type TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  
  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  -- Calculated metrics
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  engagement_score DECIMAL(10,2) DEFAULT 0,
  
  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(platform, platform_post_id)
);

-- Table for storing training data quality metrics
CREATE TABLE IF NOT EXISTS training_data_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  total_posts INTEGER DEFAULT 0,
  valid_posts INTEGER DEFAULT 0,
  invalid_posts INTEGER DEFAULT 0,
  average_engagement DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0,
  issues TEXT[],
  recommendations TEXT[],
  ready_for_training BOOLEAN DEFAULT FALSE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing model training sessions
CREATE TABLE IF NOT EXISTS model_training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preparing', 'collecting_data', 'training', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_phase TEXT,
  
  -- Configuration
  config JSONB NOT NULL,
  
  -- Results
  data_quality JSONB,
  model_results JSONB,
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing trained models metadata
CREATE TABLE IF NOT EXISTS trained_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('engagement_prediction', 'content_optimization', 'sentiment_analysis', 'virality_prediction', 'ab_testing')),
  version TEXT NOT NULL,
  user_id TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  
  -- Performance metrics
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  mse DECIMAL(10,6),
  mae DECIMAL(10,6),
  r2_score DECIMAL(5,4),
  
  -- Model metadata
  model_path TEXT,
  config_path TEXT,
  training_data_size INTEGER,
  validation_metrics JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'failed')),
  
  -- Timestamps
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(model_name, version, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_user_posts_engagement_score ON user_posts(engagement_score);

CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_model_training_sessions_user_id ON model_training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_model_training_sessions_status ON model_training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_trained_models_user_type ON trained_models(user_id, model_type);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers for new tables
CREATE TRIGGER set_timestamp_user_posts
BEFORE UPDATE ON user_posts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_model_training_sessions
BEFORE UPDATE ON model_training_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_trained_models
BEFORE UPDATE ON trained_models
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Insert a test record to verify everything works
INSERT INTO user_posts (
  user_id, 
  platform, 
  post_id, 
  platform_post_id, 
  caption, 
  posted_at,
  likes,
  comments,
  shares,
  views
) VALUES (
  'test_user_123',
  'instagram',
  'test_post_1',
  'ig_12345',
  'Test post for AI improvement pipeline',
  NOW(),
  100,
  10,
  5,
  1000
) ON CONFLICT (platform, platform_post_id) DO NOTHING;

-- Verify the setup
SELECT 'Setup completed successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_posts', 'training_data_quality', 'model_training_sessions', 'trained_models')
ORDER BY table_name; 