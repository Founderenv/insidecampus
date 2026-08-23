/*
  Create or reuse a direct-message conversation atomically.

  The client cannot safely insert another user's dm_participants row because
  RLS correctly permits only self-inserts.  This function validates the caller,
  serializes concurrent requests for a user pair, and creates both rows within
  one transaction.
*/

CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(recipient_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  existing_conversation_id uuid;
  new_conversation_id uuid;
  pair_key text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to start a direct conversation';
  END IF;

  IF caller_id = recipient_id THEN
    RAISE EXCEPTION 'A direct conversation requires a different recipient';
  END IF;

  pair_key := least(caller_id::text, recipient_id::text) || ':' || greatest(caller_id::text, recipient_id::text);
  PERFORM pg_advisory_xact_lock(hashtext(pair_key));

  SELECT mine.conversation_id
  INTO existing_conversation_id
  FROM dm_participants AS mine
  INNER JOIN dm_participants AS recipient
    ON recipient.conversation_id = mine.conversation_id
  WHERE mine.user_id = caller_id
    AND recipient.user_id = recipient_id
  ORDER BY mine.created_at ASC
  LIMIT 1;

  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  INSERT INTO dm_conversations DEFAULT VALUES
  RETURNING id INTO new_conversation_id;

  INSERT INTO dm_participants (conversation_id, user_id)
  VALUES
    (new_conversation_id, caller_id),
    (new_conversation_id, recipient_id);

  RETURN new_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION get_or_create_dm_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_dm_conversation(uuid) TO authenticated;
