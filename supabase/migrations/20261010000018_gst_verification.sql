-- GST only for verified GSTINs.
--
-- A venue may charge GST only on a GSTIN its host has confirmed in My profile. The confirmation is
-- stored against that exact GSTIN, so editing the number cancels it until the host confirms again.
-- Until this migration runs, the app treats every venue as unverified and charges no GST.
-- Idempotent: safe to run more than once.

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gst_verified_number text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gst_verified_at timestamptz;

COMMENT ON COLUMN public.businesses.gst_verified_number IS
  'The GSTIN the host confirmed as registered and active. GST is charged only while it equals gst_number.';
