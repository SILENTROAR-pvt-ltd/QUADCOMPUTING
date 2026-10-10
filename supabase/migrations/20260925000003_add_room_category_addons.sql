-- Migration: Add Priced Add-Ons to Room Categories and Physical Rooms
-- Enables configurable chargeable amenities per category and guest add-on selections per room

-- 1. Add JSONB columns to room_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'room_categories' AND column_name = 'addons'
  ) THEN
    ALTER TABLE public.room_categories ADD COLUMN addons jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'room_categories' AND column_name = 'available_addons'
  ) THEN
    ALTER TABLE public.room_categories ADD COLUMN available_addons jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Add selected_addons JSONB column to physical rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'selected_addons'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN selected_addons jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
