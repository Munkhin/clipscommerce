-- Row Level Security Policies for Subscription Tables
-- Migration: 20250705000002_subscription_rls_policies.sql
-- 
-- This migration adds RLS policies for user_subscriptions and subscription_usage tables

-- ============================================================================
-- SUBSCRIPTION TABLE POLICIES
-- ============================================================================

-- Enable RLS (already enabled in the table creation migration, but ensuring it's set)
-- ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SERVICE ROLE POLICIES (for webhook access)
-- ============================================================================

-- Service role can manage all subscription data (needed for Stripe webhooks)
CREATE POLICY "Service role can manage all subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all subscription usage"
  ON subscription_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- ADMIN POLICIES
-- ============================================================================

-- Admins can view all subscription data
CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all subscription usage"
  ON subscription_usage FOR SELECT
  USING (is_admin());

-- Admins can manage all subscription data
CREATE POLICY "Admins can manage all subscriptions"
  ON user_subscriptions FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage all subscription usage"
  ON subscription_usage FOR ALL
  USING (is_admin());

-- ============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS AND SERVICE ROLE
-- ============================================================================

-- Grant permissions to authenticated users for their own data
GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_usage TO authenticated;

-- Grant permissions to service role for webhook operations
GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_usage TO service_role;

-- Grant execute permissions on the stored procedures
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_usage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_usage_record(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_current_usage(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_usage_record(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Service role can manage all subscriptions" ON user_subscriptions IS 'Allows service role to manage subscription data for webhook operations';
COMMENT ON POLICY "Service role can manage all subscription usage" ON subscription_usage IS 'Allows service role to manage usage tracking for webhook operations';

-- Success message
SELECT 'RLS policies successfully implemented for subscription tables!' as status;