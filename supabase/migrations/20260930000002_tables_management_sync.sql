-- ============================================================
-- MIGRATION: Table Management & Bi-directional Sync
-- Creates public.tables and ensures two-way sync with restaurant_tables
-- ============================================================

-- 1. CREATE DEDICATED public.tables TABLE
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    table_number TEXT NOT NULL,
    capacity INT DEFAULT 4,
    status TEXT DEFAULT 'vacant', -- 'vacant' | 'occupied' | 'reserved' | 'cleaning'
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_venue_table UNIQUE (venue_id, table_number)
);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on tables" ON public.tables
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on tables" ON public.tables
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on tables" ON public.tables
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on tables" ON public.tables
    FOR DELETE USING (true);

-- 3. SEED / SYNC FROM public.restaurant_tables
INSERT INTO public.tables (venue_id, table_number, capacity, status, updated_at)
SELECT 
    business_id::text AS venue_id,
    table_number,
    COALESCE(seating_capacity, 4) AS capacity,
    LOWER(COALESCE(status, 'vacant')) AS status,
    timezone('utc'::text, now()) AS updated_at
FROM public.restaurant_tables
ON CONFLICT (venue_id, table_number) 
DO UPDATE SET
    capacity = EXCLUDED.capacity,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

-- 4. TRIGGER: Sync restaurant_tables to tables
CREATE OR REPLACE FUNCTION public.sync_restaurant_tables_to_tables()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.tables 
        WHERE venue_id = OLD.business_id::text AND table_number = OLD.table_number;
        RETURN OLD;
    ELSE
        INSERT INTO public.tables (venue_id, table_number, capacity, status, updated_at)
        VALUES (
            NEW.business_id::text,
            NEW.table_number,
            COALESCE(NEW.seating_capacity, 4),
            LOWER(COALESCE(NEW.status, 'vacant')),
            timezone('utc'::text, now())
        )
        ON CONFLICT (venue_id, table_number)
        DO UPDATE SET
            capacity = EXCLUDED.capacity,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_restaurant_tables_to_tables ON public.restaurant_tables;
CREATE TRIGGER trg_sync_restaurant_tables_to_tables
AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_tables
FOR EACH ROW EXECUTE FUNCTION public.sync_restaurant_tables_to_tables();

-- 5. TRIGGER: Sync tables to restaurant_tables
CREATE OR REPLACE FUNCTION public.sync_tables_to_restaurant_tables()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        UPDATE public.restaurant_tables
        SET 
            status = UPPER(NEW.status),
            seating_capacity = COALESCE(NEW.capacity, 4)
        WHERE business_id::text = NEW.venue_id AND table_number = NEW.table_number;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_tables_to_restaurant_tables ON public.tables;
CREATE TRIGGER trg_sync_tables_to_restaurant_tables
AFTER UPDATE OF status, capacity ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.sync_tables_to_restaurant_tables();
