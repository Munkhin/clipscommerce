-- Database Indexes for Team Dashboard Performance Optimization
-- These indexes are designed to optimize frequent queries for client lists, payment histories, and user management

-- ============================================================================
-- USER AND TEAM RELATED INDEXES
-- ============================================================================

-- Index for user lookups by email (authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email) 
WHERE deleted_at IS NULL;

-- Index for user team memberships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user_team 
ON team_members (user_id, team_id) 
WHERE is_active = true;

-- Index for team member roles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_role 
ON team_members (team_id, role) 
WHERE is_active = true;

-- Index for user sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_active 
ON user_sessions (user_id, is_active, expires_at) 
WHERE is_active = true;

-- ============================================================================
-- CLIENT MANAGEMENT INDEXES
-- ============================================================================

-- Index for client lists by team (most frequent query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_team_status 
ON clients (team_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index for client search by name/email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_search 
ON clients USING gin(to_tsvector('english', name || ' ' || email)) 
WHERE deleted_at IS NULL;

-- Index for client assignments to users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_assigned_user 
ON clients (assigned_user_id, team_id, status) 
WHERE deleted_at IS NULL AND assigned_user_id IS NOT NULL;

-- Index for client activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_activities_client_date 
ON client_activities (client_id, created_at DESC);

-- Index for client tags (for filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_tags_tag_team 
ON client_tags (tag, team_id);

-- ============================================================================
-- BILLING AND PAYMENT INDEXES
-- ============================================================================

-- Index for team subscription lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_team_status 
ON subscriptions (team_id, status, current_period_end DESC) 
WHERE status IN ('active', 'trialing', 'past_due');

-- Index for payment history by team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_team_date 
ON payments (team_id, created_at DESC, status);

-- Index for invoice lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_team_status_date 
ON invoices (team_id, status, created_at DESC);

-- Index for usage tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_team_period 
ON usage_records (team_id, billing_period, created_at DESC);

-- Index for Stripe webhook events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_events_type_processed 
ON stripe_events (event_type, processed_at) 
WHERE processed_at IS NOT NULL;

-- ============================================================================
-- AUDIT AND SECURITY INDEXES
-- ============================================================================

-- Index for audit log queries by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs (user_id, timestamp DESC);

-- Index for audit log queries by team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_team_date 
ON audit_logs (team_id, timestamp DESC) 
WHERE team_id IS NOT NULL;

-- Index for audit log queries by action type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_category 
ON audit_logs (action, category, timestamp DESC);

-- Index for security events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_security 
ON audit_logs (category, severity, timestamp DESC) 
WHERE category = 'security';

-- ============================================================================
-- ANALYTICS AND REPORTING INDEXES
-- ============================================================================

-- Index for analytics queries by team and date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_team_date 
ON analytics_events (team_id, event_date, event_type);

-- Index for performance metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_date 
ON performance_metrics (metric_date DESC, metric_type);

-- Index for user activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user_date 
ON user_activities (user_id, activity_date DESC);

-- ============================================================================
-- API AND INTEGRATION INDEXES
-- ============================================================================

-- Index for API key lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_key_active 
ON api_keys (api_key_hash) 
WHERE is_active = true AND expires_at > NOW();

-- Index for webhook deliveries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_status_date 
ON webhook_deliveries (status, created_at DESC);

-- Index for integration logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_logs_team_date 
ON integration_logs (team_id, created_at DESC, status);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Index for client dashboard queries (clients with recent activities)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_dashboard 
ON clients (team_id, status, last_activity_at DESC, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index for team billing dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_billing_dashboard 
ON subscriptions (team_id, status, current_period_start, current_period_end) 
WHERE status IN ('active', 'trialing', 'past_due');

-- Index for user permission checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions 
ON team_members (user_id, team_id, role, is_active) 
WHERE is_active = true;

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Index for active clients only (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_active_only 
ON clients (team_id, created_at DESC) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Index for failed payments (for retry logic)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_failed 
ON payments (team_id, created_at DESC) 
WHERE status = 'failed';

-- Index for pending invitations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invitations_pending 
ON team_invitations (email, team_id, created_at DESC) 
WHERE status = 'pending' AND expires_at > NOW();

-- ============================================================================
-- INDEXES FOR FULL-TEXT SEARCH
-- ============================================================================

-- Full-text search index for clients
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_fulltext 
ON clients USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(company, '') || ' ' || 
    COALESCE(notes, '')
  )
) 
WHERE deleted_at IS NULL;

-- Full-text search index for audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_fulltext 
ON audit_logs USING gin(
  to_tsvector('english', 
    COALESCE(action, '') || ' ' || 
    COALESCE(resource, '') || ' ' || 
    COALESCE(details::text, '')
  )
);

-- ============================================================================
-- MAINTENANCE AND CLEANUP INDEXES
-- ============================================================================

-- Index for cleanup operations (soft deletes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_soft_deletes_cleanup 
ON clients (deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Index for session cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_cleanup 
ON user_sessions (expires_at) 
WHERE expires_at < NOW();

-- Index for audit log cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_cleanup 
ON audit_logs (timestamp) 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Unused'
    WHEN idx_scan < 100 THEN 'Low Usage'
    WHEN idx_scan < 1000 THEN 'Medium Usage'
    ELSE 'High Usage'
  END as usage_level
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View to monitor table sizes and index effectiveness
CREATE OR REPLACE VIEW table_index_stats AS
SELECT 
  t.tablename,
  pg_size_pretty(pg_total_relation_size(t.tablename::regclass)) as total_size,
  pg_size_pretty(pg_relation_size(t.tablename::regclass)) as table_size,
  pg_size_pretty(pg_total_relation_size(t.tablename::regclass) - pg_relation_size(t.tablename::regclass)) as index_size,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename) as index_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(t.tablename::regclass) DESC;

-- ============================================================================
-- INDEX MAINTENANCE COMMANDS
-- ============================================================================

-- Commands to run periodically for index maintenance:

-- 1. Reindex all indexes (run during maintenance windows)
-- REINDEX DATABASE your_database_name;

-- 2. Update table statistics (run daily)
-- ANALYZE;

-- 3. Check for unused indexes (run monthly)
-- SELECT * FROM index_usage_stats WHERE usage_level = 'Unused';

-- 4. Monitor slow queries
-- SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- ============================================================================
-- NOTES AND BEST PRACTICES
-- ============================================================================

/*
PERFORMANCE CONSIDERATIONS:

1. CONCURRENTLY keyword is used to avoid blocking writes during index creation
2. Partial indexes are used where appropriate to reduce index size
3. Composite indexes are ordered by selectivity (most selective columns first)
4. GIN indexes are used for full-text search and array operations
5. Indexes include WHERE clauses to exclude soft-deleted records

MONITORING:
- Use pg_stat_user_indexes to monitor index usage
- Use pg_stat_statements to identify slow queries
- Monitor index bloat with pg_stat_user_tables

MAINTENANCE:
- Run ANALYZE regularly to update statistics
- Consider REINDEX for heavily updated indexes
- Monitor and drop unused indexes
- Use pg_stat_activity to identify blocking queries

SCALING CONSIDERATIONS:
- Consider partitioning for very large tables (>100M rows)
- Use connection pooling (PgBouncer) for high concurrency
- Consider read replicas for analytics queries
- Monitor connection limits and query timeouts
*/ 