-- AI Improvement Pipeline Tables
-- Migration: 20250106000001_ai_improvement_tables.sql

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

-- Indexes for user_posts
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_platform ON user_posts(platform);
CREATE INDEX IF NOT EXISTS idx_user_posts_posted_at ON user_posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_user_posts_engagement_score ON user_posts(engagement_score);

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

-- Table for storing AI suggestions and feedback
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('content', 'timing', 'hashtags', 'caption', 'strategy')),
  suggestion TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  expected_improvement DECIMAL(5,2),
  
  -- Feedback tracking
  applied_at TIMESTAMPTZ,
  actual_improvement DECIMAL(5,2),
  feedback TEXT CHECK (feedback IN ('positive', 'negative', 'neutral')),
  feedback_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for A/B testing experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  
  -- Experiment configuration
  variants JSONB NOT NULL,
  target_metric TEXT NOT NULL,
  minimum_sample_size INTEGER DEFAULT 100,
  confidence_level DECIMAL(3,2) DEFAULT 0.95,
  
  -- Bayesian parameters
  prior_alpha DECIMAL(10,6),
  prior_beta DECIMAL(10,6),
  info_gain DECIMAL(10,6),
  
  -- Timeline
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Results
  results JSONB,
  winning_variant TEXT,
  statistical_significance DECIMAL(5,4),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for experiment results tracking
CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(experiment_id),
  variant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  post_id TEXT,
  
  -- Metrics
  metric_value DECIMAL(10,4),
  conversion_event BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TRIGGER set_timestamp_ai_suggestions
BEFORE UPDATE ON ai_suggestions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_ab_experiments
BEFORE UPDATE ON ab_experiments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_data_quality_user_platform ON training_data_quality(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_model_training_sessions_user_id ON model_training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_model_training_sessions_status ON model_training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_trained_models_user_type ON trained_models(user_id, model_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_platform ON ai_suggestions(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_user_status ON ab_experiments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_experiment_results_experiment_id ON experiment_results(experiment_id); 