-- ==============================================================================
-- MIGRATION: Host Security & Control Center Permissions Alignment
-- ==============================================================================

-- 1. Ensure businesses table allows updates from host control center
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'businesses' AND policyname = 'Allow host control center update businesses'
  ) THEN
    CREATE POLICY "Allow host control center update businesses"
    ON public.businesses FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 2. Ensure locations table allows branch name sync
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' AND policyname = 'Allow host control center update locations'
  ) THEN
    CREATE POLICY "Allow host control center update locations"
    ON public.locations FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Ensure profiles table allows host upserts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow host control center update profiles'
  ) THEN
    CREATE POLICY "Allow host control center update profiles"
    ON public.profiles FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
