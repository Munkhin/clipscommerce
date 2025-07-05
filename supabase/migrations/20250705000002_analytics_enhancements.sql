-- Enhanced Analytics Schema for ClipsCommerce
-- This migration adds comprehensive analytics tracking and real-time metrics

-- Create platform authentication table
CREATE TABLE IF NOT EXISTS platform_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'linkedin')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT[],
    platform_user_id TEXT,
    platform_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Create posts table for content tracking
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'linkedin')),
    platform_post_id TEXT,
    content JSONB NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[],
    campaign_id UUID,
    CONSTRAINT posts_platform_post_id_unique UNIQUE(platform, platform_post_id)
);

-- Create post metrics table for engagement tracking
CREATE TABLE IF NOT EXISTS post_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    link_clicks INTEGER DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    view_time INTEGER DEFAULT 0, -- in seconds
    metrics_data JSONB, -- store raw platform-specific metrics
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, platform, DATE(collected_at))
);

-- Create audience demographics table
CREATE TABLE IF NOT EXISTS audience_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    age_range JSONB NOT NULL DEFAULT '{}', -- {"13-17": 5, "18-24": 25, etc.}
    gender JSONB NOT NULL DEFAULT '{}', -- {"male": 45, "female": 52, etc.}
    top_locations JSONB NOT NULL DEFAULT '[]', -- [{"location": "US", "percentage": 40}]
    languages JSONB NOT NULL DEFAULT '[]', -- [{"language": "English", "percentage": 85}]
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, DATE(collected_at))
);

-- Create trending data table
CREATE TABLE IF NOT EXISTS trending_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('hashtag', 'topic', 'audio')),
    item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    post_count INTEGER DEFAULT 0,
    growth_rate DECIMAL(5,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(platform, data_type, item_id, DATE(collected_at))
);

-- Create realtime metrics table for dashboard
CREATE TABLE IF NOT EXISTS realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    value DECIMAL(15,2) NOT NULL DEFAULT 0,
    previous_value DECIMAL(15,2) DEFAULT 0,
    change_percentage DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, metric_name)
);

-- Insert default realtime metrics for new users
INSERT INTO realtime_metrics (user_id, metric_name, value) 
SELECT 
    id,
    metric_name,
    CASE metric_name
        WHEN 'revenue' THEN 0
        WHEN 'revenueGrowth' THEN 0
        WHEN 'orders' THEN 0
        WHEN 'ordersGrowth' THEN 0
        WHEN 'conversion' THEN 0
        WHEN 'conversionGrowth' THEN 0
        WHEN 'visitors' THEN 0
        WHEN 'visitorsGrowth' THEN 0
    END as value
FROM auth.users
CROSS JOIN (
    VALUES 
        ('revenue'),
        ('revenueGrowth'),
        ('orders'),
        ('ordersGrowth'),
        ('conversion'),
        ('conversionGrowth'),
        ('visitors'),
        ('visitorsGrowth')
) AS metrics(metric_name)
ON CONFLICT (user_id, metric_name) DO NOTHING;

-- Create analytics cache table for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_platform_status ON posts(platform, status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id ON post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_collected_at ON post_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_metrics_platform ON post_metrics(platform);

CREATE INDEX IF NOT EXISTS idx_audience_demographics_user_platform ON audience_demographics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_audience_demographics_collected_at ON audience_demographics(collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_data_platform_type ON trending_data(platform, data_type);
CREATE INDEX IF NOT EXISTS idx_trending_data_collected_at ON trending_data(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_data_expires_at ON trending_data(expires_at);

CREATE INDEX IF NOT EXISTS idx_realtime_metrics_user_id ON realtime_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_updated_at ON realtime_metrics(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_platform_auth_updated_at ON platform_auth;
CREATE TRIGGER update_platform_auth_updated_at
    BEFORE UPDATE ON platform_auth
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_metrics_updated_at ON post_metrics;
CREATE TRIGGER update_post_metrics_updated_at
    BEFORE UPDATE ON post_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_cache WHERE expires_at < NOW();
    DELETE FROM trending_data WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
    p_likes INTEGER,
    p_comments INTEGER,
    p_shares INTEGER,
    p_saves INTEGER,
    p_impressions INTEGER
)
RETURNS DECIMAL(5,4) AS $$
BEGIN
    IF p_impressions = 0 OR p_impressions IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(
        (COALESCE(p_likes, 0) + COALESCE(p_comments, 0) + COALESCE(p_shares, 0) + COALESCE(p_saves, 0))::DECIMAL 
        / p_impressions::DECIMAL * 100, 
        4
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update realtime metrics
CREATE OR REPLACE FUNCTION update_realtime_metric(
    p_user_id UUID,
    p_metric_name TEXT,
    p_value DECIMAL(15,2)
)
RETURNS void AS $$
DECLARE
    current_value DECIMAL(15,2);
    change_pct DECIMAL(5,2);
BEGIN
    -- Get current value
    SELECT value INTO current_value 
    FROM realtime_metrics 
    WHERE user_id = p_user_id AND metric_name = p_metric_name;
    
    -- Calculate change percentage
    IF current_value IS NULL OR current_value = 0 THEN
        change_pct := 0;
    ELSE
        change_pct := ROUND(((p_value - current_value) / current_value) * 100, 2);
    END IF;
    
    -- Update or insert metric
    INSERT INTO realtime_metrics (user_id, metric_name, value, previous_value, change_percentage)
    VALUES (p_user_id, p_metric_name, p_value, COALESCE(current_value, 0), change_pct)
    ON CONFLICT (user_id, metric_name)
    DO UPDATE SET
        previous_value = EXCLUDED.previous_value,
        value = EXCLUDED.value,
        change_percentage = EXCLUDED.change_percentage,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE platform_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own platform auth" ON platform_auth
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view metrics for their posts" ON post_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_metrics.post_id 
            AND posts.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert/update post metrics" ON post_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update post metrics" ON post_metrics
    FOR UPDATE USING (true);

CREATE POLICY "Users can view their audience demographics" ON audience_demographics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their realtime metrics" ON realtime_metrics
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Analytics cache is accessible to all authenticated users" ON analytics_cache
    FOR ALL USING (auth.role() = 'authenticated');

-- Trending data is public (no user_id restriction)
CREATE POLICY "Trending data is publicly readable" ON trending_data
    FOR SELECT USING (true);

CREATE POLICY "System can manage trending data" ON trending_data
    FOR ALL USING (auth.role() = 'service_role');

-- Create a view for comprehensive post analytics
CREATE OR REPLACE VIEW post_analytics AS
SELECT 
    p.id,
    p.user_id,
    p.platform,
    p.platform_post_id,
    p.content,
    p.status,
    p.published_at,
    p.tags,
    pm.likes,
    pm.comments,
    pm.shares,
    pm.saves,
    pm.reach,
    pm.impressions,
    pm.engagement_rate,
    pm.link_clicks,
    pm.video_views,
    pm.view_time,
    pm.collected_at as metrics_collected_at,
    calculate_engagement_rate(pm.likes, pm.comments, pm.shares, pm.saves, pm.impressions) as calculated_engagement_rate
FROM posts p
LEFT JOIN post_metrics pm ON p.id = pm.post_id
WHERE p.status = 'published';

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Insert some sample trending data
INSERT INTO trending_data (platform, data_type, item_id, title, post_count, growth_rate) VALUES
('tiktok', 'hashtag', 'socialmedia', 'socialmedia', 1500, 45.2),
('tiktok', 'hashtag', 'marketing', 'marketing', 1200, 32.1),
('tiktok', 'topic', 'ai-marketing', 'AI in Marketing', 3200, 65.8),
('tiktok', 'topic', 'video-content', 'Video Content', 2800, 58.3),
('tiktok', 'audio', 'audio1', 'Upbeat Corporate', 12500, 85.6),
('instagram', 'hashtag', 'contentcreation', 'contentcreation', 750, 22.4),
('instagram', 'topic', 'instagram-reels', 'Instagram Reels', 2400, 52.1),
('youtube', 'topic', 'youtube-shorts', 'YouTube Shorts', 1900, 48.7)
ON CONFLICT (platform, data_type, item_id, DATE(collected_at)) DO NOTHING;

COMMENT ON TABLE platform_auth IS 'Stores OAuth tokens and authentication data for social media platforms';
COMMENT ON TABLE posts IS 'Stores content posts across all platforms with scheduling and status tracking';
COMMENT ON TABLE post_metrics IS 'Stores engagement metrics and analytics data for published posts';
COMMENT ON TABLE audience_demographics IS 'Stores audience demographic data retrieved from platform APIs';
COMMENT ON TABLE trending_data IS 'Stores trending hashtags, topics, and audio across platforms';
COMMENT ON TABLE realtime_metrics IS 'Stores real-time business metrics for dashboard display';
COMMENT ON TABLE analytics_cache IS 'Caches computed analytics data to improve performance';