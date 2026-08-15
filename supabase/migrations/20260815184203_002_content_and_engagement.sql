/*
# Content & engagement schema: clubs, posts, comments, likes, saved, notifications, events, gossip, confessions, teachers, reviews, projects, achievements, marketplace, lost_found, builders, business_links, reports

1. New Tables (clubs created first so posts FK resolves)
- clubs, club_members — campus clubs
- posts, post_media, poll_options, poll_votes — real-identity social posts
- post_likes, comments, comment_likes, saved_posts — engagement
- notifications — notification center
- events, event_interests — campus events
- gossip_posts — anonymous gossip (hidden identity)
- confessions — anonymous confessions (hidden identity)
- teachers, teacher_reviews — teacher directory + anonymous reviews
- projects, project_members, team_requests — project portfolio + teammate finder
- achievements — student showcase
- marketplace_listings — free marketplace
- lost_found_items — lost & found
- builders — student startups
- business_links — Founder.env placeholder
- reports — moderation
2. Security
- RLS on all tables. Public content is readable by authenticated; owner-only mutations.
- Gossip/confessions/reviews reference hidden_profile_id (not owner_id) so public never maps to real account.
- Reports: reporter + admin read. Admin check via profiles.is_admin.
- Saved posts: owner-only.
- Notifications: recipient-only.
3. Notes
- All owner columns DEFAULT auth.uid() for safe inserts.
*/

-- Clubs (must come before posts FK)
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  logo_url text,
  cover_url text,
  category text,
  member_count int DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text DEFAULT '',
  post_type text NOT NULL DEFAULT 'text',
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  like_count int DEFAULT 0,
  comment_count int DEFAULT 0,
  share_count int DEFAULT 0,
  save_count int DEFAULT 0,
  view_count int DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);

-- Post media
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text DEFAULT 'image',
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Poll options & votes
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  vote_count int DEFAULT 0,
  position int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, voter_id)
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  like_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Saved posts
CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  content text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, is_read);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  poster_url text,
  organizer text,
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  event_date timestamptz NOT NULL,
  end_date timestamptz,
  venue text,
  category text,
  interested_count int DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Gossip
CREATE TABLE IF NOT EXISTS gossip_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hidden_profile_id uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  category text DEFAULT 'trending',
  view_count int DEFAULT 0,
  like_count int DEFAULT 0,
  comment_count int DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gossip_created ON gossip_posts (created_at DESC);

-- Confessions
CREATE TABLE IF NOT EXISTS confessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hidden_profile_id uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'confession',
  like_count int DEFAULT 0,
  comment_count int DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_confessions_created ON confessions (created_at DESC);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  image_url text,
  avg_teaching numeric DEFAULT 0,
  avg_explanation numeric DEFAULT 0,
  avg_approachability numeric DEFAULT 0,
  avg_practical numeric DEFAULT 0,
  avg_overall numeric DEFAULT 0,
  review_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Teacher reviews
CREATE TABLE IF NOT EXISTS teacher_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  hidden_profile_id uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  rating_teaching int NOT NULL DEFAULT 3,
  rating_explanation int NOT NULL DEFAULT 3,
  rating_approachability int NOT NULL DEFAULT 3,
  rating_practical int NOT NULL DEFAULT 3,
  content text DEFAULT '',
  helpful_count int DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  image_url text,
  technologies text[] DEFAULT '{}',
  project_url text,
  github_url text,
  looking_for_teammates boolean DEFAULT false,
  like_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Team requests
CREATE TABLE IF NOT EXISTS team_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  required_skills text[] DEFAULT '{}',
  team_size int DEFAULT 2,
  deadline date,
  interested_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  image_url text,
  category text DEFAULT 'academic',
  achievement_date date,
  created_at timestamptz DEFAULT now()
);

-- Marketplace
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  image_url text,
  price numeric DEFAULT 0,
  condition text DEFAULT 'good',
  category text DEFAULT 'other',
  is_sold boolean DEFAULT false,
  saved_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Lost & Found
CREATE TABLE IF NOT EXISTS lost_found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'lost',
  item_name text NOT NULL,
  description text DEFAULT '',
  image_url text,
  location text,
  item_date date,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Builders
CREATE TABLE IF NOT EXISTS builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'tech',
  logo_url text,
  cover_url text,
  founder_role text DEFAULT 'Founder',
  follower_count int DEFAULT 0,
  is_trending boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Business links
CREATE TABLE IF NOT EXISTS business_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  founder_env_id text,
  business_name text,
  business_category text,
  description text,
  linked_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- ===== RLS + POLICIES =====

-- Clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_clubs" ON clubs;
CREATE POLICY "read_clubs" ON clubs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_clubs" ON clubs;
CREATE POLICY "insert_clubs" ON clubs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_clubs" ON clubs;
CREATE POLICY "update_own_clubs" ON clubs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM club_members WHERE club_id = clubs.id AND user_id = auth.uid() AND role IN ('owner','admin')))
WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_clubs" ON clubs;
CREATE POLICY "delete_own_clubs" ON clubs FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM club_members WHERE club_id = clubs.id AND user_id = auth.uid() AND role = 'owner'));

-- Club members
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_club_members" ON club_members;
CREATE POLICY "read_club_members" ON club_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_club_member" ON club_members;
CREATE POLICY "insert_own_club_member" ON club_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_club_member" ON club_members;
CREATE POLICY "delete_own_club_member" ON club_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_posts" ON posts;
CREATE POLICY "read_posts" ON posts FOR SELECT TO authenticated
USING (is_hidden = false OR auth.uid() = author_id);
DROP POLICY IF EXISTS "insert_own_posts" ON posts;
CREATE POLICY "insert_own_posts" ON posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "update_own_posts" ON posts;
CREATE POLICY "update_own_posts" ON posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "delete_own_posts" ON posts;
CREATE POLICY "delete_own_posts" ON posts FOR DELETE TO authenticated
USING (auth.uid() = author_id);

-- Post media
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_post_media" ON post_media;
CREATE POLICY "read_post_media" ON post_media FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_post_media" ON post_media;
CREATE POLICY "insert_own_post_media" ON post_media FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_post_media" ON post_media;
CREATE POLICY "delete_own_post_media" ON post_media FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));

-- Poll options
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_poll_options" ON poll_options;
CREATE POLICY "read_poll_options" ON poll_options FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_poll_options" ON poll_options;
CREATE POLICY "insert_own_poll_options" ON poll_options FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_poll_options" ON poll_options;
CREATE POLICY "delete_own_poll_options" ON poll_options FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));

-- Poll votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_poll_votes" ON poll_votes;
CREATE POLICY "read_poll_votes" ON poll_votes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_poll_vote" ON poll_votes;
CREATE POLICY "insert_own_poll_vote" ON poll_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = voter_id);
DROP POLICY IF EXISTS "delete_own_poll_vote" ON poll_votes;
CREATE POLICY "delete_own_poll_vote" ON poll_votes FOR DELETE TO authenticated
USING (auth.uid() = voter_id);

-- Post likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_post_likes" ON post_likes;
CREATE POLICY "read_post_likes" ON post_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_post_like" ON post_likes;
CREATE POLICY "insert_own_post_like" ON post_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_post_like" ON post_likes;
CREATE POLICY "delete_own_post_like" ON post_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_comments" ON comments;
CREATE POLICY "read_comments" ON comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_comment" ON comments;
CREATE POLICY "insert_own_comment" ON comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "update_own_comment" ON comments;
CREATE POLICY "update_own_comment" ON comments FOR UPDATE TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "delete_own_comment" ON comments;
CREATE POLICY "delete_own_comment" ON comments FOR DELETE TO authenticated
USING (auth.uid() = author_id);

-- Comment likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_comment_likes" ON comment_likes;
CREATE POLICY "read_comment_likes" ON comment_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_comment_like" ON comment_likes;
CREATE POLICY "insert_own_comment_like" ON comment_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_comment_like" ON comment_likes;
CREATE POLICY "delete_own_comment_like" ON comment_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Saved posts
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_saved" ON saved_posts;
CREATE POLICY "read_own_saved" ON saved_posts FOR SELECT TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saved" ON saved_posts;
CREATE POLICY "insert_own_saved" ON saved_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saved" ON saved_posts;
CREATE POLICY "delete_own_saved" ON saved_posts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT TO authenticated
USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated
USING (auth.uid() = recipient_id);

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_events" ON events;
CREATE POLICY "read_events" ON events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events" ON events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_events" ON events;
CREATE POLICY "update_own_events" ON events FOR UPDATE TO authenticated
USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_own_events" ON events;
CREATE POLICY "delete_own_events" ON events FOR DELETE TO authenticated
USING (auth.uid() = created_by);

-- Event interests
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_event_interests" ON event_interests;
CREATE POLICY "read_event_interests" ON event_interests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_event_interest" ON event_interests;
CREATE POLICY "insert_own_event_interest" ON event_interests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_event_interest" ON event_interests;
CREATE POLICY "delete_own_event_interest" ON event_interests FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Gossip
ALTER TABLE gossip_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_gossip" ON gossip_posts;
CREATE POLICY "read_gossip" ON gossip_posts FOR SELECT TO authenticated
USING (is_hidden = false OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = gossip_posts.hidden_profile_id));
DROP POLICY IF EXISTS "insert_own_gossip" ON gossip_posts;
CREATE POLICY "insert_own_gossip" ON gossip_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_id));
DROP POLICY IF EXISTS "delete_own_gossip" ON gossip_posts;
CREATE POLICY "delete_own_gossip" ON gossip_posts FOR DELETE TO authenticated
USING (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = gossip_posts.hidden_profile_id));

-- Confessions
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_confessions" ON confessions;
CREATE POLICY "read_confessions" ON confessions FOR SELECT TO authenticated
USING (is_hidden = false OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = confessions.hidden_profile_id));
DROP POLICY IF EXISTS "insert_own_confession" ON confessions;
CREATE POLICY "insert_own_confession" ON confessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_id));
DROP POLICY IF EXISTS "delete_own_confession" ON confessions;
CREATE POLICY "delete_own_confession" ON confessions FOR DELETE TO authenticated
USING (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = confessions.hidden_profile_id));

-- Teachers
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_teachers" ON teachers;
CREATE POLICY "read_teachers" ON teachers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_teachers" ON teachers;
CREATE POLICY "insert_teachers" ON teachers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_teachers" ON teachers;
CREATE POLICY "update_teachers" ON teachers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)) WITH CHECK (true);

-- Teacher reviews
ALTER TABLE teacher_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_teacher_reviews" ON teacher_reviews;
CREATE POLICY "read_teacher_reviews" ON teacher_reviews FOR SELECT TO authenticated
USING (is_hidden = false OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = teacher_reviews.hidden_profile_id));
DROP POLICY IF EXISTS "insert_own_teacher_review" ON teacher_reviews;
CREATE POLICY "insert_own_teacher_review" ON teacher_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_id));
DROP POLICY IF EXISTS "delete_own_teacher_review" ON teacher_reviews;
CREATE POLICY "delete_own_teacher_review" ON teacher_reviews FOR DELETE TO authenticated
USING (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = teacher_reviews.hidden_profile_id));

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_projects" ON projects;
CREATE POLICY "read_projects" ON projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Project members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_project_members" ON project_members;
CREATE POLICY "read_project_members" ON project_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_project_member" ON project_members;
CREATE POLICY "insert_own_project_member" ON project_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_project_member" ON project_members;
CREATE POLICY "delete_own_project_member" ON project_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Team requests
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_team_requests" ON team_requests;
CREATE POLICY "read_team_requests" ON team_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_team_request" ON team_requests;
CREATE POLICY "insert_own_team_request" ON team_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_team_request" ON team_requests;
CREATE POLICY "delete_own_team_request" ON team_requests FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_achievements" ON achievements;
CREATE POLICY "read_achievements" ON achievements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_achievement" ON achievements;
CREATE POLICY "insert_own_achievement" ON achievements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_achievement" ON achievements;
CREATE POLICY "update_own_achievement" ON achievements FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_achievement" ON achievements;
CREATE POLICY "delete_own_achievement" ON achievements FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Marketplace
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_marketplace" ON marketplace_listings;
CREATE POLICY "read_marketplace" ON marketplace_listings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_listing" ON marketplace_listings;
CREATE POLICY "insert_own_listing" ON marketplace_listings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "update_own_listing" ON marketplace_listings;
CREATE POLICY "update_own_listing" ON marketplace_listings FOR UPDATE TO authenticated
USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "delete_own_listing" ON marketplace_listings;
CREATE POLICY "delete_own_listing" ON marketplace_listings FOR DELETE TO authenticated
USING (auth.uid() = seller_id);

-- Lost & Found
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_lost_found" ON lost_found_items;
CREATE POLICY "read_lost_found" ON lost_found_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_lost_found" ON lost_found_items;
CREATE POLICY "insert_own_lost_found" ON lost_found_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_lost_found" ON lost_found_items;
CREATE POLICY "update_own_lost_found" ON lost_found_items FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_lost_found" ON lost_found_items;
CREATE POLICY "delete_own_lost_found" ON lost_found_items FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Builders
ALTER TABLE builders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_builders" ON builders;
CREATE POLICY "read_builders" ON builders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_builder" ON builders;
CREATE POLICY "insert_own_builder" ON builders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_builder" ON builders;
CREATE POLICY "update_own_builder" ON builders FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_builder" ON builders;
CREATE POLICY "delete_own_builder" ON builders FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Business links
ALTER TABLE business_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_business_links" ON business_links;
CREATE POLICY "read_business_links" ON business_links FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_business_link" ON business_links;
CREATE POLICY "insert_own_business_link" ON business_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "update_own_business_link" ON business_links;
CREATE POLICY "update_own_business_link" ON business_links FOR UPDATE TO authenticated
USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "delete_own_business_link" ON business_links;
CREATE POLICY "delete_own_business_link" ON business_links FOR DELETE TO authenticated
USING (auth.uid() = profile_id);

-- Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_or_admin_reports" ON reports;
CREATE POLICY "read_own_or_admin_reports" ON reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "insert_own_report" ON reports;
CREATE POLICY "insert_own_report" ON reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "admin_update_reports" ON reports;
CREATE POLICY "admin_update_reports" ON reports FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)) WITH CHECK (true);
