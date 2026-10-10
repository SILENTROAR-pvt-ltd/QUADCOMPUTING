-- ============================================================
-- MIGRATION: Venue Live Offers & Special Discounts
-- Connects Host Control Center to Guest Social Lobby
-- ============================================================

CREATE TABLE IF NOT EXISTS public.venue_live_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('room', 'food', 'general')) DEFAULT 'general',
    discount_badge TEXT NOT NULL,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.venue_live_offers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_venue_live_offers_venue_active 
    ON public.venue_live_offers(venue_id, is_active);

CREATE INDEX IF NOT EXISTS idx_venue_live_offers_created_at 
    ON public.venue_live_offers(created_at DESC);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow public read access on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow public read access on venue_live_offers"
    ON public.venue_live_offers FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow host insert on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow host insert on venue_live_offers"
    ON public.venue_live_offers FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow host update on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow host update on venue_live_offers"
    ON public.venue_live_offers FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow host delete on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow host delete on venue_live_offers"
    ON public.venue_live_offers FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END $$;
