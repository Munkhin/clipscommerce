-- Enhanced Autoposting Schema Migration
-- Add retry logic and extended metadata support

-- Add new columns to autopost_schedule table
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS retry_delay INTEGER DEFAULT 30000; -- milliseconds
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS hashtags TEXT[];
ALTER TABLE autopost_schedule ADD COLUMN IF NOT EXISTS additional_settings JSONB DEFAULT '{}';

-- Update status column to support more states
ALTER TABLE autopost_schedule ALTER COLUMN status SET DEFAULT 'scheduled';
-- Add constraint to ensure valid status values
ALTER TABLE autopost_schedule DROP CONSTRAINT IF EXISTS chk_valid_status;
ALTER TABLE autopost_schedule ADD CONSTRAINT chk_valid_status 
    CHECK (status IN ('scheduled', 'processing', 'posted', 'failed', 'cancelled', 'retrying'));

-- Add constraint to ensure valid priority values
ALTER TABLE autopost_schedule DROP CONSTRAINT IF EXISTS chk_valid_priority;
ALTER TABLE autopost_schedule ADD CONSTRAINT chk_valid_priority 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Create autopost_retry_history table for tracking retry attempts
CREATE TABLE IF NOT EXISTS autopost_retry_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES autopost_schedule(id) ON DELETE CASCADE,
    retry_attempt INTEGER NOT NULL,
    error_message TEXT,
    error_type VARCHAR(100),
    retry_strategy VARCHAR(50),
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    processing_time INTEGER, -- milliseconds
    metadata JSONB DEFAULT '{}'
);

-- Create autopost_dead_letter_queue table for failed posts requiring manual intervention
CREATE TABLE IF NOT EXISTS autopost_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_schedule_id UUID REFERENCES autopost_schedule(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    platform VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[],
    original_post_time TIMESTAMPTZ NOT NULL,
    failure_reason TEXT NOT NULL,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    moved_to_dlq_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create autopost_analytics table for tracking success rates and performance
CREATE TABLE IF NOT EXISTS autopost_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    platform VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_posts INTEGER DEFAULT 0,
    successful_posts INTEGER DEFAULT 0,
    failed_posts INTEGER DEFAULT 0,
    retry_attempts INTEGER DEFAULT 0,
    avg_processing_time INTEGER DEFAULT 0, -- milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_retry_count ON autopost_schedule(retry_count);
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_next_retry_at ON autopost_schedule(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_priority ON autopost_schedule(priority);
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_status_priority ON autopost_schedule(status, priority);
CREATE INDEX IF NOT EXISTS idx_autopost_schedule_platform_status ON autopost_schedule(platform, status);

CREATE INDEX IF NOT EXISTS idx_autopost_retry_history_schedule_id ON autopost_retry_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_autopost_retry_history_attempted_at ON autopost_retry_history(attempted_at);
CREATE INDEX IF NOT EXISTS idx_autopost_retry_history_success ON autopost_retry_history(success);

CREATE INDEX IF NOT EXISTS idx_autopost_dead_letter_queue_user_id ON autopost_dead_letter_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_autopost_dead_letter_queue_platform ON autopost_dead_letter_queue(platform);
CREATE INDEX IF NOT EXISTS idx_autopost_dead_letter_queue_moved_to_dlq_at ON autopost_dead_letter_queue(moved_to_dlq_at);

CREATE INDEX IF NOT EXISTS idx_autopost_analytics_user_platform_date ON autopost_analytics(user_id, platform, date);
CREATE INDEX IF NOT EXISTS idx_autopost_analytics_date ON autopost_analytics(date);

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS set_timestamp_autopost_analytics ON autopost_analytics;
CREATE TRIGGER set_timestamp_autopost_analytics
BEFORE UPDATE ON autopost_analytics
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create a function to automatically update retry analytics
CREATE OR REPLACE FUNCTION update_autopost_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics when a post status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO autopost_analytics (user_id, platform, date, total_posts, successful_posts, failed_posts, retry_attempts)
        VALUES (NEW.user_id, NEW.platform, CURRENT_DATE, 
                CASE WHEN NEW.status = 'posted' THEN 1 ELSE 0 END,
                CASE WHEN NEW.status = 'posted' THEN 1 ELSE 0 END,
                CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
                CASE WHEN NEW.retry_count > OLD.retry_count THEN 1 ELSE 0 END)
        ON CONFLICT (user_id, platform, date) DO UPDATE SET
            total_posts = CASE WHEN NEW.status = 'posted' THEN autopost_analytics.total_posts + 1 ELSE autopost_analytics.total_posts END,
            successful_posts = CASE WHEN NEW.status = 'posted' THEN autopost_analytics.successful_posts + 1 ELSE autopost_analytics.successful_posts END,
            failed_posts = CASE WHEN NEW.status = 'failed' THEN autopost_analytics.failed_posts + 1 ELSE autopost_analytics.failed_posts END,
            retry_attempts = CASE WHEN NEW.retry_count > OLD.retry_count THEN autopost_analytics.retry_attempts + 1 ELSE autopost_analytics.retry_attempts END,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update analytics
DROP TRIGGER IF EXISTS update_autopost_analytics_trigger ON autopost_schedule;
CREATE TRIGGER update_autopost_analytics_trigger
AFTER UPDATE ON autopost_schedule
FOR EACH ROW
EXECUTE FUNCTION update_autopost_analytics();

-- Add RLS policies for new tables
ALTER TABLE autopost_retry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopost_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopost_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for autopost_retry_history
DROP POLICY IF EXISTS "Users can view their own retry history" ON autopost_retry_history;
CREATE POLICY "Users can view their own retry history" ON autopost_retry_history
    FOR SELECT USING (
        schedule_id IN (
            SELECT id FROM autopost_schedule WHERE user_id = auth.uid()
        )
    );

-- RLS policies for autopost_dead_letter_queue
DROP POLICY IF EXISTS "Users can view their own dead letter queue" ON autopost_dead_letter_queue;
CREATE POLICY "Users can view their own dead letter queue" ON autopost_dead_letter_queue
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own dead letter queue" ON autopost_dead_letter_queue;
CREATE POLICY "Users can update their own dead letter queue" ON autopost_dead_letter_queue
    FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for autopost_analytics
DROP POLICY IF EXISTS "Users can view their own analytics" ON autopost_analytics;
CREATE POLICY "Users can view their own analytics" ON autopost_analytics
    FOR SELECT USING (user_id = auth.uid());

-- Create a function to get posts ready for retry
CREATE OR REPLACE FUNCTION get_posts_ready_for_retry()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    platform VARCHAR(255),
    content TEXT,
    media_urls TEXT[],
    post_time TIMESTAMPTZ,
    retry_count INTEGER,
    last_error TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.platform,
        s.content,
        s.media_urls,
        s.post_time,
        s.retry_count,
        s.last_error,
        s.metadata
    FROM autopost_schedule s
    WHERE s.status = 'failed'
    AND s.retry_count < s.max_retries
    AND (s.next_retry_at IS NULL OR s.next_retry_at <= NOW())
    ORDER BY s.priority DESC, s.next_retry_at ASC, s.created_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get posts ready for processing
CREATE OR REPLACE FUNCTION get_posts_ready_for_processing()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    platform VARCHAR(255),
    content TEXT,
    media_urls TEXT[],
    post_time TIMESTAMPTZ,
    priority VARCHAR(20),
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.platform,
        s.content,
        s.media_urls,
        s.post_time,
        s.priority,
        s.metadata
    FROM autopost_schedule s
    WHERE s.status = 'scheduled'
    AND s.post_time <= NOW()
    ORDER BY s.priority DESC, s.post_time ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_posts_ready_for_retry() TO authenticated;
GRANT EXECUTE ON FUNCTION get_posts_ready_for_processing() TO authenticated;