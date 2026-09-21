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
