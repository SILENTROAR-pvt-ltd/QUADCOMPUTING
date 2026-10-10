-- ==============================================================================
-- MIGRATION: Accommodations & Room Categories RLS Alignment
-- Allows host control center to insert, update, and manage room_categories and rooms
-- ==============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'room_categories' AND policyname = 'Allow host control center insert room_categories'
  ) THEN
    CREATE POLICY "Allow host control center insert room_categories"
    ON public.room_categories FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'room_categories' AND policyname = 'Allow host control center update room_categories'
  ) THEN
    CREATE POLICY "Allow host control center update room_categories"
    ON public.room_categories FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'room_categories' AND policyname = 'Allow host control center delete room_categories'
  ) THEN
    CREATE POLICY "Allow host control center delete room_categories"
    ON public.room_categories FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Allow host control center insert rooms'
  ) THEN
    CREATE POLICY "Allow host control center insert rooms"
    ON public.rooms FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Allow host control center update rooms'
  ) THEN
    CREATE POLICY "Allow host control center update rooms"
    ON public.rooms FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Allow host control center delete rooms'
  ) THEN
    CREATE POLICY "Allow host control center delete rooms"
    ON public.rooms FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
