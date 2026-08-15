/*
# Migration 010: Resources / Notes system
*/

-- ========================================
-- 1. RESOURCES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  subject text NOT NULL,
  resource_type text NOT NULL DEFAULT 'notes',
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  semester int,
  external_url text,
  useful_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_branch ON resources(branch_id);
CREATE INDEX IF NOT EXISTS idx_resources_uploader ON resources(uploader_id);

-- ========================================
-- 2. RESOURCE SAVES
-- ========================================

CREATE TABLE IF NOT EXISTS resource_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resource_id, user_id)
);

-- ========================================
-- 3. RESOURCE USEFUL VOTES
-- ========================================

CREATE TABLE IF NOT EXISTS resource_useful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resource_id, user_id)
);

-- ========================================
-- 4. RLS
-- ========================================

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_resources" ON resources;
CREATE POLICY "read_resources" ON resources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_resource" ON resources;
CREATE POLICY "insert_own_resource" ON resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);
DROP POLICY IF EXISTS "update_own_resource" ON resources;
CREATE POLICY "update_own_resource" ON resources FOR UPDATE TO authenticated USING (auth.uid() = uploader_id) WITH CHECK (auth.uid() = uploader_id);
DROP POLICY IF EXISTS "delete_own_resource" ON resources;
CREATE POLICY "delete_own_resource" ON resources FOR DELETE TO authenticated USING (auth.uid() = uploader_id);

ALTER TABLE resource_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_resource_saves" ON resource_saves;
CREATE POLICY "read_own_resource_saves" ON resource_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_resource_save" ON resource_saves;
CREATE POLICY "insert_own_resource_save" ON resource_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resource_save" ON resource_saves;
CREATE POLICY "delete_own_resource_save" ON resource_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE resource_useful ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_resource_useful" ON resource_useful;
CREATE POLICY "read_resource_useful" ON resource_useful FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_resource_useful" ON resource_useful;
CREATE POLICY "insert_own_resource_useful" ON resource_useful FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resource_useful" ON resource_useful;
CREATE POLICY "delete_own_resource_useful" ON resource_useful FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 5. RPC: increment useful count
-- ========================================

CREATE OR REPLACE FUNCTION increment_resource_useful(resource_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  UPDATE resources SET useful_count = GREATEST(useful_count + delta, 0) WHERE id = resource_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
