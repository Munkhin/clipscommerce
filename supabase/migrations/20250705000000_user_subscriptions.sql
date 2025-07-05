-- User Subscriptions Migration
-- Create table to track user subscription data from Stripe

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    price_id TEXT NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique subscription per user
    UNIQUE(user_id),
    UNIQUE(stripe_subscription_id)
);

-- Create usage tracking table for subscription limits
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per user per feature per period
    UNIQUE(user_id, feature, period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_feature ON subscription_usage(feature);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
CREATE POLICY "Users can view their own subscription" 
    ON user_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
CREATE POLICY "Users can update their own subscription"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
CREATE POLICY "Users can insert their own subscription"
    ON user_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policies for subscription_usage
DROP POLICY IF EXISTS "Users can view their own usage" ON subscription_usage;
CREATE POLICY "Users can view their own usage" 
    ON subscription_usage FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage" ON subscription_usage;
CREATE POLICY "Users can update their own usage"
    ON subscription_usage FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage" ON subscription_usage;
CREATE POLICY "Users can insert their own usage"
    ON subscription_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_usage_updated_at ON subscription_usage;
CREATE TRIGGER update_subscription_usage_updated_at
    BEFORE UPDATE ON subscription_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get or create usage tracking record
CREATE OR REPLACE FUNCTION get_or_create_usage_record(
    p_user_id UUID,
    p_feature TEXT,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
    usage_id UUID;
BEGIN
    -- Try to get existing record
    SELECT id INTO usage_id
    FROM subscription_usage
    WHERE user_id = p_user_id 
      AND feature = p_feature 
      AND period_start = p_period_start;
    
    -- If not found, create new record
    IF usage_id IS NULL THEN
        INSERT INTO subscription_usage (user_id, feature, usage_count, period_start, period_end)
        VALUES (p_user_id, p_feature, 0, p_period_start, p_period_end)
        RETURNING id INTO usage_id;
    END IF;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_feature TEXT,
    p_amount INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
    period_start TIMESTAMPTZ;
    period_end TIMESTAMPTZ;
    usage_id UUID;
BEGIN
    -- Calculate current billing period (monthly)
    period_start := DATE_TRUNC('month', NOW());
    period_end := period_start + INTERVAL '1 month';
    
    -- Get or create usage record
    usage_id := get_or_create_usage_record(p_user_id, p_feature, period_start, period_end);
    
    -- Increment usage
    UPDATE subscription_usage
    SET usage_count = usage_count + p_amount,
        updated_at = NOW()
    WHERE id = usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current usage
CREATE OR REPLACE FUNCTION get_current_usage(
    p_user_id UUID,
    p_feature TEXT
) RETURNS INTEGER AS $$
DECLARE
    usage_count INTEGER;
    period_start TIMESTAMPTZ;
BEGIN
    -- Calculate current billing period (monthly)
    period_start := DATE_TRUNC('month', NOW());
    
    -- Get usage count for current period
    SELECT COALESCE(subscription_usage.usage_count, 0) INTO usage_count
    FROM subscription_usage
    WHERE user_id = p_user_id 
      AND feature = p_feature 
      AND period_start = period_start;
    
    RETURN COALESCE(usage_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;