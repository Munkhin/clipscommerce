-- Audit Logs Table Migration
-- Creates table for comprehensive audit logging

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'security', 'auth', 'data', 'system', etc.
  event_name TEXT NOT NULL, -- Specific event name
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  resource_type TEXT, -- 'user', 'team', 'billing', etc.
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs table
-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin' 
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Only admins can update/delete audit logs (for data retention policies)
CREATE POLICY "Only admins can manage audit logs" ON audit_logs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin' 
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  )
);

CREATE POLICY "Only admins can delete audit logs" ON audit_logs FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin' 
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_name ON audit_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create function to automatically log authentication events
CREATE OR REPLACE FUNCTION log_auth_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sign-in events
  IF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    INSERT INTO audit_logs (
      user_id,
      event_type,
      event_name,
      details,
      timestamp
    ) VALUES (
      NEW.id,
      'auth',
      'user_sign_in',
      jsonb_build_object(
        'email', NEW.email,
        'sign_in_count', COALESCE(NEW.raw_user_meta_data->>'sign_in_count', '0')
      ),
      NEW.last_sign_in_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for authentication events
DROP TRIGGER IF EXISTS on_auth_user_updated_log_event ON auth.users;
CREATE TRIGGER on_auth_user_updated_log_event
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION log_auth_event();

-- Create function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      event_type,
      event_name,
      details,
      resource_type,
      resource_id
    ) VALUES (
      NEW.assigned_by,
      'security',
      'role_assigned',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role_id', NEW.role_id,
        'team_id', NEW.team_id,
        'expires_at', NEW.expires_at
      ),
      'user_role',
      NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      event_type,
      event_name,
      details,
      old_values,
      new_values,
      resource_type,
      resource_id
    ) VALUES (
      NEW.assigned_by,
      'security',
      'role_updated',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role_id', NEW.role_id
      ),
      to_jsonb(OLD),
      to_jsonb(NEW),
      'user_role',
      NEW.id::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      event_type,
      event_name,
      details,
      resource_type,
      resource_id
    ) VALUES (
      OLD.assigned_by,
      'security',
      'role_removed',
      jsonb_build_object(
        'target_user_id', OLD.user_id,
        'role_id', OLD.role_id,
        'team_id', OLD.team_id
      ),
      'user_role',
      OLD.id::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS on_user_roles_changed_log_event ON user_roles;
CREATE TRIGGER on_user_roles_changed_log_event
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- Create function to log 2FA events
CREATE OR REPLACE FUNCTION log_2fa_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      event_type,
      event_name,
      details
    ) VALUES (
      NEW.user_id,
      'security',
      '2fa_enabled',
      jsonb_build_object(
        'totp_enabled', NEW.totp_enabled
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log when 2FA is used
    IF OLD.last_used_at IS DISTINCT FROM NEW.last_used_at THEN
      INSERT INTO audit_logs (
        user_id,
        event_type,
        event_name,
        details
      ) VALUES (
        NEW.user_id,
        'security',
        '2fa_used',
        jsonb_build_object(
          'method', 'totp',
          'recovery_codes_used', NEW.recovery_codes_used
        )
      );
    END IF;
    
    -- Log when 2FA is disabled
    IF OLD.totp_enabled = true AND NEW.totp_enabled = false THEN
      INSERT INTO audit_logs (
        user_id,
        event_type,
        event_name,
        details
      ) VALUES (
        NEW.user_id,
        'security',
        '2fa_disabled',
        jsonb_build_object(
          'recovery_codes_used', NEW.recovery_codes_used
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for 2FA events
DROP TRIGGER IF EXISTS on_user_2fa_settings_changed_log_event ON user_2fa_settings;
CREATE TRIGGER on_user_2fa_settings_changed_log_event
  AFTER INSERT OR UPDATE ON user_2fa_settings
  FOR EACH ROW EXECUTE FUNCTION log_2fa_event();

-- Create function to clean up old audit logs (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 2 years
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Log the cleanup action
  INSERT INTO audit_logs (
    event_type,
    event_name,
    details
  ) VALUES (
    'system',
    'audit_logs_cleanup',
    jsonb_build_object(
      'retention_period', '2 years',
      'cleanup_timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;