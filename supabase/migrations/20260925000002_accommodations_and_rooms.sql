-- Accommodations & Room Management Schema

-- 1. Room Categories (Configuration)
CREATE TABLE IF NOT EXISTS public.room_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL, -- Link to auto-created catalog item
  name text NOT NULL, -- e.g., "Family Suite", "Dorm Bed"
  price numeric NOT NULL,
  occupancy integer NOT NULL DEFAULT 2,
  total_units integer NOT NULL DEFAULT 1,
  photos text[] DEFAULT '{}'::text[],
  amenities jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for room_categories
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can manage room categories of their business" ON public.room_categories
FOR ALL
USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

CREATE POLICY "Allow public read room categories" ON public.room_categories
FOR SELECT
USING (true);

-- 2. Physical Rooms (For POS Grid & Front Desk)
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.room_categories(id) ON DELETE CASCADE,
  room_number text NOT NULL, -- e.g., "101", "102", "Dorm-A"
  status text DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'OCCUPIED', 'CLEANING', 'MAINTENANCE')),
  current_guest_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to guest app ID
  guest_name text, -- For walk-in front desk check-ins
  guest_phone text,
  check_in_date timestamp with time zone,
  check_out_date timestamp with time zone,
  qr_code_hash text UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can manage rooms of their business" ON public.rooms
FOR ALL
USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

CREATE POLICY "Allow public read rooms" ON public.rooms
FOR SELECT
USING (true);

-- 3. Link Orders and Tickets to Rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN guest_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'kitchen_tickets' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE public.kitchen_tickets ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_categories_business_id ON public.room_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_rooms_business_id ON public.rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_rooms_category_id ON public.rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_orders_room_id ON public.orders(room_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_room_id ON public.kitchen_tickets(room_id);
