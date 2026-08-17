-- 020: fix gossip attachment read policy
-- Migration 019's subquery used an unqualified "name" which PostgreSQL
-- resolved to chat_rooms.name (inner scope) instead of storage.objects.name,
-- so the message-visibility branch could never match and non-uploaders could
-- not read any attachment. Recreate the policy with the column fully
-- qualified. All other 019 statements are correct as applied.

DROP POLICY IF EXISTS "gossip_attachments_read" ON storage.objects;
CREATE POLICY "gossip_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'gossip-attachments'
    AND (
      (storage.foldername(name))[3]::text = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'campus'
        AND EXISTS (
          SELECT 1 FROM chat_messages cm
          JOIN chat_rooms cr ON cr.id = cm.room_id
          JOIN profiles p ON p.id = auth.uid()
          WHERE cm.attachment_path = storage.objects.name
            AND (cr.type = 'everyone' OR (cr.branch_id IS NOT NULL AND cr.branch_id = p.branch_id))
        )
      )
    )
  );
