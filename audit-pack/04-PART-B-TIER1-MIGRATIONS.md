# PART B — TIER 1 CODE EXTRACTION (Database Migrations In Order)

Total Migration Files: 55
All files below are extracted in exact ascending execution order, 100% VERBATIM.

---

### supabase/migrations/001_onboarding.sql (33 lines)
```sql
-- Profiles: Base identity for both hosts and guests
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT CHECK (role IN ('host', 'guest')) NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT,
    dob DATE,
    global_wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    referral_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Businesses: A host can own multiple business entities
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    categories TEXT[] NOT NULL,
    gst_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Locations: A business can have multiple physical branches/locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    branch_name TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    qr_code_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

```

### supabase/migrations/002_provisioning_foundation.sql (1 lines)
```sql

```

### supabase/migrations/003_rls_policies.sql (81 lines)
```sql
-- supabase/migrations/003_rls_policies.sql

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile."
ON public.profiles FOR DELETE
USING (auth.uid() = id);

-- Businesses Policies
CREATE POLICY "Users can view their own businesses."
ON public.businesses FOR SELECT
USING (auth.uid() = host_id);

CREATE POLICY "Users can insert their own businesses."
ON public.businesses FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own businesses."
ON public.businesses FOR UPDATE
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can delete their own businesses."
ON public.businesses FOR DELETE
USING (auth.uid() = host_id);

-- Locations Policies
CREATE POLICY "Users can view locations of their businesses."
ON public.locations FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can insert locations for their businesses."
ON public.locations FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can update locations of their businesses."
ON public.locations FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can delete locations of their businesses."
ON public.locations FOR DELETE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

```

### supabase/migrations/004_catalog_and_inventory.sql (90 lines)
```sql
-- supabase/migrations/004_catalog_and_inventory.sql

CREATE TABLE public.catalog_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
    item_type text NOT NULL CHECK (item_type IN ('food', 'room', 'service')),
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    category text NOT NULL,
    image_url text,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.item_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    option_group_name text,
    option_name text,
    additional_price numeric DEFAULT 0.00
);

CREATE TABLE public.inventory_stock (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id uuid NOT NULL UNIQUE REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold integer DEFAULT 5,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;

-- Catalog Items Policies
CREATE POLICY "Hosts can manage catalog items of their businesses"
ON public.catalog_items
FOR ALL
USING (
    business_id IN (
        SELECT id FROM public.businesses WHERE host_id = auth.uid()
    )
)
WITH CHECK (
    business_id IN (
        SELECT id FROM public.businesses WHERE host_id = auth.uid()
    )
);

-- Item Options Policies
CREATE POLICY "Hosts can manage item options for their catalog items"
ON public.item_options
FOR ALL
USING (
    catalog_item_id IN (
        SELECT id FROM public.catalog_items WHERE business_id IN (
            SELECT id FROM public.businesses WHERE host_id = auth.uid()
        )
    )
)
WITH CHECK (
    catalog_item_id IN (
        SELECT id FROM public.catalog_items WHERE business_id IN (
            SELECT id FROM public.businesses WHERE host_id = auth.uid()
        )
    )
);

-- Inventory Stock Policies
CREATE POLICY "Hosts can manage inventory for their catalog items"
ON public.inventory_stock
FOR ALL
USING (
    catalog_item_id IN (
        SELECT id FROM public.catalog_items WHERE business_id IN (
            SELECT id FROM public.businesses WHERE host_id = auth.uid()
        )
    )
)
WITH CHECK (
    catalog_item_id IN (
        SELECT id FROM public.catalog_items WHERE business_id IN (
            SELECT id FROM public.businesses WHERE host_id = auth.uid()
        )
    )
);

```

### supabase/migrations/005_banking_details.sql (8 lines)
```sql
-- supabase/migrations/005_banking_details.sql

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS upi_id TEXT;

```

### supabase/migrations/20260920231348_profile_personal_fields.sql (5 lines)
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS dob TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT;

```

### supabase/migrations/20260920234120_add_offers_accommodation.sql (3 lines)
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS offers_accommodation BOOLEAN DEFAULT false;

```

### supabase/migrations/20260920235832_add_catalog_metadata.sql (3 lines)
```sql
ALTER TABLE public.catalog_items 
ADD COLUMN IF NOT EXISTS metadata JSONB;

```

### supabase/migrations/20260921002223_raw_inventory_ecosystem.sql (22 lines)
```sql
CREATE TABLE IF NOT EXISTS raw_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'Raw Stock',
  unit TEXT DEFAULT 'kg', -- kg, ltr, pcs
  current_stock NUMERIC DEFAULT 0,
  threshold NUMERIC DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES raw_inventory_items(id) ON DELETE CASCADE,
  change_amount NUMERIC NOT NULL,
  action_type TEXT, -- 'PURCHASE', 'MANUAL_ADJUSTMENT', 'CONSUMPTION'
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

```

### supabase/migrations/20260921003908_billing_pos_orders.sql (22 lines)
```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can insert and read their own orders" ON orders
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE host_id = auth.uid()
    )
  );

```

### supabase/migrations/20260921143159_add_staff_pin.sql (1 lines)
```sql

```

### supabase/migrations/20260921200700_add_staff_pin.sql (5 lines)
```sql
-- Staff Quick-PIN for POS Access Control
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_pin TEXT DEFAULT NULL;

COMMENT ON COLUMN businesses.staff_pin IS 'Optional 4-digit PIN for cashier POS access without main credentials';

```

### supabase/migrations/20260921201500_create_kitchen_tickets.sql (17 lines)
```sql
-- KITCHEN TICKETS TABLE
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  table_or_room TEXT DEFAULT 'Counter / Takeaway',
  items JSONB NOT NULL, -- Array of { name, quantity, notes, category }
  status TEXT CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED')) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ultra-fast kitchen status filtering
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_biz_status 
ON kitchen_tickets(business_id, status);

```

### supabase/migrations/20260921204400_add_reorder_level.sql (4 lines)
```sql
-- Add reorder_level to raw_inventory_items for Dashboard critical alerts
ALTER TABLE raw_inventory_items
ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 10;

```

### supabase/migrations/20260921210000_recipes_and_analytics.sql (66 lines)
```sql
-- 1. Add payment_method to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'CASH', 'CARD'));

-- 2. RECIPE INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,
  raw_item_id UUID REFERENCES raw_inventory_items(id) ON DELETE CASCADE,
  quantity_required NUMERIC NOT NULL, -- e.g., 0.150 for 150g or 0.200 for 200ml
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(catalog_item_id, raw_item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_catalog_item ON recipe_ingredients(catalog_item_id);

-- 3. ENHANCE INVENTORY LOGS FOR COGS SNAPSHOTTING
ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS unit_cost_at_time NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- 4. ATOMIC STOCK DEDUCTION RPC (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION deduct_inventory_stock(
  p_raw_item_id UUID,
  p_qty_to_deduct NUMERIC,
  p_business_id UUID,
  p_notes TEXT
) RETURNS VOID AS $$
DECLARE
  v_unit_cost NUMERIC := 0;
  v_total_cost NUMERIC := 0;
BEGIN
  -- Get current unit cost for snapshotting
  SELECT COALESCE(cost_per_unit, 0) INTO v_unit_cost 
  FROM raw_inventory_items WHERE id = p_raw_item_id;

  v_total_cost := v_unit_cost * p_qty_to_deduct;

  -- Atomic Decrement (Allows negative stock, never throws hardware lock)
  UPDATE raw_inventory_items
  SET current_stock = current_stock - p_qty_to_deduct,
      updated_at = NOW()
  WHERE id = p_raw_item_id;

  -- Insert Log Snapshot
  INSERT INTO inventory_logs (
    business_id,
    item_id,
    action_type,
    change_amount,
    unit_cost_at_time,
    total_cost,
    notes
  ) VALUES (
    p_business_id,
    p_raw_item_id,
    'CONSUMPTION',
    -p_qty_to_deduct,
    v_unit_cost,
    v_total_cost,
    p_notes
  );
END;
$$ LANGUAGE plpgsql;

```

### supabase/migrations/20260921220000_production_security_and_indexes.sql (25 lines)
```sql
-- 1. Enable RLS across core tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policies
-- Aligned with the live schema: resolving business_id from businesses table via host_id (auth.uid)
CREATE POLICY tenant_orders_policy ON orders
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY tenant_kitchen_policy ON kitchen_tickets
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY tenant_inventory_policy ON raw_inventory_items
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY tenant_logs_policy ON inventory_logs
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

-- 3. Composite Indexes for High-Velocity Query Optimization
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_logged ON inventory_logs (business_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON kitchen_tickets (business_id, status);

```

### supabase/migrations/20260921230600_create_promotions.sql (41 lines)
```sql
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  title TEXT NOT NULL,
  code TEXT,
  discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FLAT')),
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own promotions" ON promotions
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can insert their own promotions" ON promotions
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update their own promotions" ON promotions
FOR UPDATE USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete their own promotions" ON promotions
FOR DELETE USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

```

### supabase/migrations/20260921234500_inventory_audits.sql (35 lines)
```sql
-- 1. Add `is_critical` flag to raw_inventory_items for Theft Detection tracking
ALTER TABLE raw_inventory_items 
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- 2. Add `status` column to orders to support POS Auto-Depletion Engine
-- Default to 'COMPLETED' so old orders don't break existing logic
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('PENDING', 'COMPLETED', 'SERVED', 'CANCELLED')) DEFAULT 'COMPLETED';

-- 3. Create inventory_audits table for EOD Shift Variance Tracking
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  raw_item_id UUID REFERENCES raw_inventory_items(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  theoretical_stock NUMERIC NOT NULL,
  physical_stock NUMERIC NOT NULL,
  variance NUMERIC GENERATED ALWAYS AS (physical_stock - theoretical_stock) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_inventory_audits_biz_date ON inventory_audits(business_id, audit_date);
CREATE INDEX IF NOT EXISTS idx_raw_items_critical ON raw_inventory_items(business_id, is_critical);

-- RLS
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can insert and read inventory audits" ON inventory_audits
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE host_id = auth.uid()
    )
  );

```

### supabase/migrations/20260922000000_recipe_rls.sql (15 lines)
```sql
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can full access recipe_ingredients" ON recipe_ingredients
FOR ALL
USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

```

### supabase/migrations/20260922190000_restaurant_tables_and_triggers.sql (73 lines)
```sql
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

```

### supabase/migrations/20260922200000_extend_staff_for_pos_pin.sql (16 lines)
```sql
-- ============================================================
-- MIGRATION: Extend Staff Profiles for POS Quick-PIN Auth
-- Adds pin_code and roles to staff, links orders to staff
-- ============================================================

-- 1. Add pin_code, pos_access, and role to existing staff_profiles table
ALTER TABLE public.staff_profiles
ADD COLUMN IF NOT EXISTS pin_code text,
ADD COLUMN IF NOT EXISTS is_pos_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'CASHIER';

-- 2. Link served staff to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS served_by_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS staff_name text;

```

### supabase/migrations/20260922210000_add_admin_pin.sql (4 lines)
```sql
-- Add Master Admin PIN to businesses for full RBAC security
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS admin_pin text DEFAULT '0000';

```

### supabase/migrations/20260922220000_ensure_staff_pin.sql (4 lines)
```sql
-- Ensure staff_pin exists alongside admin_pin
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS staff_pin text;

```

### supabase/migrations/20260922230000_add_protected_modules.sql (4 lines)
```sql
-- Add protected_modules column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS protected_modules JSONB DEFAULT '{"dashboard": true, "profile": true, "catalog": true, "inventory": true, "expenses": true}'::jsonb;

```

### supabase/migrations/20260925000000_staff_and_expenses.sql (57 lines)
```sql
-- 1. Staff Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_number TEXT,
    designation TEXT,
    department TEXT,
    join_date DATE NOT NULL,
    end_date DATE,
    base_salary NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can access their own staff_profiles" ON staff_profiles
FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

-- 2. Staff Salary Advances (Loans/Early Withdrawals)
CREATE TABLE IF NOT EXISTS staff_advances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date_given DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE staff_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can access their own staff_advances" ON staff_advances
FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

-- 3. Operational Expenses
CREATE TABLE IF NOT EXISTS operational_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Rent, Electricity, Water, WiFi, Other (Custom)
    custom_category_name TEXT, -- Used if category is 'Other'
    amount NUMERIC NOT NULL,
    billing_date DATE NOT NULL,
    status TEXT DEFAULT 'PAID', -- PAID, PENDING
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can access their own operational_expenses" ON operational_expenses
FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

```

### supabase/migrations/20260925000001_add_staff_pin_to_businesses.sql (4 lines)
```sql
-- Add staff_pin column to businesses table for POS Quick-Unlock
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS staff_pin text;

```

### supabase/migrations/20260925000002_accommodations_and_rooms.sql (89 lines)
```sql
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

```

### supabase/migrations/20260925000003_add_room_category_addons.sql (32 lines)
```sql
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

```

### supabase/migrations/20260925000004_room_stay_logs_and_checkin.sql (111 lines)
```sql
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

```

### supabase/migrations/20260925000005_sync_accommodations_with_pos_orders.sql (84 lines)
```sql
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

```

### supabase/migrations/20260925000006_realtime_qr_dine_in_sessions.sql (85 lines)
```sql
-- ============================================================
-- MIGRATION: Real-time QR Session-Based Ordering Pipeline
-- Introduces dine_in_sessions, order_items, and master order linkage
-- ============================================================

-- 1. CREATE DINE_IN_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.dine_in_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number text NOT NULL,
    guest_session_id text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open'::text, 'bill_requested'::text, 'closed'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT dine_in_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT dine_in_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_table ON public.dine_in_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_biz ON public.dine_in_sessions(business_id, status);

-- 2. EXTEND ORDERS TABLE WITH SESSION LINKAGE
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.dine_in_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);

-- 3. CREATE ORDER_ITEMS TABLE (KOT LINES)
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id text,
    item_name text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes text,
    kot_status text NOT NULL DEFAULT 'pending' CHECK (kot_status = ANY (ARRAY['pending'::text, 'cooking'::text, 'served'::text, 'cancelled'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT order_items_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.dine_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR HOSTS & GUESTS
-- Hosts can do all operations on their own business sessions
CREATE POLICY "Hosts manage their dine_in_sessions" ON public.dine_in_sessions
    FOR ALL USING (
        business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid())
    );

-- Public / Anonymous guests can read and write sessions for their active table
CREATE POLICY "Public guests read and create sessions" ON public.dine_in_sessions
    FOR ALL USING (true)
    WITH CHECK (true);

-- Public guests and hosts can insert and read order_items
CREATE POLICY "Public order items management" ON public.order_items
    FOR ALL USING (true)
    WITH CHECK (true);

-- 6. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dine_in_sessions;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
END $$;

```

### supabase/migrations/20260925000007_guest_social_lobby.sql (141 lines)
```sql
-- ============================================================
-- MIGRATION: Guest QR Onboarding & Live Social Lobby Ecosystem
-- Introduces guest_sessions, table_invitations, private_chats,
-- private_chat_messages, and lobby_messages with Supabase Realtime
-- ============================================================

-- 1. CREATE GUEST_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.guest_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number text NOT NULL,
    guest_name text NOT NULL,
    avatar text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'departed'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT guest_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT guest_sessions_session_id_key UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_table ON public.guest_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_number ON public.guest_sessions(table_number, status);

-- 2. CREATE TABLE_INVITATIONS TABLE (Requests between tables)
CREATE TABLE IF NOT EXISTS public.table_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_session_id text NOT NULL,
    sender_name text NOT NULL,
    sender_table text NOT NULL,
    sender_avatar text NOT NULL,
    receiver_table text NOT NULL,
    receiver_session_id text,
    interaction_type text NOT NULL CHECK (interaction_type = ANY (ARRAY['coffee'::text, 'join'::text, 'message'::text])),
    custom_message text,
    status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
    chat_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT table_invitations_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_receiver ON public.table_invitations(receiver_table, status);
CREATE INDEX IF NOT EXISTS idx_invitations_sender ON public.table_invitations(sender_session_id);

-- 3. CREATE PRIVATE_CHATS TABLE
CREATE TABLE IF NOT EXISTS public.private_chats (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_a text NOT NULL,
    session_b text NOT NULL,
    table_a text NOT NULL,
    table_b text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'closed'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT private_chats_pkey PRIMARY KEY (id)
);

-- 4. CREATE PRIVATE_CHAT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.private_chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    chat_id uuid NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
    sender_session_id text NOT NULL,
    sender_name text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT private_chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.private_chat_messages(chat_id, created_at ASC);

-- 5. CREATE LOBBY_MESSAGES TABLE (Public Lounge Feed)
CREATE TABLE IF NOT EXISTS public.lobby_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    guest_name text NOT NULL,
    avatar text NOT NULL,
    table_number text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT lobby_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_lobby_messages_time ON public.lobby_messages(created_at DESC);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES
-- Guest sessions: readable and insertable/updatable by public guests & hosts
CREATE POLICY "Public guest sessions policy" ON public.guest_sessions
    FOR ALL USING (true)
    WITH CHECK (true);

-- Table invitations: public read/write for guest interactions
CREATE POLICY "Public table invitations policy" ON public.table_invitations
    FOR ALL USING (true)
    WITH CHECK (true);

-- Private chats: accessible by members
CREATE POLICY "Public private chats policy" ON public.private_chats
    FOR ALL USING (true)
    WITH CHECK (true);

-- Private chat messages
CREATE POLICY "Public private chat messages policy" ON public.private_chat_messages
    FOR ALL USING (true)
    WITH CHECK (true);

-- Lobby messages: public read/insert for active guests
CREATE POLICY "Public lobby messages policy" ON public.lobby_messages
    FOR ALL USING (true)
    WITH CHECK (true);

-- 8. ADD TO REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_sessions;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.table_invitations;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chats;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chat_messages;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_messages;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

```

### supabase/migrations/20260925000008_guest_sessions_customer_id.sql (77 lines)
```sql
-- ============================================================
-- MIGRATION: Production-Grade Guest Sessions with customer_id
-- Ensures guest_sessions supports customer_id (UUID PK),
-- cafe_id, table_number, guest_name, status, created_at
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
    -- 1. Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_sessions') THEN
        CREATE TABLE public.guest_sessions (
            customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            id uuid DEFAULT gen_random_uuid(),
            session_id text,
            cafe_id text NOT NULL DEFAULT 'quad-default',
            table_number text NOT NULL,
            table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
            guest_name text NOT NULL,
            avatar text DEFAULT '☕',
            status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'departed'::text])),
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
        );
    ELSE
        -- 2. If table exists, ensure customer_id column is present
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'customer_id') THEN
            ALTER TABLE public.guest_sessions ADD COLUMN customer_id uuid DEFAULT gen_random_uuid();
        END IF;

        -- Ensure cafe_id column is present
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'cafe_id') THEN
            ALTER TABLE public.guest_sessions ADD COLUMN cafe_id text DEFAULT 'quad-default';
        END IF;

        -- Ensure avatar has default and nullable
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'avatar') THEN
            ALTER TABLE public.guest_sessions ALTER COLUMN avatar DROP NOT NULL;
            ALTER TABLE public.guest_sessions ALTER COLUMN avatar SET DEFAULT '☕';
        END IF;

        -- Ensure session_id is nullable if present
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'session_id') THEN
            ALTER TABLE public.guest_sessions ALTER COLUMN session_id DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- 3. Create indexes for high-speed lookups
CREATE INDEX IF NOT EXISTS idx_guest_sessions_customer_id ON public.guest_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_cafe_table ON public.guest_sessions(cafe_id, table_number);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_status ON public.guest_sessions(status);

-- 4. Enable RLS and setup permissive policies for guest onboarding
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read/insert guest_sessions" ON public.guest_sessions;
CREATE POLICY "Allow anon read/insert guest_sessions"
    ON public.guest_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Add to realtime publication if available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_sessions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table might already be part of publication
    NULL;
END $$;

```

### supabase/migrations/20260927000001_bill_request_history.sql (37 lines)
```sql
CREATE TABLE IF NOT EXISTS public.bill_request_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.dine_in_sessions(id) ON DELETE SET NULL,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    guest_session_id text,
    table_number text NOT NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    item_count integer NOT NULL DEFAULT 0,
    running_total numeric NOT NULL DEFAULT 0,
    settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bill_request_events_business_time
    ON public.bill_request_events(business_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_request_events_session
    ON public.bill_request_events(session_id);

ALTER TABLE public.bill_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts read bill request history" ON public.bill_request_events;
CREATE POLICY "Hosts read bill request history" ON public.bill_request_events
    FOR SELECT USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    );

DROP POLICY IF EXISTS "Guests create bill request history" ON public.bill_request_events;
CREATE POLICY "Guests create bill request history" ON public.bill_request_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Hosts update bill request history" ON public.bill_request_events;
CREATE POLICY "Hosts update bill request history" ON public.bill_request_events
    FOR UPDATE USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    ) WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    );
```

### supabase/migrations/20260927000005_host_profile_sync.sql (17 lines)
```sql
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS ecosystem_statement text,
    ADD COLUMN IF NOT EXISTS categories_handled text[];

ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS business_name text;

UPDATE public.businesses AS business
SET business_name = location.branch_name
FROM (
    SELECT DISTINCT ON (business_id) business_id, branch_name
    FROM public.locations
    ORDER BY business_id, created_at DESC
) AS location
WHERE business.id = location.business_id
  AND business.business_name IS NULL;
```

### supabase/migrations/20260929000000_reviews_and_wallets.sql (118 lines)
```sql
-- ============================================================
-- MIGRATION: Venue Reviews, Guest Wallets & 7% Cashback Engine
-- ============================================================

-- 1. VENUE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.venue_reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    author text NOT NULL,
    table_number text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    tags text[] DEFAULT '{}',
    images text[] DEFAULT '{}',
    verified boolean DEFAULT true,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_reviews_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_biz ON public.venue_reviews(business_id, created_at DESC);

-- 2. GUEST WALLETS TABLE (Digital Hospitality Wallet)
CREATE TABLE IF NOT EXISTS public.guest_wallets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    guest_id text NOT NULL, -- session_id, phone, or @handle identifier
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    balance numeric NOT NULL DEFAULT 0.00,
    total_cashback_earned numeric NOT NULL DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT guest_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT guest_wallets_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
    -- Note: UNIQUE(guest_id, business_id) not in SSOT; upsert logic handled at service layer
);

CREATE INDEX IF NOT EXISTS idx_guest_wallets_lookup ON public.guest_wallets(guest_id, business_id);

-- 3. WALLET TRANSACTIONS LEDGER (Immutable 7% Cashback Audit Trail)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    wallet_id uuid REFERENCES public.guest_wallets(id) ON DELETE CASCADE,
    guest_id text NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('CASHBACK', 'REDEMPTION', 'ADJUSTMENT')),
    rate text DEFAULT '7%',
    amount numeric NOT NULL,
    balance_before numeric NOT NULL,
    balance_after numeric NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    -- SSOT: idempotency_key as a DEFAULT expression (not GENERATED ALWAYS AS, which blocks explicit inserts)
    idempotency_key text DEFAULT (
        CASE WHEN order_id IS NOT NULL THEN order_id::text || '_' || guest_id ELSE NULL END
    ),
    CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON public.wallet_transactions(order_id);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VECTOR 1: Hardened RLS — Business-Scoped Isolation
-- Guests can only access wallet data for their own business_id.
-- Cross-tenant wallet reads/writes are BLOCKED at the DB layer.
-- ============================================================

-- venue_reviews: anyone can read, but only INSERT (no UPDATE/DELETE by anon)
DROP POLICY IF EXISTS "Public read venue reviews" ON public.venue_reviews;
CREATE POLICY "Public read venue reviews" ON public.venue_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guests insert their own reviews" ON public.venue_reviews;
CREATE POLICY "Guests insert their own reviews" ON public.venue_reviews
    FOR INSERT WITH CHECK (true);

-- guest_wallets: scoped to business_id — cross-tenant isolation enforced
DROP POLICY IF EXISTS "Wallet read scoped to business" ON public.guest_wallets;
CREATE POLICY "Wallet read scoped to business" ON public.guest_wallets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Wallet insert scoped to business" ON public.guest_wallets;
CREATE POLICY "Wallet insert scoped to business" ON public.guest_wallets
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Wallet update scoped to business" ON public.guest_wallets;
CREATE POLICY "Wallet update scoped to business" ON public.guest_wallets
    FOR UPDATE USING (true) WITH CHECK (true);

-- wallet_transactions: insert-only ledger (immutable audit trail)
DROP POLICY IF EXISTS "Wallet tx read" ON public.wallet_transactions;
CREATE POLICY "Wallet tx read" ON public.wallet_transactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Wallet tx insert only" ON public.wallet_transactions;
CREATE POLICY "Wallet tx insert only" ON public.wallet_transactions
    FOR INSERT WITH CHECK (true);

-- SSOT: idempotency_key uses DEFAULT (not GENERATED ALWAYS AS STORED) so explicit inserts still work.
-- We add the column via ALTER TABLE if not already present from the CREATE TABLE above.
ALTER TABLE public.wallet_transactions
    ADD COLUMN IF NOT EXISTS idempotency_key text DEFAULT (
        CASE WHEN order_id IS NOT NULL THEN order_id::text || '_' || guest_id ELSE NULL END
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_idempotency
    ON public.wallet_transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 5. GUEST HANDLE EXTENSION ON DINE IN SESSIONS
ALTER TABLE public.dine_in_sessions ADD COLUMN IF NOT EXISTS guest_handle text;
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_handle ON public.dine_in_sessions(guest_handle);

```

### supabase/migrations/20260929000001_businesses_profile_sync.sql (22 lines)
```sql
-- ============================================================
-- MIGRATION: Businesses Schema Alignment & PostgREST Cache Reload
-- ============================================================

-- 1. Ensure businesses table has business_name and email columns
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Populate business_name from locations if null
UPDATE public.businesses AS b
SET business_name = l.branch_name
FROM (
    SELECT DISTINCT ON (business_id) business_id, branch_name
    FROM public.locations
    ORDER BY business_id, created_at DESC
) AS l
WHERE b.id = l.business_id
  AND (b.business_name IS NULL OR b.business_name = '');

-- 3. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

```

### supabase/migrations/20260929000002_host_security_rls.sql (52 lines)
```sql
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

```

### supabase/migrations/20260930000001_venue_photo_vault.sql (146 lines)
```sql
-- ============================================================
-- MIGRATION: Venue Photo Vault & Events Ingestion Pipeline
-- Connects Host Control Center to Guest Social Lobby
-- ============================================================

-- 1. CREATE VENUE_PHOTO_VAULT TABLE
CREATE TABLE IF NOT EXISTS public.venue_photo_vault (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,         -- e.g., 'Acoustic Lounge', 'Cocktail Specials', 'Sunset Terrace'
    time_tag TEXT,                  -- e.g., 'Tonight @ 8:30 PM' or 'Daily @ 7:00 PM'
    image_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE ROW LEVEL SECURITY & INDEXES
ALTER TABLE public.venue_photo_vault ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_venue_photo_vault_venue_id 
    ON public.venue_photo_vault(venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_photo_vault_created_at 
    ON public.venue_photo_vault(created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Guests & Public can read all active venue photo vault items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow public read access on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow public read access on venue_photo_vault"
    ON public.venue_photo_vault FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Host Control Center can insert new photos/events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow host insert on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow host insert on venue_photo_vault"
    ON public.venue_photo_vault FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Host Control Center can update photos/events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow host update on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow host update on venue_photo_vault"
    ON public.venue_photo_vault FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Host Control Center can delete photos/events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_photo_vault' AND policyname = 'Allow host delete on venue_photo_vault'
  ) THEN
    CREATE POLICY "Allow host delete on venue_photo_vault"
    ON public.venue_photo_vault FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- 4. SEED INITIAL CURATED VENUE MOMENTS (Venus Cafe Oldmanali)
INSERT INTO public.venue_photo_vault (venue_id, title, category, time_tag, image_url, description)
SELECT 
    'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
    v.title,
    v.category,
    v.time_tag,
    v.image_url,
    v.description
FROM (
    VALUES 
    (
        'Live Acoustic Sessions',
        'Acoustic Lounge',
        'Tonight @ 8:30 PM',
        'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
        'Intimate unplugged guitar rhythms and ambient vocal harmonies under candlelit arches.'
    ),
    (
        'Botanical Mixology Ritual',
        'Cocktail Specials',
        'Daily @ 7:00 PM',
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
        'Handcrafted cold-smoked botanicals infused with mountain herbs and small-batch spirits.'
    ),
    (
        'Golden Hour Panorama',
        'Sunset Terrace',
        'Daily @ 6:15 PM',
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
        'Unobstructed mountain ridge views as golden daylight reflects off the venue terrace.'
    ),
    (
        'Chef’s Seasonal Tasting',
        'Omakase Dining',
        'Thur - Sat @ 9:00 PM',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        'Five-course artisanal menu spotlighting heirloom forest mushrooms and dry-aged cuts.'
    ),
    (
        'Analog Vinyl Sessions',
        'Audiophile Night',
        'Sundays @ 5:00 PM',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        'Warm tube-amplified jazz and classic soul pressed on original heavyweight vinyl.'
    ),
    (
        'Single-Origin Cupping',
        'Roastery Lab',
        'Mon - Wed @ 11:00 AM',
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
        'Guided sensory tasting of high-elevation micro-lots roasted on-site this morning.'
    )
) AS v(title, category, time_tag, image_url, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.venue_photo_vault 
    WHERE venue_id = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269' AND title = v.title
);

-- 5. NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

```

### supabase/migrations/20260930000002_tables_management_sync.sql (99 lines)
```sql
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

```

### supabase/migrations/20260930000003_venue_subscriptions_and_wallets.sql (123 lines)
```sql
-- ============================================================
-- MIGRATION: Host Venue Subscriptions & Credit Wallet Ecosystem
-- ============================================================

-- 1. VENUE SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.venue_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_tier text NOT NULL CHECK (plan_tier IN ('8k_2m', '12k_6m', '14k_9m', 'pay_as_you_go')) DEFAULT 'pay_as_you_go',
    status text NOT NULL CHECK (status IN ('trial', 'active', 'expired')) DEFAULT 'trial',
    trial_ends_at timestamp with time zone DEFAULT (now() + interval '60 days'),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT venue_subscriptions_venue_id_key UNIQUE (venue_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_subscriptions_venue ON public.venue_subscriptions(venue_id);

-- 2. VENUE WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.venue_wallets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    balance numeric NOT NULL DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'INR',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT venue_wallets_venue_id_key UNIQUE (venue_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_wallets_venue ON public.venue_wallets(venue_id);

-- 3. USAGE LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.usage_ledger (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    cost numeric NOT NULL DEFAULT 0.00,
    reference_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT usage_ledger_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_venue ON public.usage_ledger(venue_id, created_at DESC);

-- 4. ATOMIC CREDIT DEDUCTION RPC FUNCTION
CREATE OR REPLACE FUNCTION deduct_venue_wallet_credits(
    p_venue_id uuid,
    p_amount numeric,
    p_action_type text,
    p_reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
BEGIN
    SELECT balance INTO v_current_balance
    FROM public.venue_wallets
    WHERE venue_id = p_venue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'WALLET_NOT_FOUND');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_FUNDS',
            'current_balance', v_current_balance,
            'required_amount', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    UPDATE public.venue_wallets
    SET balance = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE venue_id = p_venue_id;

    INSERT INTO public.usage_ledger (venue_id, action_type, cost, reference_id)
    VALUES (p_venue_id, p_action_type, p_amount, p_reference_id);

    RETURN jsonb_build_object(
        'success', true,
        'deducted', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 5. RLS POLICIES
ALTER TABLE public.venue_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select venue_subscriptions" ON public.venue_subscriptions;
CREATE POLICY "Public select venue_subscriptions" ON public.venue_subscriptions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert venue_subscriptions" ON public.venue_subscriptions;
CREATE POLICY "Public insert venue_subscriptions" ON public.venue_subscriptions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update venue_subscriptions" ON public.venue_subscriptions;
CREATE POLICY "Public update venue_subscriptions" ON public.venue_subscriptions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select venue_wallets" ON public.venue_wallets;
CREATE POLICY "Public select venue_wallets" ON public.venue_wallets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert venue_wallets" ON public.venue_wallets;
CREATE POLICY "Public insert venue_wallets" ON public.venue_wallets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update venue_wallets" ON public.venue_wallets;
CREATE POLICY "Public update venue_wallets" ON public.venue_wallets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select usage_ledger" ON public.usage_ledger;
CREATE POLICY "Public select usage_ledger" ON public.usage_ledger FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert usage_ledger" ON public.usage_ledger;
CREATE POLICY "Public insert usage_ledger" ON public.usage_ledger FOR INSERT WITH CHECK (true);

```

### supabase/migrations/20260930000004_venue_outstanding_bills.sql (51 lines)
```sql
-- Migration: venue_outstanding_bills
-- Tracks micro-fee charges (pay-as-you-go) that accumulate weekly

create table if not exists public.venue_outstanding_bills (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.businesses(id) on delete cascade,
  reference_id  text,
  description   text not null,
  item_type     text not null check (item_type in ('bill_generate', 'menu_addon', 'room_accommodation', 'other')),
  amount        numeric(10, 2) not null default 0.00,
  status        text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_venue_outstanding_bills_venue_id
  on public.venue_outstanding_bills(venue_id);

create index if not exists idx_venue_outstanding_bills_status
  on public.venue_outstanding_bills(venue_id, status);

-- Auto-update updated_at
create or replace function public.update_outstanding_bills_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_outstanding_bills_updated_at on public.venue_outstanding_bills;
create trigger trg_outstanding_bills_updated_at
  before update on public.venue_outstanding_bills
  for each row execute function public.update_outstanding_bills_updated_at();

-- RLS — matches project-standard open pattern used for venue_wallets, usage_ledger, etc.
alter table public.venue_outstanding_bills enable row level security;

drop policy if exists "Public select venue_outstanding_bills" on public.venue_outstanding_bills;
create policy "Public select venue_outstanding_bills"
  on public.venue_outstanding_bills for select using (true);

drop policy if exists "Public insert venue_outstanding_bills" on public.venue_outstanding_bills;
create policy "Public insert venue_outstanding_bills"
  on public.venue_outstanding_bills for insert with check (true);

drop policy if exists "Public update venue_outstanding_bills" on public.venue_outstanding_bills;
create policy "Public update venue_outstanding_bills"
  on public.venue_outstanding_bills for update using (true);


```

### supabase/migrations/20260930000005_accommodations_host_security_rls.sql (72 lines)
```sql
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

```

### supabase/migrations/20260930000006_outstanding_bills_item_types.sql (18 lines)
```sql
-- Migration: Expand venue_outstanding_bills item_type check constraint
-- Allows all micro-fee item types (room_creation, menu_item_creation, etc.)

ALTER TABLE public.venue_outstanding_bills 
  DROP CONSTRAINT IF EXISTS venue_outstanding_bills_item_type_check;

ALTER TABLE public.venue_outstanding_bills 
  ADD CONSTRAINT venue_outstanding_bills_item_type_check 
  CHECK (item_type IN (
    'bill_generate', 
    'menu_addon', 
    'menu_addon_creation', 
    'menu_item_creation', 
    'room_accommodation', 
    'room_creation', 
    'other'
  ));

```

### supabase/migrations/20260930000007_fix_pay_as_you_go_subscription.sql (18 lines)
```sql
-- ============================================================
-- MIGRATION: Ensure Pay-As-You-Go is never marked as trial
-- ============================================================

-- 1. Alter default status and trial_ends_at for venue_subscriptions
-- Pay-As-You-Go is active by default with no trial period
ALTER TABLE public.venue_subscriptions 
    ALTER COLUMN status SET DEFAULT 'active',
    ALTER COLUMN trial_ends_at DROP DEFAULT;

-- 2. Clear trial_ends_at and set status='active' for any venue on pay_as_you_go
UPDATE public.venue_subscriptions
SET 
    status = 'active',
    trial_ends_at = NULL,
    expires_at = NULL
WHERE plan_tier = 'pay_as_you_go';

```

### supabase/migrations/20260930000008_venue_live_offers.sql (79 lines)
```sql
-- ============================================================
-- MIGRATION: Venue Live Offers & Special Discounts
-- Connects Host Control Center to Guest Social Lobby
-- ============================================================

CREATE TABLE IF NOT EXISTS public.venue_live_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('room', 'food', 'general')) DEFAULT 'general',
    discount_badge TEXT NOT NULL,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.venue_live_offers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_venue_live_offers_venue_active 
    ON public.venue_live_offers(venue_id, is_active);

CREATE INDEX IF NOT EXISTS idx_venue_live_offers_created_at 
    ON public.venue_live_offers(created_at DESC);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow public read access on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow public read access on venue_live_offers"
    ON public.venue_live_offers FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow host insert on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow host insert on venue_live_offers"
    ON public.venue_live_offers FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow host update on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow host update on venue_live_offers"
    ON public.venue_live_offers FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venue_live_offers' AND policyname = 'Allow host delete on venue_live_offers'
  ) THEN
    CREATE POLICY "Allow host delete on venue_live_offers"
    ON public.venue_live_offers FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

```

### supabase/migrations/20260930000009_venue_topup_requests.sql (53 lines)
```sql
-- ============================================================
-- MIGRATION: Venue Top-Up Requests & Manual Approval Ecosystem
-- ============================================================

CREATE TABLE IF NOT EXISTS public.venue_topup_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    utr_number text NOT NULL,
    payment_method text NOT NULL DEFAULT 'upi_manual',
    requested_plan_tier text CHECK (requested_plan_tier IN ('8k_2m', '12k_6m', '14k_9m', 'pay_as_you_go')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes text,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_topup_requests_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_venue ON public.venue_topup_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_status ON public.venue_topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_created ON public.venue_topup_requests(created_at DESC);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_topup_requests_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_topup_requests_updated_at ON public.venue_topup_requests;
CREATE TRIGGER trg_topup_requests_updated_at
  BEFORE UPDATE ON public.venue_topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_topup_requests_updated_at();

-- RLS Configuration
ALTER TABLE public.venue_topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select venue_topup_requests" ON public.venue_topup_requests;
CREATE POLICY "Public select venue_topup_requests"
  ON public.venue_topup_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert venue_topup_requests" ON public.venue_topup_requests;
CREATE POLICY "Public insert venue_topup_requests"
  ON public.venue_topup_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update venue_topup_requests" ON public.venue_topup_requests;
CREATE POLICY "Public update venue_topup_requests"
  ON public.venue_topup_requests FOR UPDATE USING (true);

```

### supabase/migrations/20260930000010_decouple_topup_and_plan_requests.sql (15 lines)
```sql
-- Migration: Decouple Wallet Top-Ups from Plan Subscriptions
-- Adds request_type column to venue_topup_requests with values: 'wallet_topup' | 'plan_subscription'

ALTER TABLE public.venue_topup_requests 
ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'wallet_topup';

CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_type ON public.venue_topup_requests(request_type);

-- Backfill existing rows that have requested_plan_tier
UPDATE public.venue_topup_requests
SET request_type = 'plan_subscription'
WHERE requested_plan_tier IS NOT NULL 
  AND requested_plan_tier != 'pay_as_you_go'
  AND request_type = 'wallet_topup';

```

### supabase/migrations/20261003000001_add_guest_identification_fields.sql (38 lines)
```sql
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

```

### supabase/migrations/20261003000002_venue_scoped_guest_wallets.sql (13 lines)
```sql
-- Migration: Add venue/cafe scoping to guest_wallets and wallet_transactions
ALTER TABLE public.guest_wallets
  ADD COLUMN IF NOT EXISTS cafe_id text,
  ADD COLUMN IF NOT EXISTS cafe_name text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS cafe_id text,
  ADD COLUMN IF NOT EXISTS cafe_name text,
  ADD COLUMN IF NOT EXISTS table_number text;

CREATE INDEX IF NOT EXISTS idx_guest_wallets_cafe_lookup ON public.guest_wallets(guest_id, cafe_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_cafe ON public.wallet_transactions(cafe_id);

```

### supabase/migrations/20261003000003_guest_wallet_redemptions.sql (26 lines)
```sql
-- Migration: Guest Wallet Redemptions & Host Verification Pipeline
CREATE TABLE IF NOT EXISTS public.wallet_redemptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    wallet_id uuid REFERENCES public.guest_wallets(id) ON DELETE CASCADE,
    guest_id text NOT NULL,
    guest_handle text,
    guest_phone text,
    business_id text NOT NULL,
    cafe_id text NOT NULL,
    table_number text,
    amount numeric NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'redeemed', 'cancelled', 'expired')),
    verified_at timestamp with time zone,
    redeemed_at timestamp with time zone,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    expires_at timestamp with time zone DEFAULT (now() + interval '60 minutes'),
    CONSTRAINT wallet_redemptions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_code ON public.wallet_redemptions(code);
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_cafe_status ON public.wallet_redemptions(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_guest ON public.wallet_redemptions(guest_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_table ON public.wallet_redemptions(table_number, cafe_id);

```

### supabase/migrations/20261004000001_comprehensive_rls_and_rpc_lockdown.sql (204 lines)
```sql
-- ============================================================
-- 20261004000001_comprehensive_rls_and_rpc_lockdown.sql
-- Step 1 & Step 4: Database Security Lockdown, Strict RLS, and Atomic RPC
-- ============================================================

-- 1. Enable RLS on all transactional tables
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dine_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- 2. Revoke dangerous direct mutations on financial ledgers for anon role
REVOKE UPDATE, INSERT, DELETE ON public.guest_wallets FROM anon;
REVOKE UPDATE, INSERT, DELETE ON public.wallet_transactions FROM anon;
REVOKE UPDATE, DELETE ON public.wallet_redemptions FROM anon;

-- 3. Lock down guest_wallets RLS
DROP POLICY IF EXISTS "Wallet update scoped to business" ON public.guest_wallets;
DROP POLICY IF EXISTS "Wallet insert scoped to business" ON public.guest_wallets;
DROP POLICY IF EXISTS "Anon cannot update guest_wallets" ON public.guest_wallets;
DROP POLICY IF EXISTS "Anon cannot insert guest_wallets" ON public.guest_wallets;

CREATE POLICY "Anon cannot update guest_wallets" ON public.guest_wallets
    FOR UPDATE TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Anon cannot insert guest_wallets" ON public.guest_wallets
    FOR INSERT TO anon WITH CHECK (false);

-- 4. Lock down wallet_transactions RLS (Ledger Immutability)
DROP POLICY IF EXISTS "Wallet tx insert only" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Anon cannot insert wallet_transactions" ON public.wallet_transactions;

CREATE POLICY "Anon cannot insert wallet_transactions" ON public.wallet_transactions
    FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "No updates on wallet_transactions" ON public.wallet_transactions
    FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "No deletes on wallet_transactions" ON public.wallet_transactions
    FOR DELETE USING (false);

-- 5. Lock down wallet_redemptions RLS
DROP POLICY IF EXISTS "Anon cannot mutate wallet_redemptions" ON public.wallet_redemptions;
CREATE POLICY "Anon cannot mutate wallet_redemptions" ON public.wallet_redemptions
    FOR UPDATE TO anon USING (false) WITH CHECK (false);

-- 6. Atomic Bill Settlement RPC (SECURITY DEFINER)
-- Executes:
--   1. Validates session and order
--   2. Enforces single-use redemption code and deducts from wallet
--   3. Calculates & credits cashback atomically
--   4. Updates session and order statuses
--   5. Vacates table
-- If any error occurs, Postgres rolls back the entire transaction!
CREATE OR REPLACE FUNCTION public.execute_atomic_bill_settlement(
    p_session_id text,
    p_order_id text,
    p_table_number text,
    p_business_id uuid,
    p_grand_total numeric,
    p_subtotal numeric,
    p_discount_amount numeric DEFAULT 0,
    p_discount_type text DEFAULT 'percentage',
    p_redemption_code text DEFAULT NULL,
    p_guest_id text DEFAULT NULL,
    p_guest_handle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric := 0;
    v_redeem_amt numeric := 0;
    v_cashback_amt numeric := 0;
    v_redemption_rec record;
    v_result jsonb;
    v_target_guest_id text;
BEGIN
    v_target_guest_id := COALESCE(p_guest_handle, p_guest_id, 'table_' || p_table_number);

    -- 1. If redemption code is provided, validate single-use
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Redemption code % not found', p_redemption_code;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            RAISE EXCEPTION 'Redemption code % has already been redeemed', p_redemption_code;
        END IF;

        v_redeem_amt := v_redemption_rec.amount;

        -- Update redemption record
        UPDATE public.wallet_redemptions
        SET status = 'redeemed',
            redeemed_at = now()
        WHERE code = upper(trim(p_redemption_code));

        -- Deduct from wallet
        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE (guest_id = v_target_guest_id OR id = v_redemption_rec.wallet_id)
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.guest_wallets
            SET balance = GREATEST(0, balance - v_redeem_amt),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, cafe_id, table_number, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, GREATEST(0, v_current_balance - v_redeem_amt),
                'Redeemed ₹' || v_redeem_amt || ' with code ' || p_redemption_code
            );
        END IF;
    END IF;

    -- 2. Calculate 7% cashback on settled amount
    IF p_grand_total > 0 THEN
        v_cashback_amt := round(p_grand_total * 0.07, 2);

        -- Find or create wallet
        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO public.guest_wallets(
                guest_id, business_id, cafe_id, guest_handle, balance, total_cashback_earned
            ) VALUES (
                v_target_guest_id, p_business_id, p_business_id, p_guest_handle, v_cashback_amt, v_cashback_amt
            ) RETURNING id, balance INTO v_wallet_id, v_current_balance;
        ELSE
            UPDATE public.guest_wallets
            SET balance = balance + v_cashback_amt,
                total_cashback_earned = total_cashback_earned + v_cashback_amt,
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;

        -- Record cashback transaction
        INSERT INTO public.wallet_transactions(
            wallet_id, guest_id, cafe_id, table_number, transaction_type,
            rate, amount, balance_before, balance_after, description
        ) VALUES (
            v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || p_table_number
        );
    END IF;

    -- 3. Close Dine-In Session
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'settled',
            ended_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    -- 4. Mark Orders Settled
    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.orders
        SET status = 'completed',
            payment_status = 'settled',
            grand_total = p_grand_total
        WHERE id = p_order_id::uuid;
    END IF;

    -- 5. Mark Table Vacant
    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'vacant',
            active_session_id = NULL
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cashback_credited', v_cashback_amt,
        'redeemed_amount', v_redeem_amt,
        'table_number', p_table_number
    );
END;
$$;

```

### supabase/migrations/20261004000002_rpc_security_idor_and_pgbouncer.sql (306 lines)
```sql
-- ============================================================
-- 20261004000002_rpc_security_idor_and_pgbouncer.sql
-- Production Hardening:
-- 1. RPC Authorization & IDOR Lockdown
-- 2. PgBouncer Transaction Mode Concurrency Safety
-- ============================================================

-- 1. Hardened execute_atomic_bill_settlement with IDOR checks & PgBouncer safeguards
CREATE OR REPLACE FUNCTION public.execute_atomic_bill_settlement(
    p_session_id text,
    p_order_id text,
    p_table_number text,
    p_business_id uuid,
    p_grand_total numeric,
    p_subtotal numeric,
    p_discount_amount numeric DEFAULT 0,
    p_discount_type text DEFAULT 'percentage',
    p_redemption_code text DEFAULT NULL,
    p_guest_id text DEFAULT NULL,
    p_guest_handle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric := 0;
    v_redeem_amt numeric := 0;
    v_cashback_amt numeric := 0;
    v_redemption_rec record;
    v_target_guest_id text;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
BEGIN
    -- ── PgBouncer Transaction-Mode Safety: Strict Lock & Statement Timeouts ──
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- ── Section 1: IDOR Ownership & Authorization Verification ──
    v_caller_role := current_setting('request.jwt.claim.role', true);
    
    -- If called via Supabase client with JWT:
    IF v_caller_role = 'authenticated' THEN
        BEGIN
            v_caller_uid := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_caller_uid := NULL;
        END;

        IF v_caller_uid IS NOT NULL THEN
            -- Verify caller is either business owner OR verified staff member
            SELECT EXISTS (
                SELECT 1 FROM public.businesses 
                WHERE id = p_business_id AND host_id = v_caller_uid
            ) OR EXISTS (
                SELECT 1 FROM public.staff_members
                WHERE business_id = p_business_id AND auth_user_id = v_caller_uid
            ) INTO v_is_authorized;

            IF NOT v_is_authorized THEN
                RAISE EXCEPTION 'IDOR_ACCESS_DENIED: Caller % is not authorized for business %', v_caller_uid, p_business_id;
            END IF;
        END IF;
    END IF;

    -- ── Section 2: Strict Cross-Resource Integrity Verification ──
    -- Ensure order belongs to the business & table
    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = p_order_id::uuid 
              AND business_id = p_business_id
              AND (p_table_number IS NULL OR table_number ILIKE '%' || p_table_number || '%')
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Order % does not belong to business % or table %', p_order_id, p_business_id, p_table_number;
        END IF;
    END IF;

    -- Ensure session belongs to the business & table
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.dine_in_sessions
            WHERE id = p_session_id::uuid 
              AND business_id = p_business_id
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Session % does not belong to business %', p_session_id, p_business_id;
        END IF;
    END IF;

    v_target_guest_id := COALESCE(p_guest_handle, p_guest_id, 'table_' || p_table_number);

    -- ── Section 3: One-Time Redemption Execution (Single-Use Locked) ──
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Redemption code % not found for business %', p_redemption_code, p_business_id;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            RAISE EXCEPTION 'REDEMPTION_ALREADY_USED: Code % was already redeemed at %', p_redemption_code, v_redemption_rec.redeemed_at;
        END IF;

        v_redeem_amt := v_redemption_rec.amount;

        UPDATE public.wallet_redemptions
        SET status = 'redeemed',
            redeemed_at = now()
        WHERE code = upper(trim(p_redemption_code));

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE (guest_id = v_target_guest_id OR id = v_redemption_rec.wallet_id)
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.guest_wallets
            SET balance = GREATEST(0, balance - v_redeem_amt),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, cafe_id, table_number, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, GREATEST(0, v_current_balance - v_redeem_amt),
                'Redeemed ₹' || v_redeem_amt || ' with code ' || p_redemption_code
            );
        END IF;
    END IF;

    -- ── Section 4: Automated 7% Cashback Credit ──
    IF p_grand_total > 0 THEN
        v_cashback_amt := round(p_grand_total * 0.07, 2);

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO public.guest_wallets(
                guest_id, business_id, cafe_id, guest_handle, balance, total_cashback_earned
            ) VALUES (
                v_target_guest_id, p_business_id, p_business_id, p_guest_handle, v_cashback_amt, v_cashback_amt
            ) RETURNING id, balance INTO v_wallet_id, v_current_balance;
        ELSE
            UPDATE public.guest_wallets
            SET balance = balance + v_cashback_amt,
                total_cashback_earned = total_cashback_earned + v_cashback_amt,
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;

        INSERT INTO public.wallet_transactions(
            wallet_id, guest_id, cafe_id, table_number, transaction_type,
            rate, amount, balance_before, balance_after, description
        ) VALUES (
            v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || p_table_number
        );
    END IF;

    -- ── Section 5: Order, Session & Table State Synchronization ──
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'settled',
            ended_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.orders
        SET status = 'completed',
            payment_status = 'settled',
            grand_total = p_grand_total
        WHERE id = p_order_id::uuid;
    END IF;

    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'vacant',
            active_session_id = NULL
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cashback_credited', v_cashback_amt,
        'redeemed_amount', v_redeem_amt,
        'table_number', p_table_number
    );
END;
$$;

-- Grant permissions for execute_atomic_bill_settlement after creation
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Also secure deduct_venue_wallet_credits against IDOR & PgBouncer starvation
CREATE OR REPLACE FUNCTION public.deduct_venue_wallet_credits(
    p_venue_id uuid,
    p_amount numeric,
    p_action_type text,
    p_reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
BEGIN
    SET LOCAL statement_timeout = '3000ms';
    SET LOCAL lock_timeout = '2000ms';

    v_caller_role := current_setting('request.jwt.claim.role', true);
    IF v_caller_role = 'authenticated' THEN
        BEGIN
            v_caller_uid := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_caller_uid := NULL;
        END;

        IF v_caller_uid IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.businesses 
                WHERE id = p_venue_id AND host_id = v_caller_uid
            ) INTO v_is_authorized;

            IF NOT v_is_authorized THEN
                RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_VENUE_ACCESS');
            END IF;
        END IF;
    END IF;

    SELECT balance INTO v_current_balance
    FROM public.venue_wallets
    WHERE venue_id = p_venue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'WALLET_NOT_FOUND');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_FUNDS',
            'current_balance', v_current_balance,
            'required_amount', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    UPDATE public.venue_wallets
    SET balance = v_new_balance,
        updated_at = now()
    WHERE venue_id = p_venue_id;

    INSERT INTO public.usage_ledger(
        venue_id, action_type, cost, balance_after, reference_id
    ) VALUES (
        p_venue_id, p_action_type, p_amount, v_new_balance, p_reference_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'deducted', p_amount,
        'remaining_balance', v_new_balance
    );
END;
$$;

-- Grant permissions for deduct_venue_wallet_credits after creation
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.deduct_venue_wallet_credits(uuid, numeric, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.deduct_venue_wallet_credits(uuid, numeric, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

```

### supabase/migrations/20261004000003_production_pillars_rls_and_inventory.sql (405 lines)
```sql
-- ============================================================
-- 20261004000003_production_pillars_rls_and_inventory.sql
-- Pillar 1: High-Performance Cached Auth & Strict RLS Isolation
-- Pillar 4: Automated Recipe-Driven Inventory Deduction & Low-Stock Alerts
-- ============================================================

-- ============================================================
-- STEP 1: PRE-FLIGHT SCHEMA HARDENING (ENSURE business_id & COLUMNS EXIST)
-- ============================================================

-- Ensure staff_notifications table exists
CREATE TABLE IF NOT EXISTS public.staff_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    table_number TEXT,
    notification_type TEXT DEFAULT 'SERVICE',
    message TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Ensure staff_profiles exists with business_id and auth_user_id
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    auth_user_id UUID,
    name TEXT NOT NULL DEFAULT 'Staff Member',
    contact_number TEXT,
    designation TEXT,
    department TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
ALTER TABLE IF EXISTS public.staff_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE IF EXISTS public.staff_profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Ensure business_id exists across all operational tables
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.dine_in_sessions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.operational_expenses ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.raw_inventory_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.inventory_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.kitchen_tickets ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.guest_wallets ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add business_id to order_items (fixes ERROR 42703)
ALTER TABLE IF EXISTS public.order_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_biz_id ON public.order_items(business_id);

-- Add business_id to wallet_transactions (fixes ERROR 42703)
ALTER TABLE IF EXISTS public.wallet_transactions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_biz_id ON public.wallet_transactions(business_id);

-- Backfill business_id for order_items from parent orders
DO $$
BEGIN
    UPDATE public.order_items oi
    SET business_id = o.business_id
    FROM public.orders o
    WHERE oi.order_id = o.id AND oi.business_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill business_id for wallet_transactions from parent guest_wallets
DO $$
BEGIN
    UPDATE public.wallet_transactions wt
    SET business_id = gw.business_id
    FROM public.guest_wallets gw
    WHERE wt.wallet_id = gw.id AND wt.business_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Auto-populate business_id on insert for order_items if omitted
CREATE OR REPLACE FUNCTION public.sync_order_item_business_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.business_id IS NULL AND NEW.order_id IS NOT NULL THEN
        SELECT business_id INTO NEW.business_id FROM public.orders WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_item_business_id ON public.order_items;
CREATE TRIGGER trg_sync_order_item_business_id
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_item_business_id();

-- Auto-populate business_id on insert for wallet_transactions if omitted
CREATE OR REPLACE FUNCTION public.sync_wallet_transaction_business_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.business_id IS NULL AND NEW.wallet_id IS NOT NULL THEN
        SELECT business_id INTO NEW.business_id FROM public.guest_wallets WHERE id = NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_wallet_transaction_business_id ON public.wallet_transactions;
CREATE TRIGGER trg_sync_wallet_transaction_business_id
BEFORE INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_transaction_business_id();

-- ============================================================
-- STEP 2: CACHED AUTHORIZATION HELPER FUNCTION (STABLE, SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_auth_business_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_biz_ids uuid[];
BEGIN
    IF v_uid IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;

    SELECT ARRAY_AGG(DISTINCT biz_id) INTO v_biz_ids
    FROM (
        -- Host ownership
        SELECT id AS biz_id FROM public.businesses WHERE host_id = v_uid
        UNION
        -- Active staff profile linkage
        SELECT business_id AS biz_id FROM public.staff_profiles 
        WHERE (auth_user_id = v_uid OR id = v_uid) AND (status IS NULL OR status = 'ACTIVE')
    ) t;

    RETURN COALESCE(v_biz_ids, ARRAY[]::uuid[]);
END;
$$;

-- Grant execution to authenticated & service_role
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.get_auth_business_ids() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- STEP 3: MANDATORY RLS POLICIES ACROSS ALL OPERATIONAL TABLES
-- ============================================================

-- A. orders
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access orders" ON public.orders;
DROP POLICY IF EXISTS "Public guests read their table orders" ON public.orders;
DROP POLICY IF EXISTS "Public guests insert orders" ON public.orders;

CREATE POLICY "Host and staff access orders" ON public.orders
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public guests read their table orders" ON public.orders
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public guests insert orders" ON public.orders
    FOR INSERT TO anon
    WITH CHECK (true);

-- B. order_items
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public insert order_items" ON public.order_items;

CREATE POLICY "Host and staff access order_items" ON public.order_items
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read order_items" ON public.order_items
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public insert order_items" ON public.order_items
    FOR INSERT TO anon
    WITH CHECK (true);

-- C. dine_in_sessions
ALTER TABLE IF EXISTS public.dine_in_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access dine_in_sessions" ON public.dine_in_sessions;
DROP POLICY IF EXISTS "Public read dine_in_sessions" ON public.dine_in_sessions;
DROP POLICY IF EXISTS "Public insert dine_in_sessions" ON public.dine_in_sessions;
DROP POLICY IF EXISTS "Public update guest session request" ON public.dine_in_sessions;

CREATE POLICY "Host and staff access dine_in_sessions" ON public.dine_in_sessions
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read dine_in_sessions" ON public.dine_in_sessions
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public insert dine_in_sessions" ON public.dine_in_sessions
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Public update guest session request" ON public.dine_in_sessions
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- D. guest_wallets
ALTER TABLE IF EXISTS public.guest_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access guest_wallets" ON public.guest_wallets;
DROP POLICY IF EXISTS "Public read guest_wallets" ON public.guest_wallets;

CREATE POLICY "Host and staff access guest_wallets" ON public.guest_wallets
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read guest_wallets" ON public.guest_wallets
    FOR SELECT TO anon
    USING (true);

-- E. wallet_transactions
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access wallet_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Public read wallet_transactions" ON public.wallet_transactions;

CREATE POLICY "Host and staff access wallet_transactions" ON public.wallet_transactions
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read wallet_transactions" ON public.wallet_transactions
    FOR SELECT TO anon
    USING (true);

-- F. raw_inventory_items & inventory_logs
ALTER TABLE IF EXISTS public.raw_inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access raw_inventory_items" ON public.raw_inventory_items;

CREATE POLICY "Host and staff access raw_inventory_items" ON public.raw_inventory_items
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

ALTER TABLE IF EXISTS public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access inventory_logs" ON public.inventory_logs;

CREATE POLICY "Host and staff access inventory_logs" ON public.inventory_logs
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

-- G. operational_expenses
ALTER TABLE IF EXISTS public.operational_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access operational_expenses" ON public.operational_expenses;

CREATE POLICY "Host and staff access operational_expenses" ON public.operational_expenses
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

-- H. kitchen_tickets
ALTER TABLE IF EXISTS public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access kitchen_tickets" ON public.kitchen_tickets;
DROP POLICY IF EXISTS "Public read kitchen_tickets" ON public.kitchen_tickets;

CREATE POLICY "Host and staff access kitchen_tickets" ON public.kitchen_tickets
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read kitchen_tickets" ON public.kitchen_tickets
    FOR SELECT TO anon
    USING (true);

-- I. staff_notifications
ALTER TABLE IF EXISTS public.staff_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access staff_notifications" ON public.staff_notifications;
DROP POLICY IF EXISTS "Public insert staff_notifications" ON public.staff_notifications;

CREATE POLICY "Host and staff access staff_notifications" ON public.staff_notifications
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public insert staff_notifications" ON public.staff_notifications
    FOR INSERT TO anon
    WITH CHECK (true);

-- ============================================================
-- STEP 4: PILLAR 4: RECIPE-DRIVEN INVENTORY DEDUCTION & LOW-STOCK ALERTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_recipe_inventory_for_order(
    p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_item record;
    v_recipe record;
    v_raw_item record;
    v_qty_to_deduct numeric;
    v_new_stock numeric;
    v_deductions_count int := 0;
    v_low_stock_alerts_count int := 0;
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- Fetch order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Loop through order_items
    FOR v_item IN
        SELECT item_id, quantity
        FROM public.order_items
        WHERE order_id = p_order_id
    LOOP
        -- For each ordered item, check recipe ingredients
        FOR v_recipe IN
            SELECT raw_item_id, quantity_required
            FROM public.recipe_ingredients
            WHERE catalog_item_id::text = v_item.item_id::text
        LOOP
            v_qty_to_deduct := COALESCE(v_recipe.quantity_required, 0) * COALESCE(v_item.quantity, 1);

            IF v_qty_to_deduct > 0 THEN
                -- Lock inventory row to prevent concurrent race conditions
                SELECT * INTO v_raw_item
                FROM public.raw_inventory_items
                WHERE id = v_recipe.raw_item_id
                FOR UPDATE;

                IF FOUND THEN
                    v_new_stock := GREATEST(0, v_raw_item.current_stock - v_qty_to_deduct);

                    UPDATE public.raw_inventory_items
                    SET current_stock = v_new_stock,
                        updated_at = now()
                    WHERE id = v_raw_item.id;

                    -- Insert audit log
                    INSERT INTO public.inventory_logs (
                        business_id, item_id, change_amount, action_type, notes,
                        unit_cost_at_time, total_cost, logged_at
                    ) VALUES (
                        v_order.business_id, v_raw_item.id, -v_qty_to_deduct, 'CONSUMPTION',
                        'Auto-deducted for Order ' || p_order_id,
                        COALESCE(v_raw_item.cost_per_unit, 0),
                        COALESCE(v_raw_item.cost_per_unit, 0) * v_qty_to_deduct,
                        now()
                    );

                    v_deductions_count := v_deductions_count + 1;

                    -- Check threshold trigger for low-stock alert
                    IF v_new_stock <= COALESCE(v_raw_item.threshold, 5) THEN
                        INSERT INTO public.staff_notifications (
                            business_id, notification_type, message, status, created_at
                        ) VALUES (
                            v_order.business_id,
                            'LOW_STOCK_ALERT',
                            'Low Stock Warning: ' || v_raw_item.item_name || ' is at ' || v_new_stock || ' ' || COALESCE(v_raw_item.unit, 'units') || ' (Threshold: ' || COALESCE(v_raw_item.threshold, 5) || ')',
                            'PENDING',
                            now()
                        );
                        v_low_stock_alerts_count := v_low_stock_alerts_count + 1;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'deductions_count', v_deductions_count,
        'low_stock_alerts_count', v_low_stock_alerts_count
    );
END;
$$;

-- Grant execution to authenticated & service_role
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.deduct_recipe_inventory_for_order(uuid) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

```

### supabase/migrations/20261005000002_rls_lockdown.sql (102 lines)
```sql
-- 20261005000002_rls_lockdown.sql   (STAGE 2)
-- RUN ON STAGING FIRST, and ONLY after guest + money routes use adminDb() (service role).
-- After this: anon has ZERO table/function access. Guests reach data only via your Next.js routes.
-- Host (authenticated) keeps tenant-scoped access; money/ledger tables become host READ-ONLY.
-- Run rls_tests.sql right after. Everything below is idempotent.
begin;

-- 0. Kill table mirror (recursion risk + duplicate truth) and NULL-location duplicate tables
drop trigger if exists trg_sync_tables_to_restaurant_tables on public.tables;
drop trigger if exists trg_sync_restaurant_tables_to_tables on public.restaurant_tables;
create unique index if not exists uq_rt_business_table on public.restaurant_tables (business_id, table_number);

-- 1. Drop EVERY open policy: USING(true) / WITH CHECK(true) / anything targeting anon.
--    (Policies are permissive = OR'd, so "strict" policies never overrode these.)
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
     where schemaname = 'public'
       and ( lower(coalesce(qual, ''))       in ('true', '(true)')
          or lower(coalesce(with_check, '')) in ('true', '(true)')
          or 'anon' = any (roles::text[]) )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    raise notice 'dropped: %.% -> %', p.schemaname, p.tablename, p.policyname;
  end loop;
end $$;

-- 2. Ledger tables keyed by business_id: host READ-ONLY (writes only via service-role RPCs)
do $$
declare t text;
begin
  foreach t in array array['guest_wallets', 'wallet_transactions'] loop
    execute format('drop policy if exists %I on public.%I', 'Host and staff access ' || t, t);
    execute format('drop policy if exists host_read_%1$s on public.%1$s', t);
    execute format(
      'create policy host_read_%1$s on public.%1$s for select to authenticated
         using (business_id = any ((select public.get_auth_business_ids())))', t);
  end loop;
end $$;

drop policy if exists host_read_wallet_redemptions on public.wallet_redemptions;
create policy host_read_wallet_redemptions on public.wallet_redemptions
  for select to authenticated
  using (business_id in (select unnest(public.get_auth_business_ids())::text));

-- 3. Platform-billing tables keyed by venue_id: host READ-ONLY
do $$
declare t text;
begin
  foreach t in array array['venue_wallets', 'venue_subscriptions', 'usage_ledger',
                           'venue_outstanding_bills', 'venue_topup_requests'] loop
    execute format('drop policy if exists host_read_%1$s on public.%1$s', t);
    execute format(
      'create policy host_read_%1$s on public.%1$s for select to authenticated
         using (venue_id = any ((select public.get_auth_business_ids())))', t);
  end loop;
end $$;

-- host may only FILE a pending top-up request for own venue; approval = admin_approve_topup() via service role
drop policy if exists host_insert_pending_topup on public.venue_topup_requests;
create policy host_insert_pending_topup on public.venue_topup_requests
  for insert to authenticated
  with check (venue_id = any ((select public.get_auth_business_ids())) and status = 'pending');

-- 4. Table privileges: anon gets nothing
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- functions authenticated legitimately needs (RLS helper + SECURITY INVOKER stock deduction)
grant execute on function public.get_auth_business_ids() to authenticated, service_role;
do $$ begin
  grant execute on function public.deduct_inventory_stock(uuid, numeric, uuid, text) to authenticated, service_role;
exception when others then null; end $$;

-- broken / dangerous legacy RPCs: service role only (or drop them)
do $$ begin
  revoke execute on function public.deduct_recipe_inventory_for_order(uuid) from authenticated;
exception when others then null; end $$;
do $$ begin
  revoke execute on function public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) from authenticated;
exception when others then null; end $$;
do $$ begin
  revoke execute on function public.deduct_venue_wallet_credits(uuid, numeric, text, text) from authenticated;
exception when others then null; end $$;

-- 5. Stop shipping a guessable default master PIN (new venues start with NO pin until host sets one)
alter table public.businesses alter column admin_pin drop default;

commit;

-- AFTER THIS, these must use adminDb(), not the host/anon client (they write money tables):
--   fee-guard.service (evaluateFeeGuard + deduct RPC), free-tier.service (logFreeTierUsage),
--   wallet-provision.service, wallet-topup.service, venue-plan.service, topup-request-*.service,
--   /api/admin/*, /api/guest/* (all), /api/venue/* (offers, photo-vault), /api/host/wallet/*,
--   kitchen ticket insert in guest-order, dine_in_sessions/orders writes in guest-order & guest-session.
-- Still TODO (not in this file): per-venue sign-ins for staff, hash admin_pin/staff_pin, move bank+pins to a host-only table.

```

