/*
# Core schema: profiles, colleges, branches, hidden profiles, follow system

1. New Tables
- colleges, branches — configurable college/department data (not hardcoded in app)
- profiles — real student identity (username, bio, year, gender, privacy, contact, aura, scores)
- hidden_profiles — anonymous persona (code, avatar, nickname). owner_id known to backend only, never selected by client
- follows — follower -> followee relationships
- follow_requests — pending requests for private accounts
- skills, interests — master lists (configurable, searchable)
- profile_skills, profile_interests — joins
- blocks — user blocks
2. Security
- RLS on every table. Profiles: public reads for public accounts, private visible to self + accepted followers. Self-only updates.
- Hidden profiles: authenticated read (app selects only safe columns, never owner_id). Owner-only insert/update/delete.
- Branches/colleges/skills/interests: authenticated read.
- Follows: public read; follower-only insert/delete.
- Follow requests: sender/recipient read; sender insert; recipient update; either delete.
- Blocks: blocker-only.
3. Notes
- owner_id/user_id default to auth.uid() so inserts succeed when client omits them.
- Gender visibility defaults OFF. is_private defaults OFF.
*/

-- Colleges
CREATE TABLE IF NOT EXISTS colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  created_at timestamptz DEFAULT now()
);

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  college_id uuid REFERENCES colleges(id) ON DELETE SET NULL,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  full_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  avatar_url text,
  bio text DEFAULT '',
  college_id uuid REFERENCES colleges(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  year int DEFAULT 1,
  gender text DEFAULT 'prefer_not_to_say',
  show_gender boolean DEFAULT false,
  show_year boolean DEFAULT true,
  is_private boolean DEFAULT false,
  instagram text,
  phone text,
  email_visible boolean DEFAULT false,
  aura_badges text[] DEFAULT '{}',
  zeal_score int DEFAULT 0,
  smart_score int DEFAULT 0,
  game_xp int DEFAULT 0,
  game_level int DEFAULT 1,
  follower_count int DEFAULT 0,
  following_count int DEFAULT 0,
  post_count int DEFAULT 0,
  onboarding_completed boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Hidden profiles
CREATE TABLE IF NOT EXISTS hidden_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  anonymous_code text UNIQUE NOT NULL,
  avatar_seed text NOT NULL DEFAULT '1',
  avatar_style text DEFAULT '1',
  nickname text,
  gender text DEFAULT 'prefer_not_to_say',
  show_gender boolean DEFAULT false,
  reputation int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, followee_id)
);

-- Follow requests
CREATE TABLE IF NOT EXISTS follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Interests
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Profile skills
CREATE TABLE IF NOT EXISTS profile_skills (
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, skill_id)
);

-- Profile interests
CREATE TABLE IF NOT EXISTS profile_interests (
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, interest_id)
);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_hidden_owner ON hidden_profiles (owner_id);
CREATE INDEX IF NOT EXISTS idx_hidden_code ON hidden_profiles (anonymous_code);

-- ===== RLS + POLICIES (after all tables exist) =====

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_colleges" ON colleges;
CREATE POLICY "read_colleges" ON colleges FOR SELECT TO authenticated USING (true);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_branches" ON branches;
CREATE POLICY "read_branches" ON branches FOR SELECT TO authenticated USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR is_private = false
  OR EXISTS (
    SELECT 1 FROM follows
    WHERE follows.followee_id = profiles.id
    AND follows.follower_id = auth.uid()
    AND follows.status = 'accepted'
  )
);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE hidden_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_hidden_profiles" ON hidden_profiles;
CREATE POLICY "read_hidden_profiles" ON hidden_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_hidden" ON hidden_profiles;
CREATE POLICY "insert_own_hidden" ON hidden_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_hidden" ON hidden_profiles;
CREATE POLICY "update_own_hidden" ON hidden_profiles FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_hidden" ON hidden_profiles;
CREATE POLICY "delete_own_hidden" ON hidden_profiles FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_follows" ON follows;
CREATE POLICY "read_follows" ON follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_follow" ON follows;
CREATE POLICY "insert_own_follow" ON follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "delete_own_follow" ON follows;
CREATE POLICY "delete_own_follow" ON follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id);

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_follow_requests" ON follow_requests;
CREATE POLICY "read_follow_requests" ON follow_requests FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "insert_own_follow_request" ON follow_requests;
CREATE POLICY "insert_own_follow_request" ON follow_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "update_received_follow_request" ON follow_requests;
CREATE POLICY "update_received_follow_request" ON follow_requests FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
DROP POLICY IF EXISTS "delete_follow_request" ON follow_requests;
CREATE POLICY "delete_follow_request" ON follow_requests FOR DELETE TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_skills" ON skills;
CREATE POLICY "read_skills" ON skills FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_skills" ON skills;
CREATE POLICY "insert_skills" ON skills FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_interests" ON interests;
CREATE POLICY "read_interests" ON interests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_interests" ON interests;
CREATE POLICY "insert_interests" ON interests FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_profile_skills" ON profile_skills;
CREATE POLICY "read_profile_skills" ON profile_skills FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_profile_skills" ON profile_skills;
CREATE POLICY "insert_own_profile_skills" ON profile_skills FOR INSERT TO authenticated
WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "delete_own_profile_skills" ON profile_skills;
CREATE POLICY "delete_own_profile_skills" ON profile_skills FOR DELETE TO authenticated
USING (auth.uid() = profile_id);

ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_profile_interests" ON profile_interests;
CREATE POLICY "read_profile_interests" ON profile_interests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_profile_interests" ON profile_interests;
CREATE POLICY "insert_own_profile_interests" ON profile_interests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "delete_own_profile_interests" ON profile_interests;
CREATE POLICY "delete_own_profile_interests" ON profile_interests FOR DELETE TO authenticated
USING (auth.uid() = profile_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_blocks" ON blocks;
CREATE POLICY "read_own_blocks" ON blocks FOR SELECT TO authenticated
USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "insert_own_block" ON blocks;
CREATE POLICY "insert_own_block" ON blocks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "delete_own_block" ON blocks;
CREATE POLICY "delete_own_block" ON blocks FOR DELETE TO authenticated
USING (auth.uid() = blocker_id);
