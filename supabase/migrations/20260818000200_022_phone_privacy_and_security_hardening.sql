-- =====================================================================
-- 022: PHONE PRIVACY + SECURITY DEFINER HARDENING + RLS AUDIT FIXES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PHONE PRIVACY
--    The phone column is no longer readable through the REST/anon API
--    for anon/authenticated roles. Contact flows use the purpose-built
--    RPC below, which pins search_path and refuses blocked users.
-- ---------------------------------------------------------------------
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_contact_phone(p_owner_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.phone
  FROM profiles p
  WHERE p.id = p_owner_id
    AND p.phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p_owner_id)
         OR (b.blocker_id = p_owner_id AND b.blocked_id = auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.get_contact_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contact_phone(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. PIN search_path ON ALL SECURITY DEFINER FUNCTIONS
--    (defense-in-depth: functions can never resolve objects outside the
--    public schema, regardless of the caller's search_path)
-- ---------------------------------------------------------------------
ALTER FUNCTION public.handle_follow_counts()            SET search_path = public;
ALTER FUNCTION public.handle_profile_post_count()       SET search_path = public;
ALTER FUNCTION public.handle_post_like_count()          SET search_path = public;
ALTER FUNCTION public.handle_post_comment_count()       SET search_path = public;
ALTER FUNCTION public.handle_creator_score()            SET search_path = public;
ALTER FUNCTION public.get_campus_rooms(uuid)            SET search_path = public;
ALTER FUNCTION public.increment_club_members(uuid, int) SET search_path = public;
ALTER FUNCTION public.increment_post_views(uuid)        SET search_path = public;
ALTER FUNCTION public.notify_contact_request()          SET search_path = public;
ALTER FUNCTION public.notify_on_comment()               SET search_path = public;
ALTER FUNCTION public.notify_on_follow()                SET search_path = public;
ALTER FUNCTION public.notify_on_follow_request()        SET search_path = public;
ALTER FUNCTION public.notify_on_like()                  SET search_path = public;
ALTER FUNCTION public.protect_profile_sensitive_fields() SET search_path = public;
ALTER FUNCTION public.sync_club_member_count()          SET search_path = public;
ALTER FUNCTION public.sync_room_member_count()          SET search_path = public;

-- ---------------------------------------------------------------------
-- 3. RLS AUDIT FIXES
-- ---------------------------------------------------------------------
-- a) chat_rooms: previously ANY authenticated user could create rooms.
--    Only admins may create chat rooms (no client-facing create UI).
DROP POLICY IF EXISTS "insert_chat_rooms" ON chat_rooms;
CREATE POLICY "insert_chat_rooms" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ));

-- b) hidden_matches: previously anyone could fabricate a match between
--    arbitrary anonymous profiles. Only a participant may create one.
DROP POLICY IF EXISTS "insert_hidden_matches" ON hidden_matches;
CREATE POLICY "insert_hidden_matches" ON hidden_matches
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_matches.hidden_profile_1)
    OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_matches.hidden_profile_2)
  );

-- c) teachers: previously anyone could add fake professors. Admin only.
DROP POLICY IF EXISTS "insert_teachers" ON teachers;
CREATE POLICY "insert_teachers" ON teachers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ));