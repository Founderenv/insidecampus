-- 015: Events schema refinement + event_volunteers table

-- Add organizing_department (single field for department or club)
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizing_department text;
-- Add whatsapp_group_url (separate from contact_number)
ALTER TABLE events ADD COLUMN IF NOT EXISTS whatsapp_group_url text;

-- Event volunteers table
CREATE TABLE IF NOT EXISTS event_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_volunteers_event ON event_volunteers(event_id);

-- RLS for event_volunteers
ALTER TABLE event_volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_event_volunteers" ON event_volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_volunteer" ON event_volunteers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_volunteer" ON event_volunteers FOR DELETE TO authenticated USING (auth.uid() = user_id);
