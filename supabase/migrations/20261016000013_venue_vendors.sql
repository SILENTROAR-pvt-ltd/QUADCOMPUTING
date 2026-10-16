-- ============================================================================
-- 20261016000013_venue_vendors.sql   (safe to re-run)
--
-- Vendors: a host's neighbour and partner contacts (a food partner, bike rental, taxi, laundry...).
-- Each has a name, a category, a WhatsApp number, an optional QR image (stored as a small data URL) and notes.
-- When a guest order comes in, the host shares it to the vendor on WhatsApp in one tap; the vendor adds it to their
-- own bill. Nothing here touches orders or billing.
-- Read and written only by the app's server routes (service role): RLS is on with no policies.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.venue_vendors (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id    uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name           text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
    category       text NOT NULL DEFAULT 'other',
    whatsapp_phone text NOT NULL CHECK (whatsapp_phone ~ '^[0-9]{10,15}$'),
    qr_image       text CHECK (qr_image IS NULL OR length(qr_image) <= 400000),
    notes          text CHECK (notes IS NULL OR length(notes) <= 300),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_vendors_business ON public.venue_vendors (business_id, created_at DESC);

ALTER TABLE public.venue_vendors ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
