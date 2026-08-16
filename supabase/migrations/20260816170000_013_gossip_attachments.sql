/*
  Migration 013: Gossip attachments — extend chat_messages + storage bucket
*/

-- 1. Extend chat_messages with attachment metadata
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS attachment_duration int;

-- 2. Create private storage bucket for gossip attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gossip-attachments',
  'gossip-attachments',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for gossip-attachments bucket (safe idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'gossip_attachments_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "gossip_attachments_read"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'gossip-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'gossip_attachments_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "gossip_attachments_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'gossip-attachments'
        AND (storage.foldername(name))[3] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'gossip_attachments_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "gossip_attachments_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'gossip-attachments'
        AND (storage.foldername(name))[3] = auth.uid()::text
      );
  END IF;
END $$;

-- 4. Index for efficient message type queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages (message_type);
