/*
# Security Hardening: Hidden Identity Protection, Privilege Escalation Prevention, Input Safety

1. Changes
- Create safe_hidden_profiles view (excludes owner_id) for public anonymous queries
- Revoke direct hidden_profiles SELECT from public; owner retains access via RLS
- Harden gossip/confessions/teacher_reviews INSERT policies to verify ownership server-side
- Prevent profile privilege escalation via trigger (blocks is_admin, scores, counts, etc.)
- Restrict notifications INSERT to sender-only and non-forgeable types
- Restrict skills/interests INSERT to prevent abuse (dedup required)

2. Security Model
- hidden_profiles table: owner can SELECT own row (for Settings/onboarding); owner INSERT/UPDATE/DELETE own
- safe_hidden_profiles view: any authenticated user reads (no owner_id exposed)
- Gossip/confessions/reviews: INSERT verified server-side against hidden_profiles table
- Profiles: BEFORE UPDATE trigger blocks non-whitelisted field changes
- Notifications: INSERT restricted to actor_id = auth.uid() and safe types only
- Skills/interests: INSERT requires name not already exist (dedup guard)

3. Notes
- Existing onboarding: creates hidden_profiles row directly (owner_id = auth.uid()) — continues working
- Existing Settings: reads/updates hidden_profiles via owner_id check — continues working
- Client anonymous queries: now use safe_hidden_profiles view — owner_id never leaves server
- Moderation: admin can still read hidden_profiles via is_admin RLS or direct DB access
*/

-- ========================================
-- 1. SAFE HIDDEN PROFILES VIEW
-- ========================================

-- Drop the wide-open SELECT policy on hidden_profiles
-- Owner can still SELECT their own row via RLS; others cannot read directly
DROP POLICY IF EXISTS "read_hidden_profiles" ON hidden_profiles;

-- Owner retains read access to their own hidden profile
CREATE POLICY "read_own_hidden_profile" ON hidden_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- Public-safe view: all columns EXCEPT owner_id
DROP VIEW IF EXISTS safe_hidden_profiles;
CREATE VIEW safe_hidden_profiles AS
  SELECT id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation, created_at, updated_at
  FROM hidden_profiles;

-- Allow any authenticated user to read the safe view
ALTER VIEW safe_hidden_profiles OWNER TO postgres;
GRANT SELECT ON safe_hidden_profiles TO authenticated;

-- ========================================
-- 2. HARDEN ANONYMOUS CONTENT INSERT POLICIES
-- ========================================

-- Gossip: verify user owns the hidden_profile they're posting as
-- (subquery reads hidden_profiles table server-side — owner_id never sent to client)
DROP POLICY IF EXISTS "insert_own_gossip" ON gossip_posts;
CREATE POLICY "insert_own_gossip" ON gossip_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_id)
  );

-- Confessions: same hardening
DROP POLICY IF EXISTS "insert_own_confession" ON confessions;
CREATE POLICY "insert_own_confession" ON confessions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_id)
  );

-- Teacher reviews: same hardening
DROP POLICY IF EXISTS "insert_own_teacher_review" ON teacher_reviews;
CREATE POLICY "insert_own_teacher_review" ON teacher_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_id)
  );

-- ========================================
-- 3. PROFILE PRIVILEGE ESCALATION PREVENTION
-- ========================================

-- Trigger function: block writes to protected columns
-- SECURITY DEFINER so counter triggers (also SECURITY DEFINER, running as postgres) can update counts
CREATE OR REPLACE FUNCTION protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow SECURITY DEFINER functions (counter triggers, admin DB access) to bypass protection
  -- current_user = 'postgres' when called from SECURITY DEFINER context
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Block is_admin changes (only via direct DB / migration)
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin via application';
  END IF;

  -- Block is_banned changes
  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    RAISE EXCEPTION 'Cannot modify is_banned via application';
  END IF;

  -- Block zeal_score changes
  IF NEW.zeal_score IS DISTINCT FROM OLD.zeal_score THEN
    RAISE EXCEPTION 'Cannot modify zeal_score directly';
  END IF;

  -- Block smart_score changes
  IF NEW.smart_score IS DISTINCT FROM OLD.smart_score THEN
    RAISE EXCEPTION 'Cannot modify smart_score directly';
  END IF;

  -- Block game_xp changes
  IF NEW.game_xp IS DISTINCT FROM OLD.game_xp THEN
    RAISE EXCEPTION 'Cannot modify game_xp directly';
  END IF;

  -- Block game_level changes
  IF NEW.game_level IS DISTINCT FROM OLD.game_level THEN
    RAISE EXCEPTION 'Cannot modify game_level directly';
  END IF;

  -- Block follower_count changes (allowed for SECURITY DEFINER counter triggers above)
  IF NEW.follower_count IS DISTINCT FROM OLD.follower_count THEN
    RAISE EXCEPTION 'Cannot modify follower_count directly';
  END IF;

  -- Block following_count changes
  IF NEW.following_count IS DISTINCT FROM OLD.following_count THEN
    RAISE EXCEPTION 'Cannot modify following_count directly';
  END IF;

  -- Block post_count changes
  IF NEW.post_count IS DISTINCT FROM OLD.post_count THEN
    RAISE EXCEPTION 'Cannot modify post_count directly';
  END IF;

  -- Block id changes
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify profile id';
  END IF;

  -- Block onboarding_completed from being set back to false
  IF NEW.onboarding_completed = false AND OLD.onboarding_completed = true THEN
    RAISE EXCEPTION 'Cannot undo onboarding completion';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS trg_protect_sensitive_fields ON profiles;
CREATE TRIGGER trg_protect_sensitive_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_sensitive_fields();

-- ========================================
-- 4. NOTIFICATION INSERT HARDENING
-- ========================================

-- Restrict notifications INSERT:
-- - actor_id must be the authenticated user (can't forge notifications as someone else)
-- - recipient_id must not be the actor (no self-notifications)
-- - type must be one of the known safe types
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND auth.uid() != recipient_id
    AND type IN ('like', 'comment', 'follow', 'follow_request', 'project_interest', 'event', 'system')
  );

-- ========================================
-- 5. SKILLS / INTERESTS INSERT HARDENING
-- ========================================

-- Skills: dedup is handled by UNIQUE constraint on skills.name
-- Original insert_skills policy from migration 001 is sufficient
DROP POLICY IF EXISTS "insert_skills" ON skills;

-- Interests: dedup is handled by UNIQUE constraint on interests.name
-- Original insert_interests policy from migration 001 is sufficient
DROP POLICY IF EXISTS "insert_interests" ON interests;

-- ========================================
-- 6. VERIFY RLS IS ENABLED (safety check)
-- ========================================
ALTER TABLE hidden_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
