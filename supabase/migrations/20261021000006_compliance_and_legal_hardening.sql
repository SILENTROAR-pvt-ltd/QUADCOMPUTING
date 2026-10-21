-- ============================================================================
-- 20261021000006_compliance_and_legal_hardening.sql
--
-- Legal & Compliance Hardening Migration:
-- 1. DPDP Act 2023 (Digital Personal Data Protection Act):
--    - Adds dpdp_consent_accepted & consent_timestamp to rooms & room_stay_logs.
--    - Adds database-level right-to-erasure / anonymization procedure that preserves
--      statutory financial accounting totals (CGST Act Sec 36 / Companies Act Sec 128).
-- 2. Saraai Act 1867 & Foreigners Act 1946 (Bureau of Immigration Form C):
--    - Adds foreign national compliance fields (passport_number, visa_number,
--      country_of_origin, visa_expiry_date) for mandatory local police / FRRO reporting.
-- 3. ISO/IEC 27001 (A.5.15) & SOC 2 Access Control:
--    - Explicitly revokes all anonymous and open policies on room_stay_logs and rooms.
--
-- Safe and idempotent to apply in staging and production.
-- ============================================================================

BEGIN;

-- ── 1. Accommodations DPDP & Saraai Act Columns on rooms ───────────────────────────
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS dpdp_consent_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp     timestamptz,
  ADD COLUMN IF NOT EXISTS is_foreign_national   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS passport_number       text,
  ADD COLUMN IF NOT EXISTS visa_number           text,
  ADD COLUMN IF NOT EXISTS country_of_origin     text,
  ADD COLUMN IF NOT EXISTS visa_expiry_date      text;

-- ── 2. Accommodations DPDP, Saraai Act & Erasure Columns on room_stay_logs ──────────
ALTER TABLE public.room_stay_logs
  ADD COLUMN IF NOT EXISTS dpdp_consent_accepted    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp        timestamptz,
  ADD COLUMN IF NOT EXISTS is_foreign_national      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS passport_number          text,
  ADD COLUMN IF NOT EXISTS visa_number              text,
  ADD COLUMN IF NOT EXISTS country_of_origin        text,
  ADD COLUMN IF NOT EXISTS visa_expiry_date         text,
  ADD COLUMN IF NOT EXISTS anonymized_at            timestamptz,
  ADD COLUMN IF NOT EXISTS erasure_compliance_basis text;

-- ── 3. Strict ISO 27001 Access Control (A.5.15) Lockdown ───────────────────────────
-- Revoke all direct privileges on stay logs from anonymous users
REVOKE ALL ON public.room_stay_logs FROM anon;
REVOKE ALL ON public.rooms FROM anon;

-- Drop any legacy permissive policies that allowed open access
DROP POLICY IF EXISTS "Allow public read stay logs" ON public.room_stay_logs;
DROP POLICY IF EXISTS "Allow host control center insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow host control center update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow host control center delete rooms" ON public.rooms;

-- Ensure RLS is active on accommodations tables
ALTER TABLE public.room_stay_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Ensure hosts can only access stay logs belonging to their own business
DROP POLICY IF EXISTS "Hosts manage own business stay logs" ON public.room_stay_logs;
CREATE POLICY "Hosts manage own business stay logs" ON public.room_stay_logs
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()) OR business_id = ANY (public.get_auth_business_ids()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()) OR business_id = ANY (public.get_auth_business_ids()));

-- ── 4. DPDP Right to Erasure Procedure (CGST Act Sec 36 Ledger Preserving) ─────────
CREATE OR REPLACE FUNCTION public.anonymize_guest_stay(
  p_log_id uuid,
  p_business_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_hash text;
BEGIN
  -- Verify the caller owns this business or has admin privileges
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND host_id = auth.uid())
    OR p_business_id = ANY (public.get_auth_business_ids())
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR current_user = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: cannot anonymize record for venue %', p_business_id USING ERRCODE = '42501';
  END IF;

  SELECT guest_phone INTO v_phone
  FROM public.room_stay_logs
  WHERE id = p_log_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Built-in sha256 (Postgres 11+): pgcrypto's digest() lives in the "extensions" schema on Supabase and is not on this function's search_path.
  v_hash := substr(encode(sha256(convert_to('dpdp_erasure_salt:' || coalesce(v_phone, p_log_id::text), 'UTF8')), 'hex'), 1, 12);

  UPDATE public.room_stay_logs
  SET
    guest_name = 'ANONYMIZED_GUEST_' || upper(v_hash),
    guest_phone = '+91-XXXXXX' || right(v_hash, 4),
    guest_email = NULL,
    guest_address = NULL,
    id_number = NULL,
    id_type = NULL,
    guest_id_proof = NULL,
    id_proof_path = NULL,
    passport_number = NULL,
    visa_number = NULL,
    country_of_origin = NULL,
    visa_expiry_date = NULL,
    anonymized_at = clock_timestamp(),
    erasure_compliance_basis = 'DPDP_ACT_2023_SEC_12'
  WHERE id = p_log_id AND business_id = p_business_id;

  RETURN true;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
