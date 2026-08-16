-- 014: Events enhancements, event community messages

-- Add new columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS whatsapp_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_number text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL;

-- Event community messages
CREATE TABLE IF NOT EXISTS event_community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_community_messages_event ON event_community_messages(event_id, created_at);

-- Event resources
CREATE TABLE IF NOT EXISTS event_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  resource_url text NOT NULL,
  resource_type text DEFAULT 'link',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_resources_event ON event_resources(event_id);

-- RLS for event_community_messages
ALTER TABLE event_community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_event_community" ON event_community_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_event_community" ON event_community_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- RLS for event_resources
ALTER TABLE event_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_event_resources" ON event_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_event_resources" ON event_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "delete_own_event_resources" ON event_resources FOR DELETE TO authenticated USING (auth.uid() = uploader_id);
