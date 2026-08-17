-- =====================================================================
-- 021: REMOVE ALL DEMO/SEED CONTENT + RECONCILE COUNTERS WITH REAL DATA
-- =====================================================================
-- Deletes every row created by migration 005 (fictional profiles
-- aaaaaaaa-*, hidden profiles bbbbbbbb-*, teachers, clubs, events,
-- posts, gossip, confessions, chat rooms/messages, challenges, etc.)
-- while KEEPING structural taxonomy (college, branches, program groups,
-- skills, interests, 018 dept chat rooms, 012 Campus room, real users).
-- Then recomputes every counter column from its source table so the
-- app shows REAL data or an empty state -- never fake numbers.

-- ---------------------------------------------------------------------
-- 1. Chat: demo rooms + demo messages (real Campus/room messages stay)
-- ---------------------------------------------------------------------
DELETE FROM chat_messages
WHERE room_id::text LIKE '99999999-%'
   OR author_id::text LIKE 'aaaaaaaa-%';

-- Demo topic rooms (Everyone/Gaming/Study/Sports/Projects) + the 3 demo
-- "branch" rooms that duplicate 018's real dept-* rooms for same branches.
DELETE FROM chat_rooms
WHERE id::text LIKE '99999999-%'
  AND (
    type <> 'branch'
    OR slug IN ('computer', 'it', 'ai-ds')
  );

-- ---------------------------------------------------------------------
-- 2. Demo content owned by seed profiles (cascade cleans up the rest)
-- ---------------------------------------------------------------------
DELETE FROM posts            WHERE author_id::text LIKE 'aaaaaaaa-%';
DELETE FROM gossip_posts     WHERE hidden_profile_id::text LIKE 'bbbbbbbb-%';
DELETE FROM confessions      WHERE hidden_profile_id::text LIKE 'bbbbbbbb-%';
DELETE FROM teacher_reviews  WHERE hidden_profile_id::text LIKE 'bbbbbbbb-%';
DELETE FROM projects         WHERE owner_id::text LIKE 'aaaaaaaa-%';
DELETE FROM achievements     WHERE owner_id::text LIKE 'aaaaaaaa-%';
DELETE FROM builders         WHERE owner_id::text LIKE 'aaaaaaaa-%';
DELETE FROM team_requests    WHERE owner_id::text LIKE 'aaaaaaaa-%';
DELETE FROM marketplace_listings WHERE seller_id::text LIKE 'aaaaaaaa-%';
DELETE FROM lost_found_items WHERE owner_id::text LIKE 'aaaaaaaa-%';
DELETE FROM game_scores      WHERE user_id::text LIKE 'aaaaaaaa-%';
DELETE FROM event_attendees  WHERE user_id::text LIKE 'aaaaaaaa-%';
DELETE FROM follows          WHERE follower_id::text LIKE 'aaaaaaaa-%' OR followee_id::text LIKE 'aaaaaaaa-%';
DELETE FROM hidden_profiles  WHERE owner_id::text LIKE 'aaaaaaaa-%';

-- ---------------------------------------------------------------------
-- 3. Non-owned demo content
-- ---------------------------------------------------------------------
DELETE FROM teachers         WHERE id::text LIKE 'dddddddd-%';
DELETE FROM clubs            WHERE id::text LIKE 'eeeeeeee-%';
DELETE FROM events           WHERE id::text LIKE 'ffffffff-%';
DELETE FROM smart_challenges;

-- ---------------------------------------------------------------------
-- 4. The seed profiles themselves
-- ---------------------------------------------------------------------
DELETE FROM profiles WHERE id::text LIKE 'aaaaaaaa-%';

-- ---------------------------------------------------------------------
-- 5. RECONCILE COUNTERS FROM REAL SOURCE ROWS (deterministic)
-- ---------------------------------------------------------------------
-- Follower/following/post counts come from the actual tables, never
-- from stored/edited numbers.
UPDATE profiles p SET
  follower_count    = (SELECT count(*) FROM follows f  WHERE f.followee_id  = p.id AND f.status = 'accepted'),
  following_count   = (SELECT count(*) FROM follows f  WHERE f.follower_id  = p.id AND f.status = 'accepted'),
  post_count        = (SELECT count(*) FROM posts po   WHERE po.author_id   = p.id);

UPDATE posts p SET
  like_count    = (SELECT count(*) FROM post_likes l  WHERE l.post_id = p.id),
  comment_count = (SELECT count(*) FROM comments c    WHERE c.post_id = p.id);

UPDATE gossip_posts g SET
  like_count = (SELECT count(*) FROM gossip_likes l WHERE l.gossip_id = g.id);

UPDATE confessions c SET
  like_count = (SELECT count(*) FROM confession_likes l WHERE l.confession_id = c.id);

UPDATE events e SET
  interested_count = (SELECT count(*) FROM event_attendees a WHERE a.event_id = e.id);

UPDATE clubs c SET
  member_count = (SELECT count(*) FROM club_members m WHERE m.club_id = c.id);

UPDATE chat_rooms r SET
  member_count = (SELECT count(*) FROM room_members m WHERE m.room_id = r.id);

-- ---------------------------------------------------------------------
-- 6. EVENT INTEREST: single source of truth = event_attendees
--    (client writes event_attendees; 019 wired triggers to the unused
--    event_interests table, so interested_count could never match.)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_event_interested_count ON event_interests;
DROP FUNCTION IF EXISTS public.sync_event_interested_count();
DROP FUNCTION IF EXISTS public.increment_event_interested(uuid, int);

CREATE OR REPLACE FUNCTION public.sync_event_attendee_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET interested_count = (SELECT count(*) FROM event_attendees WHERE event_id = COALESCE(NEW.event_id, OLD.event_id))
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_event_attendee_count ON event_attendees;
CREATE TRIGGER trg_event_attendee_count
AFTER INSERT OR DELETE ON event_attendees
FOR EACH ROW EXECUTE FUNCTION public.sync_event_attendee_count();

-- ---------------------------------------------------------------------
-- 7. IDEMPOTENT LIKE/USEFUL COUNTERS
--    Old RPCs blindly did like_count = like_count + delta, so repeated
--    calls inflated counts while the like row existed. New versions
--    recompute from the like rows: exactly one count per like row.
--    (Client always writes the row BEFORE calling the RPC, so count() is
--    always post-mutation.)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_gossip_likes(gossip_id_input uuid, delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE gossip_posts
  SET like_count = (SELECT count(*) FROM gossip_likes WHERE gossip_id = gossip_id_input)
  WHERE id = gossip_id_input;
$$;

CREATE OR REPLACE FUNCTION public.increment_confession_likes(confession_id_input uuid, delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE confessions
  SET like_count = (SELECT count(*) FROM confession_likes WHERE confession_id = confession_id_input)
  WHERE id = confession_id_input;
$$;

CREATE OR REPLACE FUNCTION public.increment_resource_useful(resource_id_input uuid, delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE resources
  SET useful_count = (SELECT count(*) FROM resource_useful WHERE resource_id = resource_id_input)
  WHERE id = resource_id_input;
$$;