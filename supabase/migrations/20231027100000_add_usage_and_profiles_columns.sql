-- Add subscription_tier and role to profiles table
ALTER TABLE profiles
ADD COLUMN subscription_tier text DEFAULT 'lite';
ALTER TABLE profiles
ADD COLUMN role text DEFAULT 'user';

-- Create usage_tracking table
CREATE TABLE usage_tracking (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_type text NOT NULL,
    execution_count integer NOT NULL DEFAULT 1,
    cost_units integer NOT NULL DEFAULT 1,
    timestamp timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on user_id and timestamp for efficient querying
CREATE INDEX idx_usage_tracking_user_id_timestamp ON usage_tracking (user_id, timestamp); 