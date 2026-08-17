-- 018: Program group hierarchy (B.E./B.Tech, Diploma/Polytechnic, Management/Masters)
--      + profile ranking privacy + branch chat rooms for every branch

-- ========================================
-- PROGRAM GROUPS
-- ========================================

CREATE TABLE IF NOT EXISTS program_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text NOT NULL,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE program_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_program_groups" ON program_groups;
CREATE POLICY "read_program_groups" ON program_groups FOR SELECT TO authenticated USING (true);

-- Branches belong to a program group
ALTER TABLE branches ADD COLUMN IF NOT EXISTS program_group_id uuid REFERENCES program_groups(id) ON DELETE SET NULL;

-- ========================================
-- SEED PROGRAM GROUPS
-- ========================================

INSERT INTO program_groups (id, name, short_name, display_order, is_active) VALUES
  ('33333333-0001-3333-3333-333333333333', 'B.E./B.Tech', 'B.E.', 1, true),
  ('33333333-0002-3333-3333-333333333333', 'Diploma/Polytechnic', 'Diploma', 2, true),
  ('33333333-0003-3333-3333-333333333333', 'Management/Masters', 'Masters', 3, true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- BRANCHES: B.E./B.Tech (10)
-- Existing branches keep their IDs (renamed where needed); new branches get fresh IDs.
-- ========================================

UPDATE branches SET
  name = 'E & TC Engineering',
  program_group_id = '33333333-0001-3333-3333-333333333333'
WHERE id = '22222222-0004-2222-2222-222222222222';

UPDATE branches SET
  program_group_id = '33333333-0001-3333-3333-333333333333'
WHERE id IN (
  '22222222-0001-2222-2222-222222222222',
  '22222222-0002-2222-2222-222222222222',
  '22222222-0003-2222-2222-222222222222',
  '22222222-0005-2222-2222-222222222222',
  '22222222-0006-2222-2222-222222222222'
);

INSERT INTO branches (id, name, short_name, college_id, display_order, is_active, program_group_id) VALUES
  ('22222222-0007-2222-2222-222222222222', 'AI & Machine Learning', 'AI&ML', '11111111-1111-1111-1111-111111111111', 4, true, '33333333-0001-3333-3333-333333333333'),
  ('22222222-0008-2222-2222-222222222222', 'Electronics & Computer Engg', 'EC', '11111111-1111-1111-1111-111111111111', 5, true, '33333333-0001-3333-3333-333333333333'),
  ('22222222-0009-2222-2222-222222222222', 'Electrical Engineering', 'Electrical', '11111111-1111-1111-1111-111111111111', 7, true, '33333333-0001-3333-3333-333333333333'),
  ('22222222-0010-2222-2222-222222222222', 'Robotics & Automation', 'Robotics', '11111111-1111-1111-1111-111111111111', 10, true, '33333333-0001-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- BRANCHES: Diploma/Polytechnic (5)
-- ========================================

INSERT INTO branches (id, name, short_name, college_id, display_order, is_active, program_group_id) VALUES
  ('22222222-0021-2222-2222-222222222222', 'Diploma Computer Engineering', 'Dip Computer', '11111111-1111-1111-1111-111111111111', 21, true, '33333333-0002-3333-3333-333333333333'),
  ('22222222-0022-2222-2222-222222222222', 'Diploma Information Technology', 'Dip IT', '11111111-1111-1111-1111-111111111111', 22, true, '33333333-0002-3333-3333-333333333333'),
  ('22222222-0023-2222-2222-222222222222', 'Diploma Mechanical Engineering', 'Dip Mechanical', '11111111-1111-1111-1111-111111111111', 23, true, '33333333-0002-3333-3333-333333333333'),
  ('22222222-0024-2222-2222-222222222222', 'Diploma Civil Engineering', 'Dip Civil', '11111111-1111-1111-1111-111111111111', 24, true, '33333333-0002-3333-3333-333333333333'),
  ('22222222-0025-2222-2222-222222222222', 'Diploma Electrical Engineering', 'Dip Electrical', '11111111-1111-1111-1111-111111111111', 25, true, '33333333-0002-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- BRANCHES: Management/Masters (MBA, MCA)
-- ========================================

INSERT INTO branches (id, name, short_name, college_id, display_order, is_active, program_group_id) VALUES
  ('22222222-0031-2222-2222-222222222222', 'MBA', 'MBA', '11111111-1111-1111-1111-111111111111', 31, true, '33333333-0003-3333-3333-333333333333'),
  ('22222222-0032-2222-2222-222222222222', 'MCA', 'MCA', '11111111-1111-1111-1111-111111111111', 32, true, '33333333-0003-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- PROFILE: ranking privacy
-- ========================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_rankings boolean NOT NULL DEFAULT true;

-- ========================================
-- CHAT ROOMS for every branch (Campus chat + Gossip)
-- ========================================

INSERT INTO chat_rooms (id, name, slug, type, branch_id, icon, member_count, is_active) VALUES
  ('99999999-0101-9999-9999-999999999999', 'Computer Engineering', 'dept-computer-engineering', 'branch', '22222222-0001-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0102-9999-9999-999999999999', 'Information Technology', 'dept-information-technology', 'branch', '22222222-0002-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0103-9999-9999-999999999999', 'AI & Data Science', 'dept-ai-data-science', 'branch', '22222222-0003-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0104-9999-9999-999999999999', 'E & TC Engineering', 'dept-etc-engineering', 'branch', '22222222-0004-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0105-9999-9999-999999999999', 'Mechanical Engineering', 'dept-mechanical-engineering', 'branch', '22222222-0005-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0106-9999-9999-999999999999', 'Civil Engineering', 'dept-civil-engineering', 'branch', '22222222-0006-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0107-9999-9999-999999999999', 'AI & Machine Learning', 'dept-ai-ml', 'branch', '22222222-0007-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0108-9999-9999-999999999999', 'Electronics & Computer Engg', 'dept-ec-engineering', 'branch', '22222222-0008-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0109-9999-9999-999999999999', 'Electrical Engineering', 'dept-electrical-engineering', 'branch', '22222222-0009-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0110-9999-9999-999999999999', 'Robotics & Automation', 'dept-robotics-automation', 'branch', '22222222-0010-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0111-9999-9999-999999999999', 'Diploma Computer Engineering', 'dept-dip-computer', 'branch', '22222222-0021-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0112-9999-9999-999999999999', 'Diploma Information Technology', 'dept-dip-it', 'branch', '22222222-0022-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0113-9999-9999-999999999999', 'Diploma Mechanical Engineering', 'dept-dip-mechanical', 'branch', '22222222-0023-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0114-9999-9999-999999999999', 'Diploma Civil Engineering', 'dept-dip-civil', 'branch', '22222222-0024-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0115-9999-9999-999999999999', 'Diploma Electrical Engineering', 'dept-dip-electrical', 'branch', '22222222-0025-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0116-9999-9999-999999999999', 'MBA', 'dept-mba', 'branch', '22222222-0031-2222-2222-222222222222', '💬', 0, true),
  ('99999999-0117-9999-9999-999999999999', 'MCA', 'dept-mca', 'branch', '22222222-0032-2222-2222-222222222222', '💬', 0, true)
ON CONFLICT (id) DO NOTHING;