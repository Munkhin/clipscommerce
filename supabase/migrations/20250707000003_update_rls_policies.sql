-- Update RLS policies to use the is_admin() helper function

-- Drop the old policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON roles;

-- Create the new policy
CREATE POLICY "Only admins can manage roles" ON roles FOR ALL USING (is_admin());

-- Drop the old policy
DROP POLICY IF EXISTS "Admins and managers can manage user roles" ON user_roles;

-- Create the new policy
CREATE POLICY "Admins and managers can manage user roles" ON user_roles FOR ALL USING (is_admin());
