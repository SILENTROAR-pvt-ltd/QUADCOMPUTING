-- Vibers Club, part 6: places, the follow graph and story receipts. Members follow each other,
-- follow places they plan to visit, tag stories and posts with a place, and see who viewed their
-- stories. Server-only tables. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.club_stories') IS NULL OR to_regclass('public.club_posts') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001-5 first (or paste supabase/club_setup_all.sql, which runs all of them in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_places (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
    region text NOT NULL CHECK (region IN ('india', 'asia', 'europe', 'americas', 'africa', 'oceania')),
    country text NOT NULL CHECK (length(country) BETWEEN 2 AND 60),
    kinds text[] NOT NULL DEFAULT '{}',
    blurb text CHECK (blurb IS NULL OR length(blurb) <= 240),
    cover_path text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_places_region ON public.club_places (region, active);

CREATE TABLE IF NOT EXISTS public.club_place_follows (
    place_id uuid NOT NULL REFERENCES public.club_places(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_club_place_follows_user ON public.club_place_follows (user_id);

CREATE TABLE IF NOT EXISTS public.club_follows (
    follower_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    followee_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id),
    CONSTRAINT club_follows_not_self CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS idx_club_follows_followee ON public.club_follows (followee_id);

CREATE TABLE IF NOT EXISTS public.club_story_views (
    story_id uuid NOT NULL REFERENCES public.club_stories(id) ON DELETE CASCADE,
    viewer_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    viewed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_club_story_views_viewer ON public.club_story_views (viewer_id);

ALTER TABLE public.club_stories ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.club_places(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_club_stories_place ON public.club_stories (place_id, expires_at DESC);

ALTER TABLE public.club_posts ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.club_places(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_club_posts_place ON public.club_posts (place_id, created_at DESC);

INSERT INTO public.club_places (slug, name, region, country, kinds, blurb) VALUES
    ('goa', 'Goa', 'india', 'India', ARRAY['beach', 'nightlife', 'food'], 'Beach shacks, sunset cruises on the Mandovi and late-night music.'),
    ('manali', 'Manali', 'india', 'India', ARRAY['mountains', 'adventure'], 'Himalayan base for treks, paragliding and mountain roads.'),
    ('old-manali', 'Old Manali', 'india', 'India', ARRAY['mountains', 'nature', 'food'], 'Riverside cafés, pine forests and quieter trails above the town.'),
    ('leh-ladakh', 'Leh-Ladakh', 'india', 'India', ARRAY['mountains', 'adventure'], 'High passes, monasteries and the bike routes everyone talks about.'),
    ('rishikesh', 'Rishikesh', 'india', 'India', ARRAY['adventure', 'spiritual'], 'River rafting, yoga ashrams and the Ganga at dusk.'),
    ('jaipur', 'Jaipur', 'india', 'India', ARRAY['heritage', 'food'], 'Pink-city palaces, bazaars and rooftop thalis.'),
    ('udaipur', 'Udaipur', 'india', 'India', ARRAY['heritage'], 'Lake palaces and old havelis by the water.'),
    ('hampi', 'Hampi', 'india', 'India', ARRAY['heritage', 'adventure'], 'Boulders, ruins and sunsets over the Tungabhadra.'),
    ('alleppey', 'Alleppey', 'india', 'India', ARRAY['nature', 'beach'], 'Houseboats, backwaters and coconut-lined canals.'),
    ('varanasi', 'Varanasi', 'india', 'India', ARRAY['spiritual', 'heritage'], 'Ghats, morning boat rides and evening aarti.'),
    ('mumbai', 'Mumbai', 'india', 'India', ARRAY['city', 'food', 'nightlife'], 'Marine Drive, street food and a city that never stops.'),
    ('ooty', 'Ooty', 'india', 'India', ARRAY['nature', 'mountains'], 'Tea estates, toy trains and cool hill air.'),
    ('ha-long-bay', 'Ha Long Bay', 'asia', 'Vietnam', ARRAY['nature', 'beach'], 'Limestone karsts and overnight junk boats.'),
    ('ubud', 'Ubud', 'asia', 'Indonesia', ARRAY['spiritual', 'nature', 'food'], 'Rice terraces, yoga retreats and temple walks in Bali.'),
    ('chiang-mai', 'Chiang Mai', 'asia', 'Thailand', ARRAY['food', 'heritage', 'city'], 'Old temples, night markets and mountain cafés.'),
    ('phuket', 'Phuket', 'asia', 'Thailand', ARRAY['beach', 'nightlife'], 'White-sand beaches and island day trips.'),
    ('kyoto', 'Kyoto', 'asia', 'Japan', ARRAY['heritage', 'food'], 'Temples, tea houses and lantern-lit lanes.'),
    ('santorini', 'Santorini', 'europe', 'Greece', ARRAY['beach', 'city'], 'Whitewashed villages and caldera sunsets.'),
    ('paris', 'Paris', 'europe', 'France', ARRAY['city', 'food'], 'Cafés, museums and the riverbanks.'),
    ('interlaken', 'Interlaken', 'europe', 'Switzerland', ARRAY['mountains', 'adventure'], 'Alpine lakes, paragliding and cable-car summits.'),
    ('lisbon', 'Lisbon', 'europe', 'Portugal', ARRAY['city', 'food', 'nightlife'], 'Tram rides, fado nights and pastel de nata.'),
    ('banff', 'Banff', 'americas', 'Canada', ARRAY['mountains', 'nature'], 'Turquoise lakes and the Rockies in every direction.'),
    ('new-york', 'New York', 'americas', 'USA', ARRAY['city', 'nightlife', 'food'], 'Neighbourhoods, rooftops and a restless skyline.'),
    ('marrakech', 'Marrakech', 'africa', 'Morocco', ARRAY['heritage', 'food'], 'Medina souks, riads and rooftop mint tea.'),
    ('serengeti', 'Serengeti', 'africa', 'Tanzania', ARRAY['nature', 'adventure'], 'Open plains, big skies and safari drives.'),
    ('sydney', 'Sydney', 'oceania', 'Australia', ARRAY['city', 'beach'], 'Harbour views, coastal walks and bondi mornings.'),
    ('queenstown', 'Queenstown', 'oceania', 'New Zealand', ARRAY['adventure', 'mountains'], 'Adrenaline capital of the south, with lakes and peaks.')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_places', 'club_place_follows', 'club_follows', 'club_story_views'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

COMMIT;
