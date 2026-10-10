-- ============================================================
-- MIGRATION: Venue Photo Vault & Events Ingestion Pipeline
-- Connects Host Control Center to Guest Social Lobby
-- ============================================================

-- 1. CREATE VENUE_PHOTO_VAULT TABLE
CREATE TABLE IF NOT EXISTS public.venue_photo_vault (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,         -- e.g., 'Acoustic Lounge', 'Cocktail Specials', 'Sunset Terrace'
    time_tag TEXT,                  -- e.g., 'Tonight @ 8:30 PM' or 'Daily @ 7:00 PM'
    image_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE ROW LEVEL SECURITY & INDEXES
ALTER TABLE public.venue_photo_vault ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_venue_photo_vault_venue_id 
    ON public.venue_photo_vault(venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_photo_vault_created_at 
    ON public.venue_photo_vault(created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Guests & Public can read all active venue photo vault items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow public read access on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow public read access on venue_photo_vault"
    ON public.venue_photo_vault FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Host Control Center can insert new photos/events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow host insert on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow host insert on venue_photo_vault"
    ON public.venue_photo_vault FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Host Control Center can update photos/events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow host update on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow host update on venue_photo_vault"
    ON public.venue_photo_vault FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Host Control Center can delete photos/events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow host delete on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow host delete on venue_photo_vault"
    ON public.venue_photo_vault FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- 4. SEED INITIAL CURATED VENUE MOMENTS (Venus Cafe Oldmanali)
INSERT INTO public.venue_photo_vault (venue_id, title, category, time_tag, image_url, description)
SELECT 
    'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
    v.title,
    v.category,
    v.time_tag,
    v.image_url,
    v.description
FROM (
    VALUES 
    (
        'Live Acoustic Sessions',
        'Acoustic Lounge',
        'Tonight @ 8:30 PM',
        'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
        'Intimate unplugged guitar rhythms and ambient vocal harmonies under candlelit arches.'
    ),
    (
        'Botanical Mixology Ritual',
        'Cocktail Specials',
        'Daily @ 7:00 PM',
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
        'Handcrafted cold-smoked botanicals infused with mountain herbs and small-batch spirits.'
    ),
    (
        'Golden Hour Panorama',
        'Sunset Terrace',
        'Daily @ 6:15 PM',
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
        'Unobstructed mountain ridge views as golden daylight reflects off the venue terrace.'
    ),
    (
        'Chef’s Seasonal Tasting',
        'Omakase Dining',
        'Thur - Sat @ 9:00 PM',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        'Five-course artisanal menu spotlighting heirloom forest mushrooms and dry-aged cuts.'
    ),
    (
        'Analog Vinyl Sessions',
        'Audiophile Night',
        'Sundays @ 5:00 PM',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        'Warm tube-amplified jazz and classic soul pressed on original heavyweight vinyl.'
    ),
    (
        'Single-Origin Cupping',
        'Roastery Lab',
        'Mon - Wed @ 11:00 AM',
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
        'Guided sensory tasting of high-elevation micro-lots roasted on-site this morning.'
    )
) AS v(title, category, time_tag, image_url, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.venue_photo_vault 
    WHERE venue_id = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269' AND title = v.title
);

-- 5. NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
