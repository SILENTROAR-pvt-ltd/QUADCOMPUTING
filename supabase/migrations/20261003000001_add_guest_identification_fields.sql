-- Migration: Add guest identification details (id_type, id_number, guest_email, guest_address)
DO $$
BEGIN
  -- 1. room_stay_logs columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_stay_logs' AND column_name = 'id_type') THEN
    ALTER TABLE public.room_stay_logs ADD COLUMN id_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_stay_logs' AND column_name = 'id_number') THEN
    ALTER TABLE public.room_stay_logs ADD COLUMN id_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_stay_logs' AND column_name = 'guest_email') THEN
    ALTER TABLE public.room_stay_logs ADD COLUMN guest_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_stay_logs' AND column_name = 'guest_address') THEN
    ALTER TABLE public.room_stay_logs ADD COLUMN guest_address text;
  END IF;

  -- 2. rooms columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'id_type') THEN
    ALTER TABLE public.rooms ADD COLUMN id_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'id_number') THEN
    ALTER TABLE public.rooms ADD COLUMN id_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'guest_email') THEN
    ALTER TABLE public.rooms ADD COLUMN guest_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'guest_address') THEN
    ALTER TABLE public.rooms ADD COLUMN guest_address text;
  END IF;
END $$;
