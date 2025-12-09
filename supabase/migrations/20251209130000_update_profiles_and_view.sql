-- Add is_active column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update admin_users_view to include is_active and ensure client_id is available
-- We drop the view first to avoid "cannot change name of view column" errors when the schema changes significantly
DROP VIEW IF EXISTS admin_users_view;

CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.is_active,
  p.created_at,
  c.id as client_id,
  c.name as client_name
FROM profiles p
LEFT JOIN client_users cu ON cu.user_id = p.id
LEFT JOIN clients c ON c.id = cu.client_id;

-- Re-grant permissions since we dropped the view
GRANT SELECT ON admin_users_view TO authenticated;
GRANT SELECT ON admin_users_view TO service_role;
