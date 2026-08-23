/*
  Send direct messages through one authenticated database operation.

  The RPC derives sender_id from auth.uid(), verifies that the caller belongs
  to the target conversation, and returns the persisted row for immediate UI
  rendering. The direct insert policy enforces the same membership boundary.
*/

DROP POLICY IF EXISTS "insert_own_dm_message" ON dm_messages;
CREATE POLICY "insert_own_dm_message" ON dm_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM dm_participants
    WHERE dm_participants.conversation_id = dm_messages.conversation_id
      AND dm_participants.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION send_dm_message(
  target_conversation_id uuid,
  message_content text
)
RETURNS dm_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  new_message dm_messages;
  normalized_content text := btrim(message_content);
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to send a message';
  END IF;

  IF normalized_content IS NULL OR normalized_content = '' THEN
    RAISE EXCEPTION 'A message cannot be empty';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM dm_participants
    WHERE conversation_id = target_conversation_id
      AND user_id = caller_id
  ) THEN
    RAISE EXCEPTION 'You are not a participant in this conversation';
  END IF;

  INSERT INTO dm_messages (conversation_id, sender_id, content)
  VALUES (target_conversation_id, caller_id, normalized_content)
  RETURNING * INTO new_message;

  RETURN new_message;
END;
$$;

REVOKE ALL ON FUNCTION send_dm_message(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_dm_message(uuid, text) TO authenticated;
