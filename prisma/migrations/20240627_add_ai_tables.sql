-- Create model_training_sessions table
CREATE TABLE IF NOT EXISTS model_training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  platforms TEXT[],
  status TEXT NOT NULL,
  progress INTEGER NOT NULL,
  current_phase TEXT,
  config JSONB,
  data_quality JSONB,
  model_results JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trained_models table
CREATE TABLE IF NOT EXISTS trained_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_versions table
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES trained_models(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  description TEXT,
  performance_metrics JSONB,
  file_path TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (model_id, version)
);

-- Create ab_experiments table
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  model_a_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  model_b_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT FALSE,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_model_training_sessions_user_id ON model_training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_model_versions_model_id ON model_versions(model_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_model_a_id ON ab_experiments(model_a_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_model_b_id ON ab_experiments(model_b_id);
