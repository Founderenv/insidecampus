-- 017: Contact requests system + notifications trigger

-- ========================================
-- CONTACT REQUESTS
-- ========================================

CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  reference_id uuid,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT contact_requests_no_self CHECK (sender_id <> recipient_id),
  CONSTRAINT contact_requests_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_recipient ON contact_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_sender ON contact_requests(sender_id);

-- Prevent duplicate pending requests from the same sender to the same recipient
-- for the same reference (e.g. spamming "interested" on one marketplace listing).
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_requests_dup_pending
  ON contact_requests(sender_id, recipient_id, request_type, reference_id)
  WHERE status = 'pending';

-- ========================================
-- RLS
-- ========================================

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_requests" ON contact_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "insert_own_request" ON contact_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "update_own_request" ON contact_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);
CREATE POLICY "delete_own_request" ON contact_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ========================================
-- NOTIFICATION TRIGGER for contact_requests
-- ========================================

CREATE OR REPLACE FUNCTION notify_contact_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
  VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'system',
    'contact_request',
    NEW.id,
    CASE NEW.request_type
      WHEN 'marketplace' THEN (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' is interested in your ' || (SELECT title FROM marketplace_listings WHERE id = NEW.reference_id) || ' listing.'
      WHEN 'lost_found' THEN (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' sent a request about your ' || (SELECT item_name FROM lost_found_items WHERE id = NEW.reference_id) || ' post.'
      ELSE (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' sent you a request.'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_contact_request ON contact_requests;
CREATE TRIGGER trg_notify_contact_request
  AFTER INSERT ON contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_contact_request();
