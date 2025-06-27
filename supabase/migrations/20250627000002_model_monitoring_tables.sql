-- Model Monitoring Tables
-- Migration: 20250627000002_model_monitoring_tables.sql

-- Table for storing model performance metrics
CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  prediction_count INTEGER DEFAULT 0,
  average_latency DECIMAL(10,2) DEFAULT 0, -- milliseconds
  error_rate DECIMAL(5,4) DEFAULT 0, -- 0-1 range
  accuracy DECIMAL(5,4), -- 0-1 range, optional
  drift DECIMAL(5,4), -- 0-1 range, optional
  resource_usage JSONB, -- CPU, memory, requests per minute
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing model alerts
CREATE TABLE IF NOT EXISTS model_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT NOT NULL UNIQUE,
  model_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('performance_degradation', 'high_error_rate', 'resource_exhaustion', 'drift_detected')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  metrics JSONB,
  threshold DECIMAL(10,4),
  actual_value DECIMAL(10,4),
  acknowledged BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing model health snapshots
CREATE TABLE IF NOT EXISTS model_health_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  uptime_seconds INTEGER DEFAULT 0,
  active_alerts_count INTEGER DEFAULT 0,
  last_prediction_at TIMESTAMPTZ,
  health_score DECIMAL(3,2) DEFAULT 0, -- 0-1 range
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_performance_metrics_model_timestamp 
  ON model_performance_metrics(model_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_model_alerts_model_status 
  ON model_alerts(model_id, acknowledged, severity);

CREATE INDEX IF NOT EXISTS idx_model_health_snapshots_model_time 
  ON model_health_snapshots(model_id, snapshot_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER set_timestamp_model_alerts
BEFORE UPDATE ON model_alerts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Function to calculate model health score
CREATE OR REPLACE FUNCTION calculate_model_health_score(
  p_model_id TEXT,
  p_hours INTEGER DEFAULT 24
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_avg_latency DECIMAL(10,2);
  v_avg_error_rate DECIMAL(5,4);
  v_critical_alerts INTEGER;
  v_health_score DECIMAL(3,2);
BEGIN
  -- Get average metrics for the last N hours
  SELECT 
    COALESCE(AVG(average_latency), 0),
    COALESCE(AVG(error_rate), 0)
  INTO v_avg_latency, v_avg_error_rate
  FROM model_performance_metrics
  WHERE model_id = p_model_id
    AND timestamp >= NOW() - INTERVAL '1 hour' * p_hours;

  -- Count critical alerts in the last 24 hours
  SELECT COUNT(*)
  INTO v_critical_alerts
  FROM model_alerts
  WHERE model_id = p_model_id
    AND severity = 'critical'
    AND acknowledged = FALSE
    AND created_at >= NOW() - INTERVAL '24 hours';

  -- Calculate health score (0-1 scale)
  v_health_score := 1.0;
  
  -- Penalize for high latency (over 1000ms)
  IF v_avg_latency > 1000 THEN
    v_health_score := v_health_score - LEAST(0.3, (v_avg_latency - 1000) / 2000);
  END IF;
  
  -- Penalize for high error rate (over 5%)
  IF v_avg_error_rate > 0.05 THEN
    v_health_score := v_health_score - LEAST(0.4, (v_avg_error_rate - 0.05) * 8);
  END IF;
  
  -- Penalize for critical alerts
  v_health_score := v_health_score - (v_critical_alerts * 0.2);
  
  -- Ensure score is between 0 and 1
  v_health_score := GREATEST(0.0, LEAST(1.0, v_health_score));
  
  RETURN v_health_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get model health status
CREATE OR REPLACE FUNCTION get_model_health_status(p_model_id TEXT)
RETURNS TABLE (
  model_id TEXT,
  status TEXT,
  health_score DECIMAL(3,2),
  last_metrics_at TIMESTAMPTZ,
  active_alerts INTEGER,
  uptime_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_metrics AS (
    SELECT 
      m.model_id,
      m.timestamp as last_metrics_at,
      EXTRACT(EPOCH FROM (NOW() - m.timestamp))::INTEGER as uptime_seconds
    FROM model_performance_metrics m
    WHERE m.model_id = p_model_id
    ORDER BY m.timestamp DESC
    LIMIT 1
  ),
  alert_counts AS (
    SELECT 
      COUNT(*) as active_alerts
    FROM model_alerts a
    WHERE a.model_id = p_model_id
      AND a.acknowledged = FALSE
  )
  SELECT 
    p_model_id,
    CASE 
      WHEN ac.active_alerts = 0 AND lm.uptime_seconds < 300 THEN 'healthy'
      WHEN ac.active_alerts > 0 AND NOT EXISTS (
        SELECT 1 FROM model_alerts 
        WHERE model_id = p_model_id 
          AND severity IN ('high', 'critical') 
          AND acknowledged = FALSE
      ) THEN 'warning'
      WHEN EXISTS (
        SELECT 1 FROM model_alerts 
        WHERE model_id = p_model_id 
          AND severity = 'critical' 
          AND acknowledged = FALSE
      ) THEN 'critical'
      WHEN lm.uptime_seconds > 300 THEN 'offline'
      ELSE 'warning'
    END as status,
    calculate_model_health_score(p_model_id) as health_score,
    lm.last_metrics_at,
    ac.active_alerts,
    COALESCE(lm.uptime_seconds, 0) as uptime_seconds
  FROM alert_counts ac
  LEFT JOIN latest_metrics lm ON true;
END;
$$ LANGUAGE plpgsql;

-- Create view for model monitoring dashboard
CREATE OR REPLACE VIEW model_monitoring_dashboard AS
SELECT 
  tm.id as model_id,
  tm.model_name,
  tm.model_type,
  tm.version,
  tm.status as deployment_status,
  tm.deployment_environment,
  mhs.status as health_status,
  mhs.health_score,
  mhs.last_prediction_at,
  mhs.uptime_seconds,
  mhs.active_alerts_count,
  tm.prediction_count,
  tm.last_used,
  tm.created_at as model_created_at
FROM trained_models tm
LEFT JOIN LATERAL (
  SELECT * FROM get_model_health_status(tm.id)
) mhs ON true
WHERE tm.status = 'deployed'
ORDER BY mhs.health_score ASC, tm.last_used DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON model_performance_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON model_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON model_health_snapshots TO authenticated;
GRANT SELECT ON model_monitoring_dashboard TO authenticated;

-- Comments for documentation
COMMENT ON TABLE model_performance_metrics IS 'Stores real-time performance metrics for deployed models';
COMMENT ON TABLE model_alerts IS 'Stores alerts generated when models exceed performance thresholds';
COMMENT ON TABLE model_health_snapshots IS 'Periodic snapshots of model health status for historical tracking';
COMMENT ON FUNCTION calculate_model_health_score IS 'Calculates a 0-1 health score based on model performance metrics';
COMMENT ON VIEW model_monitoring_dashboard IS 'Consolidated view for model monitoring dashboard';