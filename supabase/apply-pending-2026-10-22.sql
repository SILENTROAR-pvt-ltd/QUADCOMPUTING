-- Pending migrations for production, 22 October 2026. Paste the whole file into the Supabase SQL editor and run it once.
-- Both parts only add columns, change nothing that exists, and are safe to run again.
--   1. 20261010000018_gst_verification.sql   GST is charged only on a GSTIN the host has confirmed
--   2. 20261016000002_waiter_settle_switch.sql   the "waiters may settle bills" switch in My profile (starts off)

-- 1. 20261010000018_gst_verification.sql
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gst_verified_number text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gst_verified_at timestamptz;

COMMENT ON COLUMN public.businesses.gst_verified_number IS
  'The GSTIN the host confirmed as registered and active. GST is charged only while it equals gst_number.';

-- 2. 20261016000002_waiter_settle_switch.sql
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS waiter_can_settle boolean NOT NULL DEFAULT false;

-- Check: should list all three columns.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'businesses'
  AND column_name IN ('gst_verified_number', 'gst_verified_at', 'waiter_can_settle')
ORDER BY column_name;
