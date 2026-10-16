-- ============================================================================
-- 20261016000003_staff_pin_login.sql   (safe to re-run)
--
-- Staff sign in on their own phone at /pos/<venue-slug> with their name and a 4-digit PIN, with no
-- owner email or password. staff_profiles already exists (payroll) and was extended with `role`
-- and `is_pos_active` by 20260922200000; this adds what a PIN login needs on top of it:
--   pin_hash          the PIN, stored only as a salted scrypt hash ("scrypt:<salt>:<hash>")
--   pin_failures      wrong tries in a row (five locks the staff member out for a few minutes)
--   pin_locked_until  when that lock ends
--   last_login_at     the last successful sign-in
-- The old plain `pin_code` column is left alone and is never read or written by the PIN login.
-- Nothing is dropped. Apply in the Supabase SQL editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'CASHIER';
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS is_pos_active boolean DEFAULT true;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS pin_failures integer NOT NULL DEFAULT 0;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_staff_profiles_pos_login
  ON public.staff_profiles (business_id)
  WHERE is_pos_active IS TRUE AND pin_hash IS NOT NULL;

COMMIT;
