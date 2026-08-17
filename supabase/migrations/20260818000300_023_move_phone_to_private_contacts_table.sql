-- =====================================================================
-- 023: MOVE PHONE OUT OF profiles (true privacy fix)
-- =====================================================================
-- 022's REVOKE cannot work: Postgres column-level REVOKE is overridden
-- by the table-level SELECT grant, so phone stayed readable via REST.
-- Real fix: phone lives in a private profile_contacts table where only
-- the owner can SELECT/UPDATE it; clients reach others' phones through
-- the search_path-pinned get_contact_phone() SECURITY DEFINER RPC
-- (gated by the blocks table).

CREATE TABLE IF NOT EXISTS public.profile_contacts (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_contact"  ON public.profile_contacts;
DROP POLICY IF EXISTS "owner_write_contact" ON public.profile_contacts;

CREATE POLICY "owner_read_contact"
  ON public.profile_contacts FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "owner_write_contact"
  ON public.profile_contacts FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "owner_update_contact"
  ON public.profile_contacts FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "owner_delete_contact"
  ON public.profile_contacts FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;

-- migrate existing phones before dropping the column
INSERT INTO public.profile_contacts (profile_id, phone)
SELECT id, phone FROM public.profiles WHERE phone IS NOT NULL AND phone <> ''
ON CONFLICT (profile_id) DO NOTHING;

-- point the contact RPC at the private table
CREATE OR REPLACE FUNCTION public.get_contact_phone(p_owner_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pc.phone
  FROM profile_contacts pc
  WHERE pc.profile_id = p_owner_id
    AND pc.phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p_owner_id)
         OR (b.blocker_id = p_owner_id AND b.blocked_id = auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.get_contact_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contact_phone(uuid) TO authenticated;

-- the column can no longer be read through the API for anyone but the table owner
ALTER TABLE public.profiles DROP COLUMN phone;