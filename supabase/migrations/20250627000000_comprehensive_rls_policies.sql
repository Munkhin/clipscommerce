-- Comprehensive Row Level Security (RLS) Policies
-- Migration: 20250627000000_comprehensive_rls_policies.sql
-- 
-- This migration implements comprehensive RLS policies for all user-facing tables
-- Based on the existing database schema and user roles (user, admin, team)

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

-- Usage tracking table
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Pricing tables (public read access, but enable RLS for future admin controls)
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_benefits ENABLE ROW LEVEL SECURITY;

-- AI Improvement tables
ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trained_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;

-- Data collection tables
ALTER TABLE raw_instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_instagram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_tiktok_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_tiktok_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_uuid 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is team member or admin
CREATE OR REPLACE FUNCTION is_team_member_or_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_uuid 
    AND role IN ('team', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's auth.uid() as text (for tables using TEXT user_id)
CREATE OR REPLACE FUNCTION auth_uid_text()
RETURNS text AS $$
BEGIN
  RETURN auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USAGE TRACKING TABLE POLICIES
-- ============================================================================

-- Users can view their own usage tracking records
CREATE POLICY "Users can view their own usage tracking"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage tracking records (for application logging)
CREATE POLICY "Users can insert their own usage tracking"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all usage tracking records
CREATE POLICY "Admins can view all usage tracking"
  ON usage_tracking FOR SELECT
  USING (is_admin());

-- Admins can update usage tracking records
CREATE POLICY "Admins can update usage tracking"
  ON usage_tracking FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- PRICING TABLES POLICIES (PUBLIC READ, ADMIN WRITE)
-- ============================================================================

-- Everyone can read pricing tiers (public information)
CREATE POLICY "Anyone can view pricing tiers"
  ON pricing_tiers FOR SELECT
  USING (true);

-- Only admins can modify pricing tiers
CREATE POLICY "Admins can manage pricing tiers"
  ON pricing_tiers FOR ALL
  USING (is_admin());

-- Everyone can read tier benefits (public information)
CREATE POLICY "Anyone can view tier benefits"
  ON tier_benefits FOR SELECT
  USING (true);

-- Only admins can modify tier benefits
CREATE POLICY "Admins can manage tier benefits"
  ON tier_benefits FOR ALL
  USING (is_admin());

-- ============================================================================
-- USER POSTS TABLE POLICIES
-- ============================================================================

-- Users can view their own posts
CREATE POLICY "Users can view their own posts"
  ON user_posts FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts"
  ON user_posts FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON user_posts FOR UPDATE
  USING (user_id = auth_uid_text());

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON user_posts FOR DELETE
  USING (user_id = auth_uid_text());

-- Admins can view all posts
CREATE POLICY "Admins can view all posts"
  ON user_posts FOR SELECT
  USING (is_admin());

-- Admins can manage all posts
CREATE POLICY "Admins can manage all posts"
  ON user_posts FOR ALL
  USING (is_admin());

-- ============================================================================
-- TRAINING DATA QUALITY TABLE POLICIES
-- ============================================================================

-- Users can view their own training data quality records
CREATE POLICY "Users can view their own training data quality"
  ON training_data_quality FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own training data quality records
CREATE POLICY "Users can insert their own training data quality"
  ON training_data_quality FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own training data quality records
CREATE POLICY "Users can update their own training data quality"
  ON training_data_quality FOR UPDATE
  USING (user_id = auth_uid_text());

-- Admins can view all training data quality records
CREATE POLICY "Admins can view all training data quality"
  ON training_data_quality FOR SELECT
  USING (is_admin());

-- ============================================================================
-- MODEL TRAINING SESSIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own training sessions
CREATE POLICY "Users can view their own training sessions"
  ON model_training_sessions FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own training sessions
CREATE POLICY "Users can insert their own training sessions"
  ON model_training_sessions FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own training sessions
CREATE POLICY "Users can update their own training sessions"
  ON model_training_sessions FOR UPDATE
  USING (user_id = auth_uid_text());

-- Admins can view all training sessions
CREATE POLICY "Admins can view all training sessions"
  ON model_training_sessions FOR SELECT
  USING (is_admin());

-- Admins can manage all training sessions
CREATE POLICY "Admins can manage all training sessions"
  ON model_training_sessions FOR ALL
  USING (is_admin());

-- ============================================================================
-- TRAINED MODELS TABLE POLICIES
-- ============================================================================

-- Users can view their own trained models
CREATE POLICY "Users can view their own trained models"
  ON trained_models FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own trained models
CREATE POLICY "Users can insert their own trained models"
  ON trained_models FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own trained models
CREATE POLICY "Users can update their own trained models"
  ON trained_models FOR UPDATE
  USING (user_id = auth_uid_text());

-- Users can delete their own trained models
CREATE POLICY "Users can delete their own trained models"
  ON trained_models FOR DELETE
  USING (user_id = auth_uid_text());

-- Admins can view all trained models
CREATE POLICY "Admins can view all trained models"
  ON trained_models FOR SELECT
  USING (is_admin());

-- ============================================================================
-- AI SUGGESTIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own AI suggestions
CREATE POLICY "Users can view their own AI suggestions"
  ON ai_suggestions FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own AI suggestions (system generated)
CREATE POLICY "Users can insert their own AI suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own AI suggestions (feedback)
CREATE POLICY "Users can update their own AI suggestions"
  ON ai_suggestions FOR UPDATE
  USING (user_id = auth_uid_text());

-- Admins can view all AI suggestions
CREATE POLICY "Admins can view all AI suggestions"
  ON ai_suggestions FOR SELECT
  USING (is_admin());

-- ============================================================================
-- A/B EXPERIMENTS TABLE POLICIES
-- ============================================================================

-- Users can view their own experiments
CREATE POLICY "Users can view their own experiments"
  ON ab_experiments FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own experiments
CREATE POLICY "Users can insert their own experiments"
  ON ab_experiments FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own experiments
CREATE POLICY "Users can update their own experiments"
  ON ab_experiments FOR UPDATE
  USING (user_id = auth_uid_text());

-- Users can delete their own experiments
CREATE POLICY "Users can delete their own experiments"
  ON ab_experiments FOR DELETE
  USING (user_id = auth_uid_text());

-- Admins can view all experiments
CREATE POLICY "Admins can view all experiments"
  ON ab_experiments FOR SELECT
  USING (is_admin());

-- ============================================================================
-- EXPERIMENT RESULTS TABLE POLICIES
-- ============================================================================

-- Users can view their own experiment results
CREATE POLICY "Users can view their own experiment results"
  ON experiment_results FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert their own experiment results
CREATE POLICY "Users can insert their own experiment results"
  ON experiment_results FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update their own experiment results
CREATE POLICY "Users can update their own experiment results"
  ON experiment_results FOR UPDATE
  USING (user_id = auth_uid_text());

-- Admins can view all experiment results
CREATE POLICY "Admins can view all experiment results"
  ON experiment_results FOR SELECT
  USING (is_admin());

-- ============================================================================
-- DATA COLLECTION TABLES POLICIES
-- ============================================================================

-- RAW INSTAGRAM POSTS
-- Users can view posts they collected
CREATE POLICY "Users can view their collected Instagram posts"
  ON raw_instagram_posts FOR SELECT
  USING (user_id = auth_uid_text());

-- Users can insert posts they collect
CREATE POLICY "Users can insert their collected Instagram posts"
  ON raw_instagram_posts FOR INSERT
  WITH CHECK (user_id = auth_uid_text());

-- Users can update posts they collected
CREATE POLICY "Users can update their collected Instagram posts"
  ON raw_instagram_posts FOR UPDATE
  USING (user_id = auth_uid_text());

-- Admins can view all Instagram posts
CREATE POLICY "Admins can view all Instagram posts"
  ON raw_instagram_posts FOR SELECT
  USING (is_admin());

-- RAW INSTAGRAM USERS
-- All authenticated users can view Instagram user profiles (for research)
CREATE POLICY "Authenticated users can view Instagram users"
  ON raw_instagram_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert Instagram user profiles
CREATE POLICY "Users can insert Instagram users"
  ON raw_instagram_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update Instagram user profiles
CREATE POLICY "Users can update Instagram users"
  ON raw_instagram_users FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Admins can manage all Instagram users
CREATE POLICY "Admins can manage all Instagram users"
  ON raw_instagram_users FOR ALL
  USING (is_admin());

-- RAW TIKTOK VIDEOS
-- All authenticated users can view TikTok videos (for research)
CREATE POLICY "Authenticated users can view TikTok videos"
  ON raw_tiktok_videos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert TikTok videos
CREATE POLICY "Users can insert TikTok videos"
  ON raw_tiktok_videos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update TikTok videos
CREATE POLICY "Users can update TikTok videos"
  ON raw_tiktok_videos FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Admins can manage all TikTok videos
CREATE POLICY "Admins can manage all TikTok videos"
  ON raw_tiktok_videos FOR ALL
  USING (is_admin());

-- RAW TIKTOK USERS
-- All authenticated users can view TikTok user profiles (for research)
CREATE POLICY "Authenticated users can view TikTok users"
  ON raw_tiktok_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert TikTok user profiles
CREATE POLICY "Users can insert TikTok users"
  ON raw_tiktok_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update TikTok user profiles
CREATE POLICY "Users can update TikTok users"
  ON raw_tiktok_users FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Admins can manage all TikTok users
CREATE POLICY "Admins can manage all TikTok users"
  ON raw_tiktok_users FOR ALL
  USING (is_admin());

-- API CALL LOGS
-- Users can view their own API call logs
CREATE POLICY "Users can view their own API call logs"
  ON api_call_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert their own API call logs
CREATE POLICY "Users can insert API call logs"
  ON api_call_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can view all API call logs
CREATE POLICY "Admins can view all API call logs"
  ON api_call_logs FOR SELECT
  USING (is_admin());

-- Admins can manage API call logs
CREATE POLICY "Admins can manage API call logs"
  ON api_call_logs FOR ALL
  USING (is_admin());

-- ============================================================================
-- ENHANCED PROFILES TABLE POLICIES
-- ============================================================================

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Add policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Add policy for team members to view other team members' basic info
-- (This would require a team_members table, but we'll prepare for it)
CREATE POLICY "Team members can view team profiles"
  ON profiles FOR SELECT
  USING (
    is_team_member_or_admin() AND 
    (auth.uid() = id OR is_admin())
  );

-- ============================================================================
-- ADDITIONAL SECURITY POLICIES
-- ============================================================================

-- Create a policy to prevent users from escalating their own roles
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins to change any role
  IF is_admin() THEN
    RETURN NEW;
  END IF;
  
  -- Prevent users from changing their own role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent role escalation
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- ============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Grant usage on all sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select, insert, update, delete on appropriate tables
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_tracking TO authenticated;
GRANT SELECT ON pricing_tiers TO authenticated;
GRANT SELECT ON tier_benefits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON training_data_quality TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON model_training_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trained_models TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ab_experiments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON raw_instagram_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON raw_instagram_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON raw_tiktok_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON raw_tiktok_users TO authenticated;
GRANT SELECT, INSERT ON api_call_logs TO authenticated;

-- ============================================================================
-- CREATE ADMIN USER MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function for admins to promote a user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  -- Update the user's role
  UPDATE profiles 
  SET role = 'admin'
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to demote a user
CREATE OR REPLACE FUNCTION demote_user(target_user_id uuid, new_role text DEFAULT 'user')
RETURNS void AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;
  
  -- Validate new role
  IF new_role NOT IN ('user', 'team') THEN
    RAISE EXCEPTION 'Invalid role. Must be user or team';
  END IF;
  
  -- Prevent self-demotion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot demote themselves';
  END IF;
  
  -- Update the user's role
  UPDATE profiles 
  SET role = new_role
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION is_admin(uuid) IS 'Helper function to check if a user has admin privileges';
COMMENT ON FUNCTION is_team_member_or_admin(uuid) IS 'Helper function to check if a user is a team member or admin';
COMMENT ON FUNCTION auth_uid_text() IS 'Helper function to get auth.uid() as text for tables using TEXT user_id';
COMMENT ON FUNCTION prevent_role_escalation() IS 'Trigger function to prevent users from escalating their own roles';
COMMENT ON FUNCTION promote_to_admin(uuid) IS 'Admin function to promote a user to admin role';
COMMENT ON FUNCTION demote_user(uuid, text) IS 'Admin function to demote a user to a lower role';

-- Add table comments for clarity
COMMENT ON TABLE usage_tracking IS 'Tracks user usage for billing and analytics - users can only see their own data';
COMMENT ON TABLE pricing_tiers IS 'Public pricing information - read-only for all users, manageable by admins';
COMMENT ON TABLE tier_benefits IS 'Public pricing tier benefits - read-only for all users, manageable by admins';
COMMENT ON TABLE user_posts IS 'User social media posts - users can only access their own posts';
COMMENT ON TABLE training_data_quality IS 'AI training data quality metrics - users can only access their own data';
COMMENT ON TABLE model_training_sessions IS 'AI model training sessions - users can only access their own sessions';
COMMENT ON TABLE trained_models IS 'User-specific trained AI models - users can only access their own models';
COMMENT ON TABLE ai_suggestions IS 'AI-generated suggestions for users - users can only access their own suggestions';
COMMENT ON TABLE ab_experiments IS 'A/B testing experiments - users can only access their own experiments';
COMMENT ON TABLE experiment_results IS 'A/B testing results - users can only access their own results';
COMMENT ON TABLE raw_instagram_posts IS 'Raw Instagram post data - users can access posts they collected';
COMMENT ON TABLE raw_instagram_users IS 'Raw Instagram user profiles - shared for research purposes';
COMMENT ON TABLE raw_tiktok_videos IS 'Raw TikTok video data - shared for research purposes';
COMMENT ON TABLE raw_tiktok_users IS 'Raw TikTok user profiles - shared for research purposes';
COMMENT ON TABLE api_call_logs IS 'API call logging for debugging - users can see their calls, admins see all';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query to verify RLS is enabled on all expected tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'usage_tracking', 'pricing_tiers', 'tier_benefits', 
    'user_posts', 'training_data_quality', 'model_training_sessions', 
    'trained_models', 'ai_suggestions', 'ab_experiments', 'experiment_results',
    'raw_instagram_posts', 'raw_instagram_users', 'raw_tiktok_videos', 
    'raw_tiktok_users', 'api_call_logs', 'profiles'
  )
ORDER BY tablename;

-- Query to verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Success message
SELECT 'RLS policies successfully implemented for all tables!' as status;