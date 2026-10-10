-- ============================================================
-- MIGRATION: Restaurant Tables, Seating Capacity & Lifecycle
-- Adds table management with automatic status sync via triggers
-- ============================================================

-- 1. CREATE RESTAURANT TABLES / SITTING CAPACITY TABLE
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    location_id uuid,
    table_number text NOT NULL,
    seating_capacity integer NOT NULL DEFAULT 4 CHECK (seating_capacity > 0),
    status text DEFAULT 'VACANT' CHECK (status = ANY (ARRAY['VACANT'::text, 'OCCUPIED'::text, 'RESERVED'::text, 'CLEANING'::text])),
    qr_code_slug text UNIQUE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id),
    CONSTRAINT restaurant_tables_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    CONSTRAINT restaurant_tables_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL,
    CONSTRAINT unique_table_per_location UNIQUE (business_id, location_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_business_location ON public.restaurant_tables(business_id, location_id);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts manage their own tables" ON public.restaurant_tables
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid())
  );

-- 2. LINK TABLES & SOURCE TO ORDERS TABLE
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS table_number text DEFAULT 'Takeaway / Counter',
ADD COLUMN IF NOT EXISTS order_source text DEFAULT 'POS' CHECK (order_source = ANY (ARRAY['POS'::text, 'QR_GUEST'::text, 'ONLINE'::text])),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING' CHECK (status = ANY (ARRAY['PENDING'::text, 'SERVED'::text, 'COMPLETED'::text, 'CANCELLED'::text])),
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'CASH';

CREATE INDEX IF NOT EXISTS idx_orders_table_status ON public.orders(table_id, status);

-- 3. AUTOMATIC TABLE STATUS SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_table_status_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.table_id IS NOT NULL THEN
        IF NEW.status IN ('PENDING', 'SERVED') THEN
            UPDATE public.restaurant_tables
            SET status = 'OCCUPIED'
            WHERE id = NEW.table_id;
        ELSIF NEW.status IN ('COMPLETED', 'CANCELLED') THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.orders
                WHERE table_id = NEW.table_id
                AND id != NEW.id
                AND status IN ('PENDING', 'SERVED')
            ) THEN
                UPDATE public.restaurant_tables
                SET status = 'VACANT'
                WHERE id = NEW.table_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_table_status ON public.orders;
CREATE TRIGGER trigger_sync_table_status
AFTER INSERT OR UPDATE OF status, table_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_table_status_on_order();
