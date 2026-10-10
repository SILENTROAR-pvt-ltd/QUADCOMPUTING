-- Sync Accommodations & Rooms with POS Orders Ecosystem
-- Enables unified master folio orders and room-service rollups

-- 1. Extend public.orders table
DO $$
BEGIN
  -- order_type (room_stay, room_service, pos, takeaway)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN order_type text DEFAULT 'pos';
  END IF;

  -- customer_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_name text;
  END IF;

  -- customer_phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_phone text;
  END IF;

  -- total_amount (alias/sync with grand_total)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_amount numeric;
  END IF;

  -- master_order_id (links room service F&B orders to the active room stay master order)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'master_order_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN master_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Relax status check constraints on orders to allow active, open, SETTLED, and COMPLETED
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%status%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 3. Relax order_source constraint if any
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%order_source%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 4. Create performance indexes for room-linked orders and master orders
CREATE INDEX IF NOT EXISTS idx_orders_room_id_status ON public.orders(room_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_master_order_id ON public.orders(master_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
