/*
  Replace recursive dm_participants RLS predicates.

  The original participant-read policy queried dm_participants from within its
  own policy expression. PostgreSQL correctly rejects that with "infinite
  recursion detected in policy", which also broke conversation/message reads.
*/

CREATE OR REPLACE FUNCTION is_dm_participant(target_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dm_participants
    WHERE conversation_id = target_conversation_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_dm_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_dm_participant(uuid) TO authenticated;

DROP POLICY IF EXISTS "read_dm_conversations" ON dm_conversations;
CREATE POLICY "read_dm_conversations" ON dm_conversations
FOR SELECT TO authenticated
USING (is_dm_participant(id));

DROP POLICY IF EXISTS "delete_dm_conversations" ON dm_conversations;
CREATE POLICY "delete_dm_conversations" ON dm_conversations
FOR DELETE TO authenticated
USING (is_dm_participant(id));

DROP POLICY IF EXISTS "read_dm_participants" ON dm_participants;
CREATE POLICY "read_dm_participants" ON dm_participants
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_dm_participant(conversation_id));

DROP POLICY IF EXISTS "read_dm_messages" ON dm_messages;
CREATE POLICY "read_dm_messages" ON dm_messages
FOR SELECT TO authenticated
USING (is_dm_participant(conversation_id));

DROP POLICY IF EXISTS "insert_own_dm_message" ON dm_messages;
CREATE POLICY "insert_own_dm_message" ON dm_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND is_dm_participant(conversation_id)
);
