/*
# Phase 2B: Storage, Counters, Notifications, Polls, Follow Maintenance

1. Storage
- Buckets: avatars, post-images
- Policies: owner-only upload, public read, no overwrite of other user's files

2. Post Counter Triggers
- like_count: increment on post_likes INSERT, decrement on DELETE
- comment_count: increment on comments INSERT, decrement on DELETE
- post_count on profiles: increment on posts INSERT, decrement on DELETE

3. Follow Counter Triggers
- follower_count on profiles: increment when followee gains a follower (status=accepted), decrement on unfollow
- following_count on profiles: increment when follower follows someone (status=accepted), decrement on unfollow

4. Notification Functions
- notify_on_follow: create notification when follow is accepted
- notify_on_follow_request: create notification when follow request sent
- notify_on_like: create notification when post is liked
- notify_on_comment: create notification when post is commented

5. Poll Constraints
- UNIQUE(post_id, voter_id) on poll_votes (already exists in schema)

6. increment_post_views RPC
*/

-- ========================================
-- 1. STORAGE BUCKETS
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- 2. STORAGE POLICIES
-- ========================================

-- Avatars: public read
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- Avatars: authenticated users upload into own folder (user_id in path)
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars: users can update/delete their own files only
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Post images: public read
DROP POLICY IF EXISTS "post_images_public_read" ON storage.objects;
CREATE POLICY "post_images_public_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-images');

-- Post images: authenticated users upload into own folder
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;
CREATE POLICY "post_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Post images: users can update/delete their own files only
DROP POLICY IF EXISTS "post_images_update_own" ON storage.objects;
CREATE POLICY "post_images_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_images_delete_own" ON storage.objects;
CREATE POLICY "post_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========================================
-- 3. POST COUNTER TRIGGERS
-- ========================================

-- Increment/decrement like_count on posts
CREATE OR REPLACE FUNCTION handle_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = GREATEST(like_count + 1, 0) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_like_count ON post_likes;
CREATE TRIGGER trg_post_like_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION handle_post_like_count();

-- Increment/decrement comment_count on posts
CREATE OR REPLACE FUNCTION handle_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count + 1, 0) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_comment_count ON comments;
CREATE TRIGGER trg_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION handle_post_comment_count();

-- Increment/decrement post_count on profiles
CREATE OR REPLACE FUNCTION handle_profile_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = GREATEST(post_count + 1, 0) WHERE id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.author_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_post_count ON posts;
CREATE TRIGGER trg_profile_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_profile_post_count();

-- ========================================
-- 4. FOLLOW COUNTER TRIGGERS
-- ========================================

CREATE OR REPLACE FUNCTION handle_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      UPDATE profiles SET following_count = GREATEST(following_count + 1, 0) WHERE id = NEW.follower_id;
      UPDATE profiles SET follower_count = GREATEST(follower_count + 1, 0) WHERE id = NEW.followee_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN
      UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
      UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.followee_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- status changed from pending to accepted
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      UPDATE profiles SET following_count = GREATEST(following_count + 1, 0) WHERE id = NEW.follower_id;
      UPDATE profiles SET follower_count = GREATEST(follower_count + 1, 0) WHERE id = NEW.followee_id;
    -- status changed from accepted to something else (declined/blocked)
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = NEW.follower_id;
      UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = NEW.followee_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_follow_counts ON follows;
CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE OR UPDATE ON follows
  FOR EACH ROW EXECUTE FUNCTION handle_follow_counts();

-- ========================================
-- 5. NOTIFICATION FUNCTIONS
-- ========================================

-- Notify on follow (accepted directly, e.g. public account)
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND NEW.follower_id != NEW.followee_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
    VALUES (
      NEW.followee_id,
      NEW.follower_id,
      'follow',
      'user',
      NEW.follower_id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- Notify on follow request (pending)
CREATE OR REPLACE FUNCTION notify_on_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.follower_id != NEW.followee_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
    VALUES (
      NEW.followee_id,
      NEW.follower_id,
      'follow_request',
      'user',
      NEW.follower_id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_follow_request ON follows;
CREATE TRIGGER trg_notify_follow_request
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow_request();

-- Notify on like (only for post authors, not self-notifications)
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
    VALUES (
      post_author,
      NEW.user_id,
      'like',
      'post',
      NEW.post_id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_like ON post_likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Notify on comment (only for post authors, not self-notifications)
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author != NEW.author_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
    VALUES (
      post_author,
      NEW.author_id,
      'comment',
      'post',
      NEW.post_id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ========================================
-- 6. increment_post_views RPC
-- ========================================

CREATE OR REPLACE FUNCTION increment_post_views(post_id_input uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
