CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.created_at,
  c.name as client_name
FROM profiles p
LEFT JOIN client_users cu ON cu.user_id = p.id
LEFT JOIN clients c ON c.id = cu.client_id;
