-- Stays: public room showcase, advance booking, guest self check-in with an ID photo, and in-room dining.
-- Hand-apply in staging, then production, BEFORE deploying the application build that carries this feature: the
-- front-desk checkout clears the new room columns, so a build with the feature needs these columns to exist.
-- Additive and safe to re-run.

BEGIN;

-- ── Venue switches ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Self check-in is off until the owner turns it on: with it on, anyone who reaches /stay/<venue>/checkin can take a
-- vacant room by giving a name, a phone and an ID photo, so the owner decides whether their front desk works that way.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS self_checkin_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_room_dining_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stay_tagline           text;

-- ── Rooms: how the guest arrived and where their ID photo is ─────────────────────────────────────────────────────
-- id_proof_path is an object path in the private `guest-ids` bucket, never a URL: the host reads it through a short
-- signed URL (lib/services/stay/id-proof.service.ts). Checkout clears all three.
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS checkin_source text NOT NULL DEFAULT 'desk',
  ADD COLUMN IF NOT EXISTS id_proof_path  text,
  ADD COLUMN IF NOT EXISTS id_verified_at timestamptz;
DO $$ BEGIN
  ALTER TABLE public.rooms ADD CONSTRAINT rooms_checkin_source_check CHECK (checkin_source IN ('desk', 'self', 'booking'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.room_stay_logs
  ADD COLUMN IF NOT EXISTS id_proof_path  text,
  ADD COLUMN IF NOT EXISTS checkin_source text;

-- ── Advance bookings ───────────────────────────────────────────────────────────────────────────────────────────────
-- The table already exists on production (created out of band); this makes it part of the migration history and
-- adds what a web booking needs: a confirmation code the guest keeps, the room it turned into, and more statuses.
CREATE TABLE IF NOT EXISTS public.stay_booking_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.room_categories(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL CHECK (guests >= 1 AND guests <= 20),
  guest_name text NOT NULL CHECK (char_length(guest_name) >= 1 AND char_length(guest_name) <= 60),
  guest_phone text NOT NULL CHECK (guest_phone ~ '^[0-9]{10}$'),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.stay_booking_requests
  ADD COLUMN IF NOT EXISTS guest_email       text,
  ADD COLUMN IF NOT EXISTS confirmation_code text,
  ADD COLUMN IF NOT EXISTS source            text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS room_id           uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.stay_booking_requests DROP CONSTRAINT IF EXISTS stay_booking_requests_status_check;
ALTER TABLE public.stay_booking_requests ADD CONSTRAINT stay_booking_requests_status_check
  CHECK (status IN ('requested', 'confirmed', 'declined', 'cancelled', 'checked_in', 'no_show'));
CREATE UNIQUE INDEX IF NOT EXISTS stay_booking_requests_code_idx
  ON public.stay_booking_requests (confirmation_code) WHERE confirmation_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS stay_booking_requests_range_idx
  ON public.stay_booking_requests (business_id, category_id, status, check_in, check_out);

-- Server-only, like every guest and money table (20261005000002): the API reads and writes it with the service role.
ALTER TABLE public.stay_booking_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stay_booking_requests FROM PUBLIC, anon, authenticated;

-- ── ID photos: a private bucket ────────────────────────────────────────────────────────────────────────────────────
-- No storage policy is created, so no client role can read or write objects; only the service role does, from the
-- server, and the host sees a photo through a signed URL that expires in minutes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('guest-ids', 'guest-ids', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;

NOTIFY pgrst, 'reload schema';
