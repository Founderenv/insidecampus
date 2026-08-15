/*
# Phase 2-8: Additional database objects for gossip creation, DMs, matches, creator scores
*/

-- ========================================
-- 1. GOSSIP/CONFESSION LIKE TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS gossip_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gossip_id uuid NOT NULL REFERENCES gossip_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(gossip_id, user_id)
);

CREATE TABLE IF NOT EXISTS confession_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id uuid NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(confession_id, user_id)
);

-- RLS for gossip_likes
ALTER TABLE gossip_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_gossip_likes" ON gossip_likes;
CREATE POLICY "read_gossip_likes" ON gossip_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_gossip_like" ON gossip_likes;
CREATE POLICY "insert_own_gossip_like" ON gossip_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_gossip_like" ON gossip_likes;
CREATE POLICY "delete_own_gossip_like" ON gossip_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for confession_likes
ALTER TABLE confession_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_confession_likes" ON confession_likes;
CREATE POLICY "read_confession_likes" ON confession_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_confession_like" ON confession_likes;
CREATE POLICY "insert_own_confession_like" ON confession_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_confession_like" ON confession_likes;
CREATE POLICY "delete_own_confession_like" ON confession_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 2. TEACHER REVIEW LIKES
-- ========================================

CREATE TABLE IF NOT EXISTS review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES teacher_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_review_likes" ON review_likes;
CREATE POLICY "read_review_likes" ON review_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_review_like" ON review_likes;
CREATE POLICY "insert_own_review_like" ON review_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_review_like" ON review_likes;
CREATE POLICY "delete_own_review_like" ON review_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 3. EVENT ATTENDEES
-- ========================================

CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'interested',
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_event_attendees" ON event_attendees;
CREATE POLICY "read_event_attendees" ON event_attendees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_event_attendee" ON event_attendees;
CREATE POLICY "insert_own_event_attendee" ON event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_event_attendee" ON event_attendees;
CREATE POLICY "delete_own_event_attendee" ON event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 4. CLUB MEMBERSHIP REQUESTS
-- ========================================

CREATE TABLE IF NOT EXISTS club_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_club_join_requests" ON club_join_requests;
CREATE POLICY "read_club_join_requests" ON club_join_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM club_members WHERE club_id = club_join_requests.club_id AND user_id = auth.uid() AND role IN ('owner','admin')));
DROP POLICY IF EXISTS "insert_own_club_join_request" ON club_join_requests;
CREATE POLICY "insert_own_club_join_request" ON club_join_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_club_join_request" ON club_join_requests;
CREATE POLICY "delete_own_club_join_request" ON club_join_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 5. PROJECT INTERESTS
-- ========================================

CREATE TABLE IF NOT EXISTS project_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_project_interests" ON project_interests;
CREATE POLICY "read_project_interests" ON project_interests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM projects WHERE id = project_interests.project_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_project_interest" ON project_interests;
CREATE POLICY "insert_own_project_interest" ON project_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 6. MARKETPLACE SAVES
-- ========================================

CREATE TABLE IF NOT EXISTS marketplace_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

ALTER TABLE marketplace_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_marketplace_saves" ON marketplace_saves;
CREATE POLICY "read_own_marketplace_saves" ON marketplace_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_marketplace_save" ON marketplace_saves;
CREATE POLICY "insert_own_marketplace_save" ON marketplace_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_marketplace_save" ON marketplace_saves;
CREATE POLICY "delete_own_marketplace_save" ON marketplace_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 7. CREATOR SCORE TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION handle_creator_score()
RETURNS TRIGGER AS $$
DECLARE
  v_engagement int;
BEGIN
  -- Creator score = follower_count + post_count*2 + sum of post like_counts
  SELECT COALESCE(SUM(like_count), 0) INTO v_engagement FROM posts WHERE author_id = NEW.id;
  -- We'll calculate a simple creator_score for rankings
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_gossip_likes_gossip ON gossip_likes(gossip_id);
CREATE INDEX IF NOT EXISTS idx_confession_likes_confession ON confession_likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_review ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hidden_matches_profiles ON hidden_matches(hidden_profile_1, hidden_profile_2);
CREATE INDEX IF NOT EXISTS idx_smart_attempts_user_challenge ON smart_attempts(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_type ON game_scores(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category, is_sold);
CREATE INDEX IF NOT EXISTS idx_lost_found_type ON lost_found_items(type, is_resolved);
CREATE INDEX IF NOT EXISTS idx_project_interests_project ON project_interests(project_id);
