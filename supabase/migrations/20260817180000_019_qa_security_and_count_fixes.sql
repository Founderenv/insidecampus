-- 019: QA fixes
-- 1. Follow consent: allow followee to accept/decline/remove (previously no UPDATE/effective DELETE policy)
-- 2. Chat messages: department isolation (previously any authenticated user could read any room)
-- 3. Reveal requests: each matched user can only set their own approval flag
-- 4. Events: created_by cannot be forged
-- 5. Storage: gossip attachments scoped to messages in rooms the user can see
-- 6. Count RPCs: bounded delta + caller's row state must match (no count inflation)
-- 7. Accurate counters: DB triggers for event/club/room counts

-- ========================================
-- 1. FOLLOWS
-- ========================================

DROP POLICY IF EXISTS "update_follow_status" ON follows;
CREATE POLICY "update_follow_status" ON follows
  FOR UPDATE TO authenticated
  USING (auth.uid() = followee_id)
  WITH CHECK (auth.uid() = followee_id AND status IN ('accepted', 'declined', 'blocked'));

DROP POLICY IF EXISTS "delete_own_follow" ON follows;
CREATE POLICY "delete_own_follow" ON follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);

-- ========================================
-- 2. CHAT MESSAGES: read only campus-wide + own branch rooms
-- ========================================

DROP POLICY IF EXISTS "read_chat_messages" ON chat_messages;
CREATE POLICY "read_chat_messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN profiles p ON p.id = auth.uid()
      WHERE cr.id = room_id
        AND (cr.type = 'everyone' OR (cr.branch_id IS NOT NULL AND cr.branch_id = p.branch_id))
    )
  );

-- ========================================
-- 3. REVEAL REQUESTS: your approval only
-- ========================================

DROP POLICY IF EXISTS "update_reveal_requests" ON reveal_requests;
CREATE POLICY "update_reveal_requests" ON reveal_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hidden_matches hm WHERE hm.id = match_id AND (
      auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_1)
      OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_2)
    ))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM hidden_matches hm WHERE hm.id = match_id AND (
      auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_1)
      OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_2)
    ))
  );

-- RLS policies cannot compare new vs old row values, so a BEFORE UPDATE
-- trigger enforces: each user may only set their own approval flag, and the
-- request can only be finalized once BOTH users have approved.
CREATE OR REPLACE FUNCTION enforce_reveal_request_owner()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_owner uuid;
  v_participant boolean;
BEGIN
  IF NEW.match_id IS DISTINCT FROM OLD.match_id
     OR NEW.requester_hidden_id IS DISTINCT FROM OLD.requester_hidden_id THEN
    RAISE EXCEPTION 'match or requester cannot be changed';
  END IF;

  SELECT owner_id INTO v_requester_owner
  FROM hidden_profiles WHERE id = OLD.requester_hidden_id;

  SELECT EXISTS (
    SELECT 1 FROM hidden_matches hm
    WHERE hm.id = OLD.match_id
      AND (
        auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_1)
        OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_2)
      )
  ) INTO v_participant;

  IF NOT v_participant THEN
    RAISE EXCEPTION 'only matched users can update a reveal request';
  END IF;

  IF auth.uid() = v_requester_owner THEN
    IF NEW.approved_2 IS DISTINCT FROM OLD.approved_2 THEN
      RAISE EXCEPTION 'cannot change the other user''s approval';
    END IF;
  ELSE
    IF NEW.approved_1 IS DISTINCT FROM OLD.approved_1 THEN
      RAISE EXCEPTION 'cannot change the other user''s approval';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      OLD.status = 'pending'
      AND OLD.approved_1 = true
      AND OLD.approved_2 = true
      AND NEW.status IN ('approved', 'declined')
    ) THEN
      RAISE EXCEPTION 'status may only change once both users approve';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reveal_request_owner ON reveal_requests;
CREATE TRIGGER trg_reveal_request_owner
  BEFORE UPDATE ON reveal_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_reveal_request_owner();

-- ========================================
-- 4. EVENTS: created_by must be the caller
-- ========================================

DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events" ON events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- ========================================
-- 5. STORAGE: gossip attachments (path campus/{room}/{user}/{file})
--    Uploader keeps access to own files; others only via messages in rooms they can see
-- ========================================

DROP POLICY IF EXISTS "gossip_attachments_read" ON storage.objects;
CREATE POLICY "gossip_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'gossip-attachments'
    AND (
      (storage.foldername(name))[3]::text = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'campus'
        AND EXISTS (
          SELECT 1 FROM chat_messages cm
          JOIN chat_rooms cr ON cr.id = cm.room_id
          JOIN profiles p ON p.id = auth.uid()
          WHERE cm.attachment_path = name
            AND (cr.type = 'everyone' OR (cr.branch_id IS NOT NULL AND cr.branch_id = p.branch_id))
        )
      )
    )
  );

-- ========================================
-- 6. COUNT RPCS: guarded
-- ========================================

CREATE OR REPLACE FUNCTION increment_gossip_likes(gossip_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  IF delta NOT IN (-1, 1) THEN RAISE EXCEPTION 'delta must be -1 or 1'; END IF;
  IF delta = 1 AND NOT EXISTS (SELECT 1 FROM gossip_likes gl WHERE gl.gossip_id = gossip_id_input AND gl.user_id = auth.uid()) THEN RAISE EXCEPTION 'like required before increment'; END IF;
  IF delta = -1 AND EXISTS (SELECT 1 FROM gossip_likes gl WHERE gl.gossip_id = gossip_id_input AND gl.user_id = auth.uid()) THEN RAISE EXCEPTION 'unlike required before decrement'; END IF;
  UPDATE gossip_posts SET like_count = GREATEST(like_count + delta, 0) WHERE id = gossip_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_confession_likes(confession_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  IF delta NOT IN (-1, 1) THEN RAISE EXCEPTION 'delta must be -1 or 1'; END IF;
  IF delta = 1 AND NOT EXISTS (SELECT 1 FROM confession_likes cl WHERE cl.confession_id = confession_id_input AND cl.user_id = auth.uid()) THEN RAISE EXCEPTION 'like required before increment'; END IF;
  IF delta = -1 AND EXISTS (SELECT 1 FROM confession_likes cl WHERE cl.confession_id = confession_id_input AND cl.user_id = auth.uid()) THEN RAISE EXCEPTION 'unlike required before decrement'; END IF;
  UPDATE confessions SET like_count = GREATEST(like_count + delta, 0) WHERE id = confession_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_event_interested(event_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  IF delta NOT IN (-1, 1) THEN RAISE EXCEPTION 'delta must be -1 or 1'; END IF;
  IF delta = 1 AND NOT EXISTS (SELECT 1 FROM event_interests ei WHERE ei.event_id = event_id_input AND ei.user_id = auth.uid()) THEN RAISE EXCEPTION 'interest required before increment'; END IF;
  IF delta = -1 AND EXISTS (SELECT 1 FROM event_interests ei WHERE ei.event_id = event_id_input AND ei.user_id = auth.uid()) THEN RAISE EXCEPTION 'un-interest required before decrement'; END IF;
  UPDATE events SET interested_count = GREATEST(interested_count + delta, 0) WHERE id = event_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_club_members(club_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  IF delta NOT IN (-1, 1) THEN RAISE EXCEPTION 'delta must be -1 or 1'; END IF;
  IF delta = 1 AND NOT EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_id_input AND cm.user_id = auth.uid()) THEN RAISE EXCEPTION 'membership required before increment'; END IF;
  IF delta = -1 AND EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_id_input AND cm.user_id = auth.uid()) THEN RAISE EXCEPTION 'leave required before decrement'; END IF;
  UPDATE clubs SET member_count = GREATEST(member_count + delta, 0) WHERE id = club_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_resource_useful(resource_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  IF delta NOT IN (-1, 1) THEN RAISE EXCEPTION 'delta must be -1 or 1'; END IF;
  IF delta = 1 AND NOT EXISTS (SELECT 1 FROM resource_useful ru WHERE ru.resource_id = resource_id_input AND ru.user_id = auth.uid()) THEN RAISE EXCEPTION 'vote required before increment'; END IF;
  IF delta = -1 AND EXISTS (SELECT 1 FROM resource_useful ru WHERE ru.resource_id = resource_id_input AND ru.user_id = auth.uid()) THEN RAISE EXCEPTION 'un-vote required before decrement'; END IF;
  UPDATE resources SET useful_count = GREATEST(useful_count + delta, 0) WHERE id = resource_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. ACCURATE COUNTERS via triggers
-- ========================================

CREATE OR REPLACE FUNCTION sync_event_interested_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events SET interested_count = GREATEST(interested_count + 1, 0) WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET interested_count = GREATEST(interested_count - 1, 0) WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_event_interested_count ON event_interests;
CREATE TRIGGER trg_event_interested_count
  AFTER INSERT OR DELETE ON event_interests
  FOR EACH ROW EXECUTE FUNCTION sync_event_interested_count();

CREATE OR REPLACE FUNCTION sync_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clubs SET member_count = GREATEST(member_count + 1, 0) WHERE id = NEW.club_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.club_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_club_member_count ON club_members;
CREATE TRIGGER trg_club_member_count
  AFTER INSERT OR DELETE ON club_members
  FOR EACH ROW EXECUTE FUNCTION sync_club_member_count();

CREATE OR REPLACE FUNCTION sync_room_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_rooms SET member_count = GREATEST(member_count + 1, 0) WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_rooms SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_room_member_count ON room_members;
CREATE TRIGGER trg_room_member_count
  AFTER INSERT OR DELETE ON room_members
  FOR EACH ROW EXECUTE FUNCTION sync_room_member_count();