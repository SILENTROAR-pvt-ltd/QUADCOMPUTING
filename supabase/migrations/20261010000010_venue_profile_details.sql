-- ============================================================================
-- 20261010000010_venue_profile_details.sql   (safe to re-run)
--
-- The profile form asked for a registration type (Pvt Ltd, LLP...) but there was
-- nowhere to store it, so it was silently dropped. This adds the venue's legal and
-- contact details and, for stays, the standard check-in / check-out times.
-- PINs are not touched here: they are now stored only as scrypt hashes
-- (admin_pin_hash / staff_pin_hash) by the application, and any old plain-text PIN
-- is converted the first time it is entered correctly.
-- ============================================================================

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS registration_type text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS fssai_number text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS checkin_time text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS checkout_time text;

DO $$
BEGIN
  ALTER TABLE public.businesses ADD CONSTRAINT businesses_registration_type_check
    CHECK (registration_type IS NULL OR registration_type IN ('pvt', 'public', 'opc', 'llp', 'partner', 'prop', 'huf', 'trust', 'unregistered'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.businesses ADD CONSTRAINT businesses_stay_times_check
    CHECK ((checkin_time IS NULL OR checkin_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
       AND (checkout_time IS NULL OR checkout_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
