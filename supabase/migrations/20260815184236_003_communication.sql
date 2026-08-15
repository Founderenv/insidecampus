/*
# Communication schema: campus live chat, DMs, Zeal Match hidden chat, reveal requests

1. New Tables
- chat_rooms — campus live chat rooms (Everyone, branch rooms, Gaming, Study, etc.)
- room_members — membership in rooms
- chat_messages — messages in campus rooms (REAL identity only)
- dm_conversations — private 1:1 conversations
- dm_participants — participants of a DM conversation
- dm_messages — messages in DMs (REAL identity)
- hidden_matches — Zeal Match pairings (two hidden profiles matched)
- hidden_messages — anonymous chat messages in a Zeal Match
- reveal_requests — identity reveal requests (require BOTH approvals)
2. Security
- chat_rooms: authenticated read; any authenticated insert (rooms are public).
- room_members: public read; self insert/delete.
- chat_messages: public read; self insert; author update/delete own.
- dm_conversations: participant-only read; any authenticated insert (creator). Update/delete by participant.
- dm_participants: participant-of-conversation read; self insert; self delete.
- dm_messages: participant-of-conversation read; self insert; self delete.
- hidden_matches: participant hidden-profile-owner read; any authenticated insert. Update by either matched owner.
- hidden_messages: matched-participant read; self insert; self delete.
- reveal_requests: matched-participant read; self insert; update by either owner.
3. Notes
- Real identity enforced in chat_rooms/chat_messages by design (no hidden_profile_id column).
- Zeal Match uses hidden_profile_id — real identity never shown.
- reveal_requests require both approved flags to be true for a reveal.
*/

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text DEFAULT 'branch', -- everyone | branch | gaming | study | sports | projects | custom
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  icon text,
  member_count int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages (room_id, created_at DESC);

-- DM conversations
CREATE TABLE IF NOT EXISTS dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dm_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to uuid REFERENCES dm_messages(id) ON DELETE SET NULL,
  image_url text,
  is_seen boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv ON dm_messages (conversation_id, created_at DESC);

-- Zeal Match
CREATE TABLE IF NOT EXISTS hidden_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hidden_profile_1 uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  hidden_profile_2 uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  intention text DEFAULT 'random', -- friends | study | gaming | random | networking | meet
  status text DEFAULT 'active', -- active | ended | blocked
  revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hidden_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES hidden_matches(id) ON DELETE CASCADE,
  sender_hidden_id uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hidden_messages_match ON hidden_messages (match_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reveal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES hidden_matches(id) ON DELETE CASCADE,
  requester_hidden_id uuid NOT NULL REFERENCES hidden_profiles(id) ON DELETE CASCADE,
  approved_1 boolean DEFAULT false,
  approved_2 boolean DEFAULT false,
  status text DEFAULT 'pending', -- pending | approved | declined | expired
  created_at timestamptz DEFAULT now()
);

-- ===== RLS + POLICIES =====

-- Chat rooms
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_chat_rooms" ON chat_rooms;
CREATE POLICY "read_chat_rooms" ON chat_rooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_chat_rooms" ON chat_rooms;
CREATE POLICY "insert_chat_rooms" ON chat_rooms FOR INSERT TO authenticated WITH CHECK (true);

-- Room members
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_room_members" ON room_members;
CREATE POLICY "read_room_members" ON room_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_room_member" ON room_members;
CREATE POLICY "insert_own_room_member" ON room_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_room_member" ON room_members;
CREATE POLICY "update_own_room_member" ON room_members FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_room_member" ON room_members;
CREATE POLICY "delete_own_room_member" ON room_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Chat messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_chat_messages" ON chat_messages;
CREATE POLICY "read_chat_messages" ON chat_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_chat_message" ON chat_messages;
CREATE POLICY "insert_own_chat_message" ON chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "delete_own_chat_message" ON chat_messages;
CREATE POLICY "delete_own_chat_message" ON chat_messages FOR DELETE TO authenticated
USING (auth.uid() = author_id);

-- DM conversations
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_dm_conversations" ON dm_conversations;
CREATE POLICY "read_dm_conversations" ON dm_conversations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = dm_conversations.id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_dm_conversations" ON dm_conversations;
CREATE POLICY "insert_dm_conversations" ON dm_conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_dm_conversations" ON dm_conversations;
CREATE POLICY "delete_dm_conversations" ON dm_conversations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = dm_conversations.id AND user_id = auth.uid()));

-- DM participants
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_dm_participants" ON dm_participants;
CREATE POLICY "read_dm_participants" ON dm_participants FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM dm_participants dp2 WHERE dp2.conversation_id = dm_participants.conversation_id AND dp2.user_id = auth.uid())
);
DROP POLICY IF EXISTS "insert_dm_participants" ON dm_participants;
CREATE POLICY "insert_dm_participants" ON dm_participants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_dm_participant" ON dm_participants;
CREATE POLICY "update_own_dm_participant" ON dm_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_dm_participant" ON dm_participants;
CREATE POLICY "delete_own_dm_participant" ON dm_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- DM messages
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_dm_messages" ON dm_messages;
CREATE POLICY "read_dm_messages" ON dm_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_dm_message" ON dm_messages;
CREATE POLICY "insert_own_dm_message" ON dm_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "update_own_dm_message" ON dm_messages;
CREATE POLICY "update_own_dm_message" ON dm_messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "delete_own_dm_message" ON dm_messages;
CREATE POLICY "delete_own_dm_message" ON dm_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Hidden matches
ALTER TABLE hidden_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_hidden_matches" ON hidden_matches;
CREATE POLICY "read_hidden_matches" ON hidden_matches FOR SELECT TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_1)
  OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_2)
);
DROP POLICY IF EXISTS "insert_hidden_matches" ON hidden_matches;
CREATE POLICY "insert_hidden_matches" ON hidden_matches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_hidden_matches" ON hidden_matches;
CREATE POLICY "update_hidden_matches" ON hidden_matches FOR UPDATE TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_1)
  OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_2)
) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_hidden_matches" ON hidden_matches;
CREATE POLICY "delete_hidden_matches" ON hidden_matches FOR DELETE TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_1)
  OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hidden_profile_2)
);

-- Hidden messages
ALTER TABLE hidden_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_hidden_messages" ON hidden_messages;
CREATE POLICY "read_hidden_messages" ON hidden_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM hidden_matches hm WHERE hm.id = match_id AND (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_1)
    OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_2)
  ))
);
DROP POLICY IF EXISTS "insert_own_hidden_message" ON hidden_messages;
CREATE POLICY "insert_own_hidden_message" ON hidden_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = sender_hidden_id));
DROP POLICY IF EXISTS "delete_own_hidden_message" ON hidden_messages;
CREATE POLICY "delete_own_hidden_message" ON hidden_messages FOR DELETE TO authenticated
USING (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = sender_hidden_id));

-- Reveal requests
ALTER TABLE reveal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_reveal_requests" ON reveal_requests;
CREATE POLICY "read_reveal_requests" ON reveal_requests FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM hidden_matches hm WHERE hm.id = match_id AND (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_1)
    OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_2)
  ))
);
DROP POLICY IF EXISTS "insert_own_reveal_request" ON reveal_requests;
CREATE POLICY "insert_own_reveal_request" ON reveal_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = requester_hidden_id));
DROP POLICY IF EXISTS "update_reveal_requests" ON reveal_requests;
CREATE POLICY "update_reveal_requests" ON reveal_requests FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM hidden_matches hm WHERE hm.id = match_id AND (
    auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_1)
    OR auth.uid() = (SELECT owner_id FROM hidden_profiles WHERE id = hm.hidden_profile_2)
  ))
) WITH CHECK (true);
