-- Migration: Enterprise Room Check-In Attributes & Stay Logs
-- 1. Extend public.rooms table for rich check-in attributes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN check_in_time timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'check_out_time'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN check_out_time timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'total_guests'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN total_guests integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'purpose_of_visit'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN purpose_of_visit text DEFAULT 'Leisure';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'is_celebration'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN is_celebration boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'celebration_type'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN celebration_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'celebration_note'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN celebration_note text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'guest_id_proof'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN guest_id_proof text;
  END IF;
END $$;

-- 2. Create historical stay logs table for analytics, police compliance, and guest records
CREATE TABLE IF NOT EXISTS public.room_stay_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_id_proof text,
  check_in_time timestamp with time zone NOT NULL DEFAULT now(),
  check_out_time timestamp with time zone,
  total_guests integer DEFAULT 1,
  purpose_of_visit text,
  is_celebration boolean DEFAULT false,
  celebration_type text,
  celebration_note text,
  selected_addons jsonb DEFAULT '[]'::jsonb,
  total_billed_amount numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for room_stay_logs
ALTER TABLE public.room_stay_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'room_stay_logs' AND policyname = 'Hosts can manage room stay logs'
  ) THEN
    CREATE POLICY "Hosts can manage room stay logs" ON public.room_stay_logs
    FOR ALL
    USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'room_stay_logs' AND policyname = 'Allow public read stay logs'
  ) THEN
    CREATE POLICY "Allow public read stay logs" ON public.room_stay_logs
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Index for analytics and logs
CREATE INDEX IF NOT EXISTS idx_room_stay_logs_business_id ON public.room_stay_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_room_stay_logs_room_id ON public.room_stay_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_room_stay_logs_created_at ON public.room_stay_logs(created_at);
