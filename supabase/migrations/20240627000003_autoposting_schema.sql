-- Autoposting Schema Migration
-- Originally from prisma/migrations/20240627_add_autoposting_schema.sql
-- Migrated to Supabase migration structure

-- Create autopost_schedule table
CREATE TABLE IF NOT EXISTS autopost_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    platform VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[],
    post_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(255) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_social_credentials table
CREATE TABLE IF NOT EXISTS user_social_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    platform VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_user_id ON autopost_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_post_time ON autopost_schedule(post_time);
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_status ON autopost_schedule(status);
CREATE INDEX IF NOT EXISTS idx_user_social_credentials_user_id ON user_social_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_social_credentials_platform ON user_social_credentials(platform);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS set_timestamp_autopost_schedule ON autopost_schedule;
CREATE TRIGGER set_timestamp_autopost_schedule
BEFORE UPDATE ON autopost_schedule
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_user_social_credentials ON user_social_credentials;  
CREATE TRIGGER set_timestamp_user_social_credentials
BEFORE UPDATE ON user_social_credentials
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();