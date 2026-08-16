/*
# Migration 012: Ensure Campus chat room + helper to get user's rooms
*/

-- Ensure a global 'Campus' room exists
INSERT INTO chat_rooms (id, name, slug, type, branch_id, icon, member_count, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Campus',
  'campus',
  'everyone',
  NULL,
  '🌐',
  0,
  true
)
ON CONFLICT (slug) DO UPDATE SET name = 'Campus', icon = '🌐', is_active = true;

-- RPC: Get the two campus chat rooms for a user (Campus + their department)
CREATE OR REPLACE FUNCTION get_campus_rooms(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  type text,
  branch_id uuid,
  icon text,
  member_count int,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Always include the Campus room
  SELECT cr.id, cr.name, cr.slug, cr.type, cr.branch_id, cr.icon, cr.member_count, cr.is_active, cr.created_at
  FROM chat_rooms cr
  WHERE cr.slug = 'campus' AND cr.is_active = true

  UNION ALL

  -- Include the user's department room if they have a branch_id
  SELECT cr2.id, cr2.name, cr2.slug, cr2.type, cr2.branch_id, cr2.icon, cr2.member_count, cr2.is_active, cr2.created_at
  FROM chat_rooms cr2
  JOIN profiles p ON p.id = p_user_id
  WHERE cr2.branch_id = p.branch_id
    AND cr2.is_active = true
    AND p_user_id IS NOT NULL
    AND p.branch_id IS NOT NULL;
$$;
